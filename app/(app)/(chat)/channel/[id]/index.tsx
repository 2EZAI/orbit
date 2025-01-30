import {
  Channel,
  MessageInput,
  MessageList,
  Thread,
  AutoCompleteSuggestionHeader,
  AutoCompleteSuggestionItem,
  EmojiSearchIndex,
} from "stream-chat-expo";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import { useChat } from "~/src/lib/chat";
import { useEffect, useState, useRef, useCallback } from "react";
import {
  ActivityIndicator,
  View,
  TouchableOpacity,
  FlatList,
  Alert,
  ActionSheetIOS,
} from "react-native";
import { Text } from "~/src/components/ui/text";
import {
  MapPin,
  Navigation,
  Command,
  AtSign,
  Smile,
  Info,
  Users,
  Image as ImageIcon,
  Trash2,
  Edit2,
  UserPlus,
} from "lucide-react-native";
import * as Location from "expo-location";
import type { Channel as ChannelType, DefaultGenerics } from "stream-chat";
import type {
  MessageType,
  MessageActionType,
  MessageActionsParams,
  AutoCompleteSuggestionHeaderProps,
  AutoCompleteSuggestionItemProps,
  AutoCompleteSuggestionListProps,
} from "stream-chat-expo";

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
          "Cancel",
        ],
        cancelButtonIndex: 5,
        destructiveButtonIndex: 4,
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
          }
        } catch (error) {
          console.error("Channel action error:", error);
          Alert.alert("Error", "Failed to perform action");
        }
      }
    );
  }, [channel, router, id]);

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
        const newChannel = client.channel("messaging", id as string);
        await newChannel.watch();
        if (mounted) {
          channelRef.current = newChannel;
          setChannel(newChannel);
        }
      } catch (err) {
        console.error("Error loading channel:", err);
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

  const renderSuggestionHeader = useCallback(
    (props: AutoCompleteSuggestionHeaderProps) => {
      const { queryText, triggerType } = props;
      if (triggerType === "command") {
        return (
          <View
            style={{ padding: 10, flexDirection: "row", alignItems: "center" }}
          >
            <Command size={20} style={{ marginRight: 8 }} />
            <Text>Commands matching "{queryText}"</Text>
          </View>
        );
      } else if (triggerType === "mention") {
        return (
          <View
            style={{ padding: 10, flexDirection: "row", alignItems: "center" }}
          >
            <AtSign size={20} style={{ marginRight: 8 }} />
            <Text>Mention users matching "{queryText}"</Text>
          </View>
        );
      } else if (triggerType === "emoji") {
        return (
          <View
            style={{ padding: 10, flexDirection: "row", alignItems: "center" }}
          >
            <Smile size={20} style={{ marginRight: 8 }} />
            <Text>Emojis matching "{queryText}"</Text>
          </View>
        );
      }
      return <AutoCompleteSuggestionHeader {...props} />;
    },
    []
  );

  const renderSuggestionItem = useCallback(
    (props: AutoCompleteSuggestionItemProps<DefaultGenerics>) => {
      const { itemProps, triggerType } = props;
      if (triggerType === "command") {
        const commandProps = itemProps as { name: string; args: string };

        // Define command-specific icons/emojis
        const getCommandIcon = (name: string) => {
          switch (name) {
            case "giphy":
              return "🎬";
            case "location":
              return "📍";
            case "poll":
              return "📊";
            case "mute":
              return "🔇";
            case "unmute":
              return "🔊";
            default:
              return "/";
          }
        };

        return (
          <View
            style={{ padding: 10, flexDirection: "row", alignItems: "center" }}
          >
            <Text style={{ fontSize: 20, marginRight: 8 }}>
              {getCommandIcon(commandProps.name)}
            </Text>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: "bold", color: "#000" }}>
                /{commandProps.name}
              </Text>
              {commandProps.args && (
                <Text style={{ fontSize: 12, color: "#666" }}>
                  {commandProps.args}
                </Text>
              )}
            </View>
          </View>
        );
      }
      return <AutoCompleteSuggestionItem {...props} />;
    },
    []
  );

  const renderSuggestionList = useCallback(
    (props: AutoCompleteSuggestionListProps<DefaultGenerics>) => {
      const { data, onSelect, queryText, triggerType } = props;
      return (
        <View style={{ maxHeight: 250, backgroundColor: "white" }}>
          {renderSuggestionHeader({ queryText, triggerType })}
          <FlatList
            data={data}
            keyboardShouldPersistTaps="always"
            renderItem={({ item }) => (
              <TouchableOpacity onPress={() => onSelect(item)}>
                {renderSuggestionItem({ itemProps: item, triggerType })}
              </TouchableOpacity>
            )}
            keyExtractor={(item, index) => {
              if ("name" in item && typeof item.name === "string")
                return item.name;
              if ("id" in item && typeof item.id === "string") return item.id;
              return `suggestion-${index}`;
            }}
          />
        </View>
      );
    },
    [renderSuggestionHeader, renderSuggestionItem]
  );

  return (
    <View style={{ flex: 1 }}>
      <Stack.Screen
        options={{
          headerTitle: () => (
            <View>
              <Text
                style={{ fontSize: 17, fontWeight: "600", textAlign: "center" }}
              >
                {channel?.data?.name || "Chat"}
              </Text>
              <Text
                style={{ fontSize: 13, color: "#666", textAlign: "center" }}
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
              <Info size={24} color="#007AFF" />
            </TouchableOpacity>
          ),
        }}
      />
      {loading ? (
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <ActivityIndicator size="large" />
          <Text style={{ marginTop: 8 }}>Loading chat...</Text>
        </View>
      ) : error ? (
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            padding: 16,
          }}
        >
          <Text style={{ marginBottom: 16, color: "red" }}>{error}</Text>
          <Text style={{ color: "#007AFF" }} onPress={() => router.back()}>
            Go back
          </Text>
        </View>
      ) : channel ? (
        <Channel
          channel={channel}
          keyboardVerticalOffset={90}
          thread={thread}
          threadList={!!thread}
          AutoCompleteSuggestionHeader={renderSuggestionHeader}
          AutoCompleteSuggestionItem={renderSuggestionItem}
          AutoCompleteSuggestionList={renderSuggestionList}
        >
          {thread ? (
            <Thread />
          ) : (
            <>
              <MessageList onThreadSelect={setThread} />
              <MessageInput />
            </>
          )}
        </Channel>
      ) : null}
    </View>
  );
}
