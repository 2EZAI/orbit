import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import {
  View,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  ActivityIndicator,
  DeviceEventEmitter,
} from "react-native";
import { useLocalSearchParams } from "expo-router";

type TimeFrame = "Today" | "Week" | "Weekend";
import { supabase } from "~/src/lib/supabase";
import { useAuth } from "~/src/lib/auth";
import { Text } from "~/src/components/ui/text";
import * as Location from "expo-location";
import { useTheme } from "~/src/components/ThemeProvider";
import MapboxGL, { UserTrackingMode } from "@rnmapbox/maps";

import {
  useUnifiedMapData,
  type MapEvent,
  type MapLocation,
  type UnifiedCluster,
} from "~/hooks/useUnifiedMapData";
import { useMapCamera } from "~/src/hooks/useMapCamera";
import { MapControls } from "~/src/components/map/MapControls";
import {
  FilterState,
  generateDefaultFilters,
} from "~/src/components/map/MarkerFilter";

import { UserMarker } from "~/src/components/map/UserMarker";
import { UserMarkerWithCount } from "~/src/components/map/UserMarkerWithCount";

import { EventMarker } from "~/src/components/map/EventMarker";
import { ClusterSheet } from "~/src/components/map/ClusterSheet";
import { UnifiedCard } from "~/src/components/map/UnifiedCard";
import { UnifiedDetailsSheet } from "~/src/components/map/UnifiedDetailsSheet";
import { MapLoadingScreen } from "~/src/components/map/MapLoadingScreen";

import { SearchSheet } from "~/src/components/search/SearchSheet";
import { useUser } from "~/src/lib/UserProvider";

// Replace with your Mapbox access token
MapboxGL.setAccessToken(
  "pk.eyJ1IjoidGFuZ2VudGRpZ2l0YWxhZ2VuY3kiLCJhIjoiY2xwMHR0bTVmMGJwbTJtbzhxZ2pvZWNoYiJ9.ZGwLHw0gLeEVxPhoYq2WyA"
);

// Custom style URLs - now these will work with Mapbox
const CUSTOM_LIGHT_STYLE =
  "mapbox://styles/tangentdigitalagency/clzwv44pl002x01ps9aa65wxc";
const CUSTOM_DARK_STYLE =
  "mapbox://styles/tangentdigitalagency/clzwv4xtp002y01psdttf9jhr";

// Temporary fix: Use working light style until custom style is resolved
// TODO: Replace WORKING_LIGHT_STYLE with CUSTOM_LIGHT_STYLE once the custom style is fixed
const WORKING_LIGHT_STYLE = "mapbox://styles/mapbox/light-v11";

// Reliable fallback styles using default Mapbox styles
const FALLBACK_LIGHT_STYLE = "mapbox://styles/mapbox/light-v11";
const FALLBACK_DARK_STYLE = "mapbox://styles/mapbox/dark-v11";

// Theme-aware fallback selection
const getFallbackStyle = (isDarkMode: boolean) =>
  isDarkMode ? FALLBACK_DARK_STYLE : FALLBACK_LIGHT_STYLE;

