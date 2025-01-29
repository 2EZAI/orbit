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

    return () => {
      console.log("[ChatLayout] Unmounting");
    };
  }, []);

  useEffect(() => {
    console.log("[ChatLayout] Client state changed:", {
      hasClient: !!client,
      clientState: client?.state,
      clientWsConnection: client?.wsConnection?.isHealthy,
      isConnecting,
    });
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
                presentation: "card",
              }}
            />
            <Stack.Screen
              name="new"
              options={{
                title: "New Message",
                presentation: "modal",
              }}
            />
          </Stack>
        </Chat>
      </OverlayProvider>
    </ChatThemeProvider>
  );
}
