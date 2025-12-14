import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "~/src/lib/supabase";
import { useAuth } from "~/src/lib/auth";
import { mapDataService } from "~/src/services/mapDataService";
import { MapCacheService } from "~/src/services/mapCacheService";

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
  timeRange = "today", // Always default to 'today' - tab clicks use fetchTimeframeData
  zoomLevel = 10,
}: UseUnifiedMapDataProps) {
  const { session } = useAuth();

  // ============================================================================
  // STATE
  // ============================================================================

  // Simple data states - only nearby data
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
  const [isLoadingComplete, setIsLoadingComplete] = useState(false);
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
  const cacheLoadTimeRef = useRef<number | null>(null); // Track when cache was loaded

  // ============================================================================
  // HELPER FUNCTIONS
  // ============================================================================

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
        // console.log(
        //   `[UnifiedMapData] createClusters: No items to cluster for ${type}`
        // );
        return [];
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

      // Optimized clustering with spatial indexing
      const processedItems = new Set();
      const spatialGrid = new Map<string, UnifiedCluster[]>();
      const GRID_SIZE = 0.001; // Grid cell size for spatial indexing

      // Pre-filter valid items to avoid repeated coordinate lookups
      const validItems = items
        .map((item) => {
          const coords = getCoordinates(item.location);
          return coords ? { item, coords } : null;
        })
        .filter(Boolean) as Array<{
        item: any;
        coords: { latitude: number; longitude: number };
      }>;

      // Performance optimization: Limit clustering for very large datasets
      const MAX_ITEMS_TO_CLUSTER = 2000;
      const itemsToProcess =
        validItems.length > MAX_ITEMS_TO_CLUSTER
          ? validItems.slice(0, MAX_ITEMS_TO_CLUSTER)
          : validItems;

      itemsToProcess.forEach(({ item, coords }) => {
        if (processedItems.has(item.id)) return;

        const { latitude, longitude } = coords;
        processedItems.add(item.id);

        // Use spatial grid for faster nearby cluster search
        const gridKey = `${Math.floor(latitude / GRID_SIZE)},${Math.floor(
          longitude / GRID_SIZE
        )}`;
        const nearbyGridKeys = [
          gridKey,
          `${Math.floor(latitude / GRID_SIZE) - 1},${Math.floor(
            longitude / GRID_SIZE
          )}`,
          `${Math.floor(latitude / GRID_SIZE) + 1},${Math.floor(
            longitude / GRID_SIZE
          )}`,
          `${Math.floor(latitude / GRID_SIZE)},${
            Math.floor(longitude / GRID_SIZE) - 1
          }`,
          `${Math.floor(latitude / GRID_SIZE)},${
            Math.floor(longitude / GRID_SIZE) + 1
          }`,
        ];

        // Find existing cluster nearby using spatial grid
        let nearbyCluster = null;
        for (const key of nearbyGridKeys) {
          const gridClusters = spatialGrid.get(key) || [];
          for (const cluster of gridClusters) {
            const distance = Math.sqrt(
              Math.pow(cluster.coordinate[0] - longitude, 2) +
                Math.pow(cluster.coordinate[1] - latitude, 2)
            );
            if (distance < CLUSTER_RADIUS) {
              nearbyCluster = cluster;
              break;
            }
          }
          if (nearbyCluster) break;
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
          const newCluster = {
            coordinate: [longitude, latitude], // [longitude, latitude] for Mapbox
            count: 1,
            type,
            ...(type === "event"
              ? { events: [item as MapEvent], mainEvent: item as MapEvent }
              : {
                  locations: [item as MapLocation],
                  mainEvent: item as MapLocation,
                }),
          };
          clusters.push(newCluster);

          // Add to spatial grid for faster future lookups
          const gridKey = `${Math.floor(latitude / GRID_SIZE)},${Math.floor(
            longitude / GRID_SIZE
          )}`;
          if (!spatialGrid.has(gridKey)) {
            spatialGrid.set(gridKey, []);
          }
          spatialGrid.get(gridKey)!.push(newCluster);
        }
      });

      // console.log(
      //   `[UnifiedMapData] ✅ Created ${clusters.length} clusters from ${items.length} ${type}s at zoom ${zoomLevel} (radius: ${CLUSTER_RADIUS})`
      // );
      // console.log(
      //   `[UnifiedMapData] createClusters: Final processed count: ${processedItems.size}/${items.length}`
      // );
      return clusters;
    },
    []
  );

  // ============================================================================
  // CLUSTER PROCESSING FUNCTION
  // ============================================================================

  const processClusters = useCallback(
    async (
      validEvents: MapEvent[],
      validLocations: MapLocation[],
      nowEvents: MapEvent[],
      todayEvents: MapEvent[],
      tomorrowEvents: MapEvent[]
    ) => {
      try {
        // OPTIMIZATION: Use requestIdleCallback for non-blocking clustering
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
            }, 2000); // 2 second timeout - faster fallback

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

        // Create clusters in parallel for better performance
        console.log(
          `[UnifiedMapData] 🚀 Creating clusters in parallel for ${
            validEvents?.length || 0
          } events and ${validLocations?.length || 0} locations`
        );

        // Run all clustering operations in parallel
        const [
          eventClusters,
          locationClusters,
          nowEventClusters,
          todayEventClusters,
          tomorrowEventClusters,
        ] = await Promise.all([
          createClustersWithTimeout(
            validEvents || [],
            "event",
            zoomLevel || 10
          ),
          createClustersWithTimeout(
            validLocations || [],
            "location",
            zoomLevel || 10
          ),
          createClustersWithTimeout(nowEvents, "event", zoomLevel),
          createClustersWithTimeout(todayEvents, "event", zoomLevel),
          createClustersWithTimeout(tomorrowEvents, "event", zoomLevel),
        ]);

        // console.log(
        //   `[UnifiedMapData] ✅ Created ${eventClusters.length} event clusters and ${locationClusters.length} location clusters in parallel`
        // );

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
          // `[UnifiedMapData] 📊 Time-based clusters: ${nowEventClusters.length} now, ${todayEventClusters.length} today, ${tomorrowEventClusters.length} tomorrow`
        );
      } catch (error) {
        console.error("[UnifiedMapData] Error processing clusters:", error);
      }
    },
    [createClusters, getCoordinates, zoomLevel]
  );

  // ============================================================================
  // MAIN FETCH FUNCTION
  // ============================================================================

  const fetchUnifiedData = useCallback(
    async (centerCoords: number[], isBackgroundRefetch: boolean = false) => {
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

      // Check if cache expired - allow refetch even if data exists
      const cacheExpired = cacheLoadTimeRef.current 
        ? Date.now() - cacheLoadTimeRef.current >= 10 * 60 * 1000 
        : false;

      // Skip if we already have data (from immediate cache load) - unless cache expired
      if ((events.length > 0 || locations.length > 0) && !cacheExpired) {
        console.log("[UnifiedMapData] ⚠️ Data already exists, skipping fetch (likely from cache)");
        return;
      }
      
      if (cacheExpired || isBackgroundRefetch) {
        console.log("[UnifiedMapData] 🔄 Cache expired, refetching data in background (no loader)");
      }

      // Start loading - but skip loader for background refetches
      console.log("[UnifiedMapData] Fetching fresh data from API");
      lastCenterRef.current = [centerCoords[0], centerCoords[1]];
      isLoadingRef.current = true;
      if (!isBackgroundRefetch) {
        setIsLoading(true);
      }

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

        // STAGE 1: Fetch nearby data first (with loader)
        console.log("🔄 NEARBY API: Starting fetch");

        const nearbyRequestData = {
          latitude: requestData.latitude,
          longitude: requestData.longitude,
          timeRange: timeRange || "today",
          includeTicketmaster: true,
        };

        const nearbyData = await mapDataService.getNearbyData(
          nearbyRequestData
        );

        // Detailed breakdown of initial data
        const initialEvents = nearbyData.events || [];
        const initialLocations = nearbyData.locations || [];
        const initialTicketmasterEvents = initialEvents.filter(
          (e) => e.is_ticketmaster === true
        );
        const initialRegularEvents = initialEvents.filter(
          (e) => e.is_ticketmaster !== true
        );

        console.log(
          `✅ NEARBY API: Received ${initialEvents.length} events, ${initialLocations.length} locations`
        );
        console.log(`📊 INITIAL Event Breakdown:`);
        console.log(
          `   • Ticketmaster Events: ${initialTicketmasterEvents.length}`
        );
        console.log(`   • Regular Events: ${initialRegularEvents.length}`);
        console.log(`   • Total Events: ${initialEvents.length}`);
        console.log(`   • Total Locations: ${initialLocations.length}`);

        // Log sample events
        if (initialEvents.length > 0) {
          console.log(`🔍 Sample Initial Events:`);
          initialEvents.slice(0, 3).forEach((event, index) => {
            console.log(
              `   ${index + 1}. ${event.name} (${
                event.is_ticketmaster ? "Ticketmaster" : "Regular"
              })`
            );
          });
        }

        // Process nearby data immediately
        let validEvents: MapEvent[] = [];
        let validLocations: MapLocation[] = [];

        try {
          validEvents = validateData(
            nearbyData.events || [],
            "event"
          ) as MapEvent[];
          validLocations = validateData(
            nearbyData.locations || [],
            "location"
          ) as MapLocation[];
        } catch (error) {
          console.error(
            "[UnifiedMapData] Error validating nearby data:",
            error
          );
          validEvents = [];
          validLocations = [];
        }

        if (!isMountedRef.current) return;

        // Update cache refs
        cachedEventsRef.current = validEvents || [];
        cachedLocationsRef.current = validLocations || [];
        lastFetchTimeRef.current = Date.now();
        cacheLoadTimeRef.current = Date.now(); // Track when data was fetched from API

        // Simple limit like web app: 500 total markers
        const MAX_MARKERS = 500;
        const limitedEvents = (validEvents || []).slice(
          0,
          Math.min(validEvents.length, MAX_MARKERS)
        );
        const limitedLocations = (validLocations || []).slice(
          0,
          Math.min(validLocations.length, MAX_MARKERS - limitedEvents.length)
        );
        
        // Save to persistent cache (after limiting) - only if session exists
        if (session) {
          await MapCacheService.saveCachedData(
            limitedEvents,
            limitedLocations,
            [centerCoords[0], centerCoords[1]] as [number, number]
          );
        } else {
          console.log("[UnifiedMapData] ⚠️ Skipping cache save - no session");
        }

        // Show data immediately
        setEvents(limitedEvents);
        setLocations(limitedLocations);

        console.log(
          `🔍 NEARBY API: After validation - ${validEvents.length} events, ${validLocations.length} locations`
        );
        console.log(
          `📊 TOTAL VISIBLE MARKERS: ${
            limitedEvents.length + limitedLocations.length
          } (${limitedEvents.length} events + ${
            limitedLocations.length
          } locations) - LIMITED to 500 like web app`
        );

        // Filter events by time using limited data
        const nowEvents = filterEventsByTime(limitedEvents, "today");
        const todayEvents = filterEventsByTime(limitedEvents, "today");
        const tomorrowEvents = filterEventsByTime(limitedEvents, "weekend");

        console.log(
          `🔍 NEARBY API: After time filtering - now: ${nowEvents.length}, today: ${todayEvents.length}, tomorrow: ${tomorrowEvents.length}`
        );

        setEventsNow(nowEvents);
        setEventsToday(todayEvents);
        setEventsTomorrow(tomorrowEvents);

        // Create clusters for nearby data - use limited data like web app
        await processClusters(
          limitedEvents,
          limitedLocations,
          limitedEvents,
          limitedEvents,
          limitedEvents
        );

        // STAGE 2: DISABLED FOR PERFORMANCE (like web app)
        // The web app disabled the second API call for performance reasons
        // We're doing the same here to prevent app hanging
        console.log(
          "🚫 USER-LOCATIONS API: DISABLED for performance (like web app)"
        );
        setIsLoadingComplete(true);

        // DISABLED: Second API call removed for performance
        /*
        setTimeout(async () => {
          try {
            console.log(
              "🔄 USER-LOCATIONS API: Starting background fetch for 'today'"
            );
            // ... (rest of the original setTimeout block)
          } finally {
            setIsLoadingComplete(false);
          }
        }, 2000); // 500ms delay
        */

        setError(null);
      } catch (err) {
        if (!isMountedRef.current) return;
        console.error("[UnifiedMapData] Error:", err);
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        if (!isMountedRef.current) return;
        isLoadingRef.current = false;
        if (!isBackgroundRefetch) {
          setIsLoading(false);
        }
      }
    },
    [session, radius, validateData, filterEventsByTime, createClusters]
  );

  // ============================================================================
  // TAB CLICK HANDLER (for week/weekend)
  // ============================================================================

  const fetchTimeframeData = useCallback(
    async (timeframe: "week" | "weekend") => {
      if (!center || center[0] === 0 || center[1] === 0) return;

      console.log(
        `🔄 NEARBY API: Fetching ${timeframe} data on tab click (nearby only)`
      );

      try {
        // Get user data for location preferences
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

        // Prepare request data for nearby API only
        const requestData = {
          latitude:
            user?.event_location_preference == 1 &&
            userLocation?.latitude != null
              ? parseFloat(String(userLocation.latitude))
              : center[1],
          longitude:
            user?.event_location_preference == 1 &&
            userLocation?.longitude != null
              ? parseFloat(String(userLocation.longitude))
              : center[0],
          timeRange: timeframe,
          includeTicketmaster: true,
        };

        // Use nearby API only (no nationwide)
        const timeframeData = await mapDataService.getNearbyData(requestData);

        // Detailed breakdown for timeframe data
        const events = timeframeData.events || [];
        const locations = timeframeData.locations || [];
        const ticketmasterEvents = events.filter(
          (e) => e.is_ticketmaster === true
        );
        const regularEvents = events.filter((e) => e.is_ticketmaster !== true);

        console.log(
          `✅ NEARBY API: Received ${events.length} events, ${locations.length} locations for ${timeframe}`
        );
        console.log(`📊 ${timeframe.toUpperCase()} Event Breakdown:`);
        console.log(`   • Ticketmaster Events: ${ticketmasterEvents.length}`);
        console.log(`   • Regular Events: ${regularEvents.length}`);
        console.log(`   • Total Events: ${events.length}`);
        console.log(`   • Total Locations: ${locations.length}`);

        // Log sample events for this timeframe
        if (events.length > 0) {
          console.log(`🔍 Sample ${timeframe} Events:`);
          events.slice(0, 3).forEach((event, index) => {
            console.log(
              `   ${index + 1}. ${event.name} (${
                event.is_ticketmaster ? "Ticketmaster" : "Regular"
              })`
            );
          });
        }

        if (!isMountedRef.current) return;

        // Process timeframe data
        let validEvents: MapEvent[] = [];
        let validLocations: MapLocation[] = [];

        try {
          validEvents = validateData(
            timeframeData.events || [],
            "event"
          ) as MapEvent[];
          validLocations = validateData(
            timeframeData.locations || [],
            "location"
          ) as MapLocation[];
        } catch (error) {
          console.error(
            `[UnifiedMapData] Error validating ${timeframe} data:`,
            error
          );
          validEvents = [];
          validLocations = [];
        }

        // Update cache and state
        cachedEventsRef.current = validEvents;
        cachedLocationsRef.current = validLocations;

        setEvents(validEvents);
        setLocations(validLocations);

        // Filter events by time
        const nowEvents = filterEventsByTime(validEvents, "today");
        const todayEvents = filterEventsByTime(validEvents, "today");
        const tomorrowEvents = filterEventsByTime(validEvents, "weekend");

        setEventsNow(nowEvents);
        setEventsToday(todayEvents);
        setEventsTomorrow(tomorrowEvents);

        // Create clusters
        await processClusters(
          validEvents,
          validLocations,
          validEvents,
          validEvents,
          validEvents
        );

        console.log(`✅ NEARBY API: ${timeframe} data loaded successfully`);
      } catch (error) {
        console.error(
          `[UnifiedMapData] Error loading ${timeframe} data:`,
          error
        );
        setError(error instanceof Error ? error.message : "An error occurred");
      }
    },
    [center, session, validateData, filterEventsByTime]
  );

  // ============================================================================
  // EFFECTS
  // ============================================================================

    // IMMEDIATE: Load cache synchronously on mount for instant pins (only if session exists)
    useEffect(() => {
      // Don't load cache if no session (user logged out)
      if (!session) {
        return;
      }
      
      const loadCacheImmediately = async () => {
        const cachedData = await MapCacheService.getCachedData();
        if (cachedData) {
          const cacheAge = Date.now() - cachedData.timestamp;
          const isCacheFresh = cacheAge < 10 * 60 * 1000; // 10 minutes
          
          if (isCacheFresh) {
            console.log("[UnifiedMapData] ⚡ IMMEDIATE: Loading cached data for instant pins");
            console.log(`[UnifiedMapData] Cache age: ${Math.round(cacheAge / 1000)}s`);
            
            // Update state with cached data IMMEDIATELY (synchronously)
            setEvents(cachedData.events);
            setLocations(cachedData.locations);
            
            // Process clusters from cached data
            const nowEvents = filterEventsByTime(cachedData.events, "today");
            const todayEvents = filterEventsByTime(cachedData.events, "today");
            const tomorrowEvents = filterEventsByTime(cachedData.events, "weekend");
            
            setEventsNow(nowEvents);
            setEventsToday(todayEvents);
            setEventsTomorrow(tomorrowEvents);
            
            // Process clusters
            await processClusters(
              cachedData.events,
              cachedData.locations,
              nowEvents,
              todayEvents,
              tomorrowEvents
            );
            
            setIsLoading(false);
            setIsLoadingComplete(true);
            
            // Track when cache was loaded for expiry checking
            cacheLoadTimeRef.current = cachedData.timestamp;
            
            console.log("[UnifiedMapData] ✅ IMMEDIATE: Cached data loaded, pins should appear instantly");
          }
        }
      };
      
      // Load cache immediately on mount
      loadCacheImmediately();
    }, [session]); // Re-run when session changes

  // CRITICAL FIX: SINGLE API CALL ON MOUNT - PREVENT MULTIPLE CALLS
  const hasInitializedRef = useRef(false);


  useEffect(() => {
    // Skip if no session
    if (!session) {
      return;
    }
    
    // Skip if we already have data (could be from cache or API)
    if (events.length > 0 || locations.length > 0) {
      // Only log if we haven't initialized yet (meaning data came from immediate cache load)
      if (!hasInitializedRef.current && session) {
        console.log("[UnifiedMapData] ✅ Data already loaded (from cache), skipping API call");
      }
      // If hasInitializedRef is true, data was just loaded from API, so don't log anything
      return;
    }
    
    // Allow API call even without session (for browsing), but only once
    if (
      center[0] !== 0 &&
      center[1] !== 0 &&
      !hasInitializedRef.current
    ) {
      if (session) {
        console.log("[UnifiedMapData] 🚀 SINGLE API CALL (ONCE ONLY) - Authenticated");
      } else {
        console.log("[UnifiedMapData] 🚀 SINGLE API CALL (ONCE ONLY) - Browsing (no session)");
      }
      hasInitializedRef.current = true;
      fetchUnifiedData(center);
    }
  }, [session, center, fetchUnifiedData, events.length, locations.length]);

  // REMOVED: Duplicate useEffect that was causing refetches

  // Auto-refetch when cache expires (10 minutes) - runs in background
  useEffect(() => {
    if (!session) {
      console.log("[UnifiedMapData] 🔍 Auto-refetch: No session, skipping");
      return;
    }

    const CACHE_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes
    const CHECK_INTERVAL = 10 * 1000; // Check every 10 seconds

    console.log("[UnifiedMapData] 🔍 Auto-refetch: Setting up expiry checker");

    const checkCacheExpiry = () => {
      if (!isMountedRef.current) {
        console.log("[UnifiedMapData] 🔍 Auto-refetch: Component unmounted");
        return;
      }
      
      if (isLoadingRef.current) {
        console.log("[UnifiedMapData] 🔍 Auto-refetch: Already loading, skipping");
        return;
      }
      
      if (!cacheLoadTimeRef.current) {
        console.log("[UnifiedMapData] 🔍 Auto-refetch: No cache timestamp set yet");
        return;
      }
      
      const cacheAge = Date.now() - cacheLoadTimeRef.current;
      const cacheExpired = cacheAge >= CACHE_EXPIRY_MS;
      
      console.log(`[UnifiedMapData] 🔍 Auto-refetch: Checking cache - age: ${Math.round(cacheAge / 1000)}s, expired: ${cacheExpired}`);
      
      if (cacheExpired) {
        // Cache expired, refetch data in background
        console.log("[UnifiedMapData] ⏰ Cache expired (age: " + Math.round(cacheAge / 1000) + "s), auto-refetching in background");
        cacheLoadTimeRef.current = null; // Clear cache timestamp
        hasInitializedRef.current = false; // Allow refetch
        
        if (center && center[0] !== 0 && center[1] !== 0) {
          // Refetch in background without blocking UI (no loader)
          console.log("[UnifiedMapData] 🚀 Triggering background refetch (no loader)...");
          fetchUnifiedData(center, true); // Pass true to indicate background refetch
        } else {
          console.log("[UnifiedMapData] ⚠️ Cannot refetch - invalid center coordinates");
        }
      }
    };

    // Check immediately first time
    const initialCheck = setTimeout(() => {
      console.log("[UnifiedMapData] 🔍 Auto-refetch: Initial check");
      checkCacheExpiry();
    }, 2000); // Wait 2 seconds for cache to be loaded

    // Then set up interval to check every 10 seconds
    const intervalId = setInterval(checkCacheExpiry, CHECK_INTERVAL);
    
    // Also set up a timeout for when cache should expire
    if (cacheLoadTimeRef.current) {
      const remainingCacheTime = CACHE_EXPIRY_MS - (Date.now() - cacheLoadTimeRef.current);
      if (remainingCacheTime > 0 && remainingCacheTime < CACHE_EXPIRY_MS) {
        console.log(`[UnifiedMapData] 🔍 Auto-refetch: Will check expiry in ${Math.round(remainingCacheTime / 1000)}s`);
        const timeoutId = setTimeout(() => {
          checkCacheExpiry();
        }, remainingCacheTime);
        
        return () => {
          clearInterval(intervalId);
          clearTimeout(initialCheck);
          clearTimeout(timeoutId);
        };
      }
    }

    return () => {
      clearInterval(intervalId);
      clearTimeout(initialCheck);
    };
  }, [session, center, fetchUnifiedData, events.length]); // Added events.length to re-run when data changes

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
    fetchTimeframeData,
    debugBackendPerformance,
  };
}
