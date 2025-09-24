import React, { useState, useCallback, useMemo } from "react";
import {
  MapEvent,
  MapLocation,
  UnifiedCluster,
} from "~/hooks/useUnifiedMapData";
import {
  FilterState,
  generateDefaultFilters,
} from "~/src/components/map/MarkerFilter";

interface MapPerformanceOptimizerProps {
  children: (optimized: OptimizedData) => React.ReactNode;
  // Raw data
  events: MapEvent[];
  locations: MapLocation[];
  clusters: UnifiedCluster[];
  clustersLocations: UnifiedCluster[];
  clustersNow: UnifiedCluster[];
  clustersToday: UnifiedCluster[];
  clustersTomorrow: UnifiedCluster[];

  // Filters
  filters: FilterState;

  // Viewport
  mapBounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  } | null;
}

interface OptimizedData {
  // Filtered clusters
  filteredClusters: UnifiedCluster[];
  filteredClustersLocations: UnifiedCluster[];
  filteredClustersNow: UnifiedCluster[];
  filteredClustersToday: UnifiedCluster[];
  filteredClustersTomorrow: UnifiedCluster[];

  // Visible clusters (viewport-based)
  visibleClusters: UnifiedCluster[];
  visibleClustersLocations: UnifiedCluster[];
  visibleClustersNow: UnifiedCluster[];
  visibleClustersToday: UnifiedCluster[];
  visibleClustersTomorrow: UnifiedCluster[];

  // Performance metrics
  totalMarkers: number;
  visibleMarkers: number;
  renderEfficiency: number;
}

export function MapPerformanceOptimizer({
  children,
  events,
  locations,
  clusters,
  clustersLocations,
  clustersNow,
  clustersToday,
  clustersTomorrow,
  filters,
  mapBounds,
}: MapPerformanceOptimizerProps) {
  // Dynamic filter functions - uses OR logic for better UX
  const shouldShowMarker = useCallback(
    (event: MapEvent | MapLocation): boolean => {
      // If no filters are set yet, show everything
      if (!filters || Object.keys(filters).length === 0) {
        return true;
      }

      // If "show-all" filter is enabled, show everything
      if (filters["show-all"] === true) {
        return true;
      }

      // If all filters are false, hide everything
      const hasAnyFilterEnabled = Object.values(filters).some(
        (value) => value === true
      );
      if (!hasAnyFilterEnabled) {
        return false;
      }

      // DEFAULT TO SHOWING EVERYTHING - only hide if explicitly filtered out
      let shouldShow = true;

      // Check if any relevant filters are disabled for this item
      // If a filter exists for this item's category/type and it's disabled, hide the item

      // Check event source type filters
      if ("source" in event && event.source) {
        const sourceKey =
          event.source === "user"
            ? "community-events"
            : (typeof event.source === "string" &&
                event.source.includes("ticket")) ||
              event.source === "ticketmaster"
            ? "ticketed-events"
            : "featured-events";

        // If this source filter exists and is disabled, hide the item
        if (filters.hasOwnProperty(sourceKey) && !filters[sourceKey]) {
          shouldShow = false;
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
          // If this category filter exists and is disabled, hide the item
          if (filters.hasOwnProperty(catKey) && !filters[catKey]) {
            shouldShow = false;
            break;
          }
        }
      }

      // Check location category filters
      if ("category" in event && event.category) {
        const catKey = `location-${event.category.name
          .toLowerCase()
          .replace(/\s+/g, "-")}`;
        // If this category filter exists and is disabled, hide the item
        if (filters.hasOwnProperty(catKey) && !filters[catKey]) {
          shouldShow = false;
        }
      }

      // Check location type filters (only if no category is available)
      if (
        "type" in event &&
        event.type &&
        !("category" in event && event.category)
      ) {
        const typeKey = `type-${event.type.toLowerCase().replace(/\s+/g, "-")}`;
        // If this type filter exists and is disabled, hide the item
        if (filters.hasOwnProperty(typeKey) && !filters[typeKey]) {
          shouldShow = false;
        }
      }

      return shouldShow;
    },
    [filters]
  );

  // Filter clusters based on filter state
  const filterClusters = useCallback(
    (clusters: UnifiedCluster[]) => {
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
              locations: (cluster.locations || []).filter(shouldShowMarker),
            };
          } else {
            return {
              ...cluster,
              events: (cluster.events || []).filter(shouldShowMarker),
            };
          }
        });

      return filtered;
    },
    [shouldShowMarker]
  );

  // CRITICAL FIX: SHOW ALL CLUSTERS IMMEDIATELY - NO VIEWPORT FILTERING
  const getVisibleClusters = useCallback((allClusters: UnifiedCluster[]) => {
    // SHOW ALL CLUSTERS IMMEDIATELY - NO VIEWPORT FILTERING
    return allClusters;
  }, []);

  // Memoize filtered clusters to prevent repeated filtering
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

  // Get visible clusters for each timeframe
  const visibleClustersToday = useMemo(
    () => getVisibleClusters(filteredClustersToday),
    [filteredClustersToday, getVisibleClusters]
  );

  const visibleClustersNow = useMemo(
    () => getVisibleClusters(filteredClustersNow),
    [filteredClustersNow, getVisibleClusters]
  );

  const visibleClustersTomorrow = useMemo(
    () => getVisibleClusters(filteredClustersTomorrow),
    [filteredClustersTomorrow, getVisibleClusters]
  );

  const visibleClusters = useMemo(
    () => getVisibleClusters(filteredClusters),
    [filteredClusters, getVisibleClusters]
  );

  const visibleClustersLocations = useMemo(
    () => getVisibleClusters(filteredClustersLocations),
    [filteredClustersLocations, getVisibleClusters]
  );

  // Calculate performance metrics
  const totalMarkers = useMemo(() => {
    return (
      filteredClusters.length +
      filteredClustersLocations.length +
      filteredClustersNow.length +
      filteredClustersToday.length +
      filteredClustersTomorrow.length
    );
  }, [
    filteredClusters.length,
    filteredClustersLocations.length,
    filteredClustersNow.length,
    filteredClustersToday.length,
    filteredClustersTomorrow.length,
  ]);

  const visibleMarkers = useMemo(() => {
    return (
      visibleClusters.length +
      visibleClustersLocations.length +
      visibleClustersNow.length +
      visibleClustersToday.length +
      visibleClustersTomorrow.length
    );
  }, [
    visibleClusters.length,
    visibleClustersLocations.length,
    visibleClustersNow.length,
    visibleClustersToday.length,
    visibleClustersTomorrow.length,
  ]);

  const renderEfficiency = useMemo(() => {
    if (totalMarkers === 0) return 100;
    return Math.round((visibleMarkers / totalMarkers) * 100);
  }, [totalMarkers, visibleMarkers]);

  // Log performance metrics
  React.useEffect(() => {
    if (totalMarkers > 0) {
      // REMOVED: Performance logging to reduce noise
    }
  }, [totalMarkers, visibleMarkers, renderEfficiency]);

  // PERFORMANCE FIX: Disable excessive debug logging
  // No debug logging to prevent re-renders

  const optimizedData: OptimizedData = {
    // Filtered clusters
    filteredClusters,
    filteredClustersLocations,
    filteredClustersNow,
    filteredClustersToday,
    filteredClustersTomorrow,

    // Visible clusters (viewport-based)
    visibleClusters,
    visibleClustersLocations,
    visibleClustersNow,
    visibleClustersToday,
    visibleClustersTomorrow,

    // Performance metrics
    totalMarkers,
    visibleMarkers,
    renderEfficiency,
  };

  return <>{children(optimizedData)}</>;
}
