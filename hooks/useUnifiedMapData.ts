import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "~/src/lib/supabase";
import { useAuth } from "~/src/lib/auth";

// ============================================================================
// TYPES
// ============================================================================

export interface MapEvent {
  id: string;
  name: string;
  description?: string;
  start_datetime: string;
  end_datetime?: string;
  venue_name?: string;
  address?: string;
  location: {
    type: string;
    coordinates: [number, number]; // [longitude, latitude] - GeoJSON format
  };
  image_urls?: string[];
  is_ticketmaster?: boolean;
  external_url?: string;
  created_by?: {
    id: string;
    name: string;
    username?: string;
    avatar_url: string | null;
  };
  attendees?: {
    count: number;
    profiles: Array<{
      id: string;
      name: string;
      avatar_url: string | null;
    }>;
  };
  categories?: Array<{
    id: string;
    name: string;
    icon?: string;
  }>;
  join_status?: boolean;
  source?: string;
  type?: string;
}

export interface MapLocation {
  id: string;
  name: string;
  description?: string;
  address?: string;
  location: {
    type: string;
    coordinates: [number, number]; // [longitude, latitude] - GeoJSON format
  };
  image_urls?: string[];
  type?: string;
  category?: {
    id: string;
    name: string;
    icon?: string;
    prompts?: Array<{
      id: string;
      name: string;
      created_at: string;
    }>;
  };
  operation_hours?: any;
  rating?: number;
  rating_count?: number;
  price_level?: number;
  phone?: string;
  external_url?: string;
  place_id?: string;
  distance_meters?: number;
  category_id?: string;
}

export interface UnifiedCluster {
  coordinate: number[];
  count: number;
  type: "event" | "location";
  events?: MapEvent[];
  locations?: MapLocation[];
  mainEvent?: MapEvent | MapLocation;
}

export interface UseUnifiedMapDataProps {
  center: number[];
  radius?: number;
  timeRange?: "today" | "week" | "weekend";
  zoomLevel?: number;
}

// ============================================================================
// MAIN HOOK
// ============================================================================

