import React, { useRef, useState, useCallback } from "react";
import { StyleSheet, Dimensions, View } from "react-native";
import MapboxGL from "@rnmapbox/maps";
import { useTheme } from "~/src/components/ThemeProvider";
import { useMapCamera } from "~/src/hooks/useMapCamera";

// MapboxGL configuration
MapboxGL.setAccessToken(process.env.MAPBOX_ACCESS_TOKEN || "");

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

interface GoogleMapContainerProps {
  children: React.ReactNode;
  center: [number, number];
  onRegionChange: (region: any) => void;
  onMapTap: () => void;
  onMapLoadingError: () => void;
  onDidFinishLoadingMap: () => void;
  isFollowingUser: boolean;
}

export function GoogleMapContainer({
  children,
  center,
  onRegionChange,
  onMapTap,
  onMapLoadingError,
  onDidFinishLoadingMap,
  isFollowingUser,
}: GoogleMapContainerProps) {
  // Ensure we have valid center coordinates - FIXED COORDINATE ORDER
  const validCenter: [number, number] =
    center && center[0] !== 0 && center[1] !== 0
      ? center // center is already in [longitude, latitude] format from MapStateManager
      : [-80.1919, 25.773357]; // Default to Miami if invalid (longitude, latitude)
  const { isDarkMode } = useTheme();
  const mapRef = useRef<MapboxGL.MapView>(null);
  const { cameraRef } = useMapCamera();

  const handleMapLoadingError = useCallback(() => {
    console.error("🚨 GOOGLE MAP FAILED TO LOAD");
    console.error("🚨 Google Maps Error Details:");
    console.error("🚨 - Center coordinates:", center);
    onMapLoadingError();
  }, [onMapLoadingError, center]);

  const handleDidFinishLoadingMap = useCallback(() => {
    console.log("Google Map finished loading successfully");
    console.log(
      `[GoogleMapContainer] 🎯 DEBUG: Camera center: [${validCenter[0]}, ${validCenter[1]}] (longitude, latitude)`
    );
    console.log(
      "[GoogleMapContainer] 🎯 DEBUG: MapboxGL MapView rendered successfully"
    );
    console.log(
      `[GoogleMapContainer] 🎯 DEBUG: Map dimensions: ${
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
          isDarkMode ? MapboxGL.StyleURL.Dark : MapboxGL.StyleURL.Street
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
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  darkOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    pointerEvents: "none",
  },
});
