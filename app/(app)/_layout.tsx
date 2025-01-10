//
import { Stack, Redirect } from "expo-router";
import { useAuth } from "../../src/lib/auth";
import TabBar from "../../src/components/TabBar";
import { View } from "react-native";
import { useTheme } from "~/src/components/ThemeProvider";

export default function AppLayout() {
  const { isDarkMode, toggleTheme, theme } = useTheme();

  const { session, loading } = useAuth();
  if (loading) {
    return null;
  }

  if (!session) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  return (
    <View
      className="flex-1"
      style={{ backgroundColor: theme.colors.background }}
    >
      <Stack
        screenOptions={{
          headerShown: false,
          animation: "none",
          gestureEnabled: false,
          presentation: "containedModal",
          contentStyle: {
            backgroundColor: "transparent",
          },
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
