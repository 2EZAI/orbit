// ~app/_layout.tsx
import { AuthProvider } from "~/src/lib/auth";

import {
  NavigationContainer,
  Theme,
  ThemeProvider,
} from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as React from "react";
import { Platform, View } from "react-native";
import { NAV_THEME } from "~/src/lib/constants";
import { useColorScheme } from "~/src/lib/useColorScheme";
import Toast from "react-native-toast-message";
import "~/src/styles/global.css";
import { Text } from "~/src/components/ui/text";

const LIGHT_THEME: Theme = {
  dark: false,
  colors: NAV_THEME.light,
  fonts: {
    regular: {
      fontFamily: "Inter",
      fontWeight: "400",
    },
    medium: {
      fontFamily: "Inter",
      fontWeight: "500",
    },
    bold: {
      fontFamily: "Inter",
      fontWeight: "700",
    },
    heavy: {
      fontFamily: "Inter",
      fontWeight: "900",
    },
  },
};

const DARK_THEME: Theme = {
  dark: true,
  colors: NAV_THEME.dark,
  fonts: {
    regular: {
      fontFamily: "Inter",
      fontWeight: "400",
    },
    medium: {
      fontFamily: "Inter",
      fontWeight: "500",
    },
    bold: {
      fontFamily: "Inter",
      fontWeight: "700",
    },
    heavy: {
      fontFamily: "Inter",
      fontWeight: "900",
    },
  },
};

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

export { ErrorBoundary } from "expo-router";

export default function RootLayout() {
  const { isDarkColorScheme } = useColorScheme();

  return (
    <ThemeProvider value={isDarkColorScheme ? DARK_THEME : LIGHT_THEME}>
      <AuthProvider>
        <Stack
          screenOptions={{
            headerShown: false,
            gestureEnabled: false,
            animation: "none",
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
              presentation: Platform.OS === "ios" ? "modal" : "containedModal",
              animation: "default",
            }}
          />
          <Stack.Screen
            name="(app)"
            options={{
              presentation: "containedModal",
              animation: "none",
              gestureEnabled: false,
            }}
          />
        </Stack>
        <Toast topOffset={100} config={toastConfig} />
        <StatusBar style={isDarkColorScheme ? "light" : "dark"} />
      </AuthProvider>
    </ThemeProvider>
  );
}

const useIsomorphicLayoutEffect =
  Platform.OS === "web" && typeof window === "undefined"
    ? React.useEffect
    : React.useLayoutEffect;
