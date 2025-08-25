import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "~/src/lib/supabase";
import { format } from "date-fns";
import * as Location from "expo-location";
import { useAuth } from "~/src/lib/auth";

// Types from existing useMapEvents hook
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

// Unified cluster type that can handle both events and locations
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
  progressiveLoading?: boolean;
}

export function useUnifiedMapData({
  center,
  radius = 500000,
  timeRange = "today",
  zoomLevel = 13,
  progressiveLoading = true,
}: UseUnifiedMapDataProps) {
  const { session } = useAuth();

  // State
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

  // Progressive loading state
  const [isLoadingProgressively, setIsLoadingProgressively] = useState(false);
  const [loadedClusterCount, setLoadedClusterCount] = useState(0);
  const [totalClusterCount, setTotalClusterCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Refs for caching and preventing multiple calls
  const isMountedRef = useRef(true);
  const isLoadingRef = useRef(false);
  const lastCenterRef = useRef<number[] | null>(null);
  const lastFetchTimeRef = useRef(0);
  const cachedEventsRef = useRef<MapEvent[]>([]);
  const cachedLocationsRef = useRef<MapLocation[]>([]);
  const progressiveLoadingRef = useRef(false);

  // Calculate cluster radius - CONSERVATIVE CLUSTERING for accuracy
  const getClusterRadius = useCallback((zoom: number): number => {
    // Very conservative clustering - only cluster items that are actually close together
    // This prevents distant events from being grouped together
    if (zoom <= 10) return 0.002; // ~200m radius for very far zoom
    if (zoom <= 12) return 0.001; // ~100m radius for far zoom
    if (zoom <= 14) return 0.0005; // ~50m radius for medium zoom
    if (zoom <= 16) return 0.0002; // ~20m radius for closer zoom
    return 0.0001; // ~10m radius for close zoom - only cluster if items are very close
  }, []);

  // OPTIMIZED: Single progressive loading function
  const loadClustersProgressively = useCallback(
    async (
      allClusters: UnifiedCluster[],
      setClusterFunction: (clusters: UnifiedCluster[]) => void
    ) => {
      if (progressiveLoadingRef.current) return; // Prevent multiple simultaneous progressive loads

      const BATCH_SIZE = 100; // Increased batch size for better performance
      const DELAY_BETWEEN_BATCHES = 16; // ~60fps (16ms)

      progressiveLoadingRef.current = true;
      setTotalClusterCount(allClusters.length);
      setLoadedClusterCount(0);
      setIsLoadingProgressively(true);

      const loadedClusters: UnifiedCluster[] = [];

      for (let i = 0; i < allClusters.length; i += BATCH_SIZE) {
        if (!isMountedRef.current) break; // Check if component is still mounted

        const batch = allClusters.slice(i, i + BATCH_SIZE);
        loadedClusters.push(...batch);

        setClusterFunction([...loadedClusters]);
        setLoadedClusterCount(loadedClusters.length);

        // Add delay between batches to prevent blocking
        if (i + BATCH_SIZE < allClusters.length) {
          await new Promise((resolve) =>
            setTimeout(resolve, DELAY_BETWEEN_BATCHES)
          );
        }
      }

      progressiveLoadingRef.current = false;
      setIsLoadingProgressively(false);
    },
    []
  );

  // Helper function to extract coordinates from location object
  const getCoordinates = (
    location: any
  ): { latitude: number; longitude: number } | null => {
    if (!location) return null;

    // Handle GeoJSON format (new API format)
    if (
      location.type === "Point" &&
      location.coordinates &&
      Array.isArray(location.coordinates)
    ) {
      const [longitude, latitude] = location.coordinates;
      if (typeof latitude === "number" && typeof longitude === "number") {
        return { latitude, longitude };
      }
    }

    // Handle old format (fallback)
    if (
      typeof location.latitude === "number" &&
      typeof location.longitude === "number"
    ) {
      return { latitude: location.latitude, longitude: location.longitude };
    }

    return null;
  };

  // OPTIMIZED: Single clustering function for both events and locations
  const createClusters = useCallback(
    (
      items: (MapEvent | MapLocation)[],
      type: "event" | "location"
    ): UnifiedCluster[] => {
      if (!items || items.length === 0) return [];

      const clusters: UnifiedCluster[] = [];
      const CLUSTER_RADIUS = getClusterRadius(zoomLevel);

      items.forEach((item) => {
        const location =
          type === "event"
            ? (item as MapEvent).location
            : (item as MapLocation).location;

        const coords = getCoordinates(location);
        if (!coords) return;

        const { latitude, longitude } = coords;

        // Find existing cluster nearby
        const nearbyCluster = clusters.find((cluster) => {
          const distance = Math.sqrt(
            Math.pow(cluster.coordinate[0] - latitude, 2) +
              Math.pow(cluster.coordinate[1] - longitude, 2)
          );
          return distance < CLUSTER_RADIUS;
        });

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

          // Update coordinate to be average
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
            nearbyCluster.coordinate = [avgLat, avgLng];
          }
        } else {
          // Create new cluster
          clusters.push({
            coordinate: [latitude, longitude],
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

      return clusters;
    },
    [zoomLevel, getClusterRadius]
  );

  // Function to convert PostGIS geometry to GeoJSON format
  const convertPostGISGeometry = (geometry: any) => {
    if (!geometry) return null;

    // If it's already in GeoJSON format, return as is
    if (
      typeof geometry === "object" &&
      geometry.type === "Point" &&
      geometry.coordinates &&
      Array.isArray(geometry.coordinates) &&
      geometry.coordinates.length >= 2
    ) {
      return geometry;
    }

    // If it's the old lat/lng format, convert to GeoJSON
    if (
      typeof geometry === "object" &&
      typeof geometry.latitude === "number" &&
      typeof geometry.longitude === "number"
    ) {
      return {
        type: "Point",
        coordinates: [geometry.longitude, geometry.latitude], // GeoJSON format: [lng, lat]
      };
    }

    // If it's a PostGIS geometry string, try to parse it
    if (typeof geometry === "string" && geometry.startsWith("0101000020")) {
      try {
        // Extract coordinates from PostGIS geometry string
        // Format: 0101000020E6100000[8 bytes longitude][8 bytes latitude]
        const hexStr = geometry;
        const coordBytes = hexStr.substring(18); // Skip header

        if (coordBytes.length >= 16) {
          const lonHex = coordBytes.substring(0, 16);
          const latHex = coordBytes.substring(16, 32);

          // Convert hex to buffer and then to double
          const lonBuffer = Buffer.from(lonHex, "hex");
          const latBuffer = Buffer.from(latHex, "hex");

          const longitude = lonBuffer.readDoubleLE(0);
          const latitude = latBuffer.readDoubleLE(0);

          return {
            type: "Point",
            coordinates: [longitude, latitude], // GeoJSON format: [lng, lat]
          };
        }
      } catch (error) {
        console.warn(
          "[UnifiedMapData] Failed to parse PostGIS geometry:",
          geometry,
          error
        );
      }
    }

    return null;
  };

  // OPTIMIZED: Data validation function
  const validateData = useCallback(
    (data: any[], type: "event" | "location") => {
      return data.filter((item) => {
        if (!item || typeof item !== "object") return false;

        try {
          let location = type === "event" ? item.location : item.location;

          // Convert PostGIS geometry if needed
          const convertedLocation = convertPostGISGeometry(location);
          if (convertedLocation) {
            // Update the item with converted coordinates
            if (type === "event") {
              item.location = convertedLocation;
            } else {
              item.location = convertedLocation;
            }
            location = convertedLocation;
          }

          // Use the helper function to validate coordinates
          const coords = getCoordinates(location);
          const isValid =
            coords !== null &&
            !isNaN(coords.latitude) &&
            !isNaN(coords.longitude) &&
            Math.abs(coords.latitude) <= 90 &&
            Math.abs(coords.longitude) <= 180;

          return isValid;
        } catch (error) {
          console.warn(`[UnifiedMapData] Invalid ${type} data:`, item, error);
          return false;
        }
      });
    },
    [convertPostGISGeometry, getCoordinates]
  );

  // OPTIMIZED: Time-based event filtering
  const filterEventsByTime = useCallback(
    (events: MapEvent[], timeRange: string) => {
      const now = new Date().getTime();
      const FOUR_HOURS_IN_MS = 4 * 60 * 60 * 1000;
      const TWENTY_FOUR_HOURS_IN_MS = 24 * 60 * 60 * 1000;
      const SEVEN_DAYS_IN_MS = 7 * 24 * 60 * 60 * 1000;

      return events.filter((event) => {
        try {
          if (!event?.start_datetime) return false;
          const eventTime = new Date(event.start_datetime).getTime();
          if (isNaN(eventTime)) return false;

          switch (timeRange) {
            case "today":
              return (
                eventTime >= now && eventTime <= now + TWENTY_FOUR_HOURS_IN_MS
              );
            case "weekend":
              const eventDate = new Date(event.start_datetime);
              const day = eventDate.getDay(); // 0 = Sunday, 5 = Friday, 6 = Saturday
              return (
                (day === 5 || day === 6 || day === 0) &&
                eventTime >= now &&
                eventTime <= now + SEVEN_DAYS_IN_MS
              );
            default:
              return eventTime >= now && eventTime <= now + FOUR_HOURS_IN_MS;
          }
        } catch (error) {
          console.warn(
            "[UnifiedMapData] Invalid event datetime:",
            event?.start_datetime
          );
          return false;
        }
      });
    },
    []
  );

  // OPTIMIZED: Main fetch function
  const fetchUnifiedData = useCallback(
    async (centerCoords: number[]) => {
      // Guard against invalid centers
      if (
        centerCoords == null ||
        !Array.isArray(centerCoords) ||
        centerCoords.length < 2 ||
        typeof centerCoords[0] !== "number" ||
        typeof centerCoords[1] !== "number" ||
        !Number.isFinite(centerCoords[0]) ||
        !Number.isFinite(centerCoords[1]) ||
        (centerCoords[0] === 0 && centerCoords[1] === 0)
      ) {
        console.log("[UnifiedMapData] Skipping fetch due to invalid center");
        return;
      }

      if (!isMountedRef.current || isLoadingRef.current) return;

      // OPTIMIZED: Cache validation
      const now = Date.now();
      const CACHE_DURATION = 1 * 60 * 1000; // 1 minute (temporarily reduced for testing)
      const lastCenter = lastCenterRef.current;
      const timeSinceLastFetch = now - lastFetchTimeRef.current;

      // Calculate movement threshold
      const radiusInKm = radius / 1000;
      const movementThreshold = Math.min(
        0.05,
        Math.max(0.01, radiusInKm / 1000)
      );

      // Check if we have valid cached data
      let hasValidCache = false;
      if (lastCenter) {
        // Calculate distance moved
        const R = 6371; // Earth's radius in km
        const dLat = ((centerCoords[0] - lastCenter[0]) * Math.PI) / 180;
        const dLng = ((centerCoords[1] - lastCenter[1]) * Math.PI) / 180;
        const a =
          Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos((lastCenter[0] * Math.PI) / 180) *
            Math.cos((centerCoords[0] * Math.PI) / 180) *
            Math.sin(dLng / 2) *
            Math.sin(dLng / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distanceMoved = R * c;

        // If moved >100km, invalidate cache
        if (distanceMoved > 100) {
          hasValidCache = false;
        } else {
          hasValidCache =
            cachedEventsRef.current.length > 0 &&
            timeSinceLastFetch < CACHE_DURATION &&
            Math.abs(lastCenter[0] - centerCoords[0]) < movementThreshold &&
            Math.abs(lastCenter[1] - centerCoords[1]) < movementThreshold;
        }
      }

      if (hasValidCache) {
        console.log("[UnifiedMapData] Using cached data, skipping API call");
        setEvents(cachedEventsRef.current);
        setLocations(cachedLocationsRef.current);
        return;
      }

      console.log("[UnifiedMapData] Fetching fresh data from API");
      lastCenterRef.current = [centerCoords[0], centerCoords[1]];
      isLoadingRef.current = true;
      setIsLoading(true);

      try {
        // Get user data for location preference
        let user: any = null;
        let userLocation: any = null;

        if (session?.access_token) {
          try {
            const { data, error: userError } = await supabase
              .from("users")
              .select("*")
              .eq("id", session.user.id)
              .single();

            if (!userError) user = data;

            const { data: locationData, error: locationError } = await supabase
              .from("user_locations")
              .select("*")
              .eq("user_id", session.user.id)
              .order("last_updated", { ascending: false })
              .limit(1);

            if (!locationError)
              userLocation = (locationData as any[])?.[0] ?? null;
          } catch (e) {
            console.log("[UnifiedMapData] Could not get user data:", e);
          }
        }

        // Prepare request data
        const requestData = {
          latitude:
            user?.event_location_preference == 1 &&
            userLocation?.latitude != null
              ? parseFloat(String(userLocation.latitude))
              : centerCoords[0],
          longitude:
            user?.event_location_preference == 1 &&
            userLocation?.longitude != null
              ? parseFloat(String(userLocation.longitude))
              : centerCoords[1],
          // Note: radius_km parameter is not supported by the current API
          // The API uses a fixed radius from USER_LOCATION_RADIUS_MILES environment variable
        };

        // Make API call
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
        });
        console.log("session?.access_token>",session?.access_token);
        console.log("requestData>",requestData);

        if (!response.ok) {
          throw new Error(
            `API request failed: ${response.status} ${response.statusText}`
          );
        }

        const data = await response.json();

        // Validate data
        const validEvents = validateData(
          data.events || [],
          "event"
        ) as MapEvent[];
        const validLocations = validateData(
          data.locations || [],
          "location"
        ) as MapLocation[];

        // Check if the specific location we're looking for is in the response

        if (!isMountedRef.current) return;

        // Update cache and state
        cachedEventsRef.current = validEvents;
        cachedLocationsRef.current = validLocations;
        lastFetchTimeRef.current = Date.now();

        setEvents(validEvents);
        setLocations(validLocations);

        // Filter events by time
        const nowEvents = filterEventsByTime(validEvents, "today");
        const todayEvents = filterEventsByTime(validEvents, "today");
        const tomorrowEvents = filterEventsByTime(validEvents, "weekend");

        setEventsNow(nowEvents);
        setEventsToday(todayEvents);
        setEventsTomorrow(tomorrowEvents);

        // Create clusters efficiently
        try {
          // Create all clusters at once
          const allEventClusters = createClusters(validEvents, "event");
          const locationClusters = createClusters(validLocations, "location");
          const allClusters = [...allEventClusters, ...locationClusters];

          // Create time-based clusters
          const nowEventClusters = createClusters(nowEvents, "event");
          const todayEventClusters = createClusters(todayEvents, "event");
          const tomorrowEventClusters = createClusters(tomorrowEvents, "event");

          // Combine clusters
          const nowClusters = [...nowEventClusters, ...locationClusters];
          const todayClusters = [...todayEventClusters, ...locationClusters];
          const tomorrowClusters = [
            ...tomorrowEventClusters,
            ...locationClusters,
          ];

          console.log("[UnifiedMapData] Cluster counts:", {
            all: allClusters.length,
            now: nowClusters.length,
            today: todayClusters.length,
            tomorrow: tomorrowClusters.length,
            locations: locationClusters.length,
          });

          // Load clusters progressively if enabled
          if (progressiveLoading) {
            await Promise.all([
              loadClustersProgressively(allClusters, setClusters),
              loadClustersProgressively(nowClusters, setClustersNow),
              loadClustersProgressively(todayClusters, setClustersToday),
              loadClustersProgressively(tomorrowClusters, setClustersTomorrow),
              loadClustersProgressively(locationClusters, setClustersLocations),
            ]);
          } else {
            // Set clusters immediately
            setClusters(allClusters);
            setClustersNow(nowClusters);
            setClustersToday(todayClusters);
            setClustersTomorrow(tomorrowClusters);
            setClustersLocations(locationClusters);
          }

          console.log("[UnifiedMapData] Clustering completed");
        } catch (clusterError) {
          console.error("[UnifiedMapData] Error in clustering:", clusterError);
          // Set empty clusters on error
          setClusters([]);
          setClustersNow([]);
          setClustersToday([]);
          setClustersTomorrow([]);
          setClustersLocations([]);
        }

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
    [
      session,
      radius,
      zoomLevel,
      timeRange,
      progressiveLoading,
      validateData,
      filterEventsByTime,
      createClusters,
      loadClustersProgressively,
    ]
  );

  // OPTIMIZED: Effect with better debouncing
  useEffect(() => {
    if (center && center[0] !== 0 && center[1] !== 0) {
      const timeoutId = setTimeout(() => {
        fetchUnifiedData(center);
      }, 1000); // 1 second debounce

      return () => clearTimeout(timeoutId);
    }
  }, [center, fetchUnifiedData]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      progressiveLoadingRef.current = false;
    };
  }, []);

  // Force refresh function
  const forceRefresh = useCallback(() => {
    lastFetchTimeRef.current = 0;
    cachedEventsRef.current = [];
    cachedLocationsRef.current = [];

    if (center && center[0] !== 0 && center[1] !== 0) {
      fetchUnifiedData(center);
    }
  }, [center, fetchUnifiedData]);

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
    isLoadingProgressively,
    loadedClusterCount,
    totalClusterCount,

    // Actions
    forceRefresh,
    fetchUnifiedData,
  };
}
