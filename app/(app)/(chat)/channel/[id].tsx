import {
  Channel,
  MessageInput,
  MessageList,
  Thread,
  MessageType as StreamMessageType,
  useMessageContext,
  MessageAvatar,
  MessageContent,
  MessageFooter,
  MessageSimple,
  useMessagesContext,
  MessageStatus,
  MessageContextValue,
  MessageActionType,
  MessageActionsParams,
  Message as DefaultMessage,
} from "stream-chat-expo";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import { useChat } from "~/src/lib/chat";
import { useEffect, useState, useRef, useCallback } from "react";
import {
  ActivityIndicator,
  View,
  TouchableOpacity,
  Alert,
  ActionSheetIOS,
} from "react-native";
import { Text } from "~/src/components/ui/text";
import {
  Info,
  Users,
  Edit2,
  Trash2,
  MoreHorizontal,
  Image as ImageIcon,
} from "lucide-react-native";
import type { Channel as ChannelType, DefaultGenerics } from "stream-chat";
import type { MessageType } from "stream-chat-expo";
import { useTheme } from "~/src/components/ThemeProvider";

// Enhanced message component with proper typing
const EnhancedMessage = (props: any) => {
  const messageContext = useMessageContext();
  console.log("[ChatMessage] Message context:", {
    hasContext: !!messageContext,
    hasMessage: !!messageContext?.message,
    messageId: messageContext?.message?.id,
    text: messageContext?.message?.text,
  });

  // Return null if message context is not available
  if (!messageContext || !messageContext.message) {
    return null;
  }

  const { message } = messageContext;

  return (
    <MessageSimple
      {...props}
      message={message}
      MessageAvatar={MessageAvatar}
      MessageContent={MessageContent}
      MessageFooter={(messageFooterProps) => (
        <MessageFooter
          {...messageFooterProps}
          formattedDate={
            message.created_at
              ? new Date(message.created_at).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : ""
          }
        />
      )}
      MessageStatus={MessageStatus}
    />
  );
};

