import { useEffect, useState, useRef, useCallback } from "react";
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
import { useUser } from "~/hooks/useUserData";
import {
  useMapEvents,
  type MapEvent,
  type MapLocation,
} from "~/hooks/useMapEvents";
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
  const [selectedCluster, setSelectedCluster] = useState<MapEvent[] | null>(
    null
  );
  const [mapStyleError, setMapStyleError] = useState(false);
  const [filters, setFilters] = useState<FilterState>({});
  const [isMapFullyLoaded, setIsMapFullyLoaded] = useState(false); // Track overall map loading state
  const [loadingReason, setLoadingReason] = useState<
    "initial" | "timeframe" | "filters" | "data"
  >("initial"); // Track why we're loading
  const markersReadyTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Reset style error when theme changes to retry the correct style
  useEffect(() => {
    setMapStyleError(false);
    console.log("Theme changed to:", isDarkMode ? "DARK" : "LIGHT");
    console.log(
      "Will attempt to use style:",
      isDarkMode ? CUSTOM_DARK_STYLE : WORKING_LIGHT_STYLE
    );
    console.log("Fallback available:", getFallbackStyle(isDarkMode));
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
  const shouldShowMarker = (event: MapEvent | MapLocation): boolean => {
    // If no filters are set yet, show everything
    if (Object.keys(filters).length === 0) return true;

    // If all filters are false, hide everything
    const hasAnyFilterEnabled = Object.values(filters).some(
      (value) => value === true
    );
    if (!hasAnyFilterEnabled) return false;

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

    // Check location category filters
    if ("category" in event && event.category) {
      const catKey = `location-${event.category.name
        .toLowerCase()
        .replace(/\s+/g, "-")}`;
      if (filters.hasOwnProperty(catKey) && filters[catKey]) {
        shouldShow = true;
      }
    }

    // Check location type filters
    if ("type" in event && event.type) {
      const typeKey = `type-${event.type.toLowerCase().replace(/\s+/g, "-")}`;
      if (filters.hasOwnProperty(typeKey) && filters[typeKey]) {
        shouldShow = true;
      }
    }

    return shouldShow;
  };

  const filterClusters = (clusters: any[]) => {
    const filtered = clusters
      .filter((cluster) => {
        // Check if the main event should be shown
        if (cluster.mainEvent && !shouldShowMarker(cluster.mainEvent))
          return false;

        // Filter the events in the cluster
        const filteredEvents = cluster.events.filter(shouldShowMarker);

        // Only show cluster if it has at least one visible event
        return filteredEvents.length > 0;
      })
      .map((cluster) => ({
        ...cluster,
        events: cluster.events.filter(shouldShowMarker),
      }));

    // Limit to maximum 200 markers to prevent callback overflow
    return filtered.slice(0, 200);
  };

  const handleRegionChange = useCallback((region: any) => {
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
        // Check if the center has meaningfully changed (more than 0.01 degrees)
        const newCenter: [number, number] = [centerLat, centerLng];
        const lastCenter = lastCenterRef.current;

        if (
          !lastCenter ||
          Math.abs(newCenter[0] - lastCenter[0]) > 0.01 ||
          Math.abs(newCenter[1] - lastCenter[1]) > 0.01
        ) {
          // Update the map center to trigger new data fetch
          setMapCenter(newCenter);
          lastCenterRef.current = newCenter;
        }
      }
    }, 2000); // Increased to 2 seconds to reduce API calls

    // Handle zoom level for follower count visibility
    let zoomLevel = region?.properties?.zoomLevel;
    if (zoomLevel <= 12) {
      setHideCount(true);
    } else {
      setHideCount(false);
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

  var {
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
    selectedEvent,
    isLoading,
    error,
    handleEventClick,
    handleCloseModal,
  } = useMapEvents({
    center:
      mapCenter ||
      (location ? [location.latitude, location.longitude] : [0, 0]), // Use the dynamic map center instead of static coordinates
    radius: 50000,
    timeRange:
      selectedTimeFrame === "Today"
        ? "today"
        : selectedTimeFrame === "Week"
        ? "week"
        : "weekend",
  });

  // Comprehensive loading state management - placed after useMapEvents hook
  useEffect(() => {
    // Clear any existing timeout
    if (markersReadyTimeoutRef.current) {
      clearTimeout(markersReadyTimeoutRef.current);
    }

    if (isLoading) {
      // Data is loading, show loading screen
      setLoadingReason("data");
      setIsMapFullyLoaded(false);
    } else if (!isLoading && (events.length > 0 || locations.length > 0)) {
      // Data has loaded and we have markers to show
      // Add a delay to allow markers to render and images to load
      markersReadyTimeoutRef.current = setTimeout(() => {
        setIsMapFullyLoaded(true);
      }, 1000); // 1 second delay for markers to render and images to load
    } else if (!isLoading && events.length === 0 && locations.length === 0) {
      // Data loaded but no events/locations found, hide loading immediately
      setIsMapFullyLoaded(true);
    }

    // Cleanup timeout on unmount
    return () => {
      if (markersReadyTimeoutRef.current) {
        clearTimeout(markersReadyTimeoutRef.current);
      }
    };
  }, [isLoading, events.length, locations.length]);

  // Handle time frame changes - show loading while new markers are prepared
  useEffect(() => {
    if (events.length > 0 || locations.length > 0) {
      // We have data, but time frame changed, so markers will change
      setLoadingReason("timeframe");
      setIsMapFullyLoaded(false);

      // Clear any existing timeout
      if (markersReadyTimeoutRef.current) {
        clearTimeout(markersReadyTimeoutRef.current);
      }

      // Add a shorter delay for time frame changes since data is already loaded
      markersReadyTimeoutRef.current = setTimeout(() => {
        setIsMapFullyLoaded(true);
      }, 600); // Shorter delay for time frame changes
    }
  }, [selectedTimeFrame]);

  // Handle filter changes - show loading while markers are filtered
  useEffect(() => {
    if ((events.length > 0 || locations.length > 0) && isMapFullyLoaded) {
      // We have data and map was fully loaded, but filters changed
      setLoadingReason("filters");
      setIsMapFullyLoaded(false);

      // Clear any existing timeout
      if (markersReadyTimeoutRef.current) {
        clearTimeout(markersReadyTimeoutRef.current);
      }

      // Add a very short delay for filter changes
      markersReadyTimeoutRef.current = setTimeout(() => {
        setIsMapFullyLoaded(true);
      }, 300); // Short delay for filter changes
    }
  }, [filters]);

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
            eventsNow.find((e) => e.id === data.eventId) ||
            eventsToday.find((e) => e.id === data.eventId) ||
            eventsTomorrow.find((e) => e.id === data.eventId);

          if (event) {
            setIsEvent(true);
            handleEventClick(event as MapEvent);
          } else {
            console.log("Event still not found after delay:", data.eventId);
          }
        }, 2000); // Wait 2 seconds for data to load
      }
    );

    return () => {
      eventListener.remove();
      showEventCardListener.remove();
    };
  }, [handleEventClick, eventsNow, eventsToday, eventsTomorrow, cameraRef]);

  // Update mapCenter when location becomes available
  useEffect(() => {
    if (location?.latitude && location?.longitude && !mapCenter) {
      setMapCenter([location.latitude, location.longitude]);
    }
  }, [location, mapCenter]);

  // Handle route params for showing event cards
  useEffect(() => {
    if (params.showEventCard === "true" && params.eventId) {
      // Center map on event location if coordinates are provided
      if (params.lat && params.lng) {
        const lat = parseFloat(params.lat as string);
        const lng = parseFloat(params.lng as string);

        if (cameraRef.current) {
          cameraRef.current.setCamera({
            centerCoordinate: [lng, lat],
            zoomLevel: 15,
            animationDuration: 1000,
            animationMode: "flyTo",
          });
        }

        // Update map center to trigger new data fetch
        setMapCenter([lat, lng]);
      }

      // Find the event by ID and open its card
      const event =
        eventsNow.find((e) => e.id === params.eventId) ||
        eventsToday.find((e) => e.id === params.eventId) ||
        eventsTomorrow.find((e) => e.id === params.eventId);

      if (event) {
        setIsEvent(true);
        handleEventClick(event as MapEvent);
      } else {
        // If event not found in current arrays, wait for data to load
        // The DeviceEventEmitter listener will handle this case
        console.log("Event not found in current arrays, waiting for data...");
      }
    }
  }, [
    params.showEventCard,
    params.eventId,
    params.lat,
    params.lng,
    eventsNow,
    eventsToday,
    eventsTomorrow,
    handleEventClick,
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

        // Set initial camera position smoothly
        if (cameraRef.current) {
          cameraRef.current.setCamera({
            centerCoordinate: [
              initialLocation.coords.longitude,
              initialLocation.coords.latitude,
            ],
            zoomLevel: 11,
            animationDuration: 1000,
            animationMode: "flyTo",
          });
        }

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
  }, [cameraRef]);

  const handleMapTap = useCallback(() => {
    if (selectedEvent) {
      handleCloseModal();
    }
  }, [selectedEvent, handleCloseModal]);

  const handleEventSelect = useCallback(
    (event: MapEvent) => {
      // Center map on selected event
      if (cameraRef.current) {
        cameraRef.current.setCamera({
          centerCoordinate: [event.location.longitude, event.location.latitude],
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
    (cluster: { events: MapEvent[] }) => {
      if (cluster.events?.length === 1) {
        // Center map on selected event
        if (cameraRef.current) {
          cameraRef.current.setCamera({
            centerCoordinate: [
              cluster.events[0].location.longitude,
              cluster.events[0].location.latitude,
            ],
            zoomLevel: 14,
            animationDuration: 500,
            animationMode: "flyTo",
          });
        }
        handleEventClick(cluster.events[0]);
      } else {
        setSelectedCluster(cluster.events);
      }
    },
    [handleEventClick, cameraRef]
  );

  const handleLocationSelect = useCallback(
    (location: MapLocation) => {
      // Center map on selected location
      if (cameraRef.current) {
        cameraRef.current.setCamera({
          centerCoordinate: [
            location.location.longitude,
            location.location.latitude,
          ],
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

  const handleLocationClusterPress = useCallback(
    (cluster: { events: MapLocation[] }) => {
      if (cluster.events?.length === 1) {
        // Center map on selected location
        if (cameraRef.current) {
          cameraRef.current.setCamera({
            centerCoordinate: [
              cluster.events[0].location.longitude,
              cluster.events[0].location.latitude,
            ],
            zoomLevel: 14,
            animationDuration: 500,
            animationMode: "flyTo",
          });
        }
        // Convert MapLocation to MapEvent format for the card
        const locationAsEvent = {
          ...cluster.events[0],
          start_datetime: new Date().toISOString(),
          end_datetime: new Date().toISOString(),
          venue_name: cluster.events[0].name,
          attendees: { count: 0, profiles: [] },
          categories: cluster.events[0].category
            ? [cluster.events[0].category]
            : [],
        } as MapEvent;

        handleEventClick(locationAsEvent);
      } else {
        // For multiple locations, show cluster sheet
        setSelectedCluster(cluster.events as any);
      }
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
        onTouchMove={() => setIsFollowingUser(false)}
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
        onRegionDidChange={handleRegionChange}
      >
        <MapboxGL.Camera
          ref={cameraRef}
          defaultSettings={{
            centerCoordinate: [
              location?.longitude || 0,
              location?.latitude || 0,
            ],
            zoomLevel: 11,
          }}
          maxZoomLevel={16}
          minZoomLevel={3}
          animationMode="flyTo"
          animationDuration={1000}
          followUserLocation={isFollowingUser}
          followUserMode={UserTrackingMode.FollowWithCourse}
          followZoomLevel={14}
        />

        {/* Event markers */}
        {selectedTimeFrame == "Today" &&
          filterClusters(clustersToday).map((cluster, index) =>
            !cluster.mainEvent ? null : (
              <MapboxGL.MarkerView
                key={`cluster-now-${cluster.location.latitude.toFixed(
                  3
                )}-${cluster.location.longitude.toFixed(3)}-${index}`}
                id={`cluster-now-${cluster.location.latitude.toFixed(
                  3
                )}-${cluster.location.longitude.toFixed(3)}-${index}`}
                coordinate={[
                  cluster.location.longitude,
                  cluster.location.latitude,
                ]}
                anchor={{ x: 0.5, y: 0.5 }}
              >
                <View
                  style={{
                    zIndex: cluster.events.some(
                      (e: MapEvent) => e.id === selectedEvent?.id
                    )
                      ? 1000
                      : 100,
                  }}
                >
                  <EventMarker
                    imageUrl={cluster.mainEvent.image_urls?.[0]}
                    count={cluster.events.length}
                    isSelected={cluster.events.some(
                      (e: MapEvent) => e.id === selectedEvent?.id
                    )}
                    markerType={getMarkerType(cluster.mainEvent)}
                    categoryName={getCategoryName(cluster.mainEvent)}
                    onPress={() => {
                      setIsEvent(true);
                      handleClusterPress(cluster);
                    }}
                  />
                </View>
              </MapboxGL.MarkerView>
            )
          )}

        {selectedTimeFrame == "Week" &&
          filterClusters(clustersNow).map((cluster, index) =>
            !cluster.mainEvent ? null : (
              <MapboxGL.MarkerView
                key={`cluster-week-${cluster.location.latitude.toFixed(
                  3
                )}-${cluster.location.longitude.toFixed(3)}-${index}`}
                id={`cluster-week-${cluster.location.latitude.toFixed(
                  3
                )}-${cluster.location.longitude.toFixed(3)}-${index}`}
                coordinate={[
                  cluster.location.longitude,
                  cluster.location.latitude,
                ]}
                anchor={{ x: 0.5, y: 0.5 }}
              >
                <View
                  style={{
                    zIndex: cluster.events.some(
                      (e: MapEvent) => e.id === selectedEvent?.id
                    )
                      ? 1000
                      : 100,
                  }}
                >
                  <EventMarker
                    imageUrl={cluster.mainEvent.image_urls?.[0]}
                    count={cluster.events.length}
                    isSelected={cluster.events.some(
                      (e: MapEvent) => e.id === selectedEvent?.id
                    )}
                    markerType={getMarkerType(cluster.mainEvent)}
                    categoryName={getCategoryName(cluster.mainEvent)}
                    onPress={() => {
                      setIsEvent(true);
                      handleClusterPress(cluster);
                    }}
                  />
                </View>
              </MapboxGL.MarkerView>
            )
          )}

        {selectedTimeFrame == "Weekend" &&
          filterClusters(clustersTomorrow).map((cluster, index) =>
            !cluster.mainEvent ? null : (
              <MapboxGL.MarkerView
                key={`cluster-weekend-${cluster.location.latitude.toFixed(
                  3
                )}-${cluster.location.longitude.toFixed(3)}-${index}`}
                id={`cluster-weekend-${cluster.location.latitude.toFixed(
                  3
                )}-${cluster.location.longitude.toFixed(3)}-${index}`}
                coordinate={[
                  cluster.location.longitude,
                  cluster.location.latitude,
                ]}
                anchor={{ x: 0.5, y: 0.5 }}
              >
                <View
                  style={{
                    zIndex: cluster.events.some(
                      (e: MapEvent) => e.id === selectedEvent?.id
                    )
                      ? 1000
                      : 100,
                  }}
                >
                  <EventMarker
                    imageUrl={cluster.mainEvent.image_urls?.[0]}
                    count={cluster.events.length}
                    isSelected={cluster.events.some(
                      (e: MapEvent) => e.id === selectedEvent?.id
                    )}
                    markerType={getMarkerType(cluster.mainEvent)}
                    categoryName={getCategoryName(cluster.mainEvent)}
                    onPress={() => {
                      setIsEvent(true);
                      handleClusterPress(cluster);
                    }}
                  />
                </View>
              </MapboxGL.MarkerView>
            )
          )}

        {/* Fallback: Show all clusters if no specific timeframe clusters are available */}
        {clustersNow.length === 0 &&
          clustersToday.length === 0 &&
          clustersTomorrow.length === 0 &&
          clusters.length > 0 &&
          filterClusters(clusters).map((cluster, index) =>
            !cluster.mainEvent ||
            !Array.isArray(cluster.mainEvent.image_urls) ||
            !cluster.mainEvent.image_urls[0] ? null : (
              <MapboxGL.MarkerView
                key={`cluster-fallback-${cluster.location.latitude.toFixed(
                  3
                )}-${cluster.location.longitude.toFixed(3)}-${index}`}
                id={`cluster-fallback-${cluster.location.latitude.toFixed(
                  3
                )}-${cluster.location.longitude.toFixed(3)}-${index}`}
                coordinate={[
                  cluster.location.longitude,
                  cluster.location.latitude,
                ]}
                anchor={{ x: 0.5, y: 0.5 }}
              >
                <View
                  style={{
                    zIndex: cluster.events.some(
                      (e: MapEvent) => e.id === selectedEvent?.id
                    )
                      ? 1000
                      : 100,
                  }}
                >
                  <EventMarker
                    imageUrl={cluster.mainEvent.image_urls?.[0]}
                    count={cluster.events.length}
                    isSelected={cluster.events.some(
                      (e: MapEvent) => e.id === selectedEvent?.id
                    )}
                    markerType={getMarkerType(cluster.mainEvent)}
                    categoryName={getCategoryName(cluster.mainEvent)}
                    onPress={() => {
                      setIsEvent(true);
                      handleClusterPress(cluster);
                    }}
                  />
                </View>
              </MapboxGL.MarkerView>
            )
          )}

        {/* locations fetched from static_location table for (beach, club , park etc) */}
        {clustersLocations.length > 0 &&
          filterClusters(clustersLocations).map((cluster, index) =>
            !cluster.mainEvent ||
            !Array.isArray(cluster.mainEvent.image_urls) ||
            !cluster.mainEvent.image_urls[0] ? null : (
              <MapboxGL.MarkerView
                key={`cluster-location-${cluster.location.latitude.toFixed(
                  3
                )}-${cluster.location.longitude.toFixed(3)}-${index}`}
                id={`cluster-location-${cluster.location.latitude.toFixed(
                  3
                )}-${cluster.location.longitude.toFixed(3)}-${index}`}
                coordinate={[
                  cluster.location.longitude,
                  cluster.location.latitude,
                ]}
                anchor={{ x: 0.5, y: 0.5 }}
              >
                <View
                  style={{
                    zIndex: cluster?.events?.some(
                      (e: MapEvent) => e.id === selectedEvent?.id
                    )
                      ? 1000
                      : 100,
                  }}
                >
                  <EventMarker
                    imageUrl={cluster.mainEvent?.image_urls?.[0]}
                    count={cluster?.events?.length}
                    isSelected={cluster?.events?.some(
                      (e: MapEvent) => e.id === selectedEvent?.id
                    )}
                    markerType="static-location"
                    categoryName={getCategoryName(cluster.mainEvent as any)}
                    onPress={() => {
                      setIsEvent(false);
                      handleLocationClusterPress(cluster);
                    }}
                  />
                </View>
              </MapboxGL.MarkerView>
            )
          )}

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
          onRecenter={() => handleRecenter(location)}
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
          onEventSelect={handleEventClick}
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
