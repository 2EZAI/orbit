//
import { Stack, Redirect } from "expo-router";
import { useAuth } from "../../src/lib/auth";
import TabBar from "../../src/components/TabBar";
import { View } from "react-native";

export default function AppLayout() {
  const { session, loading } = useAuth();

  if (loading) {
    return null;
  }

  if (!session) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  return (
    <View className="flex-1">
      <Stack
        screenOptions={{
          headerShown: false,
          animation: "none", // Disable animations
          gestureEnabled: false, // Disable gestures
          presentation: "containedModal", // Full screen presentation
          contentStyle: { backgroundColor: "white" },
        }}
      >
        <Stack.Screen name="home" options={{ title: "Orbit" }} />
        <Stack.Screen name="chat" options={{ title: "Messages" }} />
        <Stack.Screen name="map" options={{ title: "Map" }} />
        <Stack.Screen name="create" options={{ title: "Create" }} />
        <Stack.Screen name="profile" options={{ title: "Profile" }} />
      </Stack>
      <TabBar />
    </View>
  );
}
