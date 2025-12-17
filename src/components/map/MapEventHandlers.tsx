import React, { useRef, useCallback } from "react";
import { useMapCamera } from "~/hooks/useMapCamera";
import {
  MapEvent,
  MapLocation,
  UnifiedCluster,
} from "~/hooks/useUnifiedMapData";

interface MapEventHandlersProps {
  children: (handlers: MapEventHandlers) => React.ReactNode;
  cameraRef: React.RefObject<any>;
}

interface MapEventHandlers {
  handleRegionChange: (region: any) => void;
  handleMapTap: () => void;
  handleEventSelect: (event: MapEvent) => void;
  handleLocationSelect: (location: MapLocation) => void;
  handleClusterPress: (cluster: UnifiedCluster) => void;
  handleRecenter: (location: any) => void;
  setCurrentZoomLevel: (zoom: number) => void;
  setHideCount: (hide: boolean) => void;
}

export function MapEventHandlers({
  children,
  cameraRef,
}: MapEventHandlersProps) {
  // Create a custom handleRecenter that uses the passed cameraRef
  const handleRecenter = useCallback(
    (location: {
      longitude: number | null | undefined;
      latitude: number | null | undefined;
    }) => {
      console.log(
        "🗺️ [MapEventHandlers] handleRecenter called with:",
        location
      );
      console.log(
        "🗺️ [MapEventHandlers] cameraRef.current:",
        !!cameraRef.current
      );

      if (!cameraRef.current) {
        console.log(
          "🗺️ [MapEventHandlers] Camera ref is null, cannot recenter"
        );
        return;
      }

      const lng =
        typeof location?.longitude === "number" &&
        Number.isFinite(location.longitude)
          ? location.longitude
          : null;
      const lat =
        typeof location?.latitude === "number" &&
        Number.isFinite(location.latitude)
          ? location.latitude
          : null;

      console.log("🗺️ [MapEventHandlers] Parsed coordinates:", { lng, lat });

      if (lng == null || lat == null) {
        console.log(
          "🗺️ [MapEventHandlers] Invalid coordinates, cannot recenter"
        );
        return;
      }

      console.log("🗺️ [MapEventHandlers] Setting camera to:", [lng, lat]);
      try {
        cameraRef.current.setCamera({
          centerCoordinate: [lng, lat],
          zoomLevel: 13,
          animationDuration: 500,
          animationMode: "flyTo",
        });
        console.log("🗺️ [MapEventHandlers] Camera set successfully");
      } catch (error) {
        console.error("🗺️ [MapEventHandlers] Error setting camera:", error);
      }
    },
    [cameraRef]
  );

  // Refs for throttling and debouncing
  const lastRegionChangeRef = useRef<number>(0);
  const isMapMovingRef = useRef<boolean>(false);
  const regionChangeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastCenterRef = useRef<[number, number] | null>(null);
  const zoomDebounceRef = useRef<NodeJS.Timeout | null>(null);

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

  // Optimized region change handler with throttling
  const handleRegionChange = useCallback((region: any) => {
    // CRITICAL FIX: Prevent excessive callback creation
    if (!region?.properties) {
      return;
    }

    // CRITICAL: Prevent processing during rapid map movements
    if (isMapMovingRef.current) {
      return;
    }

    // OPTIMIZATION: Throttle region changes to prevent excessive callbacks
    const now = Date.now();
    if (now - lastRegionChangeRef.current < 2000) {
      return;
    }
    lastRegionChangeRef.current = now;

    // Clear existing timeout
    if (regionChangeTimeoutRef.current) {
      clearTimeout(regionChangeTimeoutRef.current);
    }

    // OPTIMIZATION: Debounce region changes
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
          lastCenterRef.current = newCenter;
        } else {
          // Calculate distance moved
          const latDiff = Math.abs(newCenter[0] - lastCenter[0]);
          const lngDiff = Math.abs(newCenter[1] - lastCenter[1]);

          // OPTIMIZATION: Reduced threshold for more responsive data loading
          const significantMoveThreshold = 0.2; // ~20 miles

          if (
            latDiff > significantMoveThreshold ||
            lngDiff > significantMoveThreshold
          ) {
            console.log(
              `🗺️ [MAP PANNING] User moved significantly, loading new area data`
            );
            lastCenterRef.current = newCenter;
          }
        }
      }

      // Handle zoom level for follower count visibility and clustering
      if (zoomLevel) {
        // Update hide count immediately
        const shouldHideCount = zoomLevel <= 12;

        // OPTIMIZATION: Debounce zoom level updates
        if (zoomDebounceRef.current) {
          clearTimeout(zoomDebounceRef.current);
        }

        zoomDebounceRef.current = setTimeout(() => {
          console.log(`🗺️ [ZOOM] Current zoom level: ${zoomLevel}`);
        }, 500); // 500ms debounce to prevent excessive clustering
      }
    }, 2000); // 2 second debounce to prevent excessive callbacks
  }, []);

  // Map tap handler
  const handleMapTap = useCallback(() => {
    // This will be handled by the parent component
    console.log("🗺️ [Map] Map tapped");
  }, []);

  // Event selection handler
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
      console.log("🗺️ [Map] Event selected:", event.name);
    },
    [cameraRef]
  );

  // Location selection handler
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
      console.log("🗺️ [Map] Location selected:", location.name);
    },
    [cameraRef]
  );

  // Cluster press handler
  const handleClusterPress = useCallback(
    (cluster: UnifiedCluster) => {
      if (cluster.type === "event") {
        if (cluster.events?.length === 1) {
          // Center map on selected event
          const coords = getLocationCoordinates(cluster.events[0].location);
          if (cameraRef.current && coords) {
            cameraRef.current.setCamera({
              centerCoordinate: [coords.longitude, coords.latitude],
              zoomLevel: 14,
              animationDuration: 500,
              animationMode: "flyTo",
            });
          }
          console.log(
            "🗺️ [Map] Single event cluster pressed:",
            cluster.events[0].name
          );
        } else {
          console.log(
            "🗺️ [Map] Multi-event cluster pressed:",
            cluster.events?.length,
            "events"
          );
        }
      } else if (cluster.type === "location") {
        if (cluster.locations?.length === 1) {
          // Center map on selected location
          const coords = getLocationCoordinates(cluster.locations[0].location);
          if (cameraRef.current && coords) {
            cameraRef.current.setCamera({
              centerCoordinate: [coords.longitude, coords.latitude],
              zoomLevel: 14,
              animationDuration: 500,
              animationMode: "flyTo",
            });
          }
          console.log(
            "🗺️ [Map] Single location cluster pressed:",
            cluster.locations[0].name
          );
        } else {
          console.log(
            "🗺️ [Map] Multi-location cluster pressed:",
            cluster.locations?.length,
            "locations"
          );
        }
      }
    },
    [cameraRef]
  );

  // Zoom level setter
  const setCurrentZoomLevel = useCallback((zoom: number) => {
    console.log(`🗺️ [Map] Setting zoom level to: ${zoom}`);
    // This will be connected to the actual zoom level state in MapStateManager
  }, []);

  // Hide count setter
  const setHideCount = useCallback((hide: boolean) => {
    console.log(`🗺️ [Map] Setting hide count to: ${hide}`);
  }, []);

  const handlers: MapEventHandlers = {
    handleRegionChange,
    handleMapTap,
    handleEventSelect,
    handleLocationSelect,
    handleClusterPress,
    handleRecenter,
    setCurrentZoomLevel,
    setHideCount,
  };

  return <>{children(handlers)}</>;
}
