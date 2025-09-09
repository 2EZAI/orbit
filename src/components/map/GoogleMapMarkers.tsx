import React, { useCallback, useMemo, useState, useEffect } from "react";
import { View } from "react-native";
import MapView, { Marker } from "react-native-maps";
import {
  MapEvent,
  MapLocation,
  UnifiedCluster,
} from "~/hooks/useUnifiedMapData";
import { EventMarker } from "./EventMarker";
import { UserMarker } from "./UserMarker";
import { UserMarkerWithCount } from "./UserMarkerWithCount";

// Progressive rendering configuration - FASTER RENDERING
const PROGRESSIVE_RENDERING_CONFIG = {
  INITIAL_BATCH_SIZE: 50, // Start with 50 markers
  BATCH_INCREMENT: 25, // Add 25 more each batch
  BATCH_DELAY: 25, // 25ms delay between batches (faster)
  MAX_BATCH_SIZE: 200, // Max 200 markers per batch
};

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

interface GoogleMapMarkersProps {
  // Event clusters
  clustersToday: UnifiedCluster[];
  clustersNow: UnifiedCluster[];
  clustersTomorrow: UnifiedCluster[];
  clusters: UnifiedCluster[];
  clustersLocations: UnifiedCluster[];

  // User data
  location: {
    latitude: number;
    longitude: number;
    heading?: number | null;
  } | null;
  user: any;
  followerList: any[];

  // Selection state
  selectedEvent: MapEvent | null;
  selectedTimeFrame: "Today" | "Week" | "Weekend";

  // Map state
  currentZoom?: number;

  // Event handlers
  onClusterPress: (cluster: UnifiedCluster) => void;
  setIsEvent: (isEvent: boolean) => void;
}

