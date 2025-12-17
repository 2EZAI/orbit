import { Stack, useRouter } from "expo-router";
import { Platform, StatusBar } from "react-native";
import { useTheme } from "~/src/components/ThemeProvider";

export default function NotificationViewLayout() {
  const { isDarkMode } = useTheme();

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
