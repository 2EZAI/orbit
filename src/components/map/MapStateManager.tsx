import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useLocalSearchParams } from "expo-router";
import { DeviceEventEmitter, Image } from "react-native";
import * as Location from "expo-location";
import { supabase } from "~/src/lib/supabase";
import { useAuth } from "~/src/lib/auth";
import { useUser } from "~/src/lib/UserProvider";
import { setCurrentMapCenter } from "~/src/lib/mapCenter";
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

type TimeFrame = "Today" | "Week" | "Weekend";

interface MapStateManagerProps {
  children: (state: MapState) => React.ReactNode;
  cameraRef: React.RefObject<any>;
}

interface MapState {
  // Core state
  selectedTimeFrame: TimeFrame;
  selectedEvent: (MapEvent | MapLocation) | null;
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
  calculatedCenter: [number, number];

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

export function MapStateManager({ children, cameraRef }: MapStateManagerProps) {
  const params = useLocalSearchParams();
  const { session } = useAuth();
  const { user, userlocation, updateUserLocations } = useUser();

  // Helper function to extract coordinates from location object
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

  // Core state
  const [selectedTimeFrame, setSelectedTimeFrame] =
    useState<TimeFrame>("Today");
  const [selectedEvent, setSelectedEvent] = useState<(MapEvent | MapLocation) | null>(null);
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
  const [locationChangeCenter, setLocationChangeCenter] = useState<[number, number] | null>(null);

  // Performance monitoring
  const [loadStartTime, setLoadStartTime] = useState<number | null>(null);
  const [loadEndTime, setLoadEndTime] = useState<number | null>(null);
  const [renderStartTime, setRenderStartTime] = useState<number | null>(null);
  const [renderEndTime, setRenderEndTime] = useState<number | null>(null);

  // Calculate center based on user preferences - FIXED COORDINATE ORDER
  const calculatedCenter = useMemo(() => {
    // LOCATION CHANGE MODE: Use the new location center
    if (locationChangeCenter) {
      console.log("🗺️ [Map] Using location change center for data fetching:", locationChangeCenter);
      return locationChangeCenter;
    }

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
    locationChangeCenter,
    user?.event_location_preference,
    userlocation?.latitude,
    userlocation?.longitude,
    location?.latitude,
    location?.longitude,
  ]);

  // Update global map center when calculatedCenter changes
  useEffect(() => {
    if (calculatedCenter && calculatedCenter[0] !== 0 && calculatedCenter[1] !== 0) {
      setCurrentMapCenter({
        latitude: calculatedCenter[1], // Convert from [lng, lat] to {lat, lng}
        longitude: calculatedCenter[0]
      });
    }
  }, [calculatedCenter]);

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

      // console.log("🖼️ [MapStateManager] Starting image preloading...");

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

      // console.log(
      //   `🖼️ [MapStateManager] Preloading ${imagesToPreload.length} critical images...`
      // );

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
    // console.log("🗺️ [MapStateManager] Checking params:", params);
    
    if (params.eventId) {
      console.log("🗺️ [MapStateManager] Looking for event with ID:", params.eventId);
      let event =
        eventsNow.find((e: MapEvent) => e.id === params.eventId) ||
        eventsToday.find((e: MapEvent) => e.id === params.eventId) ||
        eventsTomorrow.find((e: MapEvent) => e.id === params.eventId);

      // If event not found in existing data, check if we have eventData from params
      if (!event && params.eventData) {
        try {
          console.log("🗺️ [MapStateManager] Event not found in data, using provided eventData");
          const eventData = JSON.parse(params.eventData as string);
          event = eventData as MapEvent;
          console.log("🗺️ [MapStateManager] Using provided event data:", event.name);
        } catch (error) {
          console.error("🗺️ [MapStateManager] Error parsing eventData:", error);
        }
      }

      console.log("🗺️ [MapStateManager] Event found:", event ? event.name : "NOT FOUND");
      
      // If not found, create event object from params (for external events or events not in current timeframe)
      if (!event && params.name && params.latitude && params.longitude) {
        console.log("🗺️ [MapStateManager] Creating event from params (external or out of timeframe)");
        const lat = parseFloat(Array.isArray(params.latitude) ? params.latitude[0] : params.latitude);
        const lng = parseFloat(Array.isArray(params.longitude) ? params.longitude[0] : params.longitude);
        
        event = {
          id: Array.isArray(params.eventId) ? params.eventId[0] : params.eventId,
          name: Array.isArray(params.name) ? params.name[0] : params.name,
          description: params.description ? (Array.isArray(params.description) ? params.description[0] : params.description) : "",
          venue_name: params.venue_name ? (Array.isArray(params.venue_name) ? params.venue_name[0] : params.venue_name) : "",
          type: params.type ? (Array.isArray(params.type) ? params.type[0] : params.type) : "event",
          is_ticketmaster: params.source === "ticketmaster",
          created_by: params.created_by ? (Array.isArray(params.created_by) ? JSON.parse(params.created_by[0]) : (typeof params.created_by === 'string' && params.created_by.startsWith('{') ? JSON.parse(params.created_by) : params.created_by)) : undefined,
          start_datetime: new Date().toISOString(), // Default to now to avoid invalid date errors
          end_datetime: new Date(Date.now() + 3600000).toISOString(), // Default to 1 hour from now
          location: {
            type: "Point",
            coordinates: [lng, lat]
          },
          coordinates: {
            latitude: lat,
            longitude: lng
          }
        } as MapEvent;
      }
      
      if (event) {
        console.log("🗺️ [MapStateManager] Setting event and showing card first");
        setIsEvent(true);
        setSelectedEvent(event);
        setShowDetails(false); // Show card first, not details sheet
        
        // Focus the map on the newly created event
        if (params.eventData && event.location) {
          console.log("🗺️ [MapStateManager] Focusing map on newly created event");
          const coords = getLocationCoordinates(event.location);
          if (coords) {
            setMapCenter([coords.longitude, coords.latitude]);
          }
        }
      }
    }

    if (params.locationId) {
      console.log("🗺️ [MapStateManager] Looking for location with ID:", params.locationId);
      let location = locations.find(
        (l: MapLocation) => l.id === params.locationId
      );

      if (!location && params.name) {
        const searchName = Array.isArray(params.name)
          ? params.name[0]
          : params.name;
        console.log("🗺️ [MapStateManager] Searching by name:", searchName);
        location = locations.find(
          (l: MapLocation) =>
            l.name?.toLowerCase().includes(searchName.toLowerCase()) ||
            searchName.toLowerCase().includes(l.name?.toLowerCase())
        );
      }
      
      // If still not found, create a location object from params (for external locations like Google Places)
      if (!location && params.latitude && params.longitude && params.name) {
        console.log("🗺️ [MapStateManager] Creating location from params (external source)");
        const lat = parseFloat(Array.isArray(params.latitude) ? params.latitude[0] : params.latitude);
        const lng = parseFloat(Array.isArray(params.longitude) ? params.longitude[0] : params.longitude);
        
        location = {
          id: Array.isArray(params.locationId) ? params.locationId[0] : params.locationId,
          name: Array.isArray(params.name) ? params.name[0] : params.name,
          description: params.description ? (Array.isArray(params.description) ? params.description[0] : params.description) : "",
          type: params.type ? (Array.isArray(params.type) ? params.type[0] : params.type) : "location",
          address: params.address ? (Array.isArray(params.address) ? params.address[0] : params.address) : "",
          location: {
            type: "Point",
            coordinates: [lng, lat]
          },
          coordinates: {
            latitude: lat,
            longitude: lng
          }
        } as MapLocation;
      }
      
      console.log("🗺️ [MapStateManager] Location found:", location ? location.name : "NOT FOUND", params);
      if (location) {
        console.log("🗺️ [MapStateManager] Calling handleLocationClick for:", {
          locationId: location.id,
          locationName: location.name,
          isEvent: false,
        });
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

  // Handle location change when user confirms to load data for new area
  useEffect(() => {
    if (params.changeLocation === "true" && params.lat && params.lng) {
      console.log("🗺️ [MapStateManager] Location change requested, updating map center");
      
      const newLat = parseFloat(params.lat as string);
      const newLng = parseFloat(params.lng as string);
      
      // Update location change center to trigger data reload
      const newCenter = [newLng, newLat] as [number, number];
      setLocationChangeCenter(newCenter);
      
      console.log("🗺️ [MapStateManager] Location change center set to:", newCenter);
      
      // Also update map center for camera positioning
      setMapCenter(newCenter);
    }
  }, [params.changeLocation, params.lat, params.lng]);

  // Event handlers
  const handleEventClick = useCallback((event: MapEvent) => {
    console.log("🎯 [MapStateManager] handleEventClick called!", {
      eventId: event.id,
      eventName: event.name,
      eventType: event.categories?.[0]?.name || event.type || "Unknown",
    });

    console.log(JSON.stringify(event, null, 2));
    setSelectedEvent(event);
    setShowDetails(false);
    setIsEvent(true);

    // Focus camera on the selected event
    const coords = getLocationCoordinates(event.location);
    console.log("🎯 [MapStateManager] Camera focus debug:", {
      cameraRefExists: !!cameraRef.current,
      eventLocation: event.location,
      extractedCoords: coords,
      eventName: event.name
    });
    
    if (cameraRef.current && coords) {
      console.log("🎯 [MapStateManager] Setting camera to coordinates:", coords);
      
      try {
        cameraRef.current.setCamera({
          centerCoordinate: [coords.longitude, coords.latitude],
          zoomLevel: 16,
          animationDuration: 800,
          animationMode: "flyTo",
        });
        console.log("🎯 [MapStateManager] Camera focused on event:", event.name);
      } catch (error) {
        console.error("🎯 [MapStateManager] Camera focus error:", error);
      }
    } else {
      console.log("🎯 [MapStateManager] Camera focus skipped - missing camera ref or coordinates");
    }

    console.log(
      "🎯 [MapStateManager] selectedEvent state updated, UnifiedCard should show"
    );
  }, [cameraRef]);

  const handleLocationClick = useCallback(
    (location: MapLocation) => {
      setIsEvent(false);
      
      // Focus camera on the selected location
      const coords = getLocationCoordinates(location.location);
      console.log("🎯 [MapStateManager] Location camera focus debug:", {
        cameraRefExists: !!cameraRef.current,
        locationData: location.location,
        extractedCoords: coords,
        locationName: location.name
      });
      
      if (cameraRef.current && coords) {
        console.log("🎯 [MapStateManager] Setting camera to location coordinates:", coords);
        
        try {
          cameraRef.current.setCamera({
            centerCoordinate: [coords.longitude, coords.latitude],
            zoomLevel: 16,
            animationDuration: 800,
            animationMode: "flyTo",
          });
          console.log("🎯 [MapStateManager] Camera focused on location:", location.name);
        } catch (error) {
          console.error("🎯 [MapStateManager] Location camera focus error:", error);
        }
      } else {
        console.log("🎯 [MapStateManager] Location camera focus skipped - missing camera ref or coordinates");
      }
      
      // Set the location directly without converting to event
      console.log("🎯 [MapStateManager] Setting selectedEvent to location:", {
        locationId: location.id,
        locationName: location.name,
        locationType: location.type,
      });
      setSelectedEvent(location);
      setShowDetails(false);
    },
    [cameraRef]
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
            "🎯 [MapStateManager] Single location cluster, calling handleLocationClick"
          );
          // Don't convert location to event - call location handler directly
          handleLocationClick(cluster.locations[0]);
        } else {
          console.log(
            "🎯 [MapStateManager] Multiple location cluster, showing cluster sheet"
          );
          setSelectedCluster(cluster.locations || []);
        }
      }
    },
    [handleEventClick, handleLocationClick]
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
      console.log('👥 [MapStateManager] Fetching friends live locations...');
      
