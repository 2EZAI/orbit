import { useState, useEffect } from "react";
import { View, Platform } from "react-native";
import { router } from "expo-router";
import { Text } from "~/src/components/ui/text";
import { Button } from "~/src/components/ui/button";
import * as Location from "expo-location";
import * as ImagePicker from "expo-image-picker";
import {
  MapPin,
  Camera,
  Image as ImageIcon,
  CheckCircle2,
} from "lucide-react-native";
import { MotiView } from "moti";
import { supabase } from "~/src/lib/supabase";
import { useUser } from "~/hooks/useUserData";
import Toast from "react-native-toast-message";

type Permission = "location" | "camera" | "photos";

interface PermissionState {
  granted: boolean;
  loading: boolean;
}

export default function PermissionsScreen() {
  const { user } = useUser();
  const [permissions, setPermissions] = useState<
    Record<Permission, PermissionState>
  >({
    location: { granted: false, loading: false },
    camera: { granted: false, loading: false },
    photos: { granted: false, loading: false },
  });

  useEffect(() => {
    console.log("PermissionsScreen mounted");
    return () => console.log("PermissionsScreen unmounted");
  }, []);

  const updatePermissionState = (
    permission: Permission,
    update: Partial<PermissionState>
  ) => {
    console.log(`Updating ${permission} permission:`, update);
    setPermissions((prev) => ({
      ...prev,
      [permission]: { ...prev[permission], ...update },
    }));
  };

  const requestLocationPermission = async () => {
    console.log("Requesting location permission");
    updatePermissionState("location", { loading: true });
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      console.log("Location permission status:", status);
      updatePermissionState("location", { granted: status === "granted" });
    } catch (error) {
      console.error("Error requesting location permission:", error);
    } finally {
      updatePermissionState("location", { loading: false });
    }
  };

  const requestCameraPermission = async () => {
    console.log("Requesting camera permission");
    updatePermissionState("camera", { loading: true });
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      console.log("Camera permission status:", status);
      updatePermissionState("camera", { granted: status === "granted" });
    } catch (error) {
      console.error("Error requesting camera permission:", error);
    } finally {
      updatePermissionState("camera", { loading: false });
    }
  };

  const requestPhotosPermission = async () => {
    console.log("Requesting photos permission");
    updatePermissionState("photos", { loading: true });
    try {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      console.log("Photos permission status:", status);
      updatePermissionState("photos", { granted: status === "granted" });
    } catch (error) {
      console.error("Error requesting photos permission:", error);
    } finally {
      updatePermissionState("photos", { loading: false });
    }
  };

  const allPermissionsGranted = Object.values(permissions).every(
    (p) => p.granted
  );

  const handleContinue = async () => {
    if (!user) return;

    console.log("Saving permissions state");
    try {
      // Save permissions state to database
      const { error } = await supabase
        .from("users")
        .update({ permissions_granted: true })
        .eq("id", user.id);

      if (error) throw error;

      console.log("Permissions saved, navigating to topics");
      router.replace("/(auth)/(onboarding)/topics");
    } catch (error) {
      console.error("Error saving permissions state:", error);
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Failed to save permissions state",
      });
    }
  };

  return (
    <View className="flex-1 px-4 bg-background">
      <View className="py-12">
        <Text className="text-4xl font-bold">App Permissions</Text>
        <Text className="mt-3 text-base text-muted-foreground">
          Orbit needs a few permissions to work properly
        </Text>
      </View>

      <View className="space-y-6">
        {/* Location Permission */}
        <MotiView
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ delay: 200 }}
        >
          <Button
            onPress={requestLocationPermission}
            disabled={
              permissions.location.loading || permissions.location.granted
            }
            variant={permissions.location.granted ? "secondary" : "default"}
            className="h-20"
          >
            <View className="flex-row items-center space-x-4">
              {permissions.location.granted ? (
                <CheckCircle2 size={24} className="text-green-500" />
              ) : (
                <MapPin size={24} className="text-primary-foreground" />
              )}
              <View>
                <Text
                  className={
                    permissions.location.granted
                      ? "text-green-500"
                      : "text-primary-foreground"
                  }
                >
                  Location Access
                </Text>
                <Text className="text-sm text-muted-foreground">
                  Required for finding events near you
                </Text>
              </View>
            </View>
          </Button>
        </MotiView>

        {/* Camera Permission */}
        <MotiView
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ delay: 400 }}
        >
          <Button
            onPress={requestCameraPermission}
            disabled={permissions.camera.loading || permissions.camera.granted}
            variant={permissions.camera.granted ? "secondary" : "default"}
            className="h-20"
          >
            <View className="flex-row items-center space-x-4">
              {permissions.camera.granted ? (
                <CheckCircle2 size={24} className="text-green-500" />
              ) : (
                <Camera size={24} className="text-primary-foreground" />
              )}
              <View>
                <Text
                  className={
                    permissions.camera.granted
                      ? "text-green-500"
                      : "text-primary-foreground"
                  }
                >
                  Camera Access
                </Text>
                <Text className="text-sm text-muted-foreground">
                  Required for taking photos at events
                </Text>
              </View>
            </View>
          </Button>
        </MotiView>

        {/* Photos Permission */}
        <MotiView
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ delay: 600 }}
        >
          <Button
            onPress={requestPhotosPermission}
            disabled={permissions.photos.loading || permissions.photos.granted}
            variant={permissions.photos.granted ? "secondary" : "default"}
            className="h-20"
          >
            <View className="flex-row items-center space-x-4">
              {permissions.photos.granted ? (
                <CheckCircle2 size={24} className="text-green-500" />
              ) : (
                <ImageIcon size={24} className="text-primary-foreground" />
              )}
              <View>
                <Text
                  className={
                    permissions.photos.granted
                      ? "text-green-500"
                      : "text-primary-foreground"
                  }
                >
                  Photos Access
                </Text>
                <Text className="text-sm text-muted-foreground">
                  Required for sharing photos
                </Text>
              </View>
            </View>
          </Button>
        </MotiView>

        <Button
          onPress={handleContinue}
          disabled={!allPermissionsGranted}
          className="mt-8 h-14"
        >
          <Text className="text-lg font-medium text-primary-foreground">
            Continue
          </Text>
        </Button>
      </View>
    </View>
  );
}
