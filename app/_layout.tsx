// app/_layout.tsx
import { AuthProvider } from "~/src/lib/auth";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as React from "react";
import { View } from "react-native";
import Toast from "react-native-toast-message";
import "~/src/styles/global.css";
import { Text } from "~/src/components/ui/text";
import { ThemeProvider, useTheme } from "~/src/components/ThemeProvider";

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

  return (
    <AuthProvider>
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
            presentation: "modal",
            animation: "slide_from_bottom",
            gestureEnabled: true,
            gestureDirection: "vertical",
            headerShown: false,
            headerLeft: () => null,
            headerTitle: "",
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
      <StatusBar style={isDarkMode ? "light" : "dark"} />
    </AuthProvider>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <RootLayoutContent />
    </ThemeProvider>
  );
}
