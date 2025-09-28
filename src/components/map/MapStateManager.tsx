import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useLocalSearchParams } from "expo-router";
import { DeviceEventEmitter, Image } from "react-native";
import * as Location from "expo-location";
import { supabase } from "~/src/lib/supabase";
import { useAuth } from "~/src/lib/auth";
import { useUser } from "~/src/lib/UserProvider";
import {
  useUnifiedMapData,
  type MapEvent,
  type MapLocation,
  type UnifiedCluster,
} from "~/hooks/useUnifiedMapData";
import {
  FilterState,
  generateDefaultFilters,
} from "~/src/components/map/MarkerFilter";
import { useMapCamera } from "~/src/hooks/useMapCamera";

type TimeFrame = "Today" | "Week" | "Weekend";

interface MapStateManagerProps {
  children: (state: MapState) => React.ReactNode;
}

interface MapState {
  // Core state
  selectedTimeFrame: TimeFrame;
  selectedEvent: MapEvent | null;
  selectedCluster: (MapEvent | MapLocation)[] | null;
  showDetails: boolean;
  isEvent: boolean;
  showControler: boolean;
  isSearchOpen: boolean;
  isMapFullyLoaded: boolean;
  currentZoomLevel: number;
  hideCount: boolean;
  loadingReason: "initial" | "timeframe" | "filters" | "data";

  // Location state
  location: {
    latitude: number;
    longitude: number;
    heading?: number | null;
  } | null;
  errorMsg: string | null;

  // Data state
  followerList: any[];
  filters: FilterState;
  mapCenter: [number, number] | null;

  // Map data from useUnifiedMapData hook
  events: MapEvent[];
  locations: MapLocation[];
  eventsNow: MapEvent[];
  eventsToday: MapEvent[];
  eventsTomorrow: MapEvent[];
  clusters: UnifiedCluster[];
  clustersLocations: UnifiedCluster[];
  clustersNow: UnifiedCluster[];
  clustersToday: UnifiedCluster[];
  clustersTomorrow: UnifiedCluster[];
  isLoading: boolean;
  error: string | null;

  // Performance monitoring
  loadStartTime: number | null;
  loadEndTime: number | null;
  renderStartTime: number | null;
  renderEndTime: number | null;

  // Actions
  setSelectedTimeFrame: (timeFrame: TimeFrame) => void;
  setSelectedEvent: (event: MapEvent | null) => void;
  setSelectedCluster: (cluster: (MapEvent | MapLocation)[] | null) => void;
  setShowDetails: (show: boolean) => void;
  setIsEvent: (isEvent: boolean) => void;
  setShowControler: (show: boolean) => void;
  setIsSearchOpen: (open: boolean) => void;
  setMapCenter: (center: [number, number] | null) => void;
  setFilters: (filters: FilterState) => void;
  setCurrentZoomLevel: (zoom: number) => void;
  setHideCount: (hide: boolean) => void;
  setIsMapFullyLoaded: (loaded: boolean) => void;
  handleEventClick: (event: MapEvent) => void;
  handleLocationClick: (location: MapLocation) => void;
  handleClusterPress: (cluster: UnifiedCluster) => void;
  handleCloseModal: () => void;
  handleClusterClose: () => void;
  getCurrentLocation: () => Promise<Location.LocationObject | undefined>;
  forceRefresh: () => void;
}

