//
import { Stack, Redirect } from "expo-router";
import { useAuth } from "../../src/lib/auth";
import TabBar from "../../src/components/TabBar";
import { View } from "react-native";
import { useColorScheme } from "~/src/lib/useColorScheme";

export default function AppLayout() {
  const { session, loading } = useAuth();
  const { isDarkColorScheme } = useColorScheme();
  if (loading) {
    return null;
  }

  if (!session) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  return (
    <View className="flex-1 bg-background">
      <Stack
        screenOptions={{
          headerShown: false,
          animation: "none",
          gestureEnabled: false,
          presentation: "containedModal",
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