export function GoogleMapMarkers({
  clustersToday,
  clustersNow,
  clustersTomorrow,
  clusters,
  clustersLocations,
  location,
  user,
  followerList,
  selectedEvent,
  selectedTimeFrame,
  currentZoom = 10, // Default zoom level
  onClusterPress,
  setIsEvent,
}: GoogleMapMarkersProps) {
  // Progressive rendering state
  const [visibleMarkers, setVisibleMarkers] = useState(0);
  const [isRendering, setIsRendering] = useState(false);
  // Get the appropriate cluster data based on selected timeframe
  const getActiveClusters = useCallback(() => {
    switch (selectedTimeFrame) {
      case "Today":
        return clustersToday;
      case "Week":
        return clustersNow;
      case "Weekend":
        return clustersTomorrow;
      default:
        return clusters;
    }
  }, [
    selectedTimeFrame,
    clustersToday,
    clustersNow,
    clustersTomorrow,
    clusters,
  ]);

  // OLD CLUSTERING LOGIC: EXACTLY LIKE YOUR OLD CODE
  const getGoogleMapMarkerData = useCallback(
    (clusters: UnifiedCluster[], prefix: string) => {
      // OLD BEHAVIOR: Each cluster is a single marker with count
      return clusters.map((cluster, index) => ({
        cluster,
        index,
        key: `${prefix}-${cluster.coordinate[0].toFixed(
          3
        )}-${cluster.coordinate[1].toFixed(3)}-${index}`,
        coordinate: {
          latitude: cluster.coordinate[1], // Google Maps uses [lat, lng]
          longitude: cluster.coordinate[0],
        },
        // Each cluster represents multiple events/locations
        mainEvent: cluster.events?.[0] || cluster.locations?.[0],
        count: (cluster.events?.length || 0) + (cluster.locations?.length || 0),
      }));
    },
    []
  );

  // Google Maps marker data - ALL markers
  const markerDataToday = useMemo(
    () => getGoogleMapMarkerData(clustersToday, "cluster-today"),
    [clustersToday, getGoogleMapMarkerData]
  );

  const markerDataNow = useMemo(
    () => getGoogleMapMarkerData(clustersNow, "cluster-now"),
    [clustersNow, getGoogleMapMarkerData]
  );

  const markerDataTomorrow = useMemo(
    () => getGoogleMapMarkerData(clustersTomorrow, "cluster-tomorrow"),
    [clustersTomorrow, getGoogleMapMarkerData]
  );

  const markerDataFallback = useMemo(
    () => getGoogleMapMarkerData(clusters, "cluster-fallback"),
    [clusters, getGoogleMapMarkerData]
  );

  const markerDataLocations = useMemo(
    () => getGoogleMapMarkerData(clustersLocations, "cluster-location"),
    [clustersLocations, getGoogleMapMarkerData]
  );

  // Combine all marker data for progressive rendering
  const allMarkerData = useMemo(() => {
    return [
      ...markerDataToday,
      ...markerDataNow,
      ...markerDataTomorrow,
      ...markerDataFallback,
      ...markerDataLocations,
    ];
  }, [
    markerDataToday,
    markerDataNow,
    markerDataTomorrow,
    markerDataFallback,
    markerDataLocations,
  ]);

  // Progressive rendering effect - START IMMEDIATELY WHEN DATA ARRIVES
  useEffect(() => {
    if (allMarkerData.length === 0) {
      setVisibleMarkers(0);
      setIsRendering(false);
      return;
    }

    console.log(
      `[GoogleMapMarkers] 🚀 Starting progressive rendering for ${allMarkerData.length} markers`
    );
    setIsRendering(true);
    setVisibleMarkers(PROGRESSIVE_RENDERING_CONFIG.INITIAL_BATCH_SIZE);

    const renderNextBatch = () => {
      setVisibleMarkers((prev) => {
        const nextBatch = Math.min(
          prev + PROGRESSIVE_RENDERING_CONFIG.BATCH_INCREMENT,
          allMarkerData.length
        );

        if (nextBatch >= allMarkerData.length) {
          setIsRendering(false);
          console.log(
            `[GoogleMapMarkers] ✅ Progressive rendering complete: ${allMarkerData.length} markers`
          );
        }

        return nextBatch;
      });
    };

    // Start progressive rendering immediately
    const interval = setInterval(() => {
      setVisibleMarkers((prev) => {
        if (prev < allMarkerData.length) {
          const nextBatch = Math.min(
            prev + PROGRESSIVE_RENDERING_CONFIG.BATCH_INCREMENT,
            allMarkerData.length
          );

          if (nextBatch >= allMarkerData.length) {
            setIsRendering(false);
            console.log(
              `[GoogleMapMarkers] ✅ Progressive rendering complete: ${allMarkerData.length} markers`
            );
          }

          return nextBatch;
        } else {
          clearInterval(interval);
          setIsRendering(false);
          return prev;
        }
      });
    }, PROGRESSIVE_RENDERING_CONFIG.BATCH_DELAY);

    return () => clearInterval(interval);
  }, [allMarkerData.length]);

  // Get currently visible markers
  const visibleMarkerData = useMemo(() => {
    return allMarkerData.slice(0, visibleMarkers);
  }, [allMarkerData, visibleMarkers]);

  // OLD CLUSTER MARKER COMPONENT - EXACTLY LIKE YOUR OLD CODE
  const GoogleMapMarker = useCallback(
    ({
      cluster,
      index,
      timeFrame,
      markerData,
    }: {
      cluster: UnifiedCluster;
      index: number;
      timeFrame: string;
      markerData: any;
    }) => {
      const handlePress = useCallback(() => {
        onClusterPress(cluster);
      }, [cluster, onClusterPress]);

      // OLD BEHAVIOR: Each cluster shows as a single marker with count
      const mainEvent = markerData.mainEvent;
      const count = markerData.count;
      const isSelected =
        cluster.events?.some((e) => e.id === selectedEvent?.id) ||
        cluster.locations?.some((l) => l.id === selectedEvent?.id);

      if (mainEvent) {
        return (
          <Marker
            key={markerData.key}
            coordinate={markerData.coordinate}
            onPress={handlePress}
          >
            <EventMarker
              imageUrl={mainEvent.image_urls?.[0]}
              count={count}
              isSelected={isSelected}
              category={
                mainEvent.categories?.[0]?.name || mainEvent.category?.name
              }
              type={mainEvent.type}
              source={mainEvent.source}
            />
          </Marker>
        );
      }

      return null;
    },
    [onClusterPress, selectedEvent]
  );

  return (
    <>
      {/* DEBUG: Log progressive rendering progress */}
      {console.log(
        `[GoogleMapMarkers] Progressive rendering: ${visibleMarkers}/${
          allMarkerData.length
        } markers visible (${isRendering ? "rendering..." : "complete"})`
      )}

      {/* Show progressively rendered markers */}
      {visibleMarkerData.map((markerData) => (
        <GoogleMapMarker
          key={markerData.key}
          cluster={markerData.cluster}
          index={markerData.index}
          timeFrame={markerData.key.split("-")[1] || "unknown"}
          markerData={markerData}
        />
      ))}

      {/* User marker */}
      {location && (
        <Marker
          coordinate={{
            latitude: location.latitude,
            longitude: location.longitude,
          }}
          anchor={{ x: 0.5, y: 0.5 }}
        >
          <UserMarker
            avatarUrl={user?.avatar_url}
            heading={location.heading || undefined}
          />
        </Marker>
      )}
    </>
  );
}
