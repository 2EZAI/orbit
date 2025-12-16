import { Stack } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Chat } from "stream-chat-expo";
import { ChatThemeProvider } from "~/src/components/chat/ChatThemeProvider";
import { useTheme } from "~/src/components/ThemeProvider";
import { useChat } from "~/src/lib/chat";
import { LiveLocationContextProvider } from "~/src/lib/LiveLocationContext";

export default function ChatLayout() {
  const { client, isConnecting } = useChat();
  const { theme } = useTheme();

  useEffect(() => {
    // Only try to reconnect if we have a client but no healthy connection
    if (client && !client.wsConnection?.isHealthy && !isConnecting) {
      console.log("[ChatLayout] Attempting to reconnect unhealthy client");
      client.connectUser(client.user!, client.userID!);
    }

    return () => {
      console.log("[ChatLayout] Unmounting");
      // Don't disconnect on unmount as it might be just a screen change
    };
  }, [client, isConnecting]);

  if (isConnecting || !client) {
    return (
      <View
        style={{
          alignItems: "center",
          justifyContent: "center",
          flex: 1,
          backgroundColor: theme.colors.card,
        }}
      >
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text
          style={{
            marginTop: 16,
            color: theme.colors.text,
          }}
        >
          {isConnecting ? "Connecting to chat..." : "Loading chat..."}
        </Text>
      </View>
    );
  }

  // console.log("[ChatLayout] Rendering chat layout with client:", {
  //   userId: client.userID,
  //   wsConnection: client.wsConnection?.isHealthy,
  //   activeChannels: Object.keys(client.activeChannels || {}).length,
  // });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.card }}>
      <ChatThemeProvider>
        <Chat client={client}>
          <LiveLocationContextProvider>
            <Stack
              screenOptions={{
                headerShown: true,
                animation: "slide_from_right",
                headerStyle: {
                  backgroundColor: theme.colors.card,
                },
                headerTitleStyle: {
                  color: theme.colors.text,
                },
                headerTintColor: theme.colors.text,
              }}
            >
              <Stack.Screen
                name="index"
                options={{
                  title: "Messages",
                  headerShown: false,
                  headerBackTitle: "Back",
                  headerBackVisible: true,
                }}
              />
              <Stack.Screen
                name="channel/[id]"
                options={{
                  title: "Chat",
                  headerShown: false,
                }}
              />
              <Stack.Screen
                name="new"
                options={{
                  title: "New Message",
                  headerShown: false,
                  headerTitleAlign: "center",
                  headerBackTitle: "Chats",
                  presentation: "modal",
                  animation: "slide_from_bottom",
                }}
              />
              <Stack.Screen
                name="call/[id]"
                options={{
                  title: "Call",
                  headerShown: false,
                  presentation: "modal",
                  animation: "slide_from_bottom",
                }}
              />
              <Stack.Screen
                name="channel/[id]/settings"
                options={{
                  title: "Chat Settings",
                  headerShown: false,
                  headerTitleAlign: "center",

                  headerBackVisible: true,
                }}
              />
              <Stack.Screen
                name="channel/[id]/media"
                options={{
                  title: "Chat Settings",
                  headerShown: false,
                  headerTitleAlign: "center",

                  headerBackVisible: false,
                }}
              />
            </Stack>
          </LiveLocationContextProvider>
        </Chat>
      </ChatThemeProvider>
    </SafeAreaView>
  );
}