export default function ChannelScreen() {
  const { id } = useLocalSearchParams();
  const { client } = useChat();
  const router = useRouter();
  const [channel, setChannel] = useState<ChannelType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [thread, setThread] = useState<MessageType | null>(null);
  const [memberCount, setMemberCount] = useState<number>(0);
  const channelRef = useRef<ChannelType | null>(null);
  const { theme } = useTheme();

  const handleInfoPress = useCallback(() => {
    if (!channel) return;

    ActionSheetIOS.showActionSheetWithOptions(
      {
        options: [
          "Change Chat Name",
          "View Members",
          "Add Members",
          "View Media",
          "Clear Chat History",
          "Delete Chat",
          "Cancel",
        ],
        cancelButtonIndex: 6,
        destructiveButtonIndex: 5,
      },
      async (buttonIndex) => {
        try {
          switch (buttonIndex) {
            case 0: // Change name
              Alert.prompt(
                "Change Chat Name",
                "Enter a new name for this chat",
                async (newName) => {
                  if (newName?.trim()) {
                    await channel.update({
                      name: newName.trim(),
                    });
                  }
                }
              );
              break;

            case 1: // View members
              const members = await channel.queryMembers({});
              Alert.alert(
                "Channel Members",
                members.members
                  .map((member) => member.user?.name || member.user_id)
                  .join("\n")
              );
              break;

            case 2: // Add members
              router.push({
                pathname: "/members/add",
                params: { channelId: id },
              });
              break;

            case 3: // View media
              router.push({
                pathname: `/channel/${id}/media`,
              });
              break;

            case 4: // Clear history
              Alert.alert(
                "Clear Chat History",
                "Are you sure you want to clear all messages? This cannot be undone.",
                [
                  {
                    text: "Cancel",
                    style: "cancel",
                  },
                  {
                    text: "Clear",
                    style: "destructive",
                    onPress: async () => {
                      await channel.truncate();
                    },
                  },
                ]
              );
              break;

            case 5: // Delete chat
              Alert.alert(
                "Delete Chat",
                "Are you sure you want to delete this chat? This cannot be undone.",
                [
                  {
                    text: "Cancel",
                    style: "cancel",
                  },
                  {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                      try {
                        // Call backend to delete channel
                        const response = await fetch(
                          `${process.env.BACKEND_CHAT_URL}/api/channels/${id}`,
                          {
                            method: "DELETE",
                            headers: {
                              Authorization: `Bearer ${client?.tokenManager.token}`,
                            },
                          }
                        );

                        if (!response.ok) {
                          throw new Error("Failed to delete channel");
                        }

                        // Navigate back after successful deletion
                        router.back();
                      } catch (error) {
                        console.error("Error deleting channel:", error);
                        Alert.alert(
                          "Error",
                          "Failed to delete chat. Please try again."
                        );
                      }
                    },
                  },
                ]
              );
              break;
          }
        } catch (error) {
          console.error("Channel action error:", error);
          Alert.alert("Error", "Failed to perform action");
        }
      }
    );
  }, [channel, router, id, client?.tokenManager.token]);

  useEffect(() => {
    if (!client || !id || channelRef.current) {
      if (!client || !id) {
        setError("Unable to load chat");
        setLoading(false);
      }
      return;
    }

    let mounted = true;
    const loadChannel = async () => {
      try {
        console.log("[ChatChannel] Loading channel:", id);
        const newChannel = client.channel("messaging", id as string);
        console.log("[ChatChannel] Created channel instance");

        await newChannel.watch();
        console.log("[ChatChannel] Channel watched");

        const messages = await newChannel.query({
          messages: { limit: 30 },
          watch: true,
        });

        console.log("[ChatChannel] Channel loaded with query:", {
          id: newChannel.id,
          type: newChannel.type,
          memberCount: Object.keys(newChannel.state.members || {}).length,
          messageCount: messages.messages?.length || 0,
          messages: messages.messages?.map((m) => ({
            id: m.id,
            text: m.text,
            user: m.user?.id,
          })),
        });

        if (mounted) {
          channelRef.current = newChannel;
          setChannel(newChannel);
        }
      } catch (err) {
        console.error("[ChatChannel] Error loading channel:", err);
        if (mounted) {
          setError("Failed to load chat");
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadChannel();

    return () => {
      mounted = false;
      if (channelRef.current) {
        channelRef.current.stopWatching();
        channelRef.current = null;
      }
    };
  }, [client, id]);

  // Update member count
  useEffect(() => {
    if (channel) {
      const updateMemberCount = async () => {
        try {
          const members = await channel.queryMembers({});
          setMemberCount(members.members.length);
        } catch (error) {
          console.error("Error fetching members:", error);
        }
      };

      updateMemberCount();

      // Listen for member updates
      const events = ["member.added", "member.removed"] as const;
      const unsubscribePromises = events.map((event) =>
        channel.on(event, updateMemberCount)
      );

      return () => {
        unsubscribePromises.forEach((promise) => {
          if (promise && typeof promise.unsubscribe === "function") {
            promise.unsubscribe();
          }
        });
      };
    }
  }, [channel]);

  return (
    <View style={{ flex: 1 }}>
      <Stack.Screen
        options={{
          headerTitle: () => (
            <View>
              <Text
                style={{ fontSize: 17, fontWeight: "600", textAlign: "center" }}
                className="text-foreground"
              >
                {channel?.data?.name || "Chat"}
              </Text>
              <Text
                style={{ fontSize: 13, textAlign: "center" }}
                className="text-muted-foreground"
              >
                {memberCount} {memberCount === 1 ? "member" : "members"}
              </Text>
            </View>
          ),
          headerRight: () => (
            <TouchableOpacity
              onPress={handleInfoPress}
              style={{ marginRight: 8 }}
            >
              <Info size={24} className="text-primary" />
            </TouchableOpacity>
          ),
        }}
      />
      {loading ? (
        <View className="items-center justify-center flex-1">
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text className="mt-4 text-foreground">Loading chat...</Text>
        </View>
      ) : error ? (
        <View className="items-center justify-center flex-1 px-4">
          <Text className="mb-4 text-center text-red-500">{error}</Text>
          <Text className="text-primary" onPress={() => router.back()}>
            Go back
          </Text>
        </View>
      ) : channel ? (
        <Channel
          channel={channel}
          keyboardVerticalOffset={90}
          thread={thread}
          threadList={!!thread}
          Message={DefaultMessage}
        >
          {thread ? (
            <Thread />
          ) : (
            <>
              <MessageList
                onThreadSelect={setThread}
                additionalFlatListProps={{
                  initialNumToRender: 30,
                  maxToRenderPerBatch: 10,
                  windowSize: 10,
                  removeClippedSubviews: false,
                  inverted: true,
                }}
                loadMore={() => {
                  console.log("[ChatChannel] Loading more messages...");
                  return Promise.resolve();
                }}
              />
              <MessageInput
                additionalTextInputProps={{
                  placeholder: "Type a message...",
                  placeholderTextColor: theme.colors.text,
                }}
              />
            </>
          )}
        </Channel>
      ) : null}
    </View>
  );
}
