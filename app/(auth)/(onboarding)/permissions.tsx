import { useState, useEffect } from "react";
import {
  View,
  Platform,
  ScrollView,
  StatusBar,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { Text } from "~/src/components/ui/text";
import * as Location from "expo-location";
import * as ImagePicker from "expo-image-picker";
import * as Notifications from "expo-notifications";

// Configure notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});
import {
  MapPin,
  Camera,
  Image as ImageIcon,
  CheckCircle2,
  Bell,
  ArrowLeft,
} from "lucide-react-native";
import { useAuth } from "~/src/lib/auth";
import { supabase } from "~/src/lib/supabase";
import { useUser } from "~/src/lib/UserProvider";
import Toast from "react-native-toast-message";
import { SafeAreaView } from "react-native-safe-area-context";

import { useTheme } from "~/src/components/ThemeProvider";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Permission = "location" | "camera" | "photos" | "notifications";

interface PermissionState {
  granted: boolean;
  loading: boolean;
}

export default function PermissionsScreen() {
  const { user } = useUser();
  const { session } = useAuth();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [permissions, setPermissions] = useState<
    Record<Permission, PermissionState>
  >({
    location: { granted: false, loading: false },
    camera: { granted: false, loading: false },
    photos: { granted: false, loading: false },
    notifications: { granted: false, loading: false },
  });

  const handleBack = () => {
    router.replace("/(auth)/(onboarding)/topics?from=onboarding");
  };

  useEffect(() => {
    console.log("PermissionsScreen mounted");
    checkExistingPermissions();
    return () => console.log("PermissionsScreen unmounted");
  }, []);

  const checkExistingPermissions = async () => {
    try {
      // Check location permission
      const locationStatus = await Location.getForegroundPermissionsAsync();
      if (locationStatus.granted) {
        updatePermissionState("location", { granted: true });
      }

      // Check camera permission
      const cameraStatus = await ImagePicker.getCameraPermissionsAsync();
      if (cameraStatus.granted) {
        updatePermissionState("camera", { granted: true });
      }

      // Check photos permission
      const photosStatus = await ImagePicker.getMediaLibraryPermissionsAsync();
      if (photosStatus.granted) {
        updatePermissionState("photos", { granted: true });
      }

      // Check notification permission
      const notificationStatus = await Notifications.getPermissionsAsync();
      if (notificationStatus.granted) {
        updatePermissionState("notifications", { granted: true });
      }
    } catch (error) {
      console.error("Error checking existing permissions:", error);
    }
  };

  const updatePermissionState = (
    permission: Permission,
    update: Partial<PermissionState>
  ) => {
    // console.log(`Updating ${permission} permission:`, update);
    setPermissions((prev) => ({
      ...prev,
      [permission]: { ...prev[permission], ...update },
    }));
  };

  const requestNotificationPermission = async () => {
    console.log("Requesting notification permission");
    updatePermissionState("notifications", { loading: true });
    try {
      // For Android 13+, we need to request POST_NOTIFICATIONS permission
      if (Platform.OS === "android" && Platform.Version >= 33) {
        const { status } = await Notifications.requestPermissionsAsync({
          ios: {
            allowAlert: true,
            allowBadge: true,
            allowSound: true,
          },
          android: {
            allowAlert: true,
            allowBadge: true,
            allowSound: true,
          },
        });
        console.log("Notification permission status (Android 13+):", status);
        updatePermissionState("notifications", {
          granted: status === "granted",
        });
      } else {
        const { status } = await Notifications.requestPermissionsAsync();
        console.log("Notification permission status:", status);
        updatePermissionState("notifications", {
          granted: status === "granted",
        });
      }
    } catch (error) {
      console.error("Error requesting notification permission:", error);
      updatePermissionState("notifications", { granted: false });
    } finally {
      updatePermissionState("notifications", { loading: false });
    }
  };

  const requestLocationPermission = async () => {
    console.log("Requesting location permission");
    updatePermissionState("location", { loading: true });
    try {
      // First check if location services are enabled
      const servicesEnabled = await Location.hasServicesEnabledAsync();
      if (!servicesEnabled) {
        console.log("Location services are disabled");
        updatePermissionState("location", { granted: false });
        return;
      }

      const { status } = await Location.requestForegroundPermissionsAsync();
      // console.log("Location permission status:", status);
      updatePermissionState("location", { granted: status === "granted" });
    } catch (error) {
      console.error("Error requesting location permission:", error);
      updatePermissionState("location", { granted: false });
    } finally {
      updatePermissionState("location", { loading: false });
    }
  };

  const requestCameraPermission = async () => {
    console.log("Requesting camera permission");
    updatePermissionState("camera", { loading: true });
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      // console.log("Camera permission status:", status);
      updatePermissionState("camera", { granted: status === "granted" });
    } catch (error) {
      console.error("Error requesting camera permission:", error);
      updatePermissionState("camera", { granted: false });
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
      // console.log("Photos permission status:", status);
      updatePermissionState("photos", { granted: status === "granted" });
    } catch (error) {
      console.error("Error requesting photos permission:", error);
      updatePermissionState("photos", { granted: false });
    } finally {
      updatePermissionState("photos", { loading: false });
    }
  };

  const allPermissionsGranted = Object.values(permissions).every(
    (p) => p.granted
  );

  const hitNotificationApi = async (type: string) => {
    if (!user || !session?.user?.id) return;
    try {
      const requestData = {
        userId: user.id,
        type: type,
      };

      const response = await fetch(
        `${process.env.BACKEND_MAP_URL}/api/notifications/send`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.user.id}`,
          },
          body: JSON.stringify(requestData),
        }
      );
      console.log("requestData", requestData);

      if (!response.ok) {
        console.log("error>", response);
        throw new Error(await response.text());
      }

        const data_ = await response.json();
        console.log("response>",data_);
        
    }
    catch(e)
    {
console.log("error_catch>",e);
    }
  };

  const handleContinue = async () => {
    if (!user || isSubmitting) return;

    setIsSubmitting(true);
    console.log("Saving permissions state");
    try {
      // Save permissions state to database
      const { error } = await supabase
        .from("users")
        .update({ permissions_granted: true })
        .eq("id", user.id);

      if (error) throw error;

      console.log("Permissions saved, navigating to app");
      hitNotificationApi("welcome");
      router.replace("/(app)/");
    } catch (error) {
      console.error("Error saving permissions state:", error);
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Failed to save permissions state",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const permissionItems = [
    {
      key: "location" as Permission,
      icon: MapPin,
      title: "Location Access",
      description:
        "Find amazing events happening near you and get personalized recommendations",
      onPress: requestLocationPermission,
    },
    {
      key: "camera" as Permission,
      icon: Camera,
      title: "Camera Access",
      description: "Capture and share memorable moments from events you attend",
      onPress: requestCameraPermission,
    },
    {
      key: "photos" as Permission,
      icon: ImageIcon,
      title: "Photo Library",
      description:
        "Select and share photos from your gallery to your event posts",
      onPress: requestPhotosPermission,
    },
    {
      key: "notifications" as Permission,
      icon: Bell,
      title: "Push Notifications",
      description:
        "Get notified about new events, messages, and updates from friends",
      onPress: requestNotificationPermission,
    },
  ];

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: theme.dark ? "#1a1a2e" : "#f8fafc",
      }}
    >
      <StatusBar
        barStyle={theme.dark ? "light-content" : "dark-content"}
        backgroundColor="transparent"
        translucent
      />

      {/* Back Button */}
      <TouchableOpacity
        onPress={handleBack}
        style={{
          position: "absolute",
          top: Math.max(insets.top + 16, 40),
          left: 24,
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: theme.dark
            ? "rgba(255, 255, 255, 0.1)"
            : "rgba(255, 255, 255, 0.9)",
          borderWidth: 1,
          borderColor: theme.dark
            ? "rgba(139, 92, 246, 0.3)"
            : "rgba(139, 92, 246, 0.2)",
          justifyContent: "center",
          alignItems: "center",
          zIndex: 10,
          shadowColor: "#8B5CF6",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
          elevation: 4,
        }}
      >
        <ArrowLeft size={20} color={theme.colors.text} />
      </TouchableOpacity>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingTop: Math.max(insets.top + 40, 60),
          paddingHorizontal: 24,
          paddingBottom: Math.max(insets.bottom + 40, 60),
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={{ marginBottom: 48 }}>
          <Text
            style={{
              fontSize: 42,
              fontWeight: "900",
              color: theme.colors.text,
              marginBottom: 16,
              lineHeight: 50,
              textAlign: "center",
            }}
          >
            Final Step! 🚀
          </Text>
          <Text
            style={{
              fontSize: 18,
              color: theme.colors.text + "CC",
              lineHeight: 26,
              textAlign: "center",
              maxWidth: 320,
              alignSelf: "center",
              marginBottom: 12,
            }}
          >
            Orbit needs a few device permissions to provide the best experience
          </Text>
          <Text
            style={{
              fontSize: 14,
              color: theme.colors.text + "99",
              textAlign: "center",
              fontStyle: "italic",
            }}
          >
            These are official system permissions handled by your device
          </Text>
        </View>

        {/* Progress Indicator */}
        <View style={{ marginBottom: 40 }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 12,
            }}
          >
            <View
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: "#10B981",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Text style={{ color: "white", fontSize: 14, fontWeight: "700" }}>
                1
              </Text>
            </View>
            <View
              style={{
                width: 40,
                height: 3,
                backgroundColor: "#10B981",
                borderRadius: 2,
              }}
            />
            <View
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: "#10B981",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Text style={{ color: "white", fontSize: 14, fontWeight: "700" }}>
                2
              </Text>
            </View>
            <View
              style={{
                width: 40,
                height: 3,
                backgroundColor: "#8B5CF6",
                borderRadius: 2,
              }}
            />
            <View
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: "#8B5CF6",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Text style={{ color: "white", fontSize: 14, fontWeight: "700" }}>
                3
              </Text>
            </View>
          </View>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              marginTop: 12,
              paddingHorizontal: 16,
            }}
          >
            <Text style={{ fontSize: 12, color: "#10B981", fontWeight: "600" }}>
              Profile
            </Text>
            <Text style={{ fontSize: 12, color: "#10B981", fontWeight: "600" }}>
              Topics
            </Text>
            <Text style={{ fontSize: 12, color: "#8B5CF6", fontWeight: "600" }}>
              Permissions
            </Text>
          </View>
        </View>

        {/* Permissions Status */}
        <View style={{ marginBottom: 32 }}>
          <View
            style={{
              backgroundColor: theme.dark
                ? "rgba(139, 92, 246, 0.15)"
                : "rgba(139, 92, 246, 0.1)",
              borderRadius: 20,
              padding: 20,
              borderWidth: 2,
              borderColor: allPermissionsGranted
                ? "#10B981"
                : theme.dark
                ? "rgba(139, 92, 246, 0.3)"
                : "rgba(139, 92, 246, 0.2)",
              shadowColor: allPermissionsGranted ? "#10B981" : "#8B5CF6",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.2,
              shadowRadius: 12,
              elevation: 6,
            }}
          >
            <Text
              style={{
                fontSize: 18,
                fontWeight: "700",
                color: theme.colors.text,
                textAlign: "center",
                marginBottom: 8,
              }}
            >
              {allPermissionsGranted
                ? "✅ All permissions granted!"
                : `${
                    Object.values(permissions).filter((p) => p.granted).length
                  }/4 permissions granted`}
            </Text>
            <Text
              style={{
                fontSize: 14,
                color: theme.colors.text + "CC",
                textAlign: "center",
                marginBottom: allPermissionsGranted ? 0 : 8,
              }}
            >
              {allPermissionsGranted
                ? "You're all set to explore the cosmos!"
                : "Grant permissions to unlock all features"}
            </Text>
            {!allPermissionsGranted && (
              <Text
                style={{
                  fontSize: 12,
                  color: theme.colors.text + "99",
                  textAlign: "center",
                  fontStyle: "italic",
                }}
              >
                📱 Your device will show native permission popups
              </Text>
            )}
          </View>
        </View>

        {/* Permission Items */}
        <View style={{ marginBottom: 48, gap: 20 }}>
          {permissionItems.map((item, index) => {
            const permissionState = permissions[item.key];
            const IconComponent = item.icon;

            return (
              <TouchableOpacity
                key={item.key}
                onPress={item.onPress}
                disabled={permissionState.loading || permissionState.granted}
                style={{
                  backgroundColor: theme.dark
                    ? "rgba(255, 255, 255, 0.08)"
                    : "rgba(255, 255, 255, 0.9)",
                  borderRadius: 20,
                  borderWidth: 2,
                  borderColor: permissionState.granted
                    ? "#10B981"
                    : theme.dark
                    ? "rgba(139, 92, 246, 0.3)"
                    : "rgba(139, 92, 246, 0.2)",
                  paddingHorizontal: 24,
                  paddingVertical: 24,
                  shadowColor: permissionState.granted ? "#10B981" : "#8B5CF6",
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: permissionState.granted ? 0.3 : 0.1,
                  shadowRadius: 12,
                  elevation: permissionState.granted ? 8 : 4,
                  opacity: permissionState.granted
                    ? 1
                    : permissionState.loading
                    ? 0.7
                    : 1,
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <View
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: 28,
                      backgroundColor: permissionState.granted
                        ? "#10B981"
                        : "#8B5CF6",
                      justifyContent: "center",
                      alignItems: "center",
                      marginRight: 20,
                    }}
                  >
                    {permissionState.loading ? (
                      <ActivityIndicator size="small" color="white" />
                    ) : permissionState.granted ? (
                      <CheckCircle2 size={28} color="white" />
                    ) : (
                      <IconComponent size={28} color="white" />
                    )}
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontSize: 18,
                        fontWeight: "700",
                        color: permissionState.granted
                          ? "#10B981"
                          : theme.colors.text,
                        marginBottom: 4,
                      }}
                    >
                      {item.title}
                    </Text>
                    <Text
                      style={{
                        fontSize: 14,
                        color: theme.colors.text + "CC",
                        lineHeight: 20,
                      }}
                    >
                      {item.description}
                    </Text>
                  </View>

                  {permissionState.granted && (
                    <View
                      style={{
                        backgroundColor: "#10B981",
                        borderRadius: 12,
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                      }}
                    >
                      <Text
                        style={{
                          color: "white",
                          fontSize: 12,
                          fontWeight: "600",
                        }}
                      >
                        Granted
                      </Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Continue Button */}
        <TouchableOpacity
          onPress={handleContinue}
          disabled={!allPermissionsGranted || isSubmitting}
          style={{
            height: 64,
            backgroundColor:
              allPermissionsGranted && !isSubmitting
                ? "#8B5CF6"
                : theme.colors.text + "33",
            borderRadius: 20,
            justifyContent: "center",
            alignItems: "center",
            shadowColor: "#8B5CF6",
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: allPermissionsGranted ? 0.4 : 0,
            shadowRadius: 16,
            elevation: allPermissionsGranted ? 12 : 0,
            marginHorizontal: 8,
          }}
        >
          {isSubmitting ? (
            <ActivityIndicator color="white" size="large" />
          ) : (
            <Text
              style={{
                fontSize: 20,
                fontWeight: "800",
                color: allPermissionsGranted
                  ? "white"
                  : theme.colors.text + "66",
              }}
            >
              {allPermissionsGranted
                ? "Launch Into Orbit! 🚀"
                : "Grant All Permissions"}
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      <Toast />
    </View>
  );
}
