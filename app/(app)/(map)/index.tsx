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
import MapboxGL from "@rnmapbox/maps";
import { useUser } from "~/hooks/useUserData";
import { useMapEvents, type MapEvent } from "~/hooks/useMapEvents";
import { useMapCamera } from "~/src/hooks/useMapCamera";
import { MapControls } from "~/src/components/map/MapControls";
import { X, MapPin } from "lucide-react-native";

import { Sheet } from "~/src/components/ui/sheet";
import { UserMarker } from "~/src/components/map/UserMarker";
import { EventMarker } from "~/src/components/map/EventMarker";
import { EventCard } from "~/src/components/map/EventCard";

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
    console.log("Total events available:", events.length);
  }, [events]);

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

        locationSubscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.BestForNavigation,
            distanceInterval: 0,
            timeInterval: 1000,
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
      >
        <MapboxGL.Camera
          ref={cameraRef}
          zoomLevel={11}
          centerCoordinate={[location.longitude, location.latitude]}
          animationMode="none"
          animationDuration={300}
          minZoomLevel={9}
          maxZoomLevel={16}
          followUserLocation={false}
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
                onPress={() => {
                  // If there's only one event in the cluster, select it directly
                  if (cluster.events.length === 1) {
                    handleEventSelect(cluster.events[0]);
                  } else {
                    // If there are multiple events, show the first one but indicate there are more
                    handleEventSelect(cluster.mainEvent);
                  }
                }}
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