      const { data: follows, error: followError } = await supabase
        .from("follows")
        .select("following_id")
        .eq("follower_id", session?.user.id);

      if (followError) throw followError;
      if (!follows || follows.length === 0) {
        console.log('❌ [MapStateManager] No follows found');
        return [];
      }

      console.log('👥 [MapStateManager] Following count:', follows.length);
      const followingIds = follows.map((f) => f.following_id);

      const { data: mutuals, error: mutualError } = await supabase
        .from("follows")
        .select("follower_id")
        .in("follower_id", followingIds)
        .eq("following_id", session?.user.id);

      if (mutualError) throw mutualError;
      console.log('👥 [MapStateManager] Mutual followers count:', mutuals?.length || 0);

      const mutualFollowerIds = mutuals.map((m) => m.follower_id);

      const { data: users, error: usersError } = await supabase
        .from("users")
        .select("id, avatar_url, is_live_location_shared")
        .in("id", mutualFollowerIds);

      if (usersError) throw usersError;
      console.log('👥 [MapStateManager] All mutual users:', users?.length || 0);
      console.log('👥 [MapStateManager] Users with location sharing:', users?.filter(u => u.is_live_location_shared === 1).length || 0);

      const live_usersIds = users?.filter(u => u.is_live_location_shared === 1).map((m) => m.id) || [];
      console.log('👥 [MapStateManager] Live users IDs:', live_usersIds);

