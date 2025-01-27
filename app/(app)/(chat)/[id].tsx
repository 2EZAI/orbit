import { useEffect, useState } from "react";
import { SafeAreaView } from "react-native";
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

export default function ChannelScreen() {
  const { client } = useChat();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [channel, setChannel] =
    useState<ChannelType<DefaultStreamChatGenerics> | null>(null);

  useEffect(() => {
    if (!client || !id) return;

    const getChannel = async () => {
      const channel = client.channel("messaging", id);
      await channel.watch();
      setChannel(channel);
    };

    getChannel();
  }, [client, id]);

  if (!client || !channel) return null;

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
