import { useEffect, useState, useRef } from "react";
import {
  View,
  StyleSheet,
  Dimensions,
  Image,
  TouchableOpacity,
} from "react-native";
import { Text } from "~/src/components/ui/text";
import * as Location from "expo-location";
import { useTheme } from "~/src/components/ThemeProvider";
import MapboxGL from "@rnmapbox/maps";
import { useUser } from "~/hooks/useUserData";
import { MapControls } from "~/src/components/map/MapControls";
import { Navigation2 } from "lucide-react-native";

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
        className="w-8 h-8 rounded-full"
      />
    </View>
    <View className="w-2 h-2 -mt-1 bg-black rounded-full opacity-20" />
  </View>
);

export default function Map() {
  const { theme, isDarkMode } = useTheme();
  const { user } = useUser();
  const [location, setLocation] = useState<{
    latitude: number;
    longitude: number;
    heading?: number | null;
  } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isFollowingUser, setIsFollowingUser] = useState(true);
  const mapRef = useRef<MapboxGL.MapView>(null);
  const cameraRef = useRef<MapboxGL.Camera>(null);

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
      >
        <MapboxGL.Camera
          ref={cameraRef}
          zoomLevel={16}
          centerCoordinate={[location.longitude, location.latitude]}
        />

        <MapboxGL.PointAnnotation
          id="userLocation"
          coordinate={[location.longitude, location.latitude]}
        >
          <UserMarker
            avatarUrl={user?.avatar_url}
            heading={location.heading || undefined}
          />
        </MapboxGL.PointAnnotation>
      </MapboxGL.MapView>

      <MapControls onSearch={handleSearch} />

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
