import { Stack } from "expo-router";
import { Chat, OverlayProvider } from "stream-chat-expo";
import { ChatThemeProvider } from "~/src/components/chat/ChatThemeProvider";
import { useChat } from "~/src/lib/chat";
import { View, Text } from "react-native";
import { useEffect } from "react";

export default function ChatLayout() {
  const { client, isConnecting } = useChat();

  useEffect(() => {
    console.log("[ChatLayout] Mounting with state:", {
      hasClient: !!client,
      clientState: client?.state,
      clientWsConnection: client?.wsConnection?.isHealthy,
      isConnecting,
    });

    // Ensure client is properly connected
    if (client && !isConnecting) {
      console.log("[ChatLayout] Reconnecting client on mount");
      client.connectUser(client.user!, client.userID!);
    }

    return () => {
      console.log("[ChatLayout] Unmounting");
      // Don't disconnect on unmount as it might be just a screen change
    };
  }, [client, isConnecting]);

  useEffect(() => {
    console.log("[ChatLayout] Client state changed:", {
      hasClient: !!client,
      clientState: client?.state,
      clientWsConnection: client?.wsConnection?.isHealthy,
      isConnecting,
    });

    // If client exists but isn't connected, try to reconnect
    if (client && !client.wsConnection?.isHealthy && !isConnecting) {
      console.log("[ChatLayout] Attempting to reconnect unhealthy client");
      client.connectUser(client.user!, client.userID!);
    }
  }, [client, isConnecting]);

  if (isConnecting || !client) {
    console.log("[ChatLayout] Showing loading state:", {
      isConnecting,
      hasClient: !!client,
    });
    return (
      <View className="items-center justify-center flex-1 bg-background">
        <Text className="text-foreground">Loading chat...</Text>
      </View>
    );
  }

  console.log("[ChatLayout] Rendering chat layout with client:", {
    userId: client.userID,
    wsConnection: client.wsConnection?.isHealthy,
    activeChannels: Object.keys(client.activeChannels || {}).length,
  });

  return (
    <ChatThemeProvider>
      <OverlayProvider>
        <Chat client={client}>
          <Stack
            screenOptions={{
              headerShown: true,
              animation: "slide_from_right",
            }}
          >
            <Stack.Screen
              name="index"
              options={{
                title: "Messages",
                headerShown: false,
              }}
            />
            <Stack.Screen
              name="[id]"
              options={{
                title: "Chat",
                headerShown: true,
                headerTitleAlign: "center",
                animation: "slide_from_right",
                presentation: "card",
              }}
            />
            <Stack.Screen
              name="new"
              options={{
                title: "New Message",
                presentation: "modal",
                animation: "slide_from_bottom",
                headerTitleAlign: "center",
              }}
            />
          </Stack>
        </Chat>
      </OverlayProvider>
    </ChatThemeProvider>
  );
}
