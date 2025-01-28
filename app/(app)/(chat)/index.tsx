import { useEffect, useState } from "react";
import { SafeAreaView, Text, View } from "react-native";
import {
  Chat,
  ChannelList,
  OverlayProvider,
  ChannelPreview,
  ChannelAvatar,
  DefaultStreamChatGenerics,
} from "stream-chat-expo";
import { useChat } from "~/src/lib/chat";
import { useAuth } from "~/src/lib/auth";
import { useRouter } from "expo-router";
import Constants from "expo-constants";
import type { ChannelSort } from "stream-chat";

const BACKEND_URL = Constants.expoConfig?.extra?.backendUrl;
console.log("[ChatList] Configured Backend URL:", BACKEND_URL);

if (!BACKEND_URL) {
  console.error("[ChatList] Backend URL is not configured in Constants!");
  throw new Error("Backend URL is not configured");
}

export default function ChatListScreen() {
  const router = useRouter();
  const { client, isConnecting, connectionError } = useChat();
  const { session } = useAuth();
  const [error, setError] = useState<string | null>(null);

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

  if (!client?.userID) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <Text className="p-4">Loading chat...</Text>
      </SafeAreaView>
    );
  }

  const filters = {
    members: { $in: [client.userID] },
    type: "messaging",
  };

  const sort: ChannelSort<DefaultStreamChatGenerics> = [
    { last_message_at: -1 as const },
  ];

  const options = {
    state: true,
    watch: true,
    presence: true,
    limit: 20,
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <OverlayProvider>
        <Chat client={client}>
          <View className="flex-1">
            <ChannelList
              filters={filters}
              sort={sort}
              options={options}
              onSelect={(channel) => {
                router.push(`/(app)/(chat)/${channel.id}`);
              }}
              Preview={ChannelPreview}
            />
          </View>
        </Chat>
      </OverlayProvider>
    </SafeAreaView>
  );
}