export function useUnifiedMapData({
  center,
  radius = 500000,
  timeRange = "today",
  zoomLevel = 10,
}: UseUnifiedMapDataProps) {
  const { session } = useAuth();

  // ============================================================================
  // STATE
  // ============================================================================

  const [events, setEvents] = useState<MapEvent[]>([]);
  const [locations, setLocations] = useState<MapLocation[]>([]);
  const [eventsNow, setEventsNow] = useState<MapEvent[]>([]);
  const [eventsToday, setEventsToday] = useState<MapEvent[]>([]);
  const [eventsTomorrow, setEventsTomorrow] = useState<MapEvent[]>([]);
  const [clusters, setClusters] = useState<UnifiedCluster[]>([]);
  const [clustersLocations, setClustersLocations] = useState<UnifiedCluster[]>(
    []
  );
  const [clustersNow, setClustersNow] = useState<UnifiedCluster[]>([]);
  const [clustersToday, setClustersToday] = useState<UnifiedCluster[]>([]);
  const [clustersTomorrow, setClustersTomorrow] = useState<UnifiedCluster[]>(
    []
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ============================================================================
  // REFS
  // ============================================================================

  const isMountedRef = useRef(true);
  const isLoadingRef = useRef(false);
  const lastCenterRef = useRef<number[] | null>(null);
  const lastFetchTimeRef = useRef(0);
  const cachedEventsRef = useRef<MapEvent[]>([]);
  const cachedLocationsRef = useRef<MapLocation[]>([]);

  // ============================================================================
  // UTILITY FUNCTIONS
  // ============================================================================

  const getCoordinates = (
    location: any
  ): { latitude: number; longitude: number } | null => {
    if (!location) return null;

    try {
      // Handle GeoJSON format
      if (
        location &&
        typeof location === "object" &&
        location.type === "Point" &&
        location.coordinates &&
        Array.isArray(location.coordinates)
      ) {
        const [longitude, latitude] = location.coordinates;
        if (typeof latitude === "number" && typeof longitude === "number") {
          return { latitude, longitude };
        }
      }

      // Handle old format (fallback) - also handle string coordinates
      if (
        location &&
        typeof location === "object" &&
        (typeof location.latitude === "number" ||
          typeof location.latitude === "string") &&
        (typeof location.longitude === "number" ||
          typeof location.longitude === "string")
      ) {
        const latitude = parseFloat(location.latitude);
        const longitude = parseFloat(location.longitude);
        if (!isNaN(latitude) && !isNaN(longitude)) {
          return { latitude, longitude };
        }
      }

      return null;
    } catch (error) {
      console.error("[UnifiedMapData] Error in getCoordinates:", error);
      return null;
    }
  };

  const convertPostGISGeometry = (geometry: any) => {
    if (!geometry) return null;

    // If already in GeoJSON format, return as is
    if (
      geometry.type === "Point" &&
      geometry.coordinates &&
      Array.isArray(geometry.coordinates)
    ) {
      return geometry;
    }

    // If old lat/lng format, convert to GeoJSON
    if (
      typeof geometry.latitude === "number" &&
      typeof geometry.longitude === "number"
    ) {
      return {
        type: "Point",
        coordinates: [geometry.longitude, geometry.latitude],
      };
    }

    // If PostGIS geometry string, parse it
    if (typeof geometry === "string" && geometry.startsWith("0101000020")) {
      try {
        const hexStr = geometry;
        const coordBytes = hexStr.substring(18);

        if (coordBytes.length >= 16) {
          const lonHex = coordBytes.substring(0, 16);
          const latHex = coordBytes.substring(16, 32);

          const lonBuffer = Buffer.from(lonHex, "hex");
          const latBuffer = Buffer.from(latHex, "hex");

          const longitude = lonBuffer.readDoubleLE(0);
          const latitude = latBuffer.readDoubleLE(0);

          return {
            type: "Point",
            coordinates: [longitude, latitude],
          };
        }
      } catch (error) {
        console.warn(
          "[UnifiedMapData] Failed to parse PostGIS geometry:",
          geometry
        );
      }
    }

    return null;
  };

  const validateData = useCallback(
    (data: any[], type: "event" | "location") => {
      if (!data || !Array.isArray(data)) return [];

      return data.filter((item) => {
        if (!item || typeof item !== "object") return false;

        try {
          let location = item.location;
          if (!location) return false;

          const convertedLocation = convertPostGISGeometry(location);

          if (convertedLocation) {
            item.location = convertedLocation;
            location = convertedLocation;
          }

          const coords = getCoordinates(location);
          return (
            coords !== null &&
            !isNaN(coords.latitude) &&
            !isNaN(coords.longitude) &&
            Math.abs(coords.latitude) <= 90 &&
            Math.abs(coords.longitude) <= 180
          );
        } catch (error) {
          return false;
        }
      });
    },
    []
  );

  const filterEventsByTime = useCallback(
    (events: MapEvent[], timeRange: string) => {
      const now = new Date().getTime();
      const FOUR_HOURS = 4 * 60 * 60 * 1000;
      const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
      const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;

      return events.filter((event) => {
        try {
          if (!event?.start_datetime) return false;
          const eventTime = new Date(event.start_datetime).getTime();
          if (isNaN(eventTime)) return false;

          switch (timeRange) {
            case "today":
              return eventTime >= now && eventTime <= now + TWENTY_FOUR_HOURS;
            case "weekend":
              const eventDate = new Date(event.start_datetime);
              const day = eventDate.getDay();
              return (
                (day === 5 || day === 6 || day === 0) &&
                eventTime >= now &&
                eventTime <= now + SEVEN_DAYS
              );
            default:
              return eventTime >= now && eventTime <= now + FOUR_HOURS;
          }
        } catch (error) {
          return false;
        }
      });
    },
    []
  );

  // ULTRA-FAST CLUSTERING - ALL DATA WITH PERFORMANCE
  const createClusters = useCallback(
    (
      items: (MapEvent | MapLocation)[],
      type: "event" | "location",
      zoomLevel: number = 10
    ): UnifiedCluster[] => {
      if (!items || !Array.isArray(items) || items.length === 0) {
        console.log(
          `[UnifiedMapData] createClusters: No items to cluster for ${type}`
        );
        return [];
      }

      console.log(
        `[UnifiedMapData] createClusters: Starting with ${items.length} ${type}s at zoom level ${zoomLevel}`
      );

      // Debug: Log first few items to see their structure
      if (items.length > 0) {
        console.log(`[UnifiedMapData] createClusters: First ${type} item:`, {
          id: items[0].id,
          name: items[0].name,
          location: items[0].location,
        });
      }

      // LESS AGGRESSIVE CLUSTERING: Only cluster when really close together
      const clusters: UnifiedCluster[] = [];
      const CLUSTER_RADIUS =
        zoomLevel >= 15
          ? 0.00005 // Very small radius at high zoom - only cluster if very close
          : zoomLevel >= 13
          ? 0.0002 // Small radius at medium-high zoom
          : zoomLevel >= 11
          ? 0.0005 // Medium radius at medium zoom
          : zoomLevel >= 9
          ? 0.001 // Larger radius at low zoom
          : 0.002; // Even larger radius at very low zoom

      // Pre-allocate arrays for better performance
      const processedItems = new Set();
      let processedCount = 0;

      items.forEach((item) => {
        if (processedItems.has(item.id)) return; // Skip already processed items

        const location = item.location;
        const coords = getCoordinates(location);
        if (!coords) {
          console.log(
            `[UnifiedMapData] createClusters: Could not get coordinates for ${type} item`
          );
          return;
        }

        const { latitude, longitude } = coords;
        processedItems.add(item.id);
        processedCount++;

        // Log progress every 50 items
        if (processedCount % 50 === 0) {
          console.log(
            `[UnifiedMapData] createClusters: Processed ${processedCount}/${items.length} ${type}s`
          );
        }

        // Find existing cluster nearby - optimized search
        let nearbyCluster = null;
        for (let i = 0; i < clusters.length; i++) {
          const cluster = clusters[i];
          const distance = Math.sqrt(
            Math.pow(cluster.coordinate[0] - longitude, 2) +
              Math.pow(cluster.coordinate[1] - latitude, 2)
          );
          if (distance < CLUSTER_RADIUS) {
            nearbyCluster = cluster;
            break;
          }
        }

        if (nearbyCluster) {
          // Add to existing cluster
          if (type === "event") {
            if (!nearbyCluster.events) nearbyCluster.events = [];
            nearbyCluster.events.push(item as MapEvent);
            nearbyCluster.count = nearbyCluster.events.length;
          } else {
            if (!nearbyCluster.locations) nearbyCluster.locations = [];
            nearbyCluster.locations.push(item as MapLocation);
            nearbyCluster.count = nearbyCluster.locations.length;
          }

          // Update coordinate to be average - optimized calculation
          const validItems =
            type === "event"
              ? (nearbyCluster.events || []).filter(
                  (e) => getCoordinates(e.location) !== null
                )
              : (nearbyCluster.locations || []).filter(
                  (l) => getCoordinates(l.location) !== null
                );

          if (validItems.length > 0) {
            const coordsList = validItems
              .map((item) =>
                type === "event"
                  ? getCoordinates((item as MapEvent).location)
                  : getCoordinates((item as MapLocation).location)
              )
              .filter(Boolean) as { latitude: number; longitude: number }[];

            const avgLat =
              coordsList.reduce((sum, coord) => sum + coord.latitude, 0) /
              coordsList.length;
            const avgLng =
              coordsList.reduce((sum, coord) => sum + coord.longitude, 0) /
              coordsList.length;
            nearbyCluster.coordinate = [avgLng, avgLat]; // [longitude, latitude] for Mapbox
          }
        } else {
          // Create new cluster
          clusters.push({
            coordinate: [longitude, latitude], // [longitude, latitude] for Mapbox
            count: 1,
            type,
            ...(type === "event"
              ? { events: [item as MapEvent], mainEvent: item as MapEvent }
              : {
                  locations: [item as MapLocation],
                  mainEvent: item as MapLocation,
                }),
          });
        }
      });

      console.log(
        `[UnifiedMapData] ✅ Created ${clusters.length} clusters from ${items.length} ${type}s at zoom ${zoomLevel} (radius: ${CLUSTER_RADIUS})`
      );
      console.log(
        `[UnifiedMapData] createClusters: Final processed count: ${processedCount}/${items.length}`
      );
      return clusters;
    },
    []
  );

  // ============================================================================
  // MAIN FETCH FUNCTION
  // ============================================================================

  const fetchUnifiedData = useCallback(
    async (centerCoords: number[]) => {
      // Validation
      if (
        !centerCoords ||
        !Array.isArray(centerCoords) ||
        centerCoords.length < 2 ||
        !Number.isFinite(centerCoords[0]) ||
        !Number.isFinite(centerCoords[1]) ||
        (centerCoords[0] === 0 && centerCoords[1] === 0)
      ) {
        return;
      }

      if (!isMountedRef.current || isLoadingRef.current) return;

      // CRITICAL FIX: DISABLE CACHING TO PREVENT API DELAYS
      // Always fetch fresh data immediately

      // Start loading
      console.log("[UnifiedMapData] Fetching fresh data from API");
      lastCenterRef.current = [centerCoords[0], centerCoords[1]];
      isLoadingRef.current = true;
      setIsLoading(true);

      try {
        // Get user data
        let user = null;
        let userLocation = null;

        if (session?.access_token) {
          try {
            const [userResult, locationResult] = await Promise.all([
              supabase
                .from("users")
                .select("*")
                .eq("id", session.user.id)
                .single(),
              supabase
                .from("user_locations")
                .select("*")
                .eq("user_id", session.user.id)
                .order("last_updated", { ascending: false })
                .limit(1),
            ]);

            user = userResult.data;
            userLocation = locationResult.data?.[0] ?? null;
          } catch (error) {
            console.log("[UnifiedMapData] Could not get user data:", error);
          }
        }

        // Prepare request data
        const requestData = {
          latitude:
            user?.event_location_preference == 1 &&
            userLocation?.latitude != null
              ? parseFloat(String(userLocation.latitude))
              : centerCoords[1], // Latitude is the second element
          longitude:
            user?.event_location_preference == 1 &&
            userLocation?.longitude != null
              ? parseFloat(String(userLocation.longitude))
              : centerCoords[0], // Longitude is the first element
        };

        // Fetch map data
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);

        try {
          const apiUrl = `${process.env.BACKEND_MAP_URL}/api/events/user-location`;
          const response = await fetch(apiUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(session?.access_token && {
                Authorization: `Bearer ${session.access_token}`,
              }),
            },
            body: JSON.stringify(requestData),
            signal: controller.signal,
          });

          clearTimeout(timeoutId);

          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`API Error ${response.status}: ${errorText}`);
          }

          const data = await response.json();

          console.log(
            `[UnifiedMapData] API Response: ${
              data.events?.length || 0
            } events, ${data.locations?.length || 0} locations`
          );

          // Debug: Log first few items to see structure
          if (data.events && data.events.length > 0) {
            console.log("[UnifiedMapData] First event structure:", {
              id: data.events[0].id,
              name: data.events[0].name,
              location: data.events[0].location,
            });
          }
          if (data.locations && data.locations.length > 0) {
            console.log("[UnifiedMapData] First location structure:", {
              id: data.locations[0].id,
              name: data.locations[0].name,
              location: data.locations[0].location,
            });
          }

          // Validate data with error handling - PROCESS ALL DATA
          let validEvents: MapEvent[] = [];
          let validLocations: MapLocation[] = [];

          try {
            // PROCESS ALL DATA: Validate all events and locations
            validEvents = validateData(
              data.events || [],
              "event"
            ) as MapEvent[];
            validLocations = validateData(
              data.locations || [],
              "location"
            ) as MapLocation[];

            console.log(
              `[UnifiedMapData] ⚡ Processed all data: ${validEvents.length} events, ${validLocations.length} locations`
            );
            console.log(
              `[UnifiedMapData] 🔍 About to create clusters with zoom level: ${
                zoomLevel || "UNDEFINED"
              }`
            );

            // CRITICAL: Check if we have valid data before proceeding
            if (!validEvents || validEvents.length === 0) {
              console.error("[UnifiedMapData] ❌ No valid events to cluster!");
              return;
            }
            if (!validLocations || validLocations.length === 0) {
              console.error(
                "[UnifiedMapData] ❌ No valid locations to cluster!"
              );
              return;
            }
          } catch (error) {
            console.error("[UnifiedMapData] Error validating data:", error);
            validEvents = [];
            validLocations = [];
          }

          if (!isMountedRef.current) return;

          console.log(
            `[UnifiedMapData] 🔍 Data validation complete, updating cache and state...`
          );

          // Update cache and state
          cachedEventsRef.current = validEvents || [];
          cachedLocationsRef.current = validLocations || [];
          lastFetchTimeRef.current = Date.now();

          setEvents(validEvents || []);
          setLocations(validLocations || []);

          // Filter events by time with safety checks
          const nowEvents = filterEventsByTime(validEvents || [], "today");
          const todayEvents = filterEventsByTime(validEvents || [], "today");
          const tomorrowEvents = filterEventsByTime(
            validEvents || [],
            "weekend"
          );

          setEventsNow(nowEvents);
          setEventsToday(todayEvents);
          setEventsTomorrow(tomorrowEvents);

          console.log(
            `[UnifiedMapData] 🔍 About to start clustering process...`
          );

          // REMOVED: Old clustering - now using progressive loading

          // SIMPLE CLUSTERING - BASED ON WORKING OLD CODE
          console.log(
            `[UnifiedMapData] 🚀 Creating clusters with zoom level: ${zoomLevel}`
          );

          // Create clusters using the simple clustering logic with timeout protection
          console.log(
            `[UnifiedMapData] 🚀 Creating event clusters for ${
              validEvents?.length || 0
            } events`
          );

          // Add timeout protection to clustering
          const createClustersWithTimeout = async (
            items: any[],
            type: string,
            zoom: number
          ) => {
            return new Promise<UnifiedCluster[]>((resolve, reject) => {
              const timeout = setTimeout(() => {
                console.log(
                  `[UnifiedMapData] ⏰ Clustering timeout for ${type}s, using simple fallback`
                );
                // Fallback: create individual clusters (no clustering)
                const fallbackClusters = items
                  .map((item) => {
                    const coords = getCoordinates(item.location);
                    if (!coords) return null;
                    return {
                      coordinate: [coords.longitude, coords.latitude],
                      count: 1,
                      type: type as "event" | "location",
                      events: type === "event" ? [item] : undefined,
                      locations: type === "location" ? [item] : undefined,
                      mainEvent: item,
                    };
                  })
                  .filter(Boolean) as UnifiedCluster[];
                resolve(fallbackClusters);
              }, 5000); // 5 second timeout

              try {
                const clusters = createClusters(
                  items,
                  type as "event" | "location",
                  zoom
                );
                clearTimeout(timeout);
                resolve(clusters);
              } catch (error) {
                clearTimeout(timeout);
                console.error(
                  `[UnifiedMapData] ❌ Clustering error for ${type}s:`,
                  error
                );
                // Fallback: create individual clusters
                const fallbackClusters = items
                  .map((item) => {
                    const coords = getCoordinates(item.location);
                    if (!coords) return null;
                    return {
                      coordinate: [coords.longitude, coords.latitude],
                      count: 1,
                      type: type as "event" | "location",
                      events: type === "event" ? [item] : undefined,
                      locations: type === "location" ? [item] : undefined,
                      mainEvent: item,
                    };
                  })
                  .filter(Boolean) as UnifiedCluster[];
                resolve(fallbackClusters);
              }
            });
          };

          const eventClusters = await createClustersWithTimeout(
            validEvents || [],
            "event",
            zoomLevel || 10
          );
          console.log(
            `[UnifiedMapData] ✅ Created ${eventClusters.length} event clusters`
          );

          console.log(
            `[UnifiedMapData] 🚀 Creating location clusters for ${
              validLocations?.length || 0
            } locations`
          );
          const locationClusters = await createClustersWithTimeout(
            validLocations || [],
            "location",
            zoomLevel || 10
          );
          console.log(
            `[UnifiedMapData] ✅ Created ${locationClusters.length} location clusters`
          );

          // Set clusters for different time frames with timeout protection
          const nowEventClusters = await createClustersWithTimeout(
            nowEvents,
            "event",
            zoomLevel
          );
          const todayEventClusters = await createClustersWithTimeout(
            todayEvents,
            "event",
            zoomLevel
          );
          const tomorrowEventClusters = await createClustersWithTimeout(
            tomorrowEvents,
            "event",
            zoomLevel
          );

          // Update all cluster states
          setClusters(eventClusters);
          setClustersLocations(locationClusters);
          setClustersNow(nowEventClusters);
          setClustersToday(todayEventClusters);
          setClustersTomorrow(tomorrowEventClusters);

          console.log(
            `[UnifiedMapData] ⚡ Created ${eventClusters.length} event clusters and ${locationClusters.length} location clusters`
          );
          console.log(
            `[UnifiedMapData] 📊 Time-based clusters: ${nowEventClusters.length} now, ${todayEventClusters.length} today, ${tomorrowEventClusters.length} tomorrow`
          );

          setError(null);
        } finally {
          clearTimeout(timeoutId);
        }
      } catch (err) {
        if (!isMountedRef.current) return;

        if (err instanceof Error && err.name === "AbortError") {
          console.log("[UnifiedMapData] Request timeout");
          setError(
            "Backend is currently slow. Please try again in a few moments."
          );
        } else {
          console.error("[UnifiedMapData] Error:", err);
          setError(err instanceof Error ? err.message : "An error occurred");
        }

        // Don't clear cache on timeout errors
        if (!(err instanceof Error && err.name === "AbortError")) {
          cachedEventsRef.current = [];
          cachedLocationsRef.current = [];
        }
      } finally {
        if (!isMountedRef.current) return;
        // REMOVED: Excessive timing logs
        isLoadingRef.current = false;
        setIsLoading(false);
      }
    },
    [session, radius, validateData, filterEventsByTime, createClusters]
  );

  // ============================================================================
  // EFFECTS
  // ============================================================================

  // CRITICAL FIX: SINGLE API CALL ON MOUNT - PREVENT MULTIPLE CALLS
  const hasInitializedRef = useRef(false);

  useEffect(() => {
    if (
      session &&
      center[0] !== 0 &&
      center[1] !== 0 &&
      !hasInitializedRef.current
    ) {
      console.log("[UnifiedMapData] 🚀 SINGLE API CALL (ONCE ONLY)");
      hasInitializedRef.current = true;
      fetchUnifiedData(center);
    }
  }, [session, center, fetchUnifiedData]);

  useEffect(() => {
    if (center && center[0] !== 0 && center[1] !== 0) {
      const timeoutId = setTimeout(() => {
        fetchUnifiedData(center);
      }, 2000); // 2 second debounce to reduce API calls

      return () => clearTimeout(timeoutId);
    }
  }, [center, fetchUnifiedData]);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // ============================================================================
  // UTILITY FUNCTIONS
  // ============================================================================

  const forceRefresh = useCallback(() => {
    lastFetchTimeRef.current = 0;
    cachedEventsRef.current = [];
    cachedLocationsRef.current = [];

    if (center && center[0] !== 0 && center[1] !== 0) {
      fetchUnifiedData(center);
    }
  }, [center, fetchUnifiedData]);

  const debugBackendPerformance = useCallback(async () => {
    if (!center || center[0] === 0 || center[1] === 0) {
      console.log("[Debug] No valid center coordinates available");
      return;
    }

    try {
      console.log("[Debug] Testing backend performance with debug endpoint...");
      const debugUrl = `${process.env.BACKEND_MAP_URL}/api/events/user-location?latitude=${center[0]}&longitude=${center[1]}&radius=100`;

      const response = await fetch(debugUrl, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          ...(session?.access_token && {
            Authorization: `Bearer ${session.access_token}`,
          }),
        },
      });

      if (response.ok) {
        const debugData = await response.json();
        console.log("[Debug] Backend debug response:", debugData);
      } else {
        console.log("[Debug] Debug endpoint failed:", response.status);
      }
    } catch (error) {
      console.log("[Debug] Debug endpoint error:", error);
    }
  }, [center, session?.access_token]);

  // ============================================================================
  // RETURN
  // ============================================================================

  return {
    // Data
    events,
    locations,
    eventsNow,
    eventsToday,
    eventsTomorrow,

    // Clusters
    clusters,
    clustersLocations,
    clustersNow,
    clustersToday,
    clustersTomorrow,

    // State
    isLoading,
    error,
    zoomLevel,

    // Actions
    forceRefresh,
    fetchUnifiedData,
    debugBackendPerformance,
  };
}
