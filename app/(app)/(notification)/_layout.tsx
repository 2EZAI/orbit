import { Stack } from "expo-router";
import {
  TouchableOpacity,
  Text,
  Platform,
  View,
  Modal,
  StyleSheet,
  DeviceEventEmitter,
  StatusBar,
} from "react-native";
import { ArrowLeft } from "lucide-react-native";
import { useRouter } from "expo-router";
import { Icon } from "react-native-elements";
import { Sheet } from "~/src/components/ui/sheet";
import { useState } from "react";
import { useTheme } from "~/src/components/ThemeProvider";

export default function NotificationViewLayout() {
  const router = useRouter();
  const { theme, isDarkMode } = useTheme();
  // const [showOverlay, setShowOverlay] = useState(false);

  const handleBackPress = () => {
    router.back();
    // setShowOverlay(true); // show full screen view
  };

  return (
    <>
      <StatusBar
        barStyle={isDarkMode ? "light-content" : "dark-content"}
        backgroundColor="transparent"
        translucent
      />
      <Stack
        screenOptions={{
          headerShown: false,
          gestureEnabled: false,
          animation: Platform.OS === "ios" ? "slide_from_right" : "none",
        }}
      >
        <Stack.Screen
          name="index"
          options={{
            headerShown: false,
          }}
        />
      </Stack>
    </>
  );
}

// Theme-aware styles will be defined inline using theme.colors
// This ensures proper dark/light mode support
