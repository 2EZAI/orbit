import { Stack } from "expo-router";
import { useEffect } from "react";
import { BackHandler } from "react-native";

export default function OnboardingLayout() {
  useEffect(() => {
    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      () => true
    );
    return () => backHandler.remove();
  }, []);

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: "none",
      }}
    >
      <Stack.Screen name="index" />
    </Stack>
  );
}
