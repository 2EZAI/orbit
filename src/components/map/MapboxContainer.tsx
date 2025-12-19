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
          pitch={45}
        />
        
        {/* UI ONLY: 3D Buildings, Walkways, Landmarks - No functionality changes */}
        <MapboxGL.VectorSource id="composite" url="mapbox://mapbox.mapbox-streets-v8">
          {/* 3D Buildings - dark grey base */}
          <MapboxGL.FillExtrusionLayer
            id="3d-buildings"
            sourceLayerID="building"
            filter={['==', 'extrude', 'true']}
            style={{
              fillExtrusionColor: isDarkMode ? '#2a2a3e' : '#aaa',
              fillExtrusionHeight: ['get', 'height'],
              fillExtrusionBase: ['get', 'min_height'],
              fillExtrusionOpacity: isDarkMode ? 0.95 : 0.6,
            }}
          />
          
          {/* Window lighting layer - whitish/yellowish windows for taller buildings */}
          <MapboxGL.FillExtrusionLayer
            id="3d-buildings-windows"
            sourceLayerID="building"
            filter={[
              'all',
              ['==', 'extrude', 'true'],
              ['>=', ['get', 'height'], 20]
            ]}
            style={{
              fillExtrusionColor: isDarkMode 
                ? [
                    'case',
                    ['>=', ['get', 'height'], 80], '#fff8e1',
                    ['>=', ['get', 'height'], 50], '#fff3c4',
                    ['>=', ['get', 'height'], 30], '#ffeaa7',
                    '#fdd835',
                  ]
                : '#fff',
              fillExtrusionHeight: ['get', 'height'],
              fillExtrusionBase: ['get', 'min_height'],
              fillExtrusionOpacity: isDarkMode ? 0.3 : 0.2,
            }}
          />
          
          {/* Pedestrian walkways/paths */}
          <MapboxGL.LineLayer
            id="pedestrian-roads"
            sourceLayerID="road"
            filter={['in', 'class', 'literal', ['path']]}
            style={{
              lineColor: isDarkMode ? 'rgba(120, 120, 140, 0.7)' : 'rgba(160, 160, 180, 0.8)',
              lineWidth: [
                'interpolate',
                ['linear'],
                ['zoom'],
                10, 1.5,
                15, 2.5,
                18, 3.5,
              ],
              lineOpacity: 0.85,
              lineCap: 'round',
              lineJoin: 'round',
            }}
          />
          
          {/* Additional pedestrian paths (footways, steps) */}
          <MapboxGL.LineLayer
            id="pedestrian-footways"
            sourceLayerID="road"
            filter={['in', 'type', 'literal', ['footway', 'steps', 'pedestrian']]}
            style={{
              lineColor: isDarkMode ? 'rgba(110, 110, 130, 0.6)' : 'rgba(150, 150, 170, 0.7)',
              lineWidth: [
                'interpolate',
                ['linear'],
                ['zoom'],
                10, 1,
                15, 2,
                18, 3,
              ],
              lineOpacity: 0.75,
              lineCap: 'round',
              lineJoin: 'round',
            }}
          />
          
          {/* 3D Landmarks */}
          <MapboxGL.SymbolLayer
            id="landmarks"
            sourceLayerID="poi_label"
            filter={['==', 'type', 'landmark']}
            minZoomLevel={12}
            style={{
              iconSize: [
                'interpolate',
                ['linear'],
                ['zoom'],
                12, 0.6,
                15, 0.9,
                18, 1.3,
              ],
              iconAllowOverlap: false,
              iconIgnorePlacement: false,
              textField: ['get', 'name_en'],
              textFont: ['Open Sans Semibold', 'Arial Unicode MS Bold'],
              textSize: [
                'interpolate',
                ['linear'],
                ['zoom'],
                12, 11,
                15, 13,
                18, 15,
              ],
              textColor: isDarkMode ? '#ffffff' : '#000000',
              textHaloColor: isDarkMode ? '#000000' : '#ffffff',
              textHaloWidth: 1.5,
              textOptional: true,
              textAnchor: 'top',
            }}
          />
        </MapboxGL.VectorSource>
        
        {children}
      </MapboxGL.MapView>

      {/* UI ONLY: Darker overlay to match web app's background */}
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
    backgroundColor: "rgba(26, 26, 46, 0.3)",
    pointerEvents: "none",
    zIndex: -1,
  },
});
