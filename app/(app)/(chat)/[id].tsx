import { useEffect, useState } from "react";
import { SafeAreaView, Text } from "react-native";
import {
  Channel,
  MessageList,
  MessageInput,
  DefaultStreamChatGenerics,
} from "stream-chat-expo";
import type { Channel as ChannelType } from "stream-chat";
import { useChat } from "~/src/lib/chat";
import { useLocalSearchParams, Stack } from "expo-router";

export default function ChannelScreen() {
  const { client, isConnecting, connectionError } = useChat();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [channel, setChannel] =
    useState<ChannelType<DefaultStreamChatGenerics> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initializeChannel = async () => {
      if (!client?.userID || !id) {
        return;
      }

      try {
        console.log("[Channel] Creating/watching channel:", id);
        const newChannel = client.channel("messaging", id);
        console.log("[Channel] Channel created, watching...");
        await newChannel.watch();
        console.log("[Channel] Channel watch successful");
        setChannel(newChannel);
        setError(null);
      } catch (error) {
        console.error("[Channel] Error initializing channel:", error);
        setError(
          error instanceof Error
            ? error.message
            : "Failed to initialize channel"
        );
      }
    };

    initializeChannel();
  }, [client?.userID, id]);

  if (isConnecting) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <Text className="p-4">Connecting to chat...</Text>
      </SafeAreaView>
    );
  }

  if (error || connectionError) {
    const displayError = error || connectionError?.message;
    return (
      <SafeAreaView className="flex-1 bg-background">
        <Text className="p-4 text-red-500">Error: {displayError}</Text>
      </SafeAreaView>
    );
  }

  if (!client?.userID || !channel) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <Text className="p-4">Loading channel...</Text>
      </SafeAreaView>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: channel.data?.name || "Chat",
          headerTitleAlign: "center",
          animation: "slide_from_right",
        }}
      />
      <SafeAreaView className="flex-1 bg-background">
        <Channel channel={channel}>
          <MessageList />
          <MessageInput />
        </Channel>
      </SafeAreaView>
    </>
  );
}
