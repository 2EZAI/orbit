import { useEffect, useState, useRef, useCallback } from "react";
import {
  View,
  StyleSheet,
  Dimensions,
  Image,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { Text } from "~/src/components/ui/text";
import * as Location from "expo-location";
import { useTheme } from "~/src/components/ThemeProvider";
import MapboxGL from "@rnmapbox/maps";
import { useUser } from "~/hooks/useUserData";
import { useMapEvents } from "~/hooks/useMapEvents";
import { MapControls } from "~/src/components/map/MapControls";
import { Navigation2, Plus, Minus, User } from "lucide-react-native";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "~/src/components/ui/avatar";

// Replace with your Mapbox access token
MapboxGL.setAccessToken(
  "pk.eyJ1IjoidGFuZ2VudGRpZ2l0YWxhZ2VuY3kiLCJhIjoiY2xwMHR0bTVmMGJwbTJtbzhxZ2pvZWNoYiJ9.ZGwLHw0gLeEVxPhoYq2WyA"
);

// Custom style URLs - now these will work with Mapbox
const CUSTOM_LIGHT_STYLE =
  "mapbox://styles/tangentdigitalagency/clzwv4xtp002y01psdttf9jhr";
const CUSTOM_DARK_STYLE =
  "mapbox://styles/tangentdigitalagency/clzwv4xtp002y01psdttf9jhr";

const UserMarker = ({
  avatarUrl,
  heading,
}: {
  avatarUrl?: string | null;
  heading?: number;
}) => (
  <View>
    <View className="items-center">
      <View
        className="p-0.5 bg-white rounded-full shadow-lg"
        style={
          heading !== undefined
            ? {
                transform: [{ rotate: `${heading}deg` }],
              }
            : undefined
        }
      >
        <Image
          source={
            avatarUrl ? { uri: avatarUrl } : require("~/assets/favicon.png")
          }
          style={{ width: 32, height: 32, borderRadius: 16 }}
        />
      </View>
      <View className="w-2 h-2 -mt-1 bg-black rounded-full opacity-20" />
    </View>
  </View>
);

const EventMarker = ({ imageUrl }: { imageUrl: string }) => (
  <View>
    <View className="items-center">
      <View
        className="p-0.5 bg-white rounded-full shadow-lg"
        style={{ width: 50, height: 50 }}
      >
        <Image
          source={{ uri: imageUrl }}
          style={{
            width: "100%",
            height: "100%",
            borderRadius: 10,
          }}
        />
      </View>
      <View className="w-2 h-2 -mt-1 bg-black rounded-full opacity-20" />
    </View>
  </View>
);

const ZoomControls = ({
  onZoomIn,
  onZoomOut,
}: {
  onZoomIn: () => void;
  onZoomOut: () => void;
}) => (
  <View className="absolute border rounded-lg left-4 bottom-32 bg-background/80 backdrop-blur-lg border-border">
    <TouchableOpacity onPress={onZoomIn} className="p-2 border-b border-border">
      <Plus size={20} />
    </TouchableOpacity>
    <TouchableOpacity onPress={onZoomOut} className="p-2">
      <Minus size={20} />
    </TouchableOpacity>
  </View>
);

export default function Map() {
  const { theme, isDarkMode } = useTheme();
  const { user } = useUser();
  const [location, setLocation] = useState<{
    latitude: number;
    longitude: number;
    heading?: number | null;
  }>({
    latitude: 37.7694,
    longitude: -122.4862,
    heading: 0,
  });
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isFollowingUser, setIsFollowingUser] = useState(false);
  const mapRef = useRef<MapboxGL.MapView>(null);
  const cameraRef = useRef<MapboxGL.Camera>(null);
  const [zoomLevel, setZoomLevel] = useState(14);
  const [mapCenter, setMapCenter] = useState<[number, number]>([
    37.7694, -122.4862,
  ]);

  const { events, selectedEvent, isLoading, error, handleEventClick } =
    useMapEvents({
      center: mapCenter,
      radius: 5000,
      timeRange: "now",
    });

  useEffect(() => {
    let locationSubscription: Location.LocationSubscription;

    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setErrorMsg("Permission to access location was denied");
        return;
      }

      try {
        // Get initial location immediately
        const initialLocation = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.BestForNavigation,
        });

        setLocation({
          latitude: initialLocation.coords.latitude,
          longitude: initialLocation.coords.longitude,
          heading: initialLocation.coords.heading || undefined,
        });

        // Start watching position with heading
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

            if (isFollowingUser && cameraRef.current) {
              cameraRef.current.setCamera({
                centerCoordinate: [
                  newLocation.coords.longitude,
                  newLocation.coords.latitude,
                ],
                animationDuration: 500,
              });
            }
          }
        );
      } catch (error) {
        console.error("Location error:", error);
        setErrorMsg(
          "Error getting location. Please check your location settings and try again."
        );
      }
    })();

    return () => {
      if (locationSubscription) {
        locationSubscription.remove();
      }
    };
  }, [isFollowingUser]);

  const handleMapIdle = useCallback(
    (feature: { properties?: any }) => {
      try {
        if (!feature || !feature.properties) return;

        const { properties } = feature;

        // Update zoom if available
        if (properties.zoomLevel) {
          setZoomLevel(properties.zoomLevel);
        }

        // Update center if changed significantly
        if (properties.center && Array.isArray(properties.center)) {
          const [centerLng, centerLat] = properties.center;
          if (
            Math.abs(centerLat - mapCenter[0]) > 0.001 ||
            Math.abs(centerLng - mapCenter[1]) > 0.001
          ) {
            setMapCenter([centerLat, centerLng]);
          }
        }
      } catch (err) {
        console.error("Error handling map idle:", err);
      }
    },
    [mapCenter]
  );

  const handleSearch = (text: string) => {
    console.log("Searching for:", text);
  };

  const handleRecenter = () => {
    if (location && cameraRef.current) {
      setIsFollowingUser(true);
      cameraRef.current.setCamera({
        centerCoordinate: [location.longitude, location.latitude],
        zoomLevel: 16,
        animationDuration: 500,
      });
    }
  };

  const handleZoomIn = () => {
    if (cameraRef.current) {
      const newZoom = Math.min(zoomLevel + 1, 20); // Max zoom level is 20
      setZoomLevel(newZoom);
      cameraRef.current.setCamera({
        zoomLevel: newZoom,
        centerCoordinate: [location.longitude, location.latitude],
        animationDuration: 300,
      });
    }
  };

  const handleZoomOut = () => {
    if (cameraRef.current) {
      const newZoom = Math.max(zoomLevel - 1, 0); // Min zoom level is 0
      setZoomLevel(newZoom);
      cameraRef.current.setCamera({
        zoomLevel: newZoom,
        centerCoordinate: [location.longitude, location.latitude],
        animationDuration: 300,
      });
    }
  };

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
        <Text>Loading location...</Text>
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
        onMapIdle={handleMapIdle}
      >
        <MapboxGL.Camera
          ref={cameraRef}
          zoomLevel={zoomLevel}
          centerCoordinate={[location.longitude, location.latitude]}
        />

        {/* User location marker */}
        <MapboxGL.PointAnnotation
          id="userLocation"
          coordinate={[location.longitude, location.latitude]}
        >
          <UserMarker
            avatarUrl={user?.avatar_url}
            heading={location.heading || undefined}
          />
        </MapboxGL.PointAnnotation>

        {/* Event markers */}
        {events.map((event) => (
          <MapboxGL.PointAnnotation
            key={event.id}
            id={`event-${event.id}`}
            coordinate={[event.location.longitude, event.location.latitude]}
            onSelected={() => handleEventClick(event)}
          >
            <EventMarker imageUrl={event.image_urls[0]} />
          </MapboxGL.PointAnnotation>
        ))}
      </MapboxGL.MapView>

      <MapControls onSearch={handleSearch} />

      <ZoomControls onZoomIn={handleZoomIn} onZoomOut={handleZoomOut} />

      {!isFollowingUser && (
        <TouchableOpacity
          onPress={handleRecenter}
          className="absolute items-center justify-center border rounded-full bottom-32 right-4 w-11 h-11 bg-background/80 backdrop-blur-lg border-border"
        >
          <Navigation2 size={20} />
        </TouchableOpacity>
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
