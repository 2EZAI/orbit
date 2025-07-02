import { useRef, useState, useCallback } from "react";
import MapboxGL from "@rnmapbox/maps";

interface UseMapCameraProps {
  initialZoom?: number;
  minZoom?: number;
  maxZoom?: number;
}

export const useMapCamera = ({
  initialZoom = 11,
  minZoom = 3,
  maxZoom = 16,
}: UseMapCameraProps = {}) => {
  const cameraRef = useRef<MapboxGL.Camera>(null);
  const [zoomLevel, setZoomLevel] = useState(initialZoom);
  const [isFollowingUser, setIsFollowingUser] = useState(true);

  const handleZoomIn = useCallback(() => {
    console.log("Zoom In pressed. Current zoom:", zoomLevel);
    if (cameraRef.current) {
      const newZoom = Math.min(zoomLevel + 1, maxZoom);
      console.log("Setting new zoom level:", newZoom);

      cameraRef.current.setCamera({
        zoomLevel: newZoom,
        animationDuration: 300,
      });
      setZoomLevel(newZoom);
    } else {
      console.log("Camera ref is null");
    }
  }, [zoomLevel, maxZoom]);

  const handleZoomOut = useCallback(() => {
    console.log("Zoom Out pressed. Current zoom:", zoomLevel);
    if (cameraRef.current) {
      const newZoom = Math.max(zoomLevel - 1, minZoom);
      console.log("Setting new zoom level:", newZoom);

      cameraRef.current.setCamera({
        zoomLevel: newZoom,
        animationDuration: 300,
      });
      setZoomLevel(newZoom);
    } else {
      console.log("Camera ref is null");
    }
  }, [zoomLevel, minZoom]);

  const handleRecenter = useCallback(
    (location: { longitude: number; latitude: number }) => {
      if (location && cameraRef.current) {
        setIsFollowingUser(true);
        cameraRef.current.setCamera({
          centerCoordinate: [location.longitude, location.latitude],
          zoomLevel: 16,
          animationDuration: 500,
        });
      }
    },
    []
  );

  const fitToEvents = useCallback(
    (events: Array<{ location: { latitude: number; longitude: number } }>) => {
      if (!events.length || !cameraRef.current) return;

      const bounds = events.reduce(
        (acc, event) => {
          const lat = event.location.latitude;
          const lng = event.location.longitude;
          return {
            ne: {
              latitude: Math.max(acc.ne.latitude, lat),
              longitude: Math.max(acc.ne.longitude, lng),
            },
            sw: {
              latitude: Math.min(acc.sw.latitude, lat),
              longitude: Math.min(acc.sw.longitude, lng),
            },
          };
        },
        {
          ne: { latitude: -90, longitude: -180 },
          sw: { latitude: 90, longitude: 180 },
        }
      );

      const centerLat = (bounds.ne.latitude + bounds.sw.latitude) / 2;
      const centerLng = (bounds.ne.longitude + bounds.sw.longitude) / 2;
      const latDiff = bounds.ne.latitude - bounds.sw.latitude;
      const lngDiff = bounds.ne.longitude - bounds.sw.longitude;
      const maxDiff = Math.max(latDiff, lngDiff);
      const zoomLevel = Math.floor(14 - Math.log2(maxDiff * 111));

      cameraRef.current.setCamera({
        centerCoordinate: [centerLng, centerLat],
        zoomLevel: Math.min(Math.max(zoomLevel, 11), 15),
        animationDuration: 1000,
        animationMode: "flyTo",
      });
    },
    []
  );

  return {
    cameraRef,
    zoomLevel,
    isFollowingUser,
    setIsFollowingUser,
    handleZoomIn,
    handleZoomOut,
    handleRecenter,
    fitToEvents,
  };
};
