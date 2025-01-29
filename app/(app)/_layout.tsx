// ~/app/(app)/_layout.tsx
import { Tabs } from "expo-router";
import { View } from "react-native";
import { useAuth } from "~/src/lib/auth";
import { useTheme } from "~/src/components/ThemeProvider";
import TabBar from "~/src/components/shared/TabBar";
import { Redirect } from "expo-router";
import { BottomTabBarProps } from "@react-navigation/bottom-tabs";

export default function AppLayout() {
  const { theme } = useTheme();
  const { session, loading } = useAuth();

  if (loading) {
    return null;
  }

  if (!session) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <Tabs
        screenOptions={{
          headerShown: false,
        }}
        initialRouteName="(map)"
        tabBar={(props: BottomTabBarProps) => {
          return props.state.routeNames[props.state.index] !== "onboarding" &&
            props.state.routeNames[props.state.index] !== "chat" ? (
            <TabBar />
          ) : null;
        }}
      >
        <Tabs.Screen name="(map)" />
        <Tabs.Screen name="(chat)" />
        <Tabs.Screen name="(create)" />
        <Tabs.Screen name="(home)" />
        <Tabs.Screen name="(profile)" />
        <Tabs.Screen name="onboarding" />
      </Tabs>
    </View>
  );
}
