// ~app/(auth)/_layout.tsx
import { Stack } from "expo-router";
import { Platform } from "react-native";

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        gestureEnabled: false,
        animation: Platform.OS === "ios" ? "default" : "slide_from_right",
        presentation: "card",
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
      <Stack.Screen
        name="reset-password"
        options={{
          title: "Reset Password",
        }}
      />
      <Stack.Screen
        name="(onboarding)"
        options={{
          title: "Onboarding",
          gestureEnabled: false,
          presentation: "card",
        }}
      />
    </Stack>
  );
}
