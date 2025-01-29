import { Stack } from "expo-router";
import { Chat } from "stream-chat-expo";
import { ChatThemeProvider } from "~/src/components/chat/ChatThemeProvider";
import { useChat } from "~/src/lib/chat";
import { View, Text } from "react-native";

export default function ChatLayout() {
  const { client, isConnecting } = useChat();

  if (isConnecting || !client) {
    return (
      <View className="items-center justify-center flex-1 bg-background">
        <Text className="text-foreground">Loading chat...</Text>
      </View>
    );
  }

  return (
    <ChatThemeProvider>
      <Chat client={client}>
        <Stack screenOptions={{ headerShown: true }}>
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
    </ChatThemeProvider>
  );
}
