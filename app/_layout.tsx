// app/_layout.tsx
import * as React from "react";
import { View } from "react-native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import Toast from "react-native-toast-message";
import "react-native-reanimated";

import { Text } from "~/src/components/ui/text";
import { ThemeProvider, useTheme } from "~/src/components/ThemeProvider";
import { AuthProvider } from "~/src/lib/auth";
import { ChatProvider } from "~/src/lib/chat";
import "~/src/styles/global.css";

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
    </>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <AuthProvider>
          <ChatProvider>
            <RootLayoutContent />
          </ChatProvider>
        </AuthProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
