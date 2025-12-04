// app/_layout.tsx
import * as React from "react";
import { View } from "react-native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import Toast from "react-native-toast-message";
import "react-native-reanimated";
import { ActionSheetProvider } from "@expo/react-native-action-sheet";

import { Text } from "~/src/components/ui/text";
import { ThemeProvider, useTheme } from "~/src/components/ThemeProvider";
import { AuthProvider } from "~/src/lib/auth";
import { ChatProvider } from "~/src/lib/chat";
import { VideoProvider } from "~/src/lib/video";
import { UserProvider } from "~/src/lib/UserProvider";
import "~/src/styles/global.css";
import "~/src/lib/utils/consoleCapture";
import * as Linking from "expo-linking";
import { router } from "expo-router";
import { useEffect } from "react";
import * as Sentry from "@sentry/react-native";
import Constants from "expo-constants";
import { supabaseIntegration } from "@supabase/sentry-js-integration";
import { supabase } from "~/src/lib/supabase";
import { PostRefreshProvider } from "~/src/lib/postProvider";

Sentry.init({
  dsn: "https://d49231e6742e5638c77f98c0c7691b77@o4510307919462400.ingest.us.sentry.io/4510308014882816",
  tracesSampleRate: 1.0,
  profilesSampleRate: 1.0,
  replaysSessionSampleRate: 0.1, // this means 10% of sessions are sent to Sentry, sessions are used to track user behavior
  replaysOnErrorSampleRate: 1.0, // this means 100% of sessions with errors are sent to Sentry, sessions are used to track user behavior
  attachScreenshot: true,
  attachViewHierarchy: true,

  sendDefaultPii: true,
  enableLogs: true,
  debug: false,
  integrations: [
    supabaseIntegration(supabase, Sentry, {
      tracing: true,
      breadcrumbs: true,
      errors: true,
    }),

    Sentry.reactNativeTracingIntegration({
      shouldCreateSpanForRequest: (url: string) => {
        const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl as
          | string
          | undefined;
        if (supabaseUrl && url.startsWith(`${supabaseUrl}/rest`)) {
          return false;
        }
        return true;
      },
    }),
    // React Navigation instrumentation is automatically wired by Sentry.wrap with Expo Router,
    // but keeping the integration here ensures performance spans for navigation in all cases.
    Sentry.reactNavigationIntegration(),
    Sentry.consoleLoggingIntegration({ levels: ["log", "warn", "error"] }),
    Sentry.breadcrumbsIntegration({
      // Disable console breadcrumbs since we have consoleLoggingIntegration for structured logs
      console: false,
      // Enable DOM breadcrumbs to track user interactions (clicks, keypresses)
      dom: {
        serializeAttribute: ["data-testid", "aria-label", "data-cy"],
      },
      // Enable fetch breadcrumbs to track API calls
      fetch: true,
      // Enable history breadcrumbs to track navigation
      history: true,
      // Enable XHR breadcrumbs (if you use XMLHttpRequest)
      xhr: true,
      // Enable Sentry breadcrumbs to see when events are sent
      sentry: true,
    }),
  ],
});

const toastConfig = {
  success: (props: any) => (
    <View className="w-3/4 px-4 py-3 mx-4 bg-green-500 rounded-lg">
      <Text className="font-medium text-white">{props.text1}</Text>
      {props.text2 && (
        <Text className="mt-1 text-sm text-white">{props.text2}</Text>
      )}
    </View>
  ),
  error: (props: any) => (
    <View className="w-3/4 px-4 py-3 mx-4 bg-red-500 rounded-lg">
      <Text className="font-medium text-white">{props.text1}</Text>
      {props.text2 && (
        <Text className="mt-1 text-sm text-white">{props.text2}</Text>
      )}
    </View>
  ),
};

function RootLayoutContent() {
  const { isDarkMode, theme } = useTheme();
  function handleDeepLink(url: string) {
    console.log("Handling deep link URL:", url);
    const parsed = Linking.parse(url);
    // parsed = { scheme: 'orbit', hostname: 'event', path: '123', queryParams: {} }

    if (parsed.hostname === "event") {
      console.log("parsed path>", parsed.queryParams);
      const rawId = parsed.path || "";
      // rawId may contain further path pieces; split if needed
      const eventId = rawId.split("/")[0];

      if (eventId) {
        router.navigate({
          pathname: "/(app)/(home)",
          params: {
            eventId: eventId,
            eventType: parsed.queryParams?.type || "supabase", // Pass the event ID if available
          },
        });
      }
      return true;
    }

    // Handle post deep links
    if (parsed.hostname === "post") {
      console.log("Handling post deep link:", parsed);
      const rawId = parsed.path || "";
      const postId = rawId.split("/")[0];

      if (postId) {
        router.navigate({
          pathname: "/(app)/post/[id]",
          params: {
            id: postId,
          },
        });
      }
      return true;
    }

    // Fallback for path-based style (if someone used orbit:///event/123)
    if (parsed.path?.startsWith("event/")) {
      const eventId = parsed.path.split("/")[1];
      if (eventId) {
        // router.push(`/event/${eventId}`);
        router.replace({
          pathname: "/(app)/(home)",
          params: {
            // lat: eventData.eventLocation.lat,
            // lng: eventData.eventLocation.lng,

            eventId: eventId, // Pass the event ID if available
          },
        });
        return true;
      }
    }

    // Fallback for path-based style (if someone used orbit:///post/123)
    if (parsed.path?.startsWith("post/")) {
      const postId = parsed.path.split("/")[1];
      if (postId) {
        router.navigate({
          pathname: "/(app)/post/[id]",
          params: {
            id: postId,
          },
        });
        return true;
      }
    }

    return false;
  }
  useEffect(() => {
    // Initial launch deep link
    (async () => {
      const initialUrl = await Linking.getInitialURL();
      if (initialUrl) handleDeepLink(initialUrl);
    })();

    // Listener for future links while app is running
    const sub = Linking.addEventListener("url", ({ url }) => {
      handleDeepLink(url);
    });
    return () => sub.remove();
  }, []);
  return (
    <>
      <Stack
        screenOptions={{
          headerShown: false,
          animation: "none",
          contentStyle: {
            backgroundColor: theme.colors.background,
          },
        }}
      >
        <Stack.Screen
          name="index"
          options={{
            gestureEnabled: false,
            presentation: "containedModal",
          }}
        />
        <Stack.Screen
          name="(auth)"
          options={{
            presentation: "card",
            animation: "slide_from_right",
            gestureEnabled: false,
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="(app)"
          options={{
            presentation: "card",
            animation: "none",
            gestureEnabled: false,
          }}
        />
      </Stack>
      <Toast topOffset={100} config={toastConfig} />
      <StatusBar style={isDarkMode ? "light" : "dark"} />
    </>
  );
}

export default Sentry.wrap(function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <AuthProvider>
          <UserProvider>
            <ChatProvider>
              <VideoProvider>
                <ActionSheetProvider>
                  <PostRefreshProvider>
                    <RootLayoutContent />
                  </PostRefreshProvider>
                </ActionSheetProvider>
              </VideoProvider>
            </ChatProvider>
          </UserProvider>
        </AuthProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
});
