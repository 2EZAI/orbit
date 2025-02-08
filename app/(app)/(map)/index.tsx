import { useEffect, useState, useRef, useCallback } from "react";
import {
  View,
  StyleSheet,
  Dimensions,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Button,
  ScrollView,
  Platform,
  Linking,
} from "react-native";
import { Text } from "~/src/components/ui/text";
import * as Location from "expo-location";
import { useTheme } from "~/src/components/ThemeProvider";
import MapboxGL, { UserTrackingMode } from "@rnmapbox/maps";
import { useUser } from "~/hooks/useUserData";
import { useMapEvents, type MapEvent } from "~/hooks/useMapEvents";
import { useMapCamera } from "~/src/hooks/useMapCamera";
import { MapControls } from "~/src/components/map/MapControls";
import { X, MapPin } from "lucide-react-native";

import { Sheet } from "~/src/components/ui/sheet";
import { UserMarker } from "~/src/components/map/UserMarker";
import { EventMarker } from "~/src/components/map/EventMarker";
import { EventCard } from "~/src/components/map/EventCard";
import { ClusterSheet } from "~/src/components/map/ClusterSheet";

// Replace with your Mapbox access token
MapboxGL.setAccessToken(
  "pk.eyJ1IjoidGFuZ2VudGRpZ2l0YWxhZ2VuY3kiLCJhIjoiY2xwMHR0bTVmMGJwbTJtbzhxZ2pvZWNoYiJ9.ZGwLHw0gLeEVxPhoYq2WyA"
);

// Custom style URLs - now these will work with Mapbox
const CUSTOM_LIGHT_STYLE =
  "mapbox://styles/tangentdigitalagency/clzwv4xtp002y01psdttf9jhr";
const CUSTOM_DARK_STYLE =
  "mapbox://styles/tangentdigitalagency/clzwv4xtp002y01psdttf9jhr";

