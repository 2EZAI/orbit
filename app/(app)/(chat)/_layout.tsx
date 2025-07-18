import { Stack, usePathname } from "expo-router";
import { Chat, OverlayProvider } from "stream-chat-expo";
import { ChatThemeProvider } from "~/src/components/chat/ChatThemeProvider";
import { useChat } from "~/src/lib/chat";
import { View, Text, ActivityIndicator } from "react-native";
import { useEffect } from "react";
import { LiveLocationContextProvider } from "~/src/lib/LiveLocationContext";
import { SafeAreaView} from "react-native-safe-area-context";

export default function ChatLayout() {
  const { client, isConnecting } = useChat();
  const pathname = usePathname();

  useEffect(() => {
    console.log("[ChatLayout] Route changed:", { pathname });
  }, [pathname]);

  useEffect(() => {
    console.log("[ChatLayout] Mounting with state:", {
      hasClient: !!client,
      clientState: client?.state,
      clientWsConnection: client?.wsConnection?.isHealthy,
      isConnecting,
    });

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
      <View className="items-center justify-center flex-1 bg-background">
        <ActivityIndicator size="large" color="#0000ff" />
        <Text className="mt-4 text-foreground">
          {isConnecting ? "Connecting to chat..." : "Loading chat..."}
        </Text>
      </View>
    );
  }

  console.log("[ChatLayout] Rendering chat layout with client:", {
    userId: client.userID,
    wsConnection: client.wsConnection?.isHealthy,
    activeChannels: Object.keys(client.activeChannels || {}).length,
  });

  return (
         <SafeAreaView className="flex-1 bg-background">
    <ChatThemeProvider>
      <OverlayProvider>
        <Chat client={client}>
          <LiveLocationContextProvider>
            <Stack
              screenOptions={{
                headerShown: true,
                animation: "slide_from_right",
                headerStyle: {
                  backgroundColor: "white",
                },
                headerTitleStyle: {
                  color: "black",
                },
                headerTintColor: "black",
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
                name="channel/[id]"
                options={{
                  title: "Chat",
                  headerShown: true,
                  headerTitleAlign: "center",
                  headerBackTitle: "Chats",
                  headerBackVisible: false,
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
          </LiveLocationContextProvider>
        </Chat>
      </OverlayProvider>
    </ChatThemeProvider>
    </SafeAreaView>
  );
}