export function MapStateManager({ children }: MapStateManagerProps) {
  const params = useLocalSearchParams();
  const { session } = useAuth();
  const { user, userlocation, updateUserLocations } = useUser();
  const { cameraRef } = useMapCamera();

  // Core state
  const [selectedTimeFrame, setSelectedTimeFrame] =
    useState<TimeFrame>("Today");
  const [selectedEvent, setSelectedEvent] = useState<MapEvent | null>(null);
  const [selectedCluster, setSelectedCluster] = useState<
    (MapEvent | MapLocation)[] | null
  >(null);
  const [showDetails, setShowDetails] = useState(false);
  const [isEvent, setIsEvent] = useState(false);
  const [showControler, setShowControler] = useState(true);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMapFullyLoaded, setIsMapFullyLoaded] = useState(false);
  const [currentZoomLevel, setCurrentZoomLevel] = useState(13);
  const [hideCount, setHideCount] = useState(false);
  const [loadingReason, setLoadingReason] = useState<
    "initial" | "timeframe" | "filters" | "data"
  >("initial");

  // Location state
  const [location, setLocation] = useState<{
    latitude: number;
    longitude: number;
    heading?: number | null;
  } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Data state
  const [followerList, setFollowerList] = useState<any[]>([]);
  const [filters, setFilters] = useState<FilterState>({ "show-all": true }); // Default to showing everything
  const [mapCenter, setMapCenter] = useState<[number, number] | null>(null);

  // Performance monitoring
  const [loadStartTime, setLoadStartTime] = useState<number | null>(null);
  const [loadEndTime, setLoadEndTime] = useState<number | null>(null);
  const [renderStartTime, setRenderStartTime] = useState<number | null>(null);
  const [renderEndTime, setRenderEndTime] = useState<number | null>(null);

  // Calculate center based on user preferences - FIXED COORDINATE ORDER
  const calculatedCenter = useMemo(() => {
    // ORBIT MODE: Use orbit coordinates
    if (
      user?.event_location_preference === 1 &&
      userlocation?.latitude &&
      userlocation?.longitude
    ) {
      const orbitCenter = [
        parseFloat(userlocation.longitude), // LONGITUDE FIRST for MapboxGL
        parseFloat(userlocation.latitude), // LATITUDE SECOND for MapboxGL
      ] as [number, number];
      console.log(
        "🗺️ [Map] Using orbit center for data fetching:",
        orbitCenter
      );
      return orbitCenter;
    }

    // CURRENT MODE: Use GPS coordinates
    if (
      user?.event_location_preference === 0 &&
      location?.latitude &&
      location?.longitude
    ) {
      const gpsCenter = [location.longitude, location.latitude] as [
        number,
        number
      ]; // LONGITUDE FIRST for MapboxGL
      console.log("🗺️ [Map] Using GPS center for data fetching:", gpsCenter);
      return gpsCenter;
    }

    // Fallback for when preference is not set or no coordinates available
    if (location?.latitude && location?.longitude) {
      const fallbackCenter = [location.longitude, location.latitude] as [
        number,
        number
      ]; // LONGITUDE FIRST for MapboxGL
      console.log(
        "🗺️ [Map] Using fallback center for data fetching:",
        fallbackCenter
      );
      return fallbackCenter;
    }

    console.log("🗺️ [Map] No center available, using [0, 0]");
    return [0, 0] as [number, number];
  }, [
    user?.event_location_preference,
    userlocation?.latitude,
    userlocation?.longitude,
    location?.latitude,
    location?.longitude,
  ]);

  // Use the unified map data hook - always load 'today' data initially
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
    forceRefresh: forceRefresh,
    fetchTimeframeData,
    debugBackendPerformance,
  } = useUnifiedMapData({
    center: calculatedCenter,
    radius: 50000, // 50 miles radius
    timeRange: "today", // Always load 'today' data - tab clicks use fetchTimeframeData
    zoomLevel: currentZoomLevel,
  });

  // Handle tab clicks efficiently - only fetch additional data for week/weekend
  const handleTimeFrameChange = useCallback(
    (timeFrame: TimeFrame) => {
      setSelectedTimeFrame(timeFrame);

      // Only fetch additional data for week/weekend tabs
      if (timeFrame === "Week") {
        console.log("🗓️ [MapStateManager] Loading Week data (nearby only)");
        fetchTimeframeData("week");
      } else if (timeFrame === "Weekend") {
        console.log("🗓️ [MapStateManager] Loading Weekend data (nearby only)");
        fetchTimeframeData("weekend");
      }
      // For "Today", we already have the data from initial load
    },
    [fetchTimeframeData]
  );

  // Debug zoom level changes
  useEffect(() => {
    console.log(
      `🗺️ [MapStateManager] Zoom level changed to: ${currentZoomLevel}`
    );
  }, [currentZoomLevel]);

  // Get current location function
  const getCurrentLocation = useCallback(async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        console.log("🗺️ [Map] Location permission denied");
        return;
      }

      console.log("🗺️ [Map] Getting current GPS location...");
      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      setLocation({
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
        heading: currentLocation.coords.heading || undefined,
      });

      // Set map center to current location - FIXED COORDINATE ORDER
      const newMapCenter: [number, number] = [
        currentLocation.coords.longitude, // LONGITUDE FIRST for MapboxGL
        currentLocation.coords.latitude, // LATITUDE SECOND for MapboxGL
      ];
      setMapCenter(newMapCenter);
      console.log("🗺️ [Map] Set map center to:", newMapCenter);

      console.log("🗺️ [Map] Updated GPS location:", {
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
      });

      return currentLocation;
    } catch (error) {
      console.error("🗺️ [Map] Error getting current location:", error);
    }
  }, []);

  // Initialize and keep filters up-to-date with data: select ALL by default
  useEffect(() => {
    // Only proceed when we have some data
    if (events.length === 0 && locations.length === 0) return;

    const defaults = generateDefaultFilters(events, locations);

    // Case 1: If filters are empty or only contain the fallback 'show-all',
    // replace with the full default set so all toggles show as selected.
    const currentKeys = Object.keys(filters || {});
    const onlyShowAll =
      currentKeys.length === 1 && (filters as any)?.["show-all"] === true;
    if (!filters || currentKeys.length === 0 || onlyShowAll) {
      setFilters(defaults);
      return;
    }

    // Case 2: Merge in any new categories/keys discovered later, defaulting to true,
    // while preserving the user's current on/off selections.
    const merged: FilterState = { ...defaults, ...filters };
    const mergedKeys = Object.keys(merged);
    if (mergedKeys.length !== currentKeys.length) {
      setFilters(merged);
    }
  }, [events, locations]);

  // Preload images for better performance
  useEffect(() => {
    const preloadImages = async () => {
      if (events.length === 0 && locations.length === 0) return;

      console.log("🖼️ [MapStateManager] Starting image preloading...");

      // Collect all image URLs
      const imageUrls: string[] = [];

      // Add event images with service-specific optimization
      events.forEach((event) => {
        if (event.image_urls && event.image_urls.length > 0) {
          const url = event.image_urls[0];
          // Only add optimization parameters for services that support them
          if (url.includes("supabase.co/storage")) {
            imageUrls.push(url); // Supabase Storage - no optimization
          } else {
            imageUrls.push(`${url}?w=40&h=40&fit=crop&auto=format&q=60&f=webp`);
          }
        }
      });

      // Add location images with service-specific optimization
      locations.forEach((location) => {
        if (location.image_urls && location.image_urls.length > 0) {
          const url = location.image_urls[0];
          // Only add optimization parameters for services that support them
          if (url.includes("supabase.co/storage")) {
            imageUrls.push(url); // Supabase Storage - no optimization
          } else {
            imageUrls.push(`${url}?w=40&h=40&fit=crop&auto=format&q=60&f=webp`);
          }
        }
      });

      // Optimized image preloading - prioritize visible markers
      const imagesToPreload = imageUrls.slice(0, 5); // Reduced to 5 most critical images

      console.log(
        `🖼️ [MapStateManager] Preloading ${imagesToPreload.length} critical images...`
      );

      // Batch preload with concurrent loading for better performance
      const preloadBatch = async () => {
        const promises = imagesToPreload.map(
          (url, index) =>
            new Promise((resolve) => {
              setTimeout(() => {
                Image.prefetch(url)
                  .then(resolve)
                  .catch(() => resolve(null)); // Silently fail
              }, index * 100); // Faster intervals - 100ms
            })
        );

        await Promise.allSettled(promises);
      };

      // Start preloading in background
      preloadBatch().catch(() => {
        // Silently handle any batch errors
      });
    };

    preloadImages();
  }, [events, locations]);

  // Handle loading state management
  useEffect(() => {
    if (isLoading) {
      setLoadingReason("data");
      setIsMapFullyLoaded(false);

      if (!loadStartTime) {
        setLoadStartTime(Date.now());
        console.log("[Map] 🚀 Data loading started");
      }
    } else {
      if (loadStartTime && !loadEndTime) {
        const endTime = Date.now();
        const loadTime = endTime - loadStartTime;
        setLoadEndTime(endTime);
        // REMOVED: Excessive timing logs

        setTimeout(() => {
          setLoadStartTime(null);
          setLoadEndTime(null);
        }, 1000);
      }
    }
  }, [isLoading, loadStartTime, loadEndTime]);

  // FIXED: PROPER LOADING STATE - ONLY HIDE WHEN DATA IS ACTUALLY READY
  useEffect(() => {
    console.log("[Map] 🔍 DEBUG: Loading state check", {
      clustersLength: clusters.length,
      clustersLocationsLength: clustersLocations.length,
      isLoading,
      isMapFullyLoaded,
    });

    // Only hide loading screen when we have actual data AND loading is complete
    if (
      (clusters.length > 0 || clustersLocations.length > 0) &&
      !isLoading &&
      !isMapFullyLoaded
    ) {
      console.log(
        "[Map] ✅ Data loaded and markers ready, hiding loading screen"
      );
      setIsMapFullyLoaded(true);
    }
  }, [clusters.length, clustersLocations.length, isLoading]); // Removed isMapFullyLoaded from dependencies to prevent infinite loop

  // FIXED: LONGER TIMEOUT - ONLY HIDE AFTER 30 SECONDS IF NO DATA
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (clusters.length === 0 && clustersLocations.length === 0) {
        console.log(
          "[Map] ⏰ TIMEOUT: No data after 30 seconds, hiding loading screen"
        );
        setIsMapFullyLoaded(true);
      }
    }, 30000); // 30 seconds timeout

    return () => clearTimeout(timeout);
  }, [clusters.length, clustersLocations.length]); // Re-run when data changes

  // CRITICAL FIX: MANUAL FORCE REFRESH FUNCTION
  const forceRefreshMap = useCallback(() => {
    console.log("[Map] 🔄 MANUAL FORCE REFRESH TRIGGERED");
    setIsMapFullyLoaded(true);
  }, []);

  // REMOVED: Progressive rendering tracking - unnecessary complexity

  // Initialize location on mount - FIXED TO UPDATE MAP CENTER PROPERLY
  useEffect(() => {
    console.log("🗺️ [Map] Map center update triggered:", {
      calculatedCenter,
      userPreference: user?.event_location_preference,
      userlocation: userlocation
        ? {
            latitude: userlocation.latitude,
            longitude: userlocation.longitude,
          }
        : null,
      currentLocation: location
        ? {
            latitude: location.latitude,
            longitude: location.longitude,
          }
        : null,
    });

    // Always update map center when calculatedCenter changes
    if (calculatedCenter[0] !== 0 || calculatedCenter[1] !== 0) {
      console.log(
        "🗺️ [Map] Setting map center to calculated center:",
        calculatedCenter
      );
      setMapCenter(calculatedCenter);
    } else {
      // If no calculated center, get current GPS location
      console.log("🗺️ [Map] No calculated center, getting current location");
      getCurrentLocation();
    }
  }, [
    calculatedCenter,
    getCurrentLocation,
    user?.event_location_preference,
    userlocation,
    location,
  ]);

  // REMOVED: Manual timeout - loading screen should be dynamic based on actual data

  // Handle route params for showing event/location cards
  useEffect(() => {
    if (params.eventId) {
      const event =
        eventsNow.find((e: MapEvent) => e.id === params.eventId) ||
        eventsToday.find((e: MapEvent) => e.id === params.eventId) ||
        eventsTomorrow.find((e: MapEvent) => e.id === params.eventId);

      if (event) {
        setIsEvent(true);
        setSelectedEvent(event);
      }
    }

    if (params.locationId) {
      let location = locations.find(
        (l: MapLocation) => l.id === params.locationId
      );

      if (!location && params.name) {
        const searchName = Array.isArray(params.name)
          ? params.name[0]
          : params.name;
        location = locations.find(
          (l: MapLocation) =>
            l.name?.toLowerCase().includes(searchName.toLowerCase()) ||
            searchName.toLowerCase().includes(l.name?.toLowerCase())
        );
      }
      console.log("Location search result:", location, params);
      if (location) {
        setIsEvent(false);
        handleLocationClick(location);
      }
    }
  }, [
    params.eventId,
    params.locationId,
    params.name,
    eventsNow,
    eventsToday,
    eventsTomorrow,
    locations,
  ]);

  // Event handlers
  const handleEventClick = useCallback((event: MapEvent) => {
    console.log("🎯 [MapStateManager] handleEventClick called!", {
      eventId: event.id,
      eventName: event.name,
      eventType: event.categories?.[0]?.name || "Unknown",
    });

    console.log(JSON.stringify(event, null, 2));
    setSelectedEvent(event);
    setShowDetails(false);
    setIsEvent(true);

    console.log(
      "🎯 [MapStateManager] selectedEvent state updated, UnifiedCard should show"
    );
  }, []);

  const handleLocationClick = useCallback(
    (location: MapLocation) => {
      setIsEvent(false);
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

  const handleClusterPress = useCallback(
    (cluster: UnifiedCluster) => {
      console.log("🎯 [MapStateManager] handleClusterPress called!", {
        clusterType: cluster.type,
        eventCount: cluster.events?.length || 0,
        locationCount: cluster.locations?.length || 0,
        mainEventId: cluster.mainEvent?.id,
      });

      if (cluster.type === "event") {
        if (cluster.events?.length === 1) {
          console.log(
            "🎯 [MapStateManager] Single event cluster, calling handleEventClick"
          );
          handleEventClick(cluster.events[0]);
        } else {
          console.log(
            "🎯 [MapStateManager] Multiple event cluster, showing cluster sheet"
          );
          setSelectedCluster(cluster.events || []);
        }
      } else if (cluster.type === "location") {
        if (cluster.locations?.length === 1) {
          console.log(
            "🎯 [MapStateManager] Single location cluster, converting to event and calling handleEventClick"
          );
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
          console.log(
            "🎯 [MapStateManager] Multiple location cluster, showing cluster sheet"
          );
          setSelectedCluster(cluster.locations || []);
        }
      }
    },
    [handleEventClick]
  );

  const handleCloseModal = useCallback(() => {
    setSelectedEvent(null);
    setShowDetails(false);
  }, []);

  const handleClusterClose = useCallback(() => {
    setSelectedCluster(null);
  }, []);

  // Fetch follower data
  const getFollowedUserDetails = useCallback(async () => {
    if (!session?.user.id) return [];

    try {
      const { data: follows, error: followError } = await supabase
        .from("follows")
        .select("following_id")
        .eq("follower_id", session?.user.id);

      if (followError) throw followError;
      if (!follows || follows.length === 0) return [];

      const followingIds = follows.map((f) => f.following_id);

      const { data: mutuals, error: mutualError } = await supabase
        .from("follows")
        .select("follower_id")
        .in("follower_id", followingIds)
        .eq("following_id", session?.user.id);

      if (mutualError) throw mutualError;

      const mutualFollowerIds = mutuals.map((m) => m.follower_id);

      const { data: users, error: usersError } = await supabase
        .from("users")
        .select("id, avatar_url")
        .in("id", mutualFollowerIds)
        .eq("is_live_location_shared", 1);

      if (usersError) throw usersError;

      const live_usersIds = users.map((m) => m.id);

      const { data: locations, error: locationError } = await supabase
        .from("user_locations")
        .select("user_id, live_location_latitude, live_location_longitude")
        .in("user_id", live_usersIds);

      if (locationError) throw locationError;

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

  // Helper function for nearby follower counts
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

  // Initialize follower data
  useEffect(() => {
    getFollowedUserDetails();
  }, [getFollowedUserDetails]);

  // Set up event listeners
  useEffect(() => {
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
        setMapCenter([data.lat, data.lng]);

        setTimeout(() => {
          const event =
            eventsNow.find((e: MapEvent) => e.id === data.eventId) ||
            eventsToday.find((e: MapEvent) => e.id === data.eventId) ||
            eventsTomorrow.find((e: MapEvent) => e.id === data.eventId);

          if (event) {
            setIsEvent(true);
            handleEventClick(event as MapEvent);
          }
        }, 2000);
      }
    );

    const locationPreferenceListener = DeviceEventEmitter.addListener(
      "locationPreferenceUpdated",
      (eventPayload: {
        mode: string;
        latitude?: number;
        longitude?: number;
      }) => {
        console.log(
          "📍 [MapStateManager] Location preference updated:",
          eventPayload
        );

        if (
          eventPayload.mode === "orbit" &&
          eventPayload.latitude &&
          eventPayload.longitude
        ) {
          console.log("📍 [MapStateManager] Setting orbit center:", [
            eventPayload.longitude, // LONGITUDE FIRST for MapboxGL
            eventPayload.latitude, // LATITUDE SECOND for MapboxGL
          ]);
          setMapCenter([eventPayload.longitude, eventPayload.latitude]); // LONGITUDE FIRST for MapboxGL

          // Force refresh data for new location
          if (forceRefresh) {
            console.log(
              "📍 [MapStateManager] Force refreshing data for orbit location"
            );
            forceRefresh();
          }

          // Also trigger camera movement to the new location
          setTimeout(() => {
            if (cameraRef.current) {
              cameraRef.current.setCamera({
                centerCoordinate: [
                  eventPayload.longitude!,
                  eventPayload.latitude!,
                ], // LONGITUDE FIRST for MapboxGL
                zoomLevel: 13 as number,
                animationDuration: 1000,
                animationMode: "flyTo",
              });
            }
          }, 100);
        } else if (eventPayload.mode === "current") {
          console.log(
            "📍 [MapStateManager] Switching to current location mode"
          );
          if (location?.latitude && location?.longitude) {
            setMapCenter([location.longitude, location.latitude]); // LONGITUDE FIRST for MapboxGL

            // Force refresh data for current location
            if (forceRefresh) {
              console.log(
                "📍 [MapStateManager] Force refreshing data for current location"
              );
              forceRefresh();
            }

            // Also trigger camera movement to current location
            setTimeout(() => {
              if (cameraRef.current) {
                cameraRef.current.setCamera({
                  centerCoordinate: [location.longitude, location.latitude], // LONGITUDE FIRST for MapboxGL
                  zoomLevel: 13 as number,
                  animationDuration: 1000,
                  animationMode: "flyTo",
                });
              }
            }, 100);
          } else {
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
    location,
    getCurrentLocation,
  ]);

  const state: MapState = {
    // Core state
    selectedTimeFrame,
    selectedEvent,
    selectedCluster,
    showDetails,
    isEvent,
    showControler,
    isSearchOpen,
    isMapFullyLoaded,
    currentZoomLevel,
    hideCount,
    loadingReason,

    // Location state
    location,
    errorMsg,

    // Data state
    followerList,
    filters,
    mapCenter,

    // Map data from useUnifiedMapData hook
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

    // Performance monitoring
    loadStartTime,
    loadEndTime,
    renderStartTime,
    renderEndTime,

    // Actions
    setSelectedTimeFrame: handleTimeFrameChange,
    setSelectedEvent,
    setSelectedCluster,
    setShowDetails,
    setIsEvent,
    setShowControler,
    setIsSearchOpen,
    setMapCenter,
    setFilters,
    setCurrentZoomLevel,
    setHideCount,
    setIsMapFullyLoaded,
    handleEventClick,
    handleLocationClick,
    handleClusterPress,
    handleCloseModal,
    handleClusterClose,
    getCurrentLocation,
    forceRefresh: forceRefresh,
  };

  return <>{children(state)}</>;
}
