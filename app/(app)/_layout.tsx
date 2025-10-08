// ~/app/(app)/_layout.tsx
import { router, Tabs } from "expo-router";
import { View } from "react-native";
import { useAuth } from "~/src/lib/auth";
import { useTheme } from "~/src/components/ThemeProvider";
import TabBar from "~/src/components/shared/TabBar";
import { Redirect } from "expo-router";
import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import useNotifications from "~/hooks/useNotifications";
import { useRef } from "react";
import { Walkthrough } from "react-native-wlkt";
import { useEffect, useState } from "react";
import Toast from "react-native-toast-message";

export default function AppLayout() {
  const { theme } = useTheme();
  const { session, loading } = useAuth();
  const lastSessionState = useRef<boolean | null>(null);

  // Call hooks before any conditional returns to follow Rules of Hooks
  useNotifications();

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

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <Tabs
        screenOptions={{
          headerShown: false,
        }}
        initialRouteName="(map)"
        tabBar={(props: BottomTabBarProps) => {
          const currentRoute = props.state.routes[props.state.index];
          console.log("Current route:", currentRoute);
          if (
            !session &&
            (currentRoute.name === "(create)" ||
              currentRoute.name === "(chat)" ||
              currentRoute.name === "(social)")
          ) {
            Toast.show({
              type: "info",
              text1: "You need to be signed in to access this feature.",
              position: "top",
              visibilityTime: 3000,
              autoHide: true,
              topOffset: 50,
            });
            // router.back();
            // Redirect unauthenticated users to the landing index screen
            router.dismissAll();
            return null;
          }

          // Show tab bar everywhere except notifications and specific chat messages
          const isSpecificChatRoute =
            currentRoute.name === "(webview)" ||
            currentRoute.name === "(create)" ||
            (currentRoute.name === "(chat)" &&
              typeof currentRoute.params === "object" &&
              currentRoute.params !== null &&
              "id" in currentRoute.params);
          console.log("currentRoute.name>", currentRoute.name);
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
        <Tabs.Screen
          name="(create)"
          options={{
            lazy: true,
          }}
        />
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
      <Walkthrough />
    </View>
  );
}
