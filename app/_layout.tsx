import { AuthProvider } from "~/src/lib/auth";

import { Theme, ThemeProvider } from "@react-navigation/native";
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
    <View className="bg-green-500 px-4 py-3 rounded-lg mx-4 w-3/4">
      <Text className="text-white font-medium">{props.text1}</Text>
      {props.text2 && (
        <Text className="text-white text-sm mt-1">{props.text2}</Text>
      )}
    </View>
  ),
  error: (props: any) => (
    <View className="bg-red-500 px-4 py-3 rounded-lg mx-4 w-3/4">
      <Text className="text-white font-medium">{props.text1}</Text>
      {props.text2 && (
        <Text className="text-white text-sm mt-1">{props.text2}</Text>
      )}
    </View>
  ),
};

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from "expo-router";

export default function RootLayout() {
  const hasMounted = React.useRef(false);
  const { colorScheme, isDarkColorScheme } = useColorScheme();
  const [isColorSchemeLoaded, setIsColorSchemeLoaded] = React.useState(false);

  useIsomorphicLayoutEffect(() => {
    if (hasMounted.current) {
      return;
    }

    if (Platform.OS === "web") {
      document.documentElement.classList.add("bg-background");
    }
    setIsColorSchemeLoaded(true);
    hasMounted.current = true;
  }, []);

  if (!isColorSchemeLoaded) {
    return null;
  }

  return (
    <ThemeProvider value={isDarkColorScheme ? DARK_THEME : LIGHT_THEME}>
      <AuthProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <StatusBar style={isDarkColorScheme ? "light" : "dark"} />
          <Stack.Screen
            name="index"
            options={{
              title: "Welcome",
              animation: "fade",
              headerShown: false,
            }}
          />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(app)" />
        </Stack>
        <Toast topOffset={100} config={toastConfig} />
      </AuthProvider>
    </ThemeProvider>
  );
}

const useIsomorphicLayoutEffect =
  Platform.OS === "web" && typeof window === "undefined"
    ? React.useEffect
    : React.useLayoutEffect;
