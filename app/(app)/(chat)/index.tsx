import { SafeAreaView } from "react-native";
import {
  ChannelList,
  Chat,
  OverlayProvider,
  DefaultStreamChatGenerics,
  Channel as ChannelComponent,
  MessageList,
  MessageInput,
  Thread,
} from "stream-chat-expo";
import { useChat } from "~/src/lib/chat";
import { useTheme } from "~/src/components/ThemeProvider";
import { router } from "expo-router";
import { Channel } from "stream-chat";

export default function ChatScreen() {
  const { client } = useChat();
  const { theme } = useTheme();

  const filters = {
    type: "messaging",
    members: { $in: [client?.user?.id || ""] },
  };

  const sort = {
    last_message_at: -1 as const,
  };

  const onChannelPressed = (channel: Channel<DefaultStreamChatGenerics>) => {
    router.push({
      pathname: "/(app)/(chat)/[id]",
      params: { id: channel.id },
    });
  };

  if (!client) return null;

  return (
    <SafeAreaView className="flex-1 bg-background">
      <OverlayProvider>
        <Chat client={client}>
          <ChannelList
            filters={filters}
            sort={sort}
            onSelect={onChannelPressed}
            options={{
              state: true,
              watch: true,
              presence: true,
            }}
          />
        </Chat>
      </OverlayProvider>
    </SafeAreaView>
  );
}
