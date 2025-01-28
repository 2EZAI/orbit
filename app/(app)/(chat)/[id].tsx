import { useEffect, useState } from "react";
import { SafeAreaView, Text } from "react-native";
import {
  Channel,
  Chat,
  MessageList,
  MessageInput,
  OverlayProvider,
  DefaultStreamChatGenerics,
} from "stream-chat-expo";
import type { Channel as ChannelType } from "stream-chat";
import { useChat } from "~/src/lib/chat";
import { useLocalSearchParams } from "expo-router";
import { useAuth } from "~/src/lib/auth";
import Constants from "expo-constants";

const BACKEND_URL = Constants.expoConfig?.extra?.backendUrl;
if (!BACKEND_URL) {
  throw new Error("Backend URL is not configured");
}

export default function ChannelScreen() {
  const { client, connectUser, isConnecting, connectionError } = useChat();
  const { session } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [channel, setChannel] =
    useState<ChannelType<DefaultStreamChatGenerics> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initializeChat = async () => {
      try {
        console.log("Starting chat initialization...");
        console.log("Backend URL:", BACKEND_URL);
        console.log("Session exists:", !!session);
        console.log("Access token exists:", !!session?.access_token);

        if (!session?.access_token) {
          throw new Error("No access token available");
        }

        if (!client) {
          throw new Error("Stream client not initialized");
        }

        // Get token from backend if not already connected
        if (!client.userID) {
          const tokenEndpoint = `${BACKEND_URL}/chat/token`;
          console.log("Fetching chat token from:", tokenEndpoint);

          const response = await fetch(tokenEndpoint, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session.access_token}`,
            },
          });

          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to get chat token: ${errorText}`);
          }

          const { token } = await response.json();
          if (!token) {
            throw new Error("No token in response");
          }

          // Connect user with the token from backend
          await connectUser(token);
        }

        if (!id) {
          throw new Error("No channel ID provided");
        }

        // Create or watch the channel
        const newChannel = client.channel("messaging", id);
        await newChannel.watch();
        setChannel(newChannel);
        setError(null);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error occurred";
        console.error("Error initializing chat:", errorMessage);
        if (error instanceof Error) {
          console.error("Stack trace:", error.stack);
        }
        setError(errorMessage);
      }
    };

    if (!isConnecting) {
      initializeChat();
    }
  }, [client, id, session?.access_token, connectUser, isConnecting]);

  if (error || connectionError) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <Text className="p-4 text-red-500">
          Error: {error || connectionError?.message}
        </Text>
      </SafeAreaView>
    );
  }

  if (!client || !channel) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <Text className="p-4">Loading chat...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <OverlayProvider>
        <Chat client={client}>
          <Channel channel={channel}>
            <MessageList />
            <MessageInput />
          </Channel>
        </Chat>
      </OverlayProvider>
    </SafeAreaView>
  );
}
