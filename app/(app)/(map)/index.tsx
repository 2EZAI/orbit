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
import { useFocusEffect, useIsFocused } from "@react-navigation/native";

type TimeFrame = "Today" | "Week" | "Weekend";
import { supabase } from "~/src/lib/supabase";
import { useAuth } from "~/src/lib/auth";
import { Text } from "~/src/components/ui/text";
import * as Location from "expo-location";
import { useTheme } from "~/src/components/ThemeProvider";
import MapboxGL, { UserTrackingMode } from "@rnmapbox/maps";
import { useUser } from "~/src/lib/UserProvider";
import { debounce } from "lodash";
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
import { imagePreloader } from "~/src/lib/imagePreloader";

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
  const isFocused = useIsFocused(); // Track if this screen is currently active
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
  const lastNavigationRef = useRef<{
    eventId?: string;
    locationId?: string;
    timestamp: number;
  }>({ timestamp: 0 });
  const searchedLocationNameRef = useRef<string | null>(null);

  // Helper to parse safe numbers
  const parseNumber = (v: any): number | null => {
    const n =
      typeof v === "string" ? parseFloat(v) : typeof v === "number" ? v : NaN;
    return Number.isFinite(n) ? n : null;
  };

  // Preferred coordinates (Orbit if selected and valid; otherwise device) - memoized to prevent infinite loops
  const orbitLat = useMemo(
    () =>
      user?.event_location_preference === 1 && userlocation?.latitude
        ? parseNumber(userlocation.latitude)
        : null,
    [user?.event_location_preference, userlocation?.latitude]
  );
  const orbitLng = useMemo(
    () =>
      user?.event_location_preference === 1 && userlocation?.longitude
        ? parseNumber(userlocation.longitude)
        : null,
    [user?.event_location_preference, userlocation?.longitude]
  );

  const preferredLat = useMemo(
    () => orbitLat ?? (location ? parseNumber(location.latitude) : null),
    [orbitLat, location?.latitude]
  );
  const preferredLng = useMemo(
    () => orbitLng ?? (location ? parseNumber(location.longitude) : null),
    [orbitLng, location?.longitude]
  );

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

  // Add state to track current map center and dynamic radius
  const [mapCenter, setMapCenter] = useState<[number, number] | null>(null);
  const [dynamicRadius, setDynamicRadius] = useState<number>(50000); // Default 50km
  const [mapZoomLevel, setMapZoomLevel] = useState<number>(10); // Track zoom level for smart limits

  // Add debounced region change handler
  const regionChangeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastCenterRef = useRef<[number, number] | null>(null);

  // Helper function to calculate distance between two points in km
  const calculateDistance = (
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number
  ): number => {
    const R = 6371; // Earth's radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Function to dynamically adjust radius based on target location
  const adjustRadiusForDistance = (
    currentCenter: [number, number] | null,
    targetLat: number,
    targetLng: number
  ) => {
    if (!currentCenter) {
      // If no current center, use a large radius to ensure we capture the target
      const expandedRadius = Math.max(100000, dynamicRadius * 2); // At least 100km
      console.log(
        "[Map] No current center, expanding radius to:",
        expandedRadius
      );
      setDynamicRadius(expandedRadius);
      return expandedRadius;
    }

    const distance = calculateDistance(
      currentCenter[0],
      currentCenter[1],
      targetLat,
      targetLng
    );
    const distanceInMeters = distance * 1000;

    // LONG DISTANCE NAVIGATION: If target is >500km away, switch to center-based loading
    if (distance > 500) {
      console.log(
        `[Map] 🚀 LONG DISTANCE NAVIGATION: ${distance.toFixed(
          1
        )}km - switching to target-centered loading`
      );

      // For long distances, center the map on the target and use standard radius
      // This is more efficient than trying to expand radius to cover huge distances
      console.log(
        `[Map] Setting new center to target location: [${targetLat}, ${targetLng}]`
      );

      // Reset to standard radius for the new location
      setDynamicRadius(100000); // 100km radius at target location

      // The map center will be updated by the calling function
      return 100000;
    }

    // REGIONAL NAVIGATION: For distances <500km, use radius expansion as before
    const requiredRadius = distanceInMeters + distanceInMeters * 0.2;
    const newRadius = Math.max(50000, Math.min(requiredRadius, 200000)); // Min 50km, max 200km

    if (newRadius > dynamicRadius) {
      console.log(
        `[Map] 📍 REGIONAL EXPANSION: from ${dynamicRadius / 1000}km to ${
          newRadius / 1000
        }km for distance ${distance.toFixed(1)}km`
      );
      setDynamicRadius(newRadius);
      return newRadius;
    }

    return dynamicRadius;
  };

  // Function to reset radius when returning to home area
  const resetRadiusIfNearHome = (currentLat: number, currentLng: number) => {
    const homeCoords = centerForHooks;
    if (homeCoords && homeCoords.length >= 2) {
      const distanceFromHome = calculateDistance(
        currentLat,
        currentLng,
        homeCoords[0],
        homeCoords[1]
      );

      // If within 25km of home and radius is expanded, reset to default
      if (distanceFromHome < 25 && dynamicRadius > 50000) {
        console.log(
          `[Map] Near home (${distanceFromHome.toFixed(
            1
          )}km), resetting radius to 50km`
        );
        setDynamicRadius(50000);
      }
    }
  };

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

    // If nothing matched any enabled filter, default to show (prevents empty map)
    return shouldShow || !hasAnyFilterEnabled;
  };

  const filterClusters = (clusters: any[], zoomLevel?: number) => {
    // Smart limit based on zoom level to prevent callback overflow
    const getSmartLimit = (zoom: number = 10) => {
      if (zoom >= 14) return 1000; // Close zoom: show everything
      if (zoom >= 12) return 500; // Medium zoom: moderate limit
      if (zoom >= 10) return 300; // Far zoom: fewer markers
      return 150; // Very far: minimal markers
    };

    const smartLimit = getSmartLimit(zoomLevel);
    // Reduced logging - only log significant changes
    if (clusters.length > smartLimit) {
      console.log(
        `[Map] ⚡ SMART LIMIT: ${smartLimit} of ${
          clusters.length
        } clusters (zoom: ${zoomLevel || "unknown"})`
      );
    }

    // If no filters are set, or all filters are enabled, don't hide anything
    const hasAnyFilterEnabled = Object.values(filters).some((v) => v === true);
    const areAllFiltersEnabled =
      Object.keys(filters).length > 0 &&
      Object.values(filters).every((v) => v === true);
    if (!hasAnyFilterEnabled || areAllFiltersEnabled) {
      // Search location debugging is now handled in the memoized hook

      // Apply smart limit to prevent callback overflow
      if (clusters.length > smartLimit) {
        return clusters.slice(0, smartLimit);
      }

      return clusters;
    }

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

    // Search location debugging is now handled in the memoized hook

    // Apply smart limit to filtered results too
    if (filtered.length > smartLimit) {
      return filtered.slice(0, smartLimit);
    }

    return filtered;
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
        // Update zoom level for smart filtering (debounced to prevent excessive updates)
        const roundedZoom = Math.floor(zoomLevel);
        if (Math.abs(mapZoomLevel - roundedZoom) >= 1) {
          setMapZoomLevel(roundedZoom);
        }
        // Check if the center has meaningfully changed (more than 0.01 degrees)
        const newCenter: [number, number] = [centerLat, centerLng];
        const lastCenter = lastCenterRef.current;

        // Calculate distance moved and adjust threshold based on current radius
        const radiusInKm = dynamicRadius / 1000;
        const baseThreshold = 0.01; // 1km base threshold
        const threshold = Math.min(
          0.05,
          Math.max(baseThreshold, radiusInKm / 1000)
        ); // Scale with radius

        if (
          !lastCenter ||
          Math.abs(newCenter[0] - lastCenter[0]) > threshold ||
          Math.abs(newCenter[1] - lastCenter[1]) > threshold
        ) {
          // Check if we need to expand radius for this new location
          if (mapCenter) {
            const distance = calculateDistance(
              mapCenter[0],
              mapCenter[1],
              newCenter[0],
              newCenter[1]
            );
            const distanceInMeters = distance * 1000;

            // LONG DISTANCE MOVEMENT: If moving >500km, switch to center-based approach
            if (distance > 500) {
              console.log(
                `[Map] 🚀 LONG DISTANCE MOVEMENT: ${distance.toFixed(
                  1
                )}km - resetting to standard radius at new location`
              );
              setDynamicRadius(100000); // 100km radius at new location
            }
            // REGIONAL MOVEMENT: If moving more than half the radius away, consider expanding
            else if (distanceInMeters > dynamicRadius * 0.5) {
              const newRadius = Math.min(
                200000,
                Math.max(dynamicRadius, distanceInMeters * 1.5)
              ); // Max 200km
              if (newRadius !== dynamicRadius) {
                console.log(
                  `[Map] 📍 Progressive loading: expanding radius to ${
                    newRadius / 1000
                  }km for ${distance.toFixed(1)}km movement`
                );
                setDynamicRadius(newRadius);
              }
            }
          }

          // Check if we should reset radius when near home
          resetRadiusIfNearHome(newCenter[0], newCenter[1]);

          // Update the map center to trigger new data fetch
          setMapCenter(newCenter);
          lastCenterRef.current = newCenter;
          console.log(
            `[Map] Region change triggered data fetch (moved ${threshold.toFixed(
              4
            )}°, radius: ${radiusInKm}km)`
          );
        } else {
          console.log(
            `[Map] Region change too small (${threshold.toFixed(
              4
            )}° threshold), skipping data fetch`
          );
        }
      }
    }, 2000); // Reduced back to 2 seconds for better responsiveness

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

  // Need to declare these before useMapEvents hook since they're used in dependencies
  // They will be calculated after useMapEvents provides the cluster data
  let clustersNowCount = 0;
  let clustersTodayCount = 0;
  let clustersTomorrowCount = 0;

  // Auto-fit once when clusters first appear to ensure markers are visible
  const didAutoFitRef = useRef(false);
  useEffect(() => {
    if (didAutoFitRef.current) return;
    const activeClusters =
      selectedTimeFrame === "Today"
        ? clustersToday || []
        : selectedTimeFrame === "Week"
        ? clustersNow || []
        : clustersTomorrow || [];

    if (activeClusters && activeClusters.length > 0) {
      const sample = activeClusters
        .flatMap((c: any) => c.events)
        .filter(
          (e: any) =>
            e &&
            e.location &&
            typeof e.location.latitude === "number" &&
            typeof e.location.longitude === "number"
        );
      if (sample.length > 0) {
        try {
          fitToEvents(sample as any);
          didAutoFitRef.current = true;
          console.log(
            "[Map] Auto-fit to",
            sample.length,
            "events for",
            selectedTimeFrame
          );
        } catch (e) {}
      }
    }
  }, [
    clustersNowCount,
    clustersTodayCount,
    clustersTomorrowCount,
    selectedTimeFrame,
    fitToEvents,
  ]);

  // Prefer preferred coordinates for data fetching center (memoized to prevent infinite loops)
  const centerForHooks: [number, number] = useMemo(() => {
    // Always prioritize preferred coordinates if available
    if (preferredLat != null && preferredLng != null) {
      return [preferredLat, preferredLng];
    }
    // Fallback to device location if available
    if (location && location.latitude !== 0 && location.longitude !== 0) {
      return [location.latitude, location.longitude];
    }
    // Last resort: use mapCenter if set
    if (mapCenter && mapCenter[0] !== 0 && mapCenter[1] !== 0) {
      return mapCenter as [number, number];
    }
    // Default fallback
    return [25.7617, -80.1918]; // Miami coordinates as default
  }, [preferredLat, preferredLng, location?.latitude, location?.longitude]); // Remove mapCenter to prevent loops

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
    forceRefreshLocations,
  } = useMapEvents({
    center: isFocused ? centerForHooks : [0, 0], // Only use real center when screen is focused
    radius: isFocused ? dynamicRadius : 0, // Disable radius when not focused
    timeRange:
      selectedTimeFrame === "Today"
        ? "today"
        : selectedTimeFrame === "Week"
        ? "week"
        : "weekend",
  });

  // Memoize filtered clusters with stable dependencies to prevent infinite re-renders
  const filteredClustersLocations = useMemo(() => {
    // If screen is not focused, return empty array to prevent unnecessary processing
    if (!isFocused) {
      return [];
    }

    if (clustersLocations.length === 0) return [];

    const filtered = filterClusters(clustersLocations, mapZoomLevel);

    // Preload images for filtered clusters (debounced) - only when focused
    if (isFocused && filtered.length > 0) {
      setTimeout(() => {
        const imageUrls: string[] = [];
        filtered.forEach((cluster) => {
          if (cluster.mainEvent?.image_urls?.[0]) {
            imageUrls.push(cluster.mainEvent.image_urls[0]);
          }
        });

        if (imageUrls.length > 0) {
          imagePreloader.preloadImages(imageUrls, {
            priority: "high",
            cache: true,
            aggressive: true,
          });
        }
      }, 500); // Longer delay to prevent spam
    }

    return filtered;
  }, [clustersLocations.length, Math.floor(mapZoomLevel), isFocused]); // Use stable dependencies

  // Calculate cluster counts for auto-fit functionality
  clustersNowCount = Array.isArray(clustersNow) ? clustersNow.length : 0;
  clustersTodayCount = Array.isArray(clustersToday) ? clustersToday.length : 0;
  clustersTomorrowCount = Array.isArray(clustersTomorrow)
    ? clustersTomorrow.length
    : 0;

  // Debug: log data/state driving markers
  useEffect(() => {
    console.log("[Map] Preferred coords:", { preferredLat, preferredLng });
    console.log("[Map] Center for hooks:", centerForHooks);
  }, [preferredLat, preferredLng, centerForHooks[0], centerForHooks[1]]);

  useEffect(() => {
    console.log("[Map] Data lengths:", {
      events: events.length,
      locations: locations.length,
      eventsNow: eventsNow.length,
      eventsToday: eventsToday.length,
      eventsTomorrow: eventsTomorrow.length,
      clusters: clusters.length,
      clustersNow: clustersNow.length,
      clustersToday: clustersToday.length,
      clustersTomorrow: clustersTomorrow.length,
      clustersLocations: clustersLocations.length,
    });
  }, [
    events.length,
    locations.length,
    eventsNow.length,
    eventsToday.length,
    eventsTomorrow.length,
    clusters.length,
    clustersNow.length,
    clustersToday.length,
    clustersTomorrow.length,
    clustersLocations.length,
  ]);

  // Ensure mapCenter is initialized to preferred when available - run only once
  useEffect(() => {
    if (!mapCenter && preferredLat != null && preferredLng != null) {
      console.log("[Map] Initializing mapCenter to preferred coordinates");
      setMapCenter([preferredLat, preferredLng]);
    }
  }, [preferredLat, preferredLng]); // Remove mapCenter from dependencies to prevent loop

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

  // Listen for location preference changes and recenter/refetch immediately
  useEffect(() => {
    const sub = DeviceEventEmitter.addListener(
      "locationPreferenceUpdated",
      (payload: {
        mode: "current" | "orbit";
        latitude: number | null;
        longitude: number | null;
      }) => {
        console.log(
          "📍 Map received locationPreferenceUpdated event:",
          payload
        );

        // ALWAYS use the coordinates from the payload - no dependency on stale state
        const lat = payload.latitude;
        const lng = payload.longitude;

        console.log("📍 Event payload coordinates:", [lat, lng]);

        if (lat != null && lng != null) {
          // IMMEDIATE camera movement - don't wait for state updates
          console.log("📍 🚀 IMMEDIATELY moving camera to:", [lng, lat]);
          console.log("📍 🔍 Camera ref exists:", !!cameraRef.current);
          console.log("📍 🔍 Camera ref details:", cameraRef.current);

          if (cameraRef.current) {
            try {
              cameraRef.current.setCamera({
                centerCoordinate: [lng, lat],
                zoomLevel: 11,
                animationDuration: 800,
                animationMode: "flyTo",
              });
              console.log("📍 ✅ Camera setCamera called successfully");
            } catch (error) {
              console.error("📍 ❌ Error calling setCamera:", error);
            }
          } else {
            console.log("📍 ❌ Camera ref is null - cannot move camera");

            // Fallback: Try again after a short delay
            setTimeout(() => {
              console.log("📍 🔄 Retrying camera movement after delay...");
              if (cameraRef.current) {
                cameraRef.current.setCamera({
                  centerCoordinate: [lng, lat],
                  zoomLevel: 11,
                  animationDuration: 800,
                  animationMode: "flyTo",
                });
                console.log("📍 ✅ Camera movement successful on retry");
              } else {
                console.log("📍 ❌ Camera ref still null on retry");
              }
            }, 500);
          }

          // Update map center state
          console.log("📍 Setting mapCenter state to:", [lat, lng]);
          setMapCenter([lat, lng]);

          // Force radius reset for long distance moves
          console.log("📍 Resetting dynamic radius for location change");
          setDynamicRadius(100000); // Reset to 100km for new area
        } else {
          console.log("📍 ⚠️ Invalid coordinates in payload:", { lat, lng });
        }
      }
    );

    return () => sub.remove();
  }, []); // NO dependencies - this should work with any state

  // Recenter on screen focus based on current preference (Orbit vs Current)
  useFocusEffect(
    useCallback(() => {
      if (preferredLat != null && preferredLng != null) {
        if (cameraRef.current) {
          cameraRef.current.setCamera({
            centerCoordinate: [preferredLng, preferredLat],
            zoomLevel: 11,
            animationDuration: 600,
            animationMode: "flyTo",
          });
        }
        setMapCenter([preferredLat, preferredLng]);
      }
    }, [preferredLat, preferredLng, cameraRef])
  );

  // Respect user location preference: when Orbit mode is enabled or updated,
  // recenter the map and trigger data refetches using the orbit coordinates.
  useEffect(() => {
    if (
      user?.event_location_preference === 1 &&
      orbitLat != null &&
      orbitLng != null
    ) {
      if (cameraRef.current) {
        cameraRef.current.setCamera({
          centerCoordinate: [orbitLng, orbitLat],
          zoomLevel: 11,
          animationDuration: 800,
          animationMode: "flyTo",
        });
      }
      setMapCenter([orbitLat, orbitLng]);
    }
  }, [user?.event_location_preference, orbitLat, orbitLng, cameraRef]);

  // Generate dynamic filters when data loads, but don't auto-hide anything
  useEffect(() => {
    if ((events && events.length > 0) || (locations && locations.length > 0)) {
      try {
        const defaultFilters = generateDefaultFilters(
          events || [],
          locations || []
        );
        // Initialize all discovered keys to true so nothing is hidden by default
        const normalized: Record<string, boolean> = {};
        Object.keys(defaultFilters).forEach((k) => (normalized[k] = true));
        setFilters(normalized);
      } catch (e) {
        // Fallback: show everything
        setFilters({});
      }
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

  // Handle route params for showing event/location cards
  useEffect(() => {
    // Handle event navigation (from SearchSheet or other sources) - with debouncing
    if (params.eventId) {
      const now = Date.now();
      const currentNavigation = {
        eventId: params.eventId as string,
        timestamp: now,
      };

      // Prevent duplicate navigation calls within 2 seconds
      if (
        lastNavigationRef.current.eventId === params.eventId &&
        now - lastNavigationRef.current.timestamp < 2000
      ) {
        console.log(
          "[Map] 🚫 Event navigation debounced - ignoring duplicate call"
        );
        return;
      }

      lastNavigationRef.current = currentNavigation;
      // Center map on event location if coordinates are provided
      const lat = params.latitude || params.lat;
      const lng = params.longitude || params.lng;

      if (lat && lng) {
        const latNum = parseFloat(lat as string);
        const lngNum = parseFloat(lng as string);

        // Adjust radius to ensure we can load events at the target location
        adjustRadiusForDistance(mapCenter, latNum, lngNum);

        // TEMPORARILY DISABLED - Force refresh locations to ensure new static locations appear (event navigation)
        console.log(
          "[Map] 🔄 Event search navigation detected - force refresh DISABLED"
        );
        // if (forceRefreshLocations) {
        //   // Only refresh once after all navigation setup is complete
        //   setTimeout(() => {
        //     forceRefreshLocations();
        //   }, 1000);
        // }

        if (cameraRef.current) {
          cameraRef.current.setCamera({
            centerCoordinate: [lngNum, latNum],
            zoomLevel: 15,
            animationDuration: 1000,
            animationMode: "flyTo",
          });
        }

        // For long-distance navigation, always update center to ensure fresh data
        const currentCenter = mapCenter;
        const isLongDistance = currentCenter
          ? calculateDistance(
              currentCenter[0],
              currentCenter[1],
              latNum,
              lngNum
            ) > 500
          : true;

        const shouldUpdateCenter =
          !currentCenter ||
          isLongDistance ||
          Math.abs(currentCenter[0] - latNum) > 0.01 ||
          Math.abs(currentCenter[1] - lngNum) > 0.01;

        if (shouldUpdateCenter) {
          if (isLongDistance) {
            console.log(
              "[Map] 🚀 Long-distance search navigation - forcing fresh data load"
            );
          }
          console.log("[Map] Updating center for search navigation:", [
            latNum,
            lngNum,
          ]);
          setMapCenter([latNum, lngNum]);
        } else {
          console.log("[Map] Skipping center update, already close enough");
        }
      }

      // Find the event by ID and open its card
      const event =
        eventsNow.find((e) => e.id === params.eventId) ||
        eventsToday.find((e) => e.id === params.eventId) ||
        eventsTomorrow.find((e) => e.id === params.eventId);

      if (event) {
        setIsEvent(true);
        handleEventClick(event as MapEvent);
        console.log("Found event in current arrays:", event.name);
      } else {
        // If event not found and we have coordinates, create provisional event
        const latNum = lat ? parseFloat(lat as string) : undefined;
        const lngNum = lng ? parseFloat(lng as string) : undefined;
        if (latNum != null && lngNum != null) {
          const provisionalEvent = {
            id: String(params.eventId),
            name: (params as any).name || "Event",
            description: (params as any).description || "",
            start_datetime: new Date().toISOString(),
            end_datetime: new Date().toISOString(),
            venue_name:
              (params as any).venue_name || (params as any).address || "",
            location: { latitude: latNum, longitude: lngNum },
            address: (params as any).address || "",
            image_urls: (params as any).image
              ? [String((params as any).image)]
              : [],
            distance: 0,
            attendees: { count: 0, profiles: [] },
            categories: [
              {
                id: "search-result",
                name:
                  (params as any).source === "ticketmaster"
                    ? "Ticketmaster Event"
                    : "Event",
                icon: "🎯",
              },
            ],
            type: (params as any).type || "event",
            is_ticketmaster: (params as any).source === "ticketmaster",
          } as MapEvent;

          // Add to current arrays so pin appears on map
          const updatedNow = [...eventsNow, provisionalEvent];
          const updatedToday = [...eventsToday, provisionalEvent];

          // Update state to show the pin
          setIsEvent(true);
          handleEventClick(provisionalEvent);
          console.log(
            "Created provisional event card with pin:",
            provisionalEvent.name
          );

          // Schedule a retry to find the real event once data loads
          setTimeout(() => {
            const realEvent =
              eventsNow.find((e) => e.id === params.eventId) ||
              eventsToday.find((e) => e.id === params.eventId) ||
              eventsTomorrow.find((e) => e.id === params.eventId);

            if (realEvent && realEvent.id !== provisionalEvent.id) {
              console.log(
                "Found real event, replacing provisional:",
                realEvent.name
              );
              handleEventClick(realEvent as MapEvent);
            }
          }, 3000); // Wait 3 seconds for data to load
        } else {
          console.log("Event not found in current arrays, waiting for data...");
        }
      }
    }

    // Handle location navigation (from SearchSheet) - with debouncing
    if (params.locationId) {
      const now = Date.now();
      const currentNavigation = {
        locationId: params.locationId as string,
        timestamp: now,
      };

      // Prevent duplicate navigation calls within 2 seconds
      if (
        lastNavigationRef.current.locationId === params.locationId &&
        now - lastNavigationRef.current.timestamp < 2000
      ) {
        console.log(
          "[Map] 🚫 Location navigation debounced - ignoring duplicate call"
        );
        return;
      }

      lastNavigationRef.current = currentNavigation;
      // Center map on location if coordinates are provided
      const lat = params.latitude || params.lat;
      const lng = params.longitude || params.lng;

      if (lat && lng) {
        const latNum = parseFloat(lat as string);
        const lngNum = parseFloat(lng as string);

        // Adjust radius for location navigation
        adjustRadiusForDistance(mapCenter, latNum, lngNum);

        // TEMPORARILY DISABLED - Force refresh locations to ensure new static locations appear (location navigation)
        console.log(
          "[Map] 🔄 Location search navigation detected - force refresh DISABLED"
        );
        // if (forceRefreshLocations) {
        //   // Only refresh once after all navigation setup is complete
        //   setTimeout(() => {
        //     forceRefreshLocations();
        //   }, 1000);
        // }

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

      // Find the location by ID and open its card
      const location = locations.find((l) => l.id === params.locationId);

      if (location) {
        setIsEvent(false);
        handleLocationClick(location as MapLocation);
      } else {
        // If location not found, still open a provisional card
        const latNum = lat ? parseFloat(lat as string) : undefined;
        const lngNum = lng ? parseFloat(lng as string) : undefined;
        if (latNum != null && lngNum != null) {
          const provisionalLocation = {
            id: String(params.locationId),
            name: (params as any).name || "Place",
            description: (params as any).description || "",
            location: { latitude: latNum, longitude: lngNum },
            address: (params as any).address || "",
            image_urls: (params as any).image
              ? [String((params as any).image)]
              : [],
            distance: 0,
            type: (params as any).type || "place",
            category: undefined,
          } as unknown as MapLocation;

          // Convert to MapEvent-like shape used by the card
          const locationAsEvent = {
            ...provisionalLocation,
            start_datetime: new Date().toISOString(),
            end_datetime: new Date().toISOString(),
            venue_name: (params as any).name || "",
            attendees: { count: 0, profiles: [] },
            categories: [],
          } as unknown as MapEvent;
          setIsEvent(false);
          handleEventClick(locationAsEvent);
        } else {
          console.log(
            "Location not found in current arrays, waiting for data..."
          );
        }
      }
    }
  }, [
    params.eventId,
    params.locationId,
    params.latitude,
    params.longitude,
    params.lat,
    params.lng,
    // Removed data dependencies that cause infinite loops:
    // eventsNow, eventsToday, eventsTomorrow, locations
    // These will be handled in separate effects if needed
  ]);

  // TEMPORARILY DISABLED - Retry finding event once data loads (for SearchSheet navigation)
  // useEffect(() => {
  //   if (
  //     params.eventId &&
  //     !isLoading &&
  //     (eventsNow.length > 0 ||
  //       eventsToday.length > 0 ||
  //       eventsTomorrow.length > 0)
  //   ) {
  //     // Check if we already have the right event displayed
  //     if (selectedEvent && selectedEvent.id === params.eventId) {
  //       return; // Already found and displaying the right event
  //     }

  //     // Try to find the real event now that data has loaded
  //     const realEvent =
  //       eventsNow.find((e) => e.id === params.eventId) ||
  //       eventsToday.find((e) => e.id === params.eventId) ||
  //       eventsTomorrow.find((e) => e.id === params.eventId);

  //     if (realEvent) {
  //       console.log("Found real event after data load:", realEvent.name);
  //       setIsEvent(true);
  //       handleEventClick(realEvent as MapEvent);
  //     }
  //   }
  // }, [
  //   params.eventId,
  //   isLoading,
  //   eventsNow,
  //   eventsToday,
  //   eventsTomorrow,
  //   selectedEvent,
  //   handleEventClick,
  // ]);

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
      // Write live device coordinates to live_* fields to avoid overwriting Orbit selection
      await updateUserLocations({
        live_location_latitude: location.coords.latitude.toString(),
        live_location_longitude: location.coords.longitude.toString(),
        last_updated: new Date().toISOString(),
      } as any);
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

        // Set initial camera position only if using current location mode
        if (user?.event_location_preference !== 1 && cameraRef.current) {
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
  }, [cameraRef, user?.event_location_preference]);

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

  // Allow rendering if we either have preferred, an existing mapCenter, or route params lat/lng
  const paramLat = (params as any)?.latitude || (params as any)?.lat;
  const paramLng = (params as any)?.longitude || (params as any)?.lng;
  const hasRouteCoords =
    (typeof paramLat === "string" || typeof paramLat === "number") &&
    (typeof paramLng === "string" || typeof paramLng === "number");
  if (preferredLat == null || preferredLng == null) {
    if (!mapCenter && !hasRouteCoords) {
      return (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" />
          <Text className="mt-4">Preparing your map...</Text>
        </View>
      );
    }
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
            centerCoordinate: [preferredLng ?? 0, preferredLat ?? 0],
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
          filterClusters(clustersToday, mapZoomLevel).map((cluster, index) =>
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
          filterClusters(clustersNow, mapZoomLevel).map((cluster, index) =>
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
          filterClusters(clustersTomorrow, mapZoomLevel).map((cluster, index) =>
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
          filterClusters(clusters, mapZoomLevel).map((cluster, index) =>
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
        {filteredClustersLocations.length > 0 &&
          filteredClustersLocations.map((cluster, index) =>
            // Only filter out clusters that don't have a mainEvent
            // Allow locations without images to still show
            !cluster.mainEvent ? (
              (console.log(
                `[Map] ⚠️ Skipping cluster at [${cluster.location.latitude}, ${cluster.location.longitude}] - no mainEvent`
              ),
              null)
            ) : (
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
          onRecenter={() =>
            handleRecenter({
              latitude: preferredLat ?? null,
              longitude: preferredLng ?? null,
            })
          }
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
