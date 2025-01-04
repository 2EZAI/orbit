// ~app/(auth)/_layout.tsx
import { Stack } from "expo-router";
import { Platform } from "react-native";

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        gestureEnabled: true,
        gestureDirection: "horizontal",
        animation: Platform.OS === "ios" ? "default" : "slide_from_right",
        presentation: Platform.OS === "ios" ? "card" : "card",
        fullScreenGestureEnabled: true,
      }}
    >
      <Stack.Screen
        name="sign-in"
        options={{
          title: "Sign In",
        }}
      />
      <Stack.Screen
        name="sign-up"
        options={{
          title: "Create Account",
        }}
      />
    </Stack>
  );
}
