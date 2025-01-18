//
import { Stack, Redirect } from "expo-router";
import { usePathname } from "expo-router";
import { View } from "react-native";
import { useAuth } from "~/src/lib/auth";
import TabBar from "~/src/components/TabBar";
import { useTheme } from "~/src/components/ThemeProvider";

export default function AppLayout() {
  const { theme } = useTheme();
  const { session, loading } = useAuth();
  const pathname = usePathname();

  if (loading) {
    return null;
  }

  if (!session) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  const showTabBar = !pathname.includes("/edit");

  return (
    <View
      className="flex-1"
      style={{ backgroundColor: theme.colors.background }}
    >
      <Stack
        screenOptions={{
          headerShown: false,
          animation: "none",
          contentStyle: {
            backgroundColor: theme.colors.background,
          },
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="[id]"
          options={{
            presentation: "modal",
            animation: "slide_from_bottom",
            headerShown: false,
            gestureEnabled: true,
            gestureDirection: "vertical",
          }}
        />
      </Stack>
      {showTabBar && <TabBar />}
    </View>
  );
}
