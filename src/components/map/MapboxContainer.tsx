import MapboxGL from "@rnmapbox/maps";
import React, { useCallback, useRef } from "react";
import { Dimensions, StyleSheet, View } from "react-native";
import { useTheme } from "~/src/components/ThemeProvider";

// MapboxGL configuration
MapboxGL.setAccessToken(process.env.MAPBOX_ACCESS_TOKEN || "");

interface MapboxContainerProps {
  children: React.ReactNode;
  center: [number, number];
  onRegionChange: (region: any) => void;
  onMapTap: () => void;
  onMapLoadingError: () => void;
  onDidFinishLoadingMap: () => void;
  isFollowingUser: boolean;
  cameraRef: React.RefObject<any>;
}

export function MapboxContainer({
  children,
  center,
  onRegionChange,
  onMapTap,
  onMapLoadingError,
  onDidFinishLoadingMap,
  isFollowingUser,
  cameraRef,
}: MapboxContainerProps) {
  // Ensure we have valid center coordinates - FIXED COORDINATE ORDER
  const validCenter: [number, number] =
    center && center[0] !== 0 && center[1] !== 0
      ? center // center is already in [longitude, latitude] format from MapStateManager
      : [-80.1919, 25.773357]; // Default to Miami if invalid (longitude, latitude)
  const { isDarkMode } = useTheme();
  const mapRef = useRef<MapboxGL.MapView>(null);

  const handleMapLoadingError = useCallback(() => {
    console.error("🚨 MAPBOX MAP FAILED TO LOAD");
    console.error("🚨 Mapbox Error Details:");
    console.error("🚨 - Center coordinates:", center);
    onMapLoadingError();
  }, [onMapLoadingError, center]);

  const handleDidFinishLoadingMap = useCallback(() => {
    console.log("Mapbox Map finished loading successfully");
    console.log(
      `[MapboxContainer] 🎯 DEBUG: Camera center: [${validCenter[0]}, ${validCenter[1]}] (longitude, latitude)`
    );
    console.log(
      "[MapboxContainer] 🎯 DEBUG: MapboxGL MapView rendered successfully"
    );
    console.log(
      `[MapboxContainer] 🎯 DEBUG: Map dimensions: ${
        Dimensions.get("window").width
      }x${Dimensions.get("window").height}`
    );
    onDidFinishLoadingMap();
  }, [onDidFinishLoadingMap, validCenter]);

  return (
    <View style={styles.container}>
      <MapboxGL.MapView
        ref={mapRef}
        style={styles.map}
        styleURL={
          isDarkMode
            ? "mapbox://styles/mapbox/dark-v11"
            : "mapbox://styles/mapbox/light-v11"
        }
        onMapIdle={onRegionChange}
        onTouchStart={onMapTap}
        compassEnabled={false}
        scaleBarEnabled={false}
        logoEnabled={false}
        attributionEnabled={false}
        zoomEnabled={true}
        rotateEnabled={true}
        scrollEnabled={true}
        pitchEnabled={true}
      >
        <MapboxGL.Camera
          ref={cameraRef}
          centerCoordinate={[validCenter[0], validCenter[1]]}
          zoomLevel={14}
        />
        {children}
      </MapboxGL.MapView>

      {/* Minimal overlay to reduce visual noise */}
      {isDarkMode && <View style={styles.darkOverlay} pointerEvents="none" />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: "relative",
  },
  map: {
    flex: 1,
  },
  darkOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.1)",
    pointerEvents: "none",
  },
});