export default function Map() {
  const { theme, isDarkMode } = useTheme();
  const { user } = useUser();
  const mapRef = useRef<MapboxGL.MapView>(null);
  const [location, setLocation] = useState<{
    latitude: number;
    longitude: number;
    heading?: number | null;
  } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [selectedCluster, setSelectedCluster] = useState<MapEvent[] | null>(
    null
  );

  const {
    cameraRef,
    isFollowingUser,
    setIsFollowingUser,
    handleZoomIn,
    handleZoomOut,
    handleRecenter,
    fitToEvents,
  } = useMapCamera();

  const {
    events,
    clusters,
    selectedEvent,
    isLoading,
    error,
    handleEventClick,
    handleCloseModal,
  } = useMapEvents({
    center: location
      ? [location.latitude, location.longitude]
      : [37.7749, -122.4194],
    radius: 50000,
    timeRange: "now",
  });

  // Add logging for event selection
  useEffect(() => {
    if (selectedEvent) {
      console.log("Selected event:", {
        id: selectedEvent.id,
        name: selectedEvent.name,
        venue: selectedEvent.venue_name,
      });
    }
  }, [selectedEvent]);

  // Add logging for events
  useEffect(() => {
    console.log("[Map] Total events available:", events.length);
    console.log("[Map] First event location:", events[0]?.location);

    // Fit map to events if we have any
    if (events.length > 0 && mapRef.current && cameraRef.current) {
      const bounds = events.reduce(
        (acc, event) => {
          acc.north = Math.max(acc.north, event.location.latitude);
          acc.south = Math.min(acc.south, event.location.latitude);
          acc.east = Math.max(acc.east, event.location.longitude);
          acc.west = Math.min(acc.west, event.location.longitude);
          return acc;
        },
        {
          north: -90,
          south: 90,
          east: -180,
          west: 180,
        }
      );

      console.log("[Map] Calculated bounds:", bounds);

      // Add padding to bounds
      const padding = 0.1; // degrees

      // Only fit to bounds if they're valid (not the initial values)
      if (bounds.north !== -90 && bounds.south !== 90) {
        // Calculate center point of events
        const centerLat = (bounds.north + bounds.south) / 2;
        const centerLng = (bounds.east + bounds.west) / 2;

        // Calculate appropriate zoom level based on bounds
        const latDiff = Math.abs(bounds.north - bounds.south);
        const lngDiff = Math.abs(bounds.east - bounds.west);
        const maxDiff = Math.max(latDiff, lngDiff);
        const zoomLevel = Math.floor(14 - Math.log2(maxDiff)); // Adjust 14 to change base zoom

        cameraRef.current.setCamera({
          centerCoordinate: [centerLng, centerLat],
          zoomLevel: Math.min(Math.max(zoomLevel, 9), 16), // Clamp between min and max zoom
          animationDuration: 1000,
          animationMode: "flyTo",
        });
      }
    }
  }, [events, mapRef, cameraRef]);

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
  }, []);

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
    [handleEventClick]
  );

  const handleClusterPress = useCallback(
    (cluster: { events: MapEvent[] }) => {
      console.log("[Map] Cluster pressed:", {
        eventCount: cluster.events.length,
        firstEventId: cluster.events[0]?.id,
      });

      if (cluster.events.length === 1) {
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

  const handleClusterClose = useCallback(() => {
    setSelectedCluster(null);
  }, []);

  if (errorMsg) {
    return (
      <View className="items-center justify-center flex-1">
        <Text className="text-red-500">{errorMsg}</Text>
      </View>
    );
  }

  if (!location) {
    return (
      <View className="items-center justify-center flex-1">
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
        styleURL={isDarkMode ? CUSTOM_DARK_STYLE : CUSTOM_LIGHT_STYLE}
        rotateEnabled
        scrollEnabled
        zoomEnabled
        onTouchMove={() => setIsFollowingUser(false)}
        onPress={handleMapTap}
        logoEnabled={false}
        onDidFinishLoadingMap={() => {
          console.log("[Map] Map finished loading");
        }}
        onRegionDidChange={(region) => {
          console.log("[Map] Region changed:", region);
        }}
      >
        <MapboxGL.Camera
          ref={cameraRef}
          defaultSettings={{
            centerCoordinate: [
              location?.longitude || -122.4194,
              location?.latitude || 37.7749,
            ],
            zoomLevel: 11,
          }}
          maxZoomLevel={16}
          minZoomLevel={9}
          animationMode="flyTo"
          animationDuration={1000}
          followUserLocation={isFollowingUser}
          followUserMode={UserTrackingMode.FollowWithCourse}
          followZoomLevel={14}
        />

        {/* Event markers */}
        {clusters.map((cluster) => (
          <MapboxGL.MarkerView
            key={`cluster-${cluster.mainEvent.id}`}
            id={`cluster-${cluster.mainEvent.id}`}
            coordinate={[cluster.location.longitude, cluster.location.latitude]}
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <View
              style={{
                zIndex: cluster.events.some((e) => e.id === selectedEvent?.id)
                  ? 1000
                  : 100,
              }}
            >
              <TouchableOpacity
                onPress={() => handleClusterPress(cluster)}
                style={{ padding: 5 }}
              >
                <EventMarker
                  imageUrl={cluster.mainEvent.image_urls[0]}
                  count={cluster.events.length}
                  isSelected={cluster.events.some(
                    (e) => e.id === selectedEvent?.id
                  )}
                />
              </TouchableOpacity>
            </View>
          </MapboxGL.MarkerView>
        ))}

        {/* User location marker */}
        <MapboxGL.MarkerView
          id="userLocation"
          coordinate={[location.longitude, location.latitude]}
          anchor={{ x: 0.5, y: 0.5 }}
        >
          <UserMarker
            avatarUrl={user?.avatar_url}
            heading={location.heading || undefined}
          />
        </MapboxGL.MarkerView>
      </MapboxGL.MapView>

      <MapControls
        onSearch={() => {}}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onRecenter={() => handleRecenter(location)}
        isFollowingUser={isFollowingUser}
      />

      {selectedEvent && (
        <EventCard
          event={selectedEvent}
          nearbyEvents={events}
          onClose={handleCloseModal}
          onEventSelect={handleEventSelect}
        />
      )}

      {selectedCluster && (
        <ClusterSheet
          events={selectedCluster}
          onEventSelect={handleEventClick}
          onClose={handleClusterClose}
        />
      )}
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
