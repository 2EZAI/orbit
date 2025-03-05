import { Stack } from "expo-router";
import { Platform } from "react-native";

export default function OnboardingLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        gestureEnabled: false,
        animation: Platform.OS === "ios" ? "slide_from_right" : "none",
      }}
    >
      <Stack.Screen name="onboarding" />
      <Stack.Screen name="username" />
      <Stack.Screen name="topics" />
      <Stack.Screen name="permissions" />
      
    </Stack>
  );
}