      if (live_usersIds.length === 0) {
        console.log('❌ [MapStateManager] No friends have live location sharing enabled');
        setFollowerList([]);
        return [];
      }

      const { data: locations, error: locationError } = await supabase
        .from("user_locations")
        .select("user_id, live_location_latitude, live_location_longitude")
        .in("user_id", live_usersIds);

      if (locationError) {
        console.error('❌ [MapStateManager] Error fetching locations:', locationError);
        throw locationError;
      }
      
      console.log('👥 [MapStateManager] Locations data:', JSON.stringify(locations, null, 2));
      console.log('👥 [MapStateManager] Number of locations found:', locations?.length || 0);

      const result = live_usersIds.map((userId) => {
        const userDetail = users.find((u) => u.id === userId);
        const locationDetail = locations?.find((l) => l.user_id === userId);

        return {
          userId,
          avatar_url: userDetail?.avatar_url || null,
          live_location_latitude:
            parseFloat(locationDetail?.live_location_latitude || "0") || 0.0,
          live_location_longitude:
            parseFloat(locationDetail?.live_location_longitude || "0") || 0.0,
        };
      });

      console.log('👥 [MapStateManager] Final result:', result);
      const updatedFollowerList = getNearbyFollowerCounts(result);
      console.log('✅ [MapStateManager] Updated follower list:', updatedFollowerList.length);
      setFollowerList(updatedFollowerList);
      return result;
    } catch (error) {
      console.error("❌ [MapStateManager] Error fetching followed user details:", error);
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

  // Log current user ID for debugging
  useEffect(() => {
    if (session?.user?.id) {
      console.log('👤 [MapStateManager] ===================================');
      console.log('👤 [MapStateManager] YOUR USER ID:', session.user.id);
      console.log('👤 [MapStateManager] ===================================');
    }
  }, [session?.user?.id]);

  // Initialize follower data
  useEffect(() => {
    getFollowedUserDetails();
  }, [getFollowedUserDetails]);

  // Update live location periodically if sharing is enabled
  useEffect(() => {
    if (!session?.user?.id || !user) return;

    const isLiveLocationEnabled = (user as any).is_live_location_shared === 1;
    
    if (!isLiveLocationEnabled) {
      console.log('📍 [MapStateManager] Live location sharing disabled');
      return;
    }

    console.log('📍 [MapStateManager] Starting live location updates...');
    
    let locationSubscription: Location.LocationSubscription | null = null;

    const startLocationUpdates = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          console.log('❌ [MapStateManager] Location permission not granted');
          return;
        }

        // Watch position and update database every time location changes significantly
        locationSubscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.Balanced,
            timeInterval: 30000, // Update every 30 seconds
            distanceInterval: 50, // Or when user moves 50 meters
          },
          async (location) => {
            console.log('📍 [MapStateManager] Location update:', location.coords);
            
            try {
              const { error } = await supabase
                .from("user_locations")
                .update({
                  live_location_latitude: location.coords.latitude.toString(),
                  live_location_longitude: location.coords.longitude.toString(),
                  last_updated: new Date().toISOString(),
                })
                .eq("user_id", session.user.id);

              if (error) {
                console.error('❌ [MapStateManager] Error updating live location:', error);
              } else {
                console.log('✅ [MapStateManager] Live location updated');
              }
            } catch (updateError) {
              console.error('❌ [MapStateManager] Exception updating live location:', updateError);
            }
          }
        );

        console.log('✅ [MapStateManager] Location watch started');
      } catch (error) {
        console.error('❌ [MapStateManager] Error starting location watch:', error);
      }
    };

    startLocationUpdates();

    // Cleanup
    return () => {
      if (locationSubscription) {
        console.log('🔒 [MapStateManager] Stopping location watch');
        locationSubscription.remove();
      }
    };
  }, [session?.user?.id, user]);

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

    // Add map reload listener
    const mapReloadListener = DeviceEventEmitter.addListener(
      "mapReload",
      (shouldReload: boolean) => {
        if (shouldReload && forceRefresh) {
          console.log("🔄 [MapStateManager] Map reload requested, refreshing data...");
          forceRefresh();
        }
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
      mapReloadListener.remove();
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
    calculatedCenter,

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
