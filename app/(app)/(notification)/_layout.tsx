import { Stack } from "expo-router";
import {
  TouchableOpacity,
  Text,
  Platform,
  View,
  Modal,
  StyleSheet,
  DeviceEventEmitter,
} from "react-native";
import { ArrowLeft } from "lucide-react-native";
import { useRouter } from "expo-router";
import { Icon } from "react-native-elements";
import { Sheet } from "~/src/components/ui/sheet";
import { useState } from "react";

export default function NotificationViewLayout() {
  const router = useRouter();
  // const [showOverlay, setShowOverlay] = useState(false);

  const handleBackPress = () => {
    router.back();
    // setShowOverlay(true); // show full screen view
  };
 
  return (
    <>
      <Stack>
        <Stack.Screen
          name="index"
          options={{
            headerShown: true,
            headerTitleAlign: "center",
            headerTitle: () => (
              <Text style={{ fontSize: 18, fontWeight: "bold" }}>
                Notifications
              </Text>
            ),
            headerLeft: () => (
              <TouchableOpacity
                style={{ marginLeft: 10 }}
                onPress={handleBackPress}
              >
                {/* You can use an icon here instead of text */}
                {Platform.OS === "ios" ? (
                  <ArrowLeft size={24} className="text-foreground" />
                ) : (
                  <Icon
                    name="arrow-back"
                    type="material"
                    size={24}
                    color="#239ED0"
                  />
                )}
              </TouchableOpacity>
            ),
          }}
        />
      </Stack>
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.85)",
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    backgroundColor: "white",
    padding: 24,
    borderRadius: 12,
    width: "80%",
    alignItems: "center",
  },
  message: {
    fontSize: 16,
    marginBottom: 20,
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "bold",
    marginHorizontal: 20,
    color: "#007AFF",
  },
});