// Helper function to extract coordinates from location object (supports both old and new formats)
const getLocationCoordinates = (
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

export default function Map() {
  const params = useLocalSearchParams();
  const [selectedTimeFrame, setSelectedTimeFrame] =
    useState<TimeFrame>("Today");
  const [showDetails, setShowDetails] = useState(false);
  const [isEvent, setIsEvent] = useState(false);
  const [hideCount, setHideCount] = useState(false);
  const [showControler, setShowControler] = useState(true);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const { theme, isDarkMode } = useTheme();
  const { user, userlocation, updateUserLocations } = useUser();
  const mapRef = useRef<MapboxGL.MapView>(null);
  const { session } = useAuth();
  const [location, setLocation] = useState<{
    latitude: number;
    longitude: number;
    heading?: number | null;
  } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [followerList, setFollowerList] = useState<any[]>([]);
  const [selectedCluster, setSelectedCluster] = useState<
    (MapEvent | MapLocation)[] | null
  >(null);
  const [mapStyleError, setMapStyleError] = useState(false);
  const [filters, setFilters] = useState<FilterState>({});
  const [isMapFullyLoaded, setIsMapFullyLoaded] = useState(false); // Track overall map loading state
  const [currentZoomLevel, setCurrentZoomLevel] = useState(13); // Track current zoom level
  const zoomDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const lastRegionChangeRef = useRef<number>(0); // CRITICAL: Track last region change time
  const isMapMovingRef = useRef<boolean>(false); // CRITICAL: Track if map is actively moving
  const [loadingReason, setLoadingReason] = useState<
    "initial" | "timeframe" | "filters" | "data"
  >("initial"); // Track why we're loading
  const markersReadyTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const forceCloseLoadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Reset style error when theme changes to retry the correct style
  useEffect(() => {
    setMapStyleError(false);
    // Reduce theme change logging to prevent spam
    // console.log("Theme changed to:", isDarkMode ? "DARK" : "LIGHT");
  }, [isDarkMode]);

  // Get loading text based on the current loading reason
  const getLoadingText = () => {
    switch (loadingReason) {
      case "initial":
        return {
          title: "Welcome to Orbit",
          subtitle: "Setting up your personalized map experience...",
        };
      case "data":
        return {
          title: "Discovering Events",
          subtitle: "Finding amazing events and locations near you...",
        };
      case "timeframe":
        return {
          title: "Updating Timeline",
          subtitle: `Loading ${selectedTimeFrame.toLowerCase()} events...`,
        };
      case "filters":
        return {
          title: "Applying Filters",
          subtitle: "Updating map with your preferences...",
        };
      default:
        return {
          title: "Loading Map",
          subtitle: "Please wait while we prepare everything...",
        };
    }
  };

  // Add state to track current map center
  const [mapCenter, setMapCenter] = useState<[number, number] | null>(null);

  // Add debounced region change handler
  const regionChangeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastCenterRef = useRef<[number, number] | null>(null);

  // Helper function to determine marker type
  const getMarkerType = (
    event: MapEvent
  ): "user-event" | "ticketmaster" | "api-event" => {
    if (event.created_by) {
      return "user-event";
    }
    if ((event as any).is_ticketmaster) {
      return "ticketmaster";
    }
    return "api-event";
  };

  // Helper function to get category name for coloring
  const getCategoryName = (event: MapEvent | MapLocation): string => {
    if (
      "categories" in event &&
      event.categories &&
      event.categories.length > 0
    ) {
      return event.categories[0].name;
    }
    if ("category" in event && event.category) {
      return event.category.name;
    }
    if ("type" in event && event.type) {
      return event.type;
    }
    return "";
  };

  // Dynamic filter functions - uses OR logic for better UX
  const shouldShowMarker = useCallback(
    (event: MapEvent | MapLocation): boolean => {
      // If no filters are set yet, show everything
      if (Object.keys(filters).length === 0) {
        return true;
      }

      // If all filters are false, hide everything
      const hasAnyFilterEnabled = Object.values(filters).some(
        (value) => value === true
      );
      if (!hasAnyFilterEnabled) {
        return false;
      }

      let shouldShow = false;

      // Check event source type filters - user-friendly names only
      if ("source" in event && event.source) {
        const sourceKey =
          event.source === "user"
            ? "community-events"
            : (typeof event.source === "string" &&
                event.source.includes("ticket")) ||
              event.source === "ticketmaster"
            ? "ticketed-events"
            : "featured-events"; // No technical terms

        if (filters.hasOwnProperty(sourceKey) && filters[sourceKey]) {
          shouldShow = true;
        }
      }

      // Check event category filters
      if (
        "categories" in event &&
        event.categories &&
        Array.isArray(event.categories)
      ) {
        for (const cat of event.categories) {
          const catKey = `event-${cat.name.toLowerCase().replace(/\s+/g, "-")}`;
          if (filters.hasOwnProperty(catKey) && filters[catKey]) {
            shouldShow = true;
            break;
          }
        }
      }

      // Check location category filters (prioritize categories over types)
      if ("category" in event && event.category) {
        const catKey = `location-${event.category.name
          .toLowerCase()
          .replace(/\s+/g, "-")}`;
        if (filters.hasOwnProperty(catKey) && filters[catKey]) {
          shouldShow = true;
        }
      }

      // Check location type filters (only if no category is available)
      if (
        "type" in event &&
        event.type &&
        !("category" in event && event.category)
      ) {
        const typeKey = `type-${event.type.toLowerCase().replace(/\s+/g, "-")}`;
        if (filters.hasOwnProperty(typeKey) && filters[typeKey]) {
          shouldShow = true;
        }
      }

      return shouldShow;
    },
    [filters]
  );

  const filterClusters = useCallback(
    (clusters: any[]) => {
      if (!clusters || !Array.isArray(clusters)) {
        return [];
      }

      const filtered = clusters
        .filter((cluster) => {
          // Handle both event clusters and location clusters
          if (cluster.type === "location") {
            // For location clusters, check if the main location should be shown
            if (cluster.mainEvent && !shouldShowMarker(cluster.mainEvent)) {
              return false;
            }

            // Filter the locations in the cluster
            const filteredLocations = (cluster.locations || []).filter(
              shouldShowMarker
            );

            // Only show cluster if it has at least one visible location
            return filteredLocations.length > 0;
          } else {
            // For event clusters, check if the main event should be shown
            if (cluster.mainEvent && !shouldShowMarker(cluster.mainEvent)) {
              return false;
            }

            // Filter the events in the cluster
            const filteredEvents = (cluster.events || []).filter(
              shouldShowMarker
            );

            // Only show cluster if it has at least one visible event
            return filteredEvents.length > 0;
          }
        })
        .map((cluster) => {
          if (cluster.type === "location") {
            return {
              ...cluster,
              locations: cluster.locations.filter(shouldShowMarker),
            };
          } else {
            return {
              ...cluster,
              events: cluster.events.filter(shouldShowMarker),
            };
          }
        });

      return filtered;
    },
    [shouldShowMarker]
  );

  const handleRegionChange = useCallback((region: any) => {
    // CRITICAL FIX: Prevent excessive callback creation
    // Only process if we have valid region data
    if (!region?.properties) {
      return;
    }

    // CRITICAL: Prevent processing during rapid map movements
    if (isMapMovingRef.current) {
      return;
    }

    // CRITICAL: Very aggressive throttle region changes to prevent callback spam
    const now = Date.now();
    if (now - lastRegionChangeRef.current < 2000) {
      // 2 second throttle to prevent excessive callbacks
      return;
    }
    lastRegionChangeRef.current = now;

    // Clear existing timeout
    if (regionChangeTimeoutRef.current) {
      clearTimeout(regionChangeTimeoutRef.current);
    }

    // Debounce the region change to avoid too many API calls
    regionChangeTimeoutRef.current = setTimeout(() => {
      const centerLat = region?.properties?.center?.[1];
      const centerLng = region?.properties?.center?.[0];
      const zoomLevel = region?.properties?.zoomLevel;

      if (centerLat && centerLng && zoomLevel) {
        // Smart panning detection: Load new data when user moves significantly
        const newCenter: [number, number] = [centerLat, centerLng];
        const lastCenter = lastCenterRef.current;

        if (!lastCenter) {
          // First time - load initial data
          setMapCenter(newCenter);
          lastCenterRef.current = newCenter;
        } else {
          // Calculate distance moved
          const latDiff = Math.abs(newCenter[0] - lastCenter[0]);
          const lngDiff = Math.abs(newCenter[1] - lastCenter[1]);

          // If moved more than ~50 miles, fetch new data for that area
          const significantMoveThreshold = 0.5; // ~50 miles in degrees

          if (
            latDiff > significantMoveThreshold ||
            lngDiff > significantMoveThreshold
          ) {
            console.log(
              `🗺️ [MAP PANNING] User moved significantly, loading new area data`
            );
            setMapCenter(newCenter);
            lastCenterRef.current = newCenter;
          }
        }
      }
    }, 1000); // Increased to 1 second to reduce callback frequency

    // Handle zoom level for follower count visibility and clustering
    let zoomLevel = region?.properties?.zoomLevel;
    if (zoomLevel) {
      // Update hide count immediately
      if (zoomLevel <= 12) {
        setHideCount(true);
      } else {
        setHideCount(false);
      }

      // CRITICAL FIX: Throttled zoom level tracking to prevent excessive callbacks
      if (zoomDebounceRef.current) {
        clearTimeout(zoomDebounceRef.current);
      }

      zoomDebounceRef.current = setTimeout(() => {
        setCurrentZoomLevel(zoomLevel);
      }, 1000); // 1 second debounce to prevent excessive callbacks
    }
  }, []);

  const {
    cameraRef,
    isFollowingUser,
    setIsFollowingUser,
    handleZoomIn,
    handleZoomOut,
    handleRecenter,
    fitToEvents,
  } = useMapCamera();

  // SIMPLE: Use orbit coordinates if orbit mode, GPS if current mode
  const calculatedCenter = useMemo(() => {
    // ORBIT MODE: Use orbit coordinates
    if (
      user?.event_location_preference === 1 &&
      userlocation?.latitude &&
      userlocation?.longitude
    ) {
      const orbitCenter: [number, number] = [
        parseFloat(userlocation.latitude),
        parseFloat(userlocation.longitude),
      ];
      // console.log("🗺️ [Map] ORBIT MODE - Using orbit coordinates:", orbitCenter);
      return orbitCenter;
    }

    // CURRENT MODE: Use GPS coordinates
    if (
      user?.event_location_preference === 0 &&
      location?.latitude &&
      location?.longitude
    ) {
      const gpsCenter: [number, number] = [
        location.latitude,
        location.longitude,
      ];
      // console.log("🗺️ [Map] CURRENT MODE - Using GPS coordinates:", gpsCenter);
      return gpsCenter;
    }

    // Fallback for when preference is not set or no coordinates available
    if (location?.latitude && location?.longitude) {
      const fallbackCenter: [number, number] = [
        location.latitude,
        location.longitude,
      ];
      // console.log("🗺️ [Map] FALLBACK - Using GPS coordinates:", fallbackCenter);
      return fallbackCenter;
    }

    return [0, 0] as [number, number];
  }, [
    user?.event_location_preference,
    userlocation?.latitude,
    userlocation?.longitude,
    location?.latitude,
    location?.longitude,
  ]);

  const {
    events,
    locations,
    eventsNow,
    eventsToday,
    eventsTomorrow,
    clusters,
    clustersLocations,
    clustersNow,
    clustersToday,
    clustersTomorrow,
    isLoading,
    error,
    isLoadingProgressively,
    loadedClusterCount,
    totalClusterCount,
    forceRefresh: forceRefreshLocations,
  } = useUnifiedMapData({
    center: calculatedCenter,
    radius: 50000, // 50 miles radius
    timeRange:
      selectedTimeFrame === "Today"
        ? "today"
        : selectedTimeFrame === "Week"
        ? "week"
        : "weekend",
    zoomLevel: currentZoomLevel, // Re-enabled for proper clustering
  });

  // Initialize filters when data is available
  useEffect(() => {
    if (
      (events.length > 0 || locations.length > 0) &&
      Object.keys(filters).length === 0
    ) {
      const defaultFilters = generateDefaultFilters(events, locations);
      setFilters(defaultFilters);
    }
  }, [events, locations]); // Removed filters from dependencies to prevent infinite loop

  // Memoize filtered clusters to prevent repeated filtering - OPTIMIZED
  const filteredClustersToday = useMemo(
    () => filterClusters(clustersToday),
    [clustersToday, filterClusters]
  );
  const filteredClustersNow = useMemo(
    () => filterClusters(clustersNow),
    [clustersNow, filterClusters]
  );
  const filteredClustersTomorrow = useMemo(
    () => filterClusters(clustersTomorrow),
    [clustersTomorrow, filterClusters]
  );
  const filteredClusters = useMemo(
    () => filterClusters(clusters),
    [clusters, filterClusters]
  );
  const filteredClustersLocations = useMemo(
    () => filterClusters(clustersLocations),
    [clustersLocations, filterClusters]
  );
  const [selectedEvent, setSelectedEvent] = useState<MapEvent | null>(null);

  // OPTIMIZATION: Memoize marker data WITHOUT selectedEvent dependency
  const memoizedMarkerData = useMemo(() => {
    return {
      today: filteredClustersToday.map((cluster, index) => ({
        cluster,
        index,
        key: `cluster-today-${cluster.coordinate[0].toFixed(
          3
        )}-${cluster.coordinate[1].toFixed(3)}-${index}`,
        id: `cluster-today-${cluster.coordinate[0].toFixed(
          3
        )}-${cluster.coordinate[1].toFixed(3)}-${index}`,
        coordinate: [cluster.coordinate[1], cluster.coordinate[0]],
        count:
          cluster.type === "event"
            ? cluster.events?.length || 0
            : cluster.locations?.length || 0,
        mainEventForMarker:
          cluster.type === "event"
            ? (cluster.mainEvent as MapEvent)
            : ({
                ...cluster.mainEvent,
                start_datetime: new Date().toISOString(),
                end_datetime: new Date().toISOString(),
                venue_name: cluster.mainEvent.name,
                attendees: { count: 0, profiles: [] },
                categories: (cluster.mainEvent as MapLocation).category
                  ? [(cluster.mainEvent as MapLocation).category!]
                  : [],
              } as MapEvent),
      })),
      now: filteredClustersNow.map((cluster, index) => ({
        cluster,
        index,
        key: `cluster-now-${cluster.coordinate[0].toFixed(
          3
        )}-${cluster.coordinate[1].toFixed(3)}-${index}`,
        id: `cluster-now-${cluster.coordinate[0].toFixed(
          3
        )}-${cluster.coordinate[1].toFixed(3)}-${index}`,
        coordinate: [cluster.coordinate[1], cluster.coordinate[0]],
        count:
          cluster.type === "event"
            ? cluster.events?.length || 0
            : cluster.locations?.length || 0,
        mainEventForMarker:
          cluster.type === "event"
            ? (cluster.mainEvent as MapEvent)
            : ({
                ...cluster.mainEvent,
                start_datetime: new Date().toISOString(),
                end_datetime: new Date().toISOString(),
                venue_name: cluster.mainEvent.name,
                attendees: { count: 0, profiles: [] },
                categories: (cluster.mainEvent as MapLocation).category
                  ? [(cluster.mainEvent as MapLocation).category!]
                  : [],
              } as MapEvent),
      })),
      tomorrow: filteredClustersTomorrow.map((cluster, index) => ({
        cluster,
        index,
        key: `cluster-tomorrow-${cluster.coordinate[0].toFixed(
          3
        )}-${cluster.coordinate[1].toFixed(3)}-${index}`,
        id: `cluster-tomorrow-${cluster.coordinate[0].toFixed(
          3
        )}-${cluster.coordinate[1].toFixed(3)}-${index}`,
        coordinate: [cluster.coordinate[1], cluster.coordinate[0]],
        count:
          cluster.type === "event"
            ? cluster.events?.length || 0
            : cluster.locations?.length || 0,
        mainEventForMarker:
          cluster.type === "event"
            ? (cluster.mainEvent as MapEvent)
            : ({
                ...cluster.mainEvent,
                start_datetime: new Date().toISOString(),
                end_datetime: new Date().toISOString(),
                venue_name: cluster.mainEvent.name,
                attendees: { count: 0, profiles: [] },
                categories: (cluster.mainEvent as MapLocation).category
                  ? [(cluster.mainEvent as MapLocation).category!]
                  : [],
              } as MapEvent),
      })),
    };
  }, [filteredClustersToday, filteredClustersNow, filteredClustersTomorrow]);

  // OPTIMIZATION: Separate memoized function for isSelected calculation
  const getIsSelected = useCallback(
    (cluster: any) => {
      return cluster.type === "event"
        ? cluster.events?.some((e: MapEvent) => e.id === selectedEvent?.id) ||
            false
        : cluster.locations?.some(
            (l: MapLocation) => l.id === selectedEvent?.id
          ) || false;
    },
    [selectedEvent]
  );

  // Mock the old functions that aren't needed with the new hook

  const handleEventClick = useCallback(
    (event: MapEvent) => {
      // OPTIMIZATION: Only update if event actually changed
      if (selectedEvent?.id !== event.id) {
        setSelectedEvent(event);
        setShowDetails(false); // Show card first, not details
        setIsEvent(true);
      }
    },
    [selectedEvent?.id]
  );

  const handleCloseModal = useCallback(() => {
    setSelectedEvent(null);
    setShowDetails(false);
  }, []);

  // Define handleLocationClick function for navigation from SearchSheet
  const handleLocationClick = useCallback(
    (location: MapLocation) => {
      setIsEvent(false);
      // Convert MapLocation to MapEvent format for the card
      const locationAsEvent = {
        ...location,
        start_datetime: new Date().toISOString(),
        end_datetime: new Date().toISOString(),
        venue_name: location.name,
        attendees: { count: 0, profiles: [] },
        categories: location.category ? [location.category] : [],
      } as MapEvent;

      handleEventClick(locationAsEvent);
    },
    [handleEventClick]
  );

  // Simplified loading state management
  useEffect(() => {
    // Clear any existing timeout
    if (markersReadyTimeoutRef.current) {
      clearTimeout(markersReadyTimeoutRef.current);
    }

    if (isLoading) {
      // Data is loading, show loading screen
      setLoadingReason("data");
      setIsMapFullyLoaded(false);

      // Aggressive timeout to prevent infinite loading
      if (forceCloseLoadingTimeoutRef.current) {
        clearTimeout(forceCloseLoadingTimeoutRef.current);
      }
      forceCloseLoadingTimeoutRef.current = setTimeout(() => {
        console.log("[Map] Force closing loading screen after 5 seconds");
        setIsMapFullyLoaded(true);
      }, 5000); // Reduced to 5 seconds
    } else {
      // Data has finished loading, hide loading screen immediately
      console.log("[Map] Loading finished, hiding loading screen");
      setIsMapFullyLoaded(true);
    }

    // Cleanup timeout on unmount
    return () => {
      if (markersReadyTimeoutRef.current) {
        clearTimeout(markersReadyTimeoutRef.current);
      }
      if (forceCloseLoadingTimeoutRef.current) {
        clearTimeout(forceCloseLoadingTimeoutRef.current);
      }
    };
  }, [isLoading]);

  // Cleanup all timeouts and listeners on unmount
  useEffect(() => {
    return () => {
      // Clear all timeouts
      if (markersReadyTimeoutRef.current) {
        clearTimeout(markersReadyTimeoutRef.current);
      }
      if (regionChangeTimeoutRef.current) {
        clearTimeout(regionChangeTimeoutRef.current);
      }
      if (zoomDebounceRef.current) {
        clearTimeout(zoomDebounceRef.current);
      }

      // CRITICAL: Reset region change tracking
      lastRegionChangeRef.current = 0;
    };
  }, []);

  // Generate dynamic filters when data loads
  useEffect(() => {
    if ((events && events.length > 0) || (locations && locations.length > 0)) {
      const defaultFilters = generateDefaultFilters(
        events || [],
        locations || []
      );
      setFilters(defaultFilters);
    }
  }, [events, locations]);

  // Add logging for event selection
  useEffect(() => {
    if (selectedEvent) {
      // Event selected
    }
  }, [selectedEvent]);

  // Function to get current location
  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        console.log("🗺️ [Map] Location permission denied");
        return;
      }

      console.log("🗺️ [Map] Getting current GPS location...");
      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.BestForNavigation,
      });

      setLocation({
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
        heading: currentLocation.coords.heading || undefined,
      });

      console.log("🗺️ [Map] Updated GPS location:", {
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
      });

      return currentLocation;
    } catch (error) {
      console.error("🗺️ [Map] Error getting current location:", error);
    }
  };

  //set zoom enabled by default
  useEffect(() => {
    setIsFollowingUser(false);
    const eventListener = DeviceEventEmitter.addListener(
      "eventNotification",
      (event: Partial<MapEvent>) => {
        setIsEvent(true);
        handleEventClick(event as MapEvent);
      }
    );

    const showEventCardListener = DeviceEventEmitter.addListener(
      "showEventCard",
      (data: { eventId: string; lat: number; lng: number }) => {
        // Center map on event location
        if (cameraRef.current) {
          cameraRef.current.setCamera({
            centerCoordinate: [data.lng, data.lat],
            zoomLevel: 15,
            animationDuration: 1000,
            animationMode: "flyTo",
          });
        }

        // Update map center to trigger new data fetch
        setMapCenter([data.lat, data.lng]);

        // Wait a bit for data to load, then find the event
        setTimeout(() => {
          const event =
            eventsNow.find((e: MapEvent) => e.id === data.eventId) ||
            eventsToday.find((e: MapEvent) => e.id === data.eventId) ||
            eventsTomorrow.find((e: MapEvent) => e.id === data.eventId);

          if (event) {
            setIsEvent(true);
            handleEventClick(event as MapEvent);
          } else {
            console.log("Event still not found after delay:", data.eventId);
          }
        }, 2000); // Wait 2 seconds for data to load
      }
    );

    // Listen for location preference updates
    const locationPreferenceListener = DeviceEventEmitter.addListener(
      "locationPreferenceUpdated",
      (eventPayload: {
        mode: string;
        latitude?: number;
        longitude?: number;
      }) => {
        console.log(
          "🗺️ [Map] Received location preference update:",
          eventPayload
        );

        if (
          eventPayload.mode === "orbit" &&
          eventPayload.latitude &&
          eventPayload.longitude
        ) {
          // Switch to orbit mode - use the specified coordinates
          console.log("🗺️ [Map] Switching to Orbit mode, centering on:", [
            eventPayload.latitude,
            eventPayload.longitude,
          ]);
          setMapCenter([eventPayload.latitude, eventPayload.longitude]);

          // Fly to the new location
          if (cameraRef.current) {
            cameraRef.current.setCamera({
              centerCoordinate: [eventPayload.longitude, eventPayload.latitude],
              zoomLevel: 13, // Approximately 5-mile radius view
              animationDuration: 2000,
              animationMode: "flyTo",
            });
          }
        } else if (eventPayload.mode === "current") {
          // Switch to current location mode - use GPS coordinates
          console.log("🗺️ [Map] Switching to Current mode, using GPS location");
          if (location?.latitude && location?.longitude) {
            console.log("🗺️ [Map] Setting center to GPS location:", [
              location.latitude,
              location.longitude,
            ]);
            setMapCenter([location.latitude, location.longitude]);

            // Fly to current location
            if (cameraRef.current) {
              cameraRef.current.setCamera({
                centerCoordinate: [location.longitude, location.latitude],
                zoomLevel: 13, // Approximately 5-mile radius view
                animationDuration: 2000,
                animationMode: "flyTo",
              });
            }
          } else {
            console.log(
              "🗺️ [Map] No GPS location available, requesting location update"
            );
            // Request fresh location update
            getCurrentLocation();
          }
        }
      }
    );

    return () => {
      eventListener.remove();
      showEventCardListener.remove();
      locationPreferenceListener.remove();
    };
  }, [
    handleEventClick,
    eventsNow,
    eventsToday,
    eventsTomorrow,
    cameraRef,
    location,
    getCurrentLocation,
  ]);

  // Set mapCenter and camera position based on user's location preference
  useEffect(() => {
    console.log("🗺️ [Map] Location preference effect triggered:", {
      userPreference: user?.event_location_preference,
      hasOrbitLocation: !!(userlocation?.latitude && userlocation?.longitude),
      hasGPSLocation: !!(location?.latitude && location?.longitude),
      currentMapCenter: mapCenter,
    });

    // ORBIT MODE: Use orbit coordinates
    if (
      user?.event_location_preference === 1 &&
      userlocation?.latitude &&
      userlocation?.longitude
    ) {
      const orbitCoords: [number, number] = [
        parseFloat(userlocation.latitude),
        parseFloat(userlocation.longitude),
      ];

      // Only update if different from current mapCenter
      if (
        !mapCenter ||
        Math.abs(mapCenter[0] - orbitCoords[0]) > 0.0001 ||
        Math.abs(mapCenter[1] - orbitCoords[1]) > 0.0001
      ) {
        console.log(
          "🗺️ [Map] Setting ORBIT mode center and moving camera:",
          orbitCoords
        );
        setMapCenter(orbitCoords);

        // Move the map camera to orbit location
        if (cameraRef.current) {
          cameraRef.current.setCamera({
            centerCoordinate: [orbitCoords[1], orbitCoords[0]], // [lng, lat] for Mapbox
            zoomLevel: 13, // Approximately 5-mile radius view
            animationDuration: 2000,
            animationMode: "flyTo",
          });
        }
      }
      return;
    }

    // CURRENT MODE: Use GPS coordinates
    if (
      user?.event_location_preference === 0 &&
      location?.latitude &&
      location?.longitude
    ) {
      const gpsCoords: [number, number] = [
        location.latitude,
        location.longitude,
      ];

      // Only update if different from current mapCenter
      if (
        !mapCenter ||
        Math.abs(mapCenter[0] - gpsCoords[0]) > 0.0001 ||
        Math.abs(mapCenter[1] - gpsCoords[1]) > 0.0001
      ) {
        console.log(
          "🗺️ [Map] Setting CURRENT mode center and moving camera:",
          gpsCoords
        );
        setMapCenter(gpsCoords);

        // Move the map camera to GPS location
        if (cameraRef.current) {
          cameraRef.current.setCamera({
            centerCoordinate: [gpsCoords[1], gpsCoords[0]], // [lng, lat] for Mapbox
            zoomLevel: 13, // Approximately 5-mile radius view
            animationDuration: 2000,
            animationMode: "flyTo",
          });
        }
      }
      return;
    }

    // No preference set yet - use GPS as fallback (should only happen on initial load)
    if (location?.latitude && location?.longitude && !mapCenter) {
      const fallbackCoords: [number, number] = [
        location.latitude,
        location.longitude,
      ];
      console.log(
        "🗺️ [Map] Setting FALLBACK center and moving camera:",
        fallbackCoords
      );
      setMapCenter(fallbackCoords);

      // Move the map camera to fallback location with immediate animation for initial load
      if (cameraRef.current) {
        cameraRef.current.setCamera({
          centerCoordinate: [fallbackCoords[1], fallbackCoords[0]], // [lng, lat] for Mapbox
          zoomLevel: 13, // Approximately 5-mile radius view
          animationDuration: 1000, // Faster animation for initial load
          animationMode: "flyTo",
        });
      }
    }
  }, [
    user?.event_location_preference,
    userlocation?.latitude,
    userlocation?.longitude,
    location?.latitude,
    location?.longitude,
    mapCenter, // Include mapCenter in dependencies to prevent infinite loops
  ]);

  // Handle route params for showing event/location cards
  useEffect(() => {
    // Handle event navigation (from SearchSheet or other sources)
    if (params.eventId) {
      // Center map on event location if coordinates are provided
      const lat = params.latitude || params.lat;
      const lng = params.longitude || params.lng;

      if (lat && lng && lat !== "undefined" && lng !== "undefined") {
        const latNum = parseFloat(lat as string);
        const lngNum = parseFloat(lng as string);

        if (cameraRef.current) {
          cameraRef.current.setCamera({
            centerCoordinate: [lngNum, latNum],
            zoomLevel: 15,
            animationDuration: 1000,
            animationMode: "flyTo",
          });
        }

        // Update map center to trigger new data fetch
        setMapCenter([latNum, lngNum]);
      }

      // Find the event by ID and open its card
      const event =
        eventsNow.find((e: MapEvent) => e.id === params.eventId) ||
        eventsToday.find((e: MapEvent) => e.id === params.eventId) ||
        eventsTomorrow.find((e: MapEvent) => e.id === params.eventId);

      if (event) {
        setIsEvent(true);
        handleEventClick(event as MapEvent);
      } else {
        // If event not found in current arrays, wait for data to load
        console.log("Event not found in current arrays, waiting for data...");
      }
    }

    // Handle location navigation (from SearchSheet)
    if (params.locationId) {
      console.log("🗺️ [Map] Navigation params received:", {
        locationId: params.locationId,
        latitude: params.latitude,
        longitude: params.longitude,
        lat: params.lat,
        lng: params.lng,
        name: params.name,
      });

      // Center map on location if coordinates are provided
      const lat = params.latitude || params.lat;
      const lng = params.longitude || params.lng;

      if (lat && lng && lat !== "undefined" && lng !== "undefined") {
        const latNum = parseFloat(lat as string);
        const lngNum = parseFloat(lng as string);

        console.log("🗺️ [Map] Centering camera on coordinates:", [
          latNum,
          lngNum,
        ]);

        if (cameraRef.current) {
          cameraRef.current.setCamera({
            centerCoordinate: [lngNum, latNum],
            zoomLevel: 15,
            animationDuration: 1000,
            animationMode: "flyTo",
          });
        }

        // Update map center to trigger new data fetch
        setMapCenter([latNum, lngNum]);
      } else {
        console.log("🗺️ [Map] No coordinates provided in params");
      }

      // Find the location by ID and open its card
      console.log("🗺️ [Map] Looking for location with ID:", params.locationId);
      console.log("🗺️ [Map] Looking for location with name:", params.name);
      console.log("🗺️ [Map] Available locations count:", locations.length);

      // Log first few locations for debugging
      console.log(
        "🗺️ [Map] Sample locations:",
        locations.slice(0, 3).map((l: MapLocation) => ({
          id: l.id,
          name: l.name,
          location: l.location,
          coordinates: l.location?.coordinates,
          type: l.location?.type,
        }))
      );

      // Try to find by ID first
      let location = locations.find(
        (l: MapLocation) => l.id === params.locationId
      );

      // If not found by ID, try to find by name (case insensitive)
      if (!location && params.name) {
        console.log("🗺️ [Map] Location not found by ID, searching by name...");
        const searchName = Array.isArray(params.name)
          ? params.name[0]
          : params.name;
        location = locations.find(
          (l: MapLocation) =>
            l.name?.toLowerCase().includes(searchName.toLowerCase()) ||
            searchName.toLowerCase().includes(l.name?.toLowerCase())
        );

        if (location) {
          console.log("🗺️ [Map] Found location by name match:", {
            searchName: params.name,
            foundName: location.name,
            id: location.id,
          });
        }
      }

      if (location) {
        console.log("🗺️ [Map] Found location:", {
          id: location.id,
          name: location.name,
          location: location.location,
        });
        setIsEvent(false);
        handleLocationClick(location as MapLocation);
      } else {
        console.log("🗺️ [Map] Location not found in current data");
      }
    }
  }, [
    params.eventId,
    params.locationId,
    params.latitude,
    params.longitude,
    params.lat,
    params.lng,
    eventsNow,
    eventsToday,
    eventsTomorrow,
    locations,
    handleEventClick,
    handleLocationClick,
    cameraRef,
  ]);

  const haversine = (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ) => {
    const toRad = (value: number) => (value * Math.PI) / 180;
    const R = 3956; // Radius of Earth in miles
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.asin(Math.sqrt(a));
    return R * c;
  };

  // Compute nearby follower count for each user
  const getNearbyFollowerCounts = (followerList: any[], radius = 10) => {
    return followerList.map((user: any, index: number) => {
      let nearbyCount = 0;
      for (let i = 0; i < followerList.length; i++) {
        if (i !== index) {
          const other = followerList[i];
          const distance = haversine(
            user.live_location_latitude,
            user.live_location_longitude,
            other.live_location_latitude,
            other.live_location_longitude
          );
          if (distance <= radius) {
            nearbyCount++;
          }
        }
      }
      return {
        ...user,
        nearbyCount,
      };
    });
  };

  const locationUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  async function scheduleLocationUpdate(location: Location.LocationObject) {
    if (!location) return;

    if (locationUpdateTimeoutRef.current) {
      clearTimeout(locationUpdateTimeoutRef.current);
    }

    locationUpdateTimeoutRef.current = setTimeout(async () => {
      await updateUserLocations({
        latitude: location.coords.latitude.toString(),
        longitude: location.coords.longitude.toString(),
      });
    }, 2000);
  }

  useEffect(() => {
    getFollowedUserDetails(); // Assuming this doesn't rely on location

    if (location) {
      scheduleLocationUpdate(location as unknown as Location.LocationObject);
    }
  }, [location]);

  const getFollowedUserDetails = useCallback(async () => {
    if (!session?.user.id) return [];

    try {
      // Step 1: Get list of following_ids
      const { data: follows, error: followError } = await supabase
        .from("follows")
        .select("following_id")
        .eq("follower_id", session?.user.id);

      if (followError) throw followError;
      if (!follows || follows.length === 0) return [];

      const followingIds = follows.map((f) => f.following_id);

      // Step 2: Check which of them also follow the session user
      const { data: mutuals, error: mutualError } = await supabase
        .from("follows")
        .select("follower_id")
        .in("follower_id", followingIds) // These people must be the follower
        .eq("following_id", session?.user.id); // ...of the session user

      if (mutualError) throw mutualError;

      const mutualFollowerIds = mutuals.map((m) => m.follower_id);

      // Step 2: Fetch user data in batch
      const { data: users, error: usersError } = await supabase
        .from("users")
        .select("id, avatar_url")
        .in("id", mutualFollowerIds)
        .eq("is_live_location_shared", 1);

      if (usersError) throw usersError;

      const live_usersIds = users.map((m) => m.id);
      // Step 3: Fetch location data in batch
      const { data: locations, error: locationError } = await supabase
        .from("user_locations")
        .select("user_id, live_location_latitude, live_location_longitude")
        .in("user_id", live_usersIds);

      if (locationError) throw locationError;

      // Step 4: Combine all data
      const result = live_usersIds.map((userId) => {
        const userDetail = users.find((u) => u.id === userId);
        const locationDetail = locations.find((l) => l.user_id === userId);

        return {
          userId,
          avatar_url: userDetail?.avatar_url || null,
          live_location_latitude:
            parseFloat(locationDetail?.live_location_latitude || "0") || 0.0,
          live_location_longitude:
            parseFloat(locationDetail?.live_location_longitude || "0") || 0.0,
        };
      });

      const updatedFollowerList = getNearbyFollowerCounts(result);
      setFollowerList(updatedFollowerList);
      return result;
    } catch (error) {
      console.error("Error fetching followed user details:", error);
      return [];
    }
  }, [session?.user.id]);

  // Initialize and watch location
  useEffect(() => {
    let locationSubscription: Location.LocationSubscription;

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setErrorMsg("Permission to access location was denied");
        return;
      }

      try {
        const initialLocation = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.BestForNavigation,
        });

        setLocation({
          latitude: initialLocation.coords.latitude,
          longitude: initialLocation.coords.longitude,
          heading: initialLocation.coords.heading || undefined,
        });

        // Don't set initial camera position here - let the location preference effect handle it
        // The map center will be set based on user preferences in the separate effect

        locationSubscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.BestForNavigation,
            distanceInterval: 10, // Only update if moved 10 meters
            timeInterval: 5000, // Or every 5 seconds
          },
          (newLocation) => {
            setLocation({
              latitude: newLocation.coords.latitude,
              longitude: newLocation.coords.longitude,
              heading: newLocation.coords.heading || undefined,
            });
          }
        );
      } catch (error) {
        console.error("Location error:", error);
        setErrorMsg(
          "Error getting location. Please check your location settings."
        );
      }
    })();

    return () => locationSubscription?.remove();
  }, []);

  const handleMapTap = useCallback(() => {
    if (selectedEvent) {
      handleCloseModal();
    }
  }, [selectedEvent, handleCloseModal]);

  const handleEventSelect = useCallback(
    (event: MapEvent) => {
      // Center map on selected event
      const coords = getLocationCoordinates(event.location);
      if (cameraRef.current && coords) {
        cameraRef.current.setCamera({
          centerCoordinate: [coords.longitude, coords.latitude],
          zoomLevel: 14,
          animationDuration: 500,
          animationMode: "flyTo",
        });
      }
      handleEventClick(event);
    },
    [handleEventClick, cameraRef]
  );

  const handleClusterPress = useCallback(
    (cluster: UnifiedCluster) => {
      if (cluster.type === "event") {
        // Handle event cluster
        if (cluster.events?.length === 1) {
          // Center map on selected event
          const coords = getLocationCoordinates(cluster.events[0].location);
          if (cameraRef.current && coords) {
            cameraRef.current.setCamera({
              centerCoordinate: [
                coords.longitude, // longitude
                coords.latitude, // latitude
              ],
              zoomLevel: 14,
              animationDuration: 500,
              animationMode: "flyTo",
            });
          }
          handleEventClick(cluster.events[0]);
        } else {
          setSelectedCluster(cluster.events || []);
        }
      } else if (cluster.type === "location") {
        // Handle location cluster
        if (cluster.locations?.length === 1) {
          // Center map on selected location
          const coords = getLocationCoordinates(cluster.locations[0].location);
          if (cameraRef.current && coords) {
            cameraRef.current.setCamera({
              centerCoordinate: [
                coords.longitude, // longitude
                coords.latitude, // latitude
              ],
              zoomLevel: 14,
              animationDuration: 500,
              animationMode: "flyTo",
            });
          }
          // Convert MapLocation to MapEvent format for the card
          const locationAsEvent = {
            ...cluster.locations[0],
            start_datetime: new Date().toISOString(),
            end_datetime: new Date().toISOString(),
            venue_name: cluster.locations[0].name,
            attendees: { count: 0, profiles: [] },
            categories: cluster.locations[0].category
              ? [cluster.locations[0].category]
              : [],
          } as MapEvent;

          handleEventClick(locationAsEvent);
        } else {
          setSelectedCluster(cluster.locations || []);
        }
      }
    },
    [handleEventClick, cameraRef]
  );

  // OPTIMIZATION: Memoized marker component to prevent re-renders
  const MemoizedMarker = useCallback(
    ({
      cluster,
      index,
      timeFrame,
      markerData,
    }: {
      cluster: any;
      index: number;
      timeFrame: string;
      markerData: any;
    }) => {
      const isSelected = getIsSelected(cluster);

      return (
        <MapboxGL.MarkerView
          key={`cluster-${timeFrame}-${cluster.coordinate[0].toFixed(
            3
          )}-${cluster.coordinate[1].toFixed(3)}-${index}`}
          id={`cluster-${timeFrame}-${cluster.coordinate[0].toFixed(
            3
          )}-${cluster.coordinate[1].toFixed(3)}-${index}`}
          coordinate={markerData.coordinate}
          anchor={{ x: 0.5, y: 0.5 }}
        >
          <View
            style={{
              zIndex: isSelected ? 1000 : 100,
            }}
          >
            <EventMarker
              imageUrl={cluster.mainEvent?.image_urls?.[0]}
              count={markerData.count}
              isSelected={isSelected}
              markerType={getMarkerType(markerData.mainEventForMarker)}
              categoryName={getCategoryName(markerData.mainEventForMarker)}
              onPress={() => {
                setIsEvent(cluster.type === "event");
                handleClusterPress(cluster);
              }}
            />
          </View>
        </MapboxGL.MarkerView>
      );
    },
    [
      getIsSelected,
      getMarkerType,
      getCategoryName,
      setIsEvent,
      handleClusterPress,
    ]
  );

  const handleLocationSelect = useCallback(
    (location: MapLocation) => {
      // Center map on selected location
      const coords = getLocationCoordinates(location.location);
      if (cameraRef.current && coords) {
        cameraRef.current.setCamera({
          centerCoordinate: [coords.longitude, coords.latitude],
          zoomLevel: 14,
          animationDuration: 500,
          animationMode: "flyTo",
        });
      }
      // Convert MapLocation to MapEvent format for the card
      const locationAsEvent = {
        ...location,
        start_datetime: new Date().toISOString(),
        end_datetime: new Date().toISOString(),
        venue_name: location.name,
        attendees: { count: 0, profiles: [] },
        categories: location.category ? [location.category] : [],
      } as MapEvent;

      handleEventClick(locationAsEvent);
    },
    [cameraRef, handleEventClick]
  );

  const handleClusterClose = useCallback(() => {
    setSelectedCluster(null);
  }, []);

  if (errorMsg) {
    return (
      <View className="flex-1 justify-center items-center">
        <Text className="text-red-500">{errorMsg}</Text>
      </View>
    );
  }

  if (!location) {
    return (
      <View className="flex-1 justify-center items-center">
        <ActivityIndicator size="large" />
        <Text className="mt-4">Getting your location...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1">
      <MapboxGL.MapView
        ref={mapRef}
        style={styles.map}
        styleURL={
          mapStyleError
            ? getFallbackStyle(isDarkMode)
            : isDarkMode
            ? CUSTOM_DARK_STYLE
            : WORKING_LIGHT_STYLE // Use working light style temporarily
        }
        rotateEnabled
        scrollEnabled
        zoomEnabled
        onTouchMove={() => {
          setIsFollowingUser(false);
          isMapMovingRef.current = true;
          // Reset movement flag after a delay
          setTimeout(() => {
            isMapMovingRef.current = false;
          }, 2000);
        }}
        onPress={handleMapTap}
        logoEnabled={false}
        onDidFinishLoadingMap={() => {
          console.log(
            "Map finished loading with style:",
            isDarkMode ? "DARK" : "LIGHT"
          );
          setMapStyleError(false); // Reset error state on successful load
        }}
        onMapLoadingError={() => {
          console.error("Map failed to load");
          console.log(
            "Attempted style URL:",
            isDarkMode ? CUSTOM_DARK_STYLE : WORKING_LIGHT_STYLE
          );
          console.log("Falling back to:", getFallbackStyle(isDarkMode));
          setMapStyleError(true); // Trigger fallback
        }}
        onRegionDidChange={(region: any) => {
          // Update hide count and zoom level for clustering
          const zoomLevel = region?.properties?.zoomLevel;
          if (zoomLevel) {
            // Update hide count immediately
            if (zoomLevel <= 12) {
              setHideCount(true);
            } else {
              setHideCount(false);
            }

            // Update zoom level for clustering with throttling
            if (zoomDebounceRef.current) {
              clearTimeout(zoomDebounceRef.current);
            }
            zoomDebounceRef.current = setTimeout(() => {
              console.log(`🗺️ [ZOOM] Current zoom level: ${zoomLevel}`);
              setCurrentZoomLevel(zoomLevel);
            }, 500); // 500ms debounce to prevent excessive clustering
          }
        }}
      >
        {/* Progressive loading indicator */}
        {isLoadingProgressively && totalClusterCount > 0 && (
          <View className="absolute right-4 top-20 z-40 p-4 bg-white rounded-xl shadow-lg">
            <View className="flex-row items-center mb-2">
              <ActivityIndicator size="small" color="#8B5CF6" />
              <Text className="ml-2 text-sm font-semibold text-gray-800">
                Loading pins...
              </Text>
            </View>
            <View className="overflow-hidden w-32 h-2 bg-gray-200 rounded-full">
              <View
                className="h-full bg-purple-600 rounded-full transition-all duration-300"
                style={{
                  width: `${(loadedClusterCount / totalClusterCount) * 100}%`,
                }}
              />
            </View>
            <Text className="mt-1 text-xs text-center text-gray-600">
              {loadedClusterCount} / {totalClusterCount} pins
            </Text>
          </View>
        )}
        <MapboxGL.Camera
          ref={cameraRef}
          defaultSettings={{
            centerCoordinate: [
              calculatedCenter[1] || location?.longitude || 0,
              calculatedCenter[0] || location?.latitude || 0,
            ],
            zoomLevel: 13, // Approximately 5-mile radius view
          }}
          maxZoomLevel={16}
          minZoomLevel={3}
          animationMode="flyTo"
          animationDuration={1000}
          followUserLocation={isFollowingUser}
          followUserMode={UserTrackingMode.FollowWithCourse}
          followZoomLevel={13} // Consistent 5-mile radius for follow mode
        />

        {/* Event markers */}
        {selectedTimeFrame == "Today" &&
          memoizedMarkerData.today.map((markerData, index) => {
            const cluster = filteredClustersToday[index];
            if (!cluster?.mainEvent) return null;

            return (
              <MemoizedMarker
                key={markerData.key}
                cluster={cluster}
                index={index}
                timeFrame="today"
                markerData={markerData}
              />
            );
          })}

        {selectedTimeFrame == "Week" &&
          filteredClustersNow.map((cluster, index) => {
            if (!cluster.mainEvent) return null;

            const isSelected =
              cluster.type === "event"
                ? cluster.events?.some(
                    (e: MapEvent) => e.id === selectedEvent?.id
                  ) || false
                : cluster.locations?.some(
                    (l: MapLocation) => l.id === selectedEvent?.id
                  ) || false;

            const count =
              cluster.type === "event"
                ? cluster.events?.length || 0
                : cluster.locations?.length || 0;

            // Convert MapLocation to MapEvent format for marker functions
            const mainEventForMarker =
              cluster.type === "event"
                ? (cluster.mainEvent as MapEvent)
                : ({
                    ...cluster.mainEvent,
                    start_datetime: new Date().toISOString(),
                    end_datetime: new Date().toISOString(),
                    venue_name: cluster.mainEvent.name,
                    attendees: { count: 0, profiles: [] },
                    categories: (cluster.mainEvent as MapLocation).category
                      ? [(cluster.mainEvent as MapLocation).category!]
                      : [],
                  } as MapEvent);

            return (
              <MapboxGL.MarkerView
                key={`cluster-week-${cluster.coordinate[0].toFixed(
                  3
                )}-${cluster.coordinate[1].toFixed(3)}-${index}`}
                id={`cluster-week-${cluster.coordinate[0].toFixed(
                  3
                )}-${cluster.coordinate[1].toFixed(3)}-${index}`}
                coordinate={[
                  cluster.coordinate[1], // longitude
                  cluster.coordinate[0], // latitude
                ]}
                anchor={{ x: 0.5, y: 0.5 }}
              >
                <View
                  style={{
                    zIndex: isSelected ? 1000 : 100,
                  }}
                >
                  <EventMarker
                    imageUrl={cluster.mainEvent?.image_urls?.[0]}
                    count={count}
                    isSelected={isSelected}
                    markerType={getMarkerType(mainEventForMarker)}
                    categoryName={getCategoryName(mainEventForMarker)}
                    onPress={() => {
                      setIsEvent(cluster.type === "event");
                      handleClusterPress(cluster);
                    }}
                  />
                </View>
              </MapboxGL.MarkerView>
            );
          })}

        {selectedTimeFrame == "Weekend" &&
          filteredClustersTomorrow.map((cluster, index) => {
            if (!cluster.mainEvent) return null;

            const isSelected =
              cluster.type === "event"
                ? cluster.events?.some(
                    (e: MapEvent) => e.id === selectedEvent?.id
                  ) || false
                : cluster.locations?.some(
                    (l: MapLocation) => l.id === selectedEvent?.id
                  ) || false;

            const count =
              cluster.type === "event"
                ? cluster.events?.length || 0
                : cluster.locations?.length || 0;

            // Convert MapLocation to MapEvent format for marker functions
            const mainEventForMarker =
              cluster.type === "event"
                ? (cluster.mainEvent as MapEvent)
                : ({
                    ...cluster.mainEvent,
                    start_datetime: new Date().toISOString(),
                    end_datetime: new Date().toISOString(),
                    venue_name: cluster.mainEvent.name,
                    attendees: { count: 0, profiles: [] },
                    categories: (cluster.mainEvent as MapLocation).category
                      ? [(cluster.mainEvent as MapLocation).category!]
                      : [],
                  } as MapEvent);

            return (
              <MapboxGL.MarkerView
                key={`cluster-weekend-${cluster.coordinate[0].toFixed(
                  3
                )}-${cluster.coordinate[1].toFixed(3)}-${index}`}
                id={`cluster-weekend-${cluster.coordinate[0].toFixed(
                  3
                )}-${cluster.coordinate[1].toFixed(3)}-${index}`}
                coordinate={[
                  cluster.coordinate[1], // longitude
                  cluster.coordinate[0], // latitude
                ]}
                anchor={{ x: 0.5, y: 0.5 }}
              >
                <View
                  style={{
                    zIndex: isSelected ? 1000 : 100,
                  }}
                >
                  <EventMarker
                    imageUrl={cluster.mainEvent?.image_urls?.[0]}
                    count={count}
                    isSelected={isSelected}
                    markerType={getMarkerType(mainEventForMarker)}
                    categoryName={getCategoryName(mainEventForMarker)}
                    onPress={() => {
                      setIsEvent(cluster.type === "event");
                      handleClusterPress(cluster);
                    }}
                  />
                </View>
              </MapboxGL.MarkerView>
            );
          })}

        {/* Fallback: Show all clusters if no specific timeframe clusters are available */}
        {clustersNow.length === 0 &&
          clustersToday.length === 0 &&
          clustersTomorrow.length === 0 &&
          clusters.length > 0 &&
          filteredClusters.map((cluster, index) => {
            if (!cluster.mainEvent) return null;

            const isSelected =
              cluster.type === "event"
                ? cluster.events?.some(
                    (e: MapEvent) => e.id === selectedEvent?.id
                  ) || false
                : cluster.locations?.some(
                    (l: MapLocation) => l.id === selectedEvent?.id
                  ) || false;

            const count =
              cluster.type === "event"
                ? cluster.events?.length || 0
                : cluster.locations?.length || 0;

            // Convert MapLocation to MapEvent format for marker functions
            const mainEventForMarker =
              cluster.type === "event"
                ? (cluster.mainEvent as MapEvent)
                : ({
                    ...cluster.mainEvent,
                    start_datetime: new Date().toISOString(),
                    end_datetime: new Date().toISOString(),
                    venue_name: cluster.mainEvent.name,
                    attendees: { count: 0, profiles: [] },
                    categories: (cluster.mainEvent as MapLocation).category
                      ? [(cluster.mainEvent as MapLocation).category!]
                      : [],
                  } as MapEvent);

            return (
              <MapboxGL.MarkerView
                key={`cluster-fallback-${cluster.coordinate[0].toFixed(
                  3
                )}-${cluster.coordinate[1].toFixed(3)}-${index}`}
                id={`cluster-fallback-${cluster.coordinate[0].toFixed(
                  3
                )}-${cluster.coordinate[1].toFixed(3)}-${index}`}
                coordinate={[
                  cluster.coordinate[1], // longitude
                  cluster.coordinate[0], // latitude
                ]}
                anchor={{ x: 0.5, y: 0.5 }}
              >
                <View
                  style={{
                    zIndex: isSelected ? 1000 : 100,
                  }}
                >
                  <EventMarker
                    imageUrl={cluster.mainEvent?.image_urls?.[0]}
                    count={count}
                    isSelected={isSelected}
                    markerType={getMarkerType(mainEventForMarker)}
                    categoryName={getCategoryName(mainEventForMarker)}
                    onPress={() => {
                      setIsEvent(cluster.type === "event");
                      handleClusterPress(cluster);
                    }}
                  />
                </View>
              </MapboxGL.MarkerView>
            );
          })}

        {/* locations fetched from static_location table for (beach, club , park etc) */}
        {clustersLocations.length > 0 &&
          filteredClustersLocations.slice(0, 500).map((cluster, index) => {
            if (!cluster.mainEvent) return null;

            const isSelected =
              cluster.type === "event"
                ? cluster.events?.some(
                    (e: MapEvent) => e.id === selectedEvent?.id
                  ) || false
                : cluster.locations?.some(
                    (l: MapLocation) => l.id === selectedEvent?.id
                  ) || false;

            const count =
              cluster.type === "event"
                ? cluster.events?.length || 0
                : cluster.locations?.length || 0;

            // Convert MapLocation to MapEvent format for marker functions
            const mainEventForMarker =
              cluster.type === "event"
                ? (cluster.mainEvent as MapEvent)
                : ({
                    ...cluster.mainEvent,
                    start_datetime: new Date().toISOString(),
                    end_datetime: new Date().toISOString(),
                    venue_name: cluster.mainEvent.name,
                    attendees: { count: 0, profiles: [] },
                    categories: (cluster.mainEvent as MapLocation).category
                      ? [(cluster.mainEvent as MapLocation).category!]
                      : [],
                  } as MapEvent);

            return (
              <MapboxGL.MarkerView
                key={`cluster-location-${cluster.coordinate[0].toFixed(
                  3
                )}-${cluster.coordinate[1].toFixed(3)}-${index}`}
                id={`cluster-location-${cluster.coordinate[0].toFixed(
                  3
                )}-${cluster.coordinate[1].toFixed(3)}-${index}`}
                coordinate={[
                  cluster.coordinate[1], // longitude
                  cluster.coordinate[0], // latitude
                ]}
                anchor={{ x: 0.5, y: 0.5 }}
              >
                <View
                  style={{
                    zIndex: isSelected ? 1000 : 100,
                  }}
                >
                  <EventMarker
                    imageUrl={cluster.mainEvent?.image_urls?.[0]}
                    count={count}
                    isSelected={isSelected}
                    markerType={
                      cluster.type === "location"
                        ? "static-location"
                        : getMarkerType(mainEventForMarker)
                    }
                    categoryName={getCategoryName(mainEventForMarker)}
                    onPress={() => {
                      setIsEvent(cluster.type === "event");
                      handleClusterPress(cluster);
                    }}
                  />
                </View>
              </MapboxGL.MarkerView>
            );
          })}

        {/* User location marker */}
        {location && (
          <MapboxGL.MarkerView
            id="userLocation"
            coordinate={[location.longitude, location.latitude]}
            anchor={{ x: 0.5, y: 0.5 }}
            allowOverlap={true}
          >
            <View
              className="justify-center items-center"
              style={{ zIndex: 2000 }}
            >
              <UserMarker
                avatarUrl={user?.avatar_url}
                heading={location.heading || undefined}
              />
            </View>
          </MapboxGL.MarkerView>
        )}

        {followerList.length > 0 &&
          followerList.map((followerUser: any) => (
            <MapboxGL.MarkerView
              key={`followerUser-${followerUser?.userId}`}
              id={`followerUser-${followerUser?.userId}`}
              coordinate={[
                followerUser.live_location_longitude,
                followerUser.live_location_latitude,
              ]}
              anchor={{ x: 0.5, y: 0.5 }}
            >
              <View className="justify-center items-center">
                <UserMarkerWithCount
                  avatarUrl={followerUser?.avatar_url}
                  showCount={hideCount}
                  count={
                    followerUser.nearbyCount > 0
                      ? followerUser.nearbyCount + 1
                      : 0
                  } // +1 to include the user
                />
              </View>
            </MapboxGL.MarkerView>
          ))}
      </MapboxGL.MapView>

      {showControler && (
        <MapControls
          onSearch={() => setIsSearchOpen(true)}
          filters={filters}
          onFilterChange={setFilters}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onRecenter={() => {
            // Respect user's location preference when recentering
            if (
              user?.event_location_preference === 1 &&
              userlocation?.latitude &&
              userlocation?.longitude
            ) {
              // User is in orbit mode - recenter to orbit location
              console.log("🗺️ [Map] Recentering to orbit location");
              handleRecenter({
                latitude: parseFloat(userlocation.latitude),
                longitude: parseFloat(userlocation.longitude),
              });
            } else {
              // User is in current mode - recenter to GPS location
              console.log("🗺️ [Map] Recentering to GPS location");
              handleRecenter(location);
            }
          }}
          isFollowingUser={isFollowingUser}
          timeFrame={selectedTimeFrame}
          onSelectedTimeFrame={(txt) => {
            setSelectedTimeFrame(txt as TimeFrame);
          }}
          eventsList={events as any}
          locationsList={locations as any}
          onShowControler={(value: boolean) => setShowControler(value)}
        />
      )}
      {selectedEvent && (
        <UnifiedCard
          data={selectedEvent as any}
          nearbyData={(isEvent ? events : locations) as any}
          onClose={handleCloseModal}
          onDataSelect={(data: any) => {
            if (isEvent) {
              handleEventSelect(data);
            } else {
              handleLocationSelect(data);
            }
          }}
          treatAsEvent={isEvent}
          onShowDetails={() => {
            setShowControler(false);
            setShowDetails(true);
          }}
        />
      )}

      {selectedCluster && (
        <ClusterSheet
          events={selectedCluster}
          onEventSelect={
            handleEventClick as (event: MapEvent | MapLocation) => void
          }
          onClose={handleClusterClose}
        />
      )}
      <SearchSheet
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        eventsList={events as any}
        locationsList={locations as any}
        onShowControler={() => setShowControler(true)}
      />
      {showDetails && selectedEvent && (
        <UnifiedDetailsSheet
          data={selectedEvent as any}
          isOpen={showDetails}
          onClose={() => setShowDetails(false)}
          nearbyData={(isEvent ? events : locations) as any}
          onDataSelect={(data) => handleEventClick(data as any)}
          onShowControler={() => setShowControler(true)}
          isEvent={isEvent}
        />
      )}

      {/* Loading Screen - appears on top when data and markers are loading */}
      <MapLoadingScreen
        isVisible={!isMapFullyLoaded}
        loadingText={getLoadingText().title}
        subtitle={getLoadingText().subtitle}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  map: {
    flex: 1,
    width: Dimensions.get("window").width,
    height: Dimensions.get("window").height,
  },
});
