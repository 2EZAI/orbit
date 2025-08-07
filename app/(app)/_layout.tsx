// ~/app/(app)/_layout.tsx
import { Tabs } from "expo-router";
import { View } from "react-native";
import { useAuth } from "~/src/lib/auth";
import { useTheme } from "~/src/components/ThemeProvider";
import TabBar from "~/src/components/shared/TabBar";
import { Redirect } from "expo-router";
import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import useNotifications from "~/hooks/useNotifications";
import { useRef, useEffect } from "react";

export default function AppLayout() {
  const { theme } = useTheme();
  const { session, loading } = useAuth();
  const lastSessionState = useRef<boolean | null>(null);

  useEffect(() => {
    const hasSession = !!session;
    if (lastSessionState.current !== hasSession) {
      console.log("App layout: Session state changed to:", hasSession);
      lastSessionState.current = hasSession;
    }
  }, [session]);

  if (loading) {
    return null;
  }

  if (!session) {
    return <Redirect href="/" />;
  }
  useNotifications();
  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <Tabs
        screenOptions={{
          headerShown: false,
        }}
        initialRouteName="(map)"
        tabBar={(props: BottomTabBarProps) => {
          const currentRoute = props.state.routes[props.state.index];

          // Show tab bar everywhere except notifications and specific chat messages
          const isSpecificChatRoute =
            currentRoute.name === "(webview)" ||
            currentRoute.name === "(create)" ||
            (currentRoute.name === "(chat)" &&
              typeof currentRoute.params === "object" &&
              currentRoute.params !== null &&
              "id" in currentRoute.params);

          const hideTabBar =
            currentRoute.name === "(notification)" || isSpecificChatRoute;

          return hideTabBar ? null : <TabBar />;
        }}
      >
        <Tabs.Screen name="(map)" />
        <Tabs.Screen
          name="(chat)"
          options={{
            href: {
              pathname: "(chat)/index",
            },
          }}
        />
        <Tabs.Screen name="(create)" />
        <Tabs.Screen name="(home)" />
        <Tabs.Screen
          name="(social)"
          options={{
            href: {
              pathname: "(social)/index",
            },
          }}
        />
        <Tabs.Screen name="(profile)" />
      </Tabs>
    </View>
  );
}
