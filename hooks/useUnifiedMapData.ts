import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "~/src/lib/supabase";
import { useAuth } from "~/src/lib/auth";
import { mapDataService } from "~/src/services/mapDataService";

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

      console.log(
        `[UnifiedMapData] ✅ Created ${clusters.length} clusters from ${items.length} ${type}s at zoom ${zoomLevel} (radius: ${CLUSTER_RADIUS})`
      );
      console.log(
        `[UnifiedMapData] createClusters: Final processed count: ${processedItems.size}/${items.length}`
      );
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

        console.log(
          `[UnifiedMapData] ✅ Created ${eventClusters.length} event clusters and ${locationClusters.length} location clusters in parallel`
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

        console.log(
          `✅ NEARBY API: Received ${nearbyData.events?.length || 0} events, ${
            nearbyData.locations?.length || 0
          } locations`
        );
        console.log(
          `🔍 NEARBY API: First few events:`,
          nearbyData.events?.slice(0, 3).map((e) => ({
            id: e.id,
            name: e.name,
            start_datetime: e.start_datetime,
          }))
        );

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

        // Update state with nearby data
        cachedEventsRef.current = validEvents || [];
        cachedLocationsRef.current = validLocations || [];
        lastFetchTimeRef.current = Date.now();

        // Simple limit like web app: 500 total markers
        const MAX_MARKERS = 500;
        const limitedEvents = (validEvents || []).slice(0, Math.min(validEvents.length, MAX_MARKERS));
        const limitedLocations = (validLocations || []).slice(0, Math.min(validLocations.length, MAX_MARKERS - limitedEvents.length));

        setEvents(limitedEvents);
        setLocations(limitedLocations);

        console.log(
          `🔍 NEARBY API: After validation - ${validEvents.length} events, ${validLocations.length} locations`
        );
        console.log(
          `📊 TOTAL VISIBLE MARKERS: ${limitedEvents.length + limitedLocations.length} (${limitedEvents.length} events + ${limitedLocations.length} locations) - LIMITED to 500 like web app`
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
        console.log("🚫 USER-LOCATIONS API: DISABLED for performance (like web app)");
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
        setIsLoading(false);
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
        `🔄 USER-LOCATIONS API: Fetching ${timeframe} data on tab click`
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

        // Prepare request data
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
          radius: radius || 500000,
          timeRange: timeframe,
          includeTicketmaster: true,
        };

        const timeframeData = await mapDataService.getMapData(requestData);

        console.log(
          `✅ USER-LOCATIONS API: Received ${
            timeframeData.events?.length || 0
          } events, ${
            timeframeData.locations?.length || 0
          } locations for ${timeframe}`
        );

        if (!isMountedRef.current) return;

        // Process timeframe data
        let timeframeValidEvents: MapEvent[] = [];
        let timeframeValidLocations: MapLocation[] = [];

        try {
          timeframeValidEvents = validateData(
            timeframeData.events || [],
            "event"
          ) as MapEvent[];
          timeframeValidLocations = validateData(
            timeframeData.locations || [],
            "location"
          ) as MapLocation[];
        } catch (error) {
          console.error(
            `[UnifiedMapData] Error validating ${timeframe} data:`,
            error
          );
          timeframeValidEvents = [];
          timeframeValidLocations = [];
        }

        // Merge with existing data
        const mergedEvents = [
          ...events,
          ...timeframeValidEvents.filter(
            (event) => !events.some((existing) => existing.id === event.id)
          ),
        ];
        const mergedLocations = [
          ...locations,
          ...timeframeValidLocations.filter(
            (location) =>
              !locations.some((existing) => existing.id === location.id)
          ),
        ];

        // Update state with merged data
        cachedEventsRef.current = mergedEvents;
        cachedLocationsRef.current = mergedLocations;

        setEvents(mergedEvents);
        setLocations(mergedLocations);

        // Filter events by time
        const mergedNowEvents = filterEventsByTime(mergedEvents || [], "today");
        const mergedTodayEvents = filterEventsByTime(
          mergedEvents || [],
          "today"
        );
        const mergedTomorrowEvents = filterEventsByTime(
          mergedEvents || [],
          "weekend"
        );

        setEventsNow(mergedNowEvents);
        setEventsToday(mergedTodayEvents);
        setEventsTomorrow(mergedTomorrowEvents);

        // Create clusters for merged data - use all events for initial display
        await processClusters(
          mergedEvents,
          mergedLocations,
          mergedEvents,
          mergedEvents,
          mergedEvents
        );

        console.log(
          `✅ USER-LOCATIONS API: ${timeframe} data loaded and merged on tab click`
        );
      } catch (error) {
        console.error(
          `[UnifiedMapData] Error loading ${timeframe} data:`,
          error
        );
        setError(error instanceof Error ? error.message : "An error occurred");
      }
    },
    [
      center,
      radius,
      session,
      events,
      locations,
      validateData,
      filterEventsByTime,
    ]
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
    fetchTimeframeData,
    debugBackendPerformance,
  };
}
