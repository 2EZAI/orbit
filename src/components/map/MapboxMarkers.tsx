import React, { useCallback, useMemo, useState, useEffect, useRef } from "react";
import { View } from "react-native";
import MapboxGL from "@rnmapbox/maps";
import {
  MapEvent,
  MapLocation,
  UnifiedCluster,
} from "~/hooks/useUnifiedMapData";
import { EventMarker } from "./EventMarker";
import { UserMarker } from "./UserMarker";
import { UserMarkerWithCount } from "./UserMarkerWithCount";

// Progressive rendering configuration - OPTIMIZED FOR LARGE DATASETS
const PROGRESSIVE_RENDERING_CONFIG = {
  INITIAL_BATCH_SIZE: 20, // Start with 20 markers
  BATCH_INCREMENT: 10, // Add 10 more each batch
  BATCH_DELAY: 50, // 50ms delay between batches
  MAX_BATCH_SIZE: 50, // Max 50 markers per batch
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

interface MapboxMarkersProps {
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

export function MapboxMarkers({
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
}: MapboxMarkersProps) {
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
  const getMapboxMarkerData = useCallback(
    (clusters: UnifiedCluster[], prefix: string) => {
      // OLD BEHAVIOR: Each cluster is a single marker with count
      return clusters.map((cluster, index) => ({
        cluster,
        index,
        key: `${prefix}-${cluster.coordinate[0].toFixed(
          3
        )}-${cluster.coordinate[1].toFixed(3)}-${index}`,
        coordinate: cluster.coordinate, // Already in [lng, lat] format
        // Each cluster represents multiple events/locations
        mainEvent: cluster.events?.[0] || cluster.locations?.[0],
        count: (cluster.events?.length || 0) + (cluster.locations?.length || 0),
      }));
    },
    []
  );

  // Mapbox marker data - ALL markers
  const markerDataToday = useMemo(
    () => getMapboxMarkerData(clustersToday, "cluster-today"),
    [clustersToday, getMapboxMarkerData]
  );

  const markerDataNow = useMemo(
    () => getMapboxMarkerData(clustersNow, "cluster-now"),
    [clustersNow, getMapboxMarkerData]
  );

  const markerDataTomorrow = useMemo(
    () => getMapboxMarkerData(clustersTomorrow, "cluster-tomorrow"),
    [clustersTomorrow, getMapboxMarkerData]
  );

  const markerDataFallback = useMemo(
    () => getMapboxMarkerData(clusters, "cluster-fallback"),
    [clusters, getMapboxMarkerData]
  );

  const markerDataLocations = useMemo(
    () => getMapboxMarkerData(clustersLocations, "cluster-location"),
    [clustersLocations, getMapboxMarkerData]
  );

  // Combine all marker data for progressive rendering - ALL DATA INCLUDED
  const allMarkerData = useMemo(() => {
    const combined = [
      ...markerDataToday,
      ...markerDataNow,
      ...markerDataTomorrow,
      ...markerDataFallback,
      ...markerDataLocations,
    ];

    return combined;
  }, [
    markerDataToday,
    markerDataNow,
    markerDataTomorrow,
    markerDataFallback,
    markerDataLocations,
    clustersToday,
    clustersNow,
    clustersTomorrow,
    clusters,
    clustersLocations,
  ]);

  // OPTIMIZATION: Progressive rendering with proper dependency tracking to prevent continuous re-renders
  const lastMarkerCountRef = useRef(0);
  const isRenderingRef = useRef(false);

  useEffect(() => {
    if (allMarkerData.length === 0) {
      setVisibleMarkers(0);
      setIsRendering(false);
      isRenderingRef.current = false;
      lastMarkerCountRef.current = 0;
      return;
    }

    // Only start progressive rendering if marker count actually changed and we're not already rendering
    if (allMarkerData.length !== lastMarkerCountRef.current && !isRenderingRef.current) {
      console.log(
        `[MapboxMarkers] 🚀 Starting INSTANT VISIBLE rendering for ${allMarkerData.length} markers`
      );
      setIsRendering(true);
      isRenderingRef.current = true;
      lastMarkerCountRef.current = allMarkerData.length;

      // Start with more markers immediately for better UX
      setVisibleMarkers(Math.min(300, allMarkerData.length));

      // INSTANT VISIBLE rendering: Render markers in smaller batches for immediate visibility
      const interval = setInterval(() => {
        setVisibleMarkers((prev) => {
          if (prev < allMarkerData.length) {
            const nextBatch = Math.min(
              prev + 25, // Render 25 markers at a time for immediate visibility
              allMarkerData.length
            );

            if (nextBatch >= allMarkerData.length) {
              setIsRendering(false);
              isRenderingRef.current = false;
              console.log(
                `[MapboxMarkers] ✅ INSTANT VISIBLE rendering complete: ${allMarkerData.length} markers`
              );
            }

            return nextBatch;
          } else {
            clearInterval(interval);
            setIsRendering(false);
            isRenderingRef.current = false;
            return prev;
          }
        });
      }, 8); // 120fps rendering (8ms intervals) for immediate visibility

      return () => clearInterval(interval);
    }
  }, [allMarkerData.length]);

  // Get currently visible markers
  const visibleMarkerData = useMemo(() => {
    return allMarkerData.slice(0, visibleMarkers);
  }, [allMarkerData, visibleMarkers]);

  // ULTRA-OPTIMIZED CLUSTER MARKER COMPONENT - MEMOIZED FOR PERFORMANCE
  const MapboxMarker = useCallback(
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
        console.log("🎯 [MapboxMarkers] Marker pressed!", {
          clusterType: cluster.type,
          clusterId:
            cluster.mainEvent?.id ||
            cluster.events?.[0]?.id ||
            cluster.locations?.[0]?.id,
          eventCount: cluster.events?.length || 0,
          locationCount: cluster.locations?.length || 0,
        });
        onClusterPress(cluster);
      }, [cluster, onClusterPress]);

      // ULTRA-OPTIMIZED BEHAVIOR: Each cluster shows as a single marker with count
      const mainEvent = markerData.mainEvent;
      const count = markerData.count;
      const isSelected = useMemo(
        () =>
          cluster.events?.some((e) => e.id === selectedEvent?.id) ||
          cluster.locations?.some((l) => l.id === selectedEvent?.id),
        [cluster.events, cluster.locations, selectedEvent?.id]
      );

      if (mainEvent) {
        return (
          <MapboxGL.MarkerView
            key={markerData.key}
            id={markerData.key}
            coordinate={markerData.coordinate}
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <View style={{ zIndex: isSelected ? 1000 : 100 }}>
              <EventMarker
                imageUrl={mainEvent.image_urls?.[0]}
                count={count}
                isSelected={isSelected}
                onPress={handlePress}
                category={
                  mainEvent.categories?.[0]?.name || mainEvent.category?.name
                }
                type={mainEvent.type}
                source={mainEvent.source}
              />
            </View>
          </MapboxGL.MarkerView>
        );
      }

      return null;
    },
    [onClusterPress, selectedEvent]
  );

  // OPTIMIZATION: Move console.log outside JSX to prevent re-renders
  // Only log when rendering state actually changes
  useEffect(() => {
    if (allMarkerData.length > 0) {
      console.log(
        `[MapboxMarkers] Progressive rendering: ${visibleMarkers}/${
          allMarkerData.length
        } markers visible (${isRendering ? "rendering..." : "complete"})`
      );
    }
  }, [visibleMarkers, allMarkerData.length, isRendering]);

  return (
    <>
      {/* Show progressively rendered markers */}
      {visibleMarkerData.map((markerData) => (
        <MapboxMarker
          key={markerData.key}
          cluster={markerData.cluster}
          index={markerData.index}
          timeFrame={markerData.key.split("-")[1] || "unknown"}
          markerData={markerData}
        />
      ))}

      {/* User marker */}
      {location && (
        <MapboxGL.UserLocation
          visible={true}
          showsUserHeadingIndicator={true}
          animated={true}
        />
      )}
    </>
  );
}
