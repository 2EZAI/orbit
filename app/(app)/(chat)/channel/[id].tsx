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
  useChannelContext,
  AutoCompleteSuggestionHeader,
  AutoCompleteSuggestionItem,
  AutoCompleteSuggestionList,
  Card,
  AutoCompleteInput,
  TypingIndicator,
  ReactionListTop,
  ReactionListBottom,
} from "stream-chat-expo";
import { useAuth } from "~/src/lib/auth";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import { useChat } from "~/src/lib/chat";
import { useEffect, useState, useRef, useCallback } from "react";
import {
  ActivityIndicator,
  View,
  TouchableOpacity,
  Alert,
  TextInput,
  FlatList,
  Platform,
  StyleSheet,
} from "react-native";
import { Text } from "~/src/components/ui/text";
import {
  Info,
  Users,
  Edit2,
  Trash2,
  MoreHorizontal,
  Image as ImageIcon,
  Calendar,
  Search,
} from "lucide-react-native";
import { Icon } from "react-native-elements";
import type {
  Channel as ChannelType,
  DefaultGenerics,
  Attachment as StreamAttachment,
} from "stream-chat";
import type { MessageType } from "stream-chat-expo";
import { useTheme } from "~/src/components/ThemeProvider";
import { ArrowLeft, Phone, Video } from "lucide-react-native";
import { useVideo } from "~/src/lib/video";
import ActiveCallBanner from "~/src/components/chat/ActiveCallBanner";

interface Event {
  id: string;
  name: string;
  startDate: string;
  location?: string;
}

interface EventAttachment extends StreamAttachment<DefaultGenerics> {
  type: string;
  title: string;
  text: string;
  event_data: Event;
}

interface EventMessage {
  text: string;
  attachments: EventAttachment[];
}

// Event search component
const EventSearchHeader = ({ queryText }: { queryText: string }) => (
  <View className="flex-row items-center p-3 space-x-2 border-b border-border">
    <Calendar size={20} className="text-foreground" />
    <Text className="text-foreground">Events matching "{queryText}"</Text>
  </View>
);

// Event search result item
const EventSearchItem = ({
  event,
  onSelect,
}: {
  event: any;
  onSelect: (event: any) => void;
}) => (
  <TouchableOpacity
    onPress={() => onSelect(event)}
    className="flex-row items-center p-3 space-x-3 border-b border-border"
  >
    <Calendar size={20} className="text-foreground" />
    <View className="flex-1">
      <Text className="font-medium text-foreground">{event.name}</Text>
      <Text className="text-sm text-muted-foreground">
        {new Date(event.startDate).toLocaleDateString()}
      </Text>
    </View>
  </TouchableOpacity>
);

// Event message component
const EventMessage = (props: any) => {
  const { message } = useMessageContext();
  const router = useRouter();
  const { channel } = useChannelContext();

  // Type guard for event search results
  const isEventSearchMessage = (
    msg: any
  ): msg is { attachments: EventAttachment[] } => {
    return msg?.attachments?.some((att: any) => att.type === "event_card");
  };

  // Type guard for event messages
  const isEventMessage = (msg: any): msg is EventMessage => {
    const hasEventAttachment = msg?.attachments?.some(
      (att: any) => att.type === "event"
    );
    const hasValidAttachments =
      Array.isArray(msg?.attachments) && msg.attachments.length > 0;
    return hasEventAttachment && hasValidAttachments;
  };

  // Handle event selection
  const handleEventSelect = async (eventData: Event) => {
    try {
      console.log("[EventMessage] Sending event message:", eventData);
      const message = {
        text: `Shared event: ${eventData.name}`,
        attachments: [
          {
            type: "event",
            title: eventData.name,
            text: `${new Date(eventData.startDate).toLocaleString()}${
              eventData.location ? `\nLocation: ${eventData.location}` : ""
            }`,
            event_data: eventData,
          },
        ],
      };
      console.log("[EventMessage] Sending message:", message);
      const response = await channel?.sendMessage(message);
      console.log("[EventMessage] Message sent:", response);
    } catch (error) {
      console.error("[EventMessage] Error sharing event:", error);
      Alert.alert("Error", "Failed to share event");
    }
  };

  // Check if this is an event search result message
  if (isEventSearchMessage(message)) {
    return (
      <MessageSimple
        {...props}
        MessageContent={() => (
          <View>
            {message.attachments.map((attachment, index) => (
              <View key={index} className="p-3 mb-2 rounded-lg bg-muted">
                <View className="flex-row items-center mb-2 space-x-2">
                  <Calendar size={20} className="text-primary" />
                  <Text className="font-medium text-foreground">
                    {attachment.title}
                  </Text>
                </View>
                <Text className="text-muted-foreground">{attachment.text}</Text>
                <TouchableOpacity
                  onPress={() =>
                    handleEventSelect(attachment.event_data as Event)
                  }
                  className="p-2 mt-2 rounded bg-primary"
                >
                  <Text className="text-center text-primary-foreground">
                    Select this event
                  </Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      />
    );
  }

  // Handle display of shared event message
  if (isEventMessage(message)) {
    const eventAttachment = message.attachments.find(
      (att) => att.type === "event"
    ) as EventAttachment | undefined;

    if (!eventAttachment) {
      return <DefaultMessage {...props} />;
    }

    const eventData = eventAttachment.event_data;
    return (
      <MessageSimple
        {...props}
        MessageContent={() => (
          <TouchableOpacity
            onPress={() => {
              console.log("[EventMessage] Navigating to event:", eventData);
              router.push({
                pathname: "/(app)/(map)",
                params: { eventId: eventData.id },
              });
            }}
            className="p-3 rounded-lg bg-muted"
          >
            <View className="flex-row items-center mb-2 space-x-2">
              <Calendar size={20} className="text-primary" />
              <Text className="font-medium text-foreground">
                {eventData.name}
              </Text>
            </View>
            <Text className="text-muted-foreground">
              {new Date(eventData.startDate).toLocaleString()}
              {eventData.location ? `\nLocation: ${eventData.location}` : ""}
            </Text>
          </TouchableOpacity>
        )}
      />
    );
  }

  return <DefaultMessage {...props} />;
};

// Poll message component
const PollMessage = (props: any) => {
  const { message } = useMessageContext();
  const { channel } = useChannelContext();
  const { theme } = useTheme();

  // Check if message has a poll
  if (!message?.poll) {
    return <DefaultMessage {...props} />;
  }

  const poll = message.poll;
  const hasVoted = poll.own_votes && poll.own_votes.length > 0;

  const handleVote = async (optionId: string) => {
    try {
      if (!channel || !message?.id) return;

      // Cast vote using Stream Chat poll API
      const pollVoteResponse = await channel._client.post(
        `${channel._client.baseURL}/polls/${poll.id}/vote`,
        {
          message_id: message.id,
          vote: { option_id: optionId },
        }
      );

      console.log("Poll vote response:", pollVoteResponse);

      // Refresh the message to show updated poll results
      await channel.query({
        messages: { limit: 1, id_gte: message.id, id_lte: message.id },
      });
    } catch (error) {
      console.error("Error voting on poll:", error);
      Alert.alert("Error", "Failed to submit vote. Please try again.");
    }
  };

  const getTotalVotes = () => {
    if (!poll.vote_counts_by_option) return 0;
    return Object.values(poll.vote_counts_by_option).reduce(
      (sum: number, count: number) => sum + count,
      0
    );
  };

  const getVotePercentage = (optionId: string) => {
    const totalVotes = getTotalVotes();
    if (totalVotes === 0) return 0;
    const optionVotes = poll.vote_counts_by_option?.[optionId] || 0;
    return Math.round((optionVotes / totalVotes) * 100);
  };

  return (
    <MessageSimple
      {...props}
      MessageContent={() => (
        <View
          style={{
            backgroundColor: theme.colors.background,
            borderColor: theme.colors.border,
            borderWidth: 1,
            borderRadius: 16,
            padding: 20,
            marginVertical: 8,
            shadowColor: theme.colors.border,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 3,
          }}
        >
          {/* Poll Header */}
          <View style={{ marginBottom: 16 }}>
            <Text
              style={{
                color: theme.colors.text,
                fontSize: 18,
                fontWeight: "700",
                marginBottom: 4,
              }}
            >
              📊 {poll.name}
            </Text>

            {/* Poll Description */}
            {poll.description && (
              <Text
                style={{
                  color: theme.colors.text + "70",
                  fontSize: 15,
                  lineHeight: 20,
                }}
              >
                {poll.description}
              </Text>
            )}
          </View>

          {/* Poll Options */}
          {poll.options?.map((option: any) => {
            const voteCount = poll.vote_counts_by_option?.[option.id] || 0;
            const percentage = getVotePercentage(option.id);
            const isSelected = poll.own_votes?.some(
              (vote: any) => vote.option_id === option.id
            );

            return (
              <TouchableOpacity
                key={option.id}
                onPress={() => !poll.is_closed && handleVote(option.id)}
                disabled={poll.is_closed}
                style={{
                  backgroundColor: isSelected
                    ? theme.colors.primary + "15"
                    : theme.colors.card,
                  borderColor: isSelected
                    ? theme.colors.primary
                    : theme.colors.border,
                  borderWidth: isSelected ? 2 : 1,
                  borderRadius: 12,
                  padding: 16,
                  marginVertical: 6,
                  position: "relative",
                  overflow: "hidden",
                  shadowColor: isSelected
                    ? theme.colors.primary
                    : "transparent",
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.2,
                  shadowRadius: 2,
                  elevation: isSelected ? 2 : 0,
                }}
              >
                {/* Progress bar background */}
                {getTotalVotes() > 0 && (
                  <View
                    style={{
                      position: "absolute",
                      left: 0,
                      top: 0,
                      bottom: 0,
                      width: `${percentage}%`,
                      backgroundColor: isSelected
                        ? theme.colors.primary + "25"
                        : theme.colors.primary + "15",
                      borderRadius: 11,
                    }}
                  />
                )}

                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                    zIndex: 1,
                  }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      flex: 1,
                    }}
                  >
                    {isSelected && (
                      <Text style={{ marginRight: 8, fontSize: 16 }}>✓</Text>
                    )}
                    <Text
                      style={{
                        color: theme.colors.text,
                        fontSize: 16,
                        fontWeight: isSelected ? "600" : "400",
                        flex: 1,
                      }}
                    >
                      {option.text}
                    </Text>
                  </View>
                  {getTotalVotes() > 0 && (
                    <View style={{ alignItems: "flex-end" }}>
                      <Text
                        style={{
                          color: theme.colors.text,
                          fontSize: 14,
                          fontWeight: "600",
                        }}
                      >
                        {percentage}%
                      </Text>
                      <Text
                        style={{
                          color: theme.colors.text + "70",
                          fontSize: 12,
                        }}
                      >
                        {voteCount} vote{voteCount !== 1 ? "s" : ""}
                      </Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}

          {/* Poll Footer */}
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              marginTop: 16,
              paddingTop: 16,
              borderTopWidth: 1,
              borderTopColor: theme.colors.border + "40",
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Text style={{ marginRight: 4, fontSize: 14 }}>👥</Text>
              <Text
                style={{
                  color: theme.colors.text + "80",
                  fontSize: 14,
                  fontWeight: "500",
                }}
              >
                {getTotalVotes()} {getTotalVotes() === 1 ? "vote" : "votes"}
              </Text>
            </View>
            {poll.is_closed && (
              <View
                style={{
                  backgroundColor: theme.colors.notification + "20",
                  paddingHorizontal: 12,
                  paddingVertical: 4,
                  borderRadius: 12,
                }}
              >
                <Text
                  style={{
                    color: theme.colors.notification,
                    fontSize: 12,
                    fontWeight: "600",
                  }}
                >
                  🔒 Closed
                </Text>
              </View>
            )}
          </View>
        </View>
      )}
    />
  );
};

// Combined message component that handles both events and polls
const CombinedMessage = (props: any) => {
  const messageContext = useMessageContext();

  // Fallback to DefaultMessage if message context is not available
  if (!messageContext || !messageContext.message) {
    return <DefaultMessage {...props} />;
  }

  const { message } = messageContext;

  // Check if this is a poll message
  if (message?.poll) {
    return <PollMessage {...props} />;
  }

  // Check if this is an event message
  const isEventSearchMessage = (
    msg: any
  ): msg is { attachments: EventAttachment[] } => {
    return msg?.attachments?.some((att: any) => att.type === "event_card");
  };

  const isEventMessage = (msg: any): msg is EventMessage => {
    const hasEventAttachment = msg?.attachments?.some(
      (att: any) => att.type === "event"
    );
    const hasValidAttachments =
      Array.isArray(msg?.attachments) && msg.attachments.length > 0;
    return hasEventAttachment && hasValidAttachments;
  };

  if (isEventSearchMessage(message) || isEventMessage(message)) {
    return <EventMessage {...props} />;
  }

  // Default message rendering with enhanced features
  return (
    <MessageSimple
      {...props}
      message={message}
      MessageAvatar={MessageAvatar}
      MessageContent={MessageContent}
      MessageFooter={(messageFooterProps) => (
        <>
          {/* Reactions */}
          {message.latest_reactions && message.latest_reactions.length > 0 && (
            <ReactionListBottom />
          )}
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
        </>
      )}
      MessageStatus={MessageStatus}
      // Enable message actions (edit, delete, react, reply)
      messageActions={true}
    />
  );
};

export default function ChannelScreen() {
  const { session } = useAuth();
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
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Event[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [orbitMsg, setorbitMsg] = useState<any>(null);
  const { videoClient } = useVideo();

  console.log("chanell???", channel?.data);
  // if (channel?.data?.name === "Orbit App") {
  //   console.log("messages???", channel?.state.messages);
  //   setorbitMsg(channel?.state?.messages);
  // }

  const handleInfoPress = useCallback(() => {
    if (!channel) return;

    // Navigate to the settings screen
    router.push(`/(app)/(chat)/channel/${channel.id}/settings`);
  }, [channel, router]);

  const handleVideoCall = useCallback(() => {
    if (!channel || !videoClient) {
      Alert.alert("Error", "Unable to start video call");
      return;
    }

    // Generate a unique call ID based on channel ID
    const callId = `channel-call-${channel.id}-${Date.now()}`;

    router.push({
      pathname: "/call/[id]" as const,
      params: {
        id: callId,
        type: "default",
        create: "true",
      },
    });
  }, [channel, videoClient, router]);

  const handleAudioCall = useCallback(() => {
    if (!channel || !videoClient) {
      Alert.alert("Error", "Unable to start audio call");
      return;
    }

    // Generate a unique call ID based on channel ID
    const callId = `channel-call-${channel.id}-${Date.now()}`;

    router.push({
      pathname: "/call/[id]" as const,
      params: {
        id: callId,
        type: "audio_room",
        create: "true",
      },
    });
  }, [channel, videoClient, router]);

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

      if (channel?.data?.name === "Orbit App") {
        console.log("messages???", channel?.state?.messages);
        setorbitMsg(channel?.state?.messages[0]);
      }

      return () => {
        unsubscribePromises.forEach((promise) => {
          if (promise && typeof promise.unsubscribe === "function") {
            promise.unsubscribe();
          }
        });
      };
    }
  }, [channel]);

  // Handle command selection
  const handleCommand = useCallback(
    async (name: string, value?: string) => {
      if (name === "event" && value) {
        setIsSearching(true);
        try {
          console.log("[EventSearch] Searching with query:", value);
          console.log(
            "[EventSearch] Backend URL:",
            process.env.BACKEND_CHAT_URL
          );
          const response = await fetch(
            `${process.env.BACKEND_CHAT_URL}/commands`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${client?.tokenManager.token}`,
              },
              body: JSON.stringify({
                message: {
                  command: "event",
                  args: value,
                  text: `/event ${value}`,
                  cid: channel?.cid,
                },
                user: {
                  id: client?.userID,
                },
              }),
            }
          );

          if (!response.ok) {
            const errorText = await response.text();
            console.error("[EventSearch] Error response:", {
              status: response.status,
              text: errorText,
            });
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          const data = await response.json();
          console.log("[EventSearch] Response:", data);

          if (data.message?.attachments) {
            const eventMessage = {
              text: data.message.text,
              attachments: data.message.attachments,
            };
            await channel?.sendMessage(eventMessage);
          } else {
            Alert.alert("Error", data.message?.text || "No events found");
          }
        } catch (error) {
          console.error("[EventSearch] Error searching events:", error);
          Alert.alert("Error", "Failed to search events. Please try again.");
        } finally {
          setIsSearching(false);
        }
      }
    },
    [channel, client]
  );

  useEffect(() => {
    if (channel) {
      // Register event command
      channel.on("message.new", (event) => {
        if (event.message?.command === "event") {
          handleCommand("event", event.message.args);
        }
      });
    }
  }, [channel, handleCommand]);

  const hitNoificationApi = async (
    typee: string,
    chatId: string,
    name: string
  ) => {
    if (!session) return;
    try {
      console.log("vcvc");
      const reuestData = {
        senderId: session.user.id,
        type: typee,
        data: {
          chat_id: chatId,
          group_name: name,
        },
      };
      ///send notification
      const response = await fetch(
        `${process.env.BACKEND_MAP_URL}/api/notifications/send`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.user.id}`,
          },
          body: JSON.stringify(reuestData),
        }
      );
      console.log("requestData", reuestData);

      if (!response.ok) {
        console.log("error>", response);
        throw new Error(await response.text());
      }

      const data_ = await response.json();
      console.log("response>", data_);
    } catch (e) {
      console.log("error_catch>", e);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.card }}>
      <Stack.Screen
        options={{
          headerTitle: () => (
            <TouchableOpacity
              style={{ alignItems: "center" }}
              onPress={() => {
                // Optional: Navigate to contact info on title tap (iOS behavior)
                if (channel?.data?.name !== "Orbit App") {
                  handleInfoPress();
                }
              }}
            >
              <Text
                style={{
                  fontSize: 17,
                  fontWeight: "600",
                  color: theme.colors.text,
                  textAlign: "center",
                }}
              >
                {channel?.data?.name || "Chat"}
              </Text>
              {channel?.data?.name !== "Orbit App" && (
                <Text
                  style={{
                    fontSize: 13,
                    color: theme.colors.text + "60",
                    textAlign: "center",
                    marginTop: 1,
                  }}
                >
                  {memberCount} {memberCount === 1 ? "member" : "members"}
                </Text>
              )}
            </TouchableOpacity>
          ),
          headerLeft: () => (
            <TouchableOpacity
              style={{
                flexDirection: "row",
                alignItems: "center",
                paddingLeft: 8,
              }}
              onPress={() => router.back()}
            >
              <ArrowLeft size={22} color={theme.colors.text} strokeWidth={2} />
              <Text
                style={{
                  fontSize: 17,
                  color: theme.colors.text,
                  marginLeft: 6,
                }}
              >
                Messages
              </Text>
            </TouchableOpacity>
          ),
          headerRight: () =>
            channel?.data?.name !== "Orbit App" ? (
              <View style={{ flexDirection: "row", paddingRight: 8, gap: 12 }}>
                {/* Audio Call Button */}
                <TouchableOpacity
                  onPress={handleAudioCall}
                  style={{ padding: 4 }}
                >
                  <Phone size={20} color={theme.colors.text} strokeWidth={2} />
                </TouchableOpacity>

                {/* Video Call Button */}
                <TouchableOpacity
                  onPress={handleVideoCall}
                  style={{ padding: 4 }}
                >
                  <Video size={20} color={theme.colors.text} strokeWidth={2} />
                </TouchableOpacity>

                {/* Settings Button */}
                <TouchableOpacity
                  onPress={handleInfoPress}
                  style={{ padding: 4 }}
                >
                  <Info size={20} color={theme.colors.text} strokeWidth={2} />
                </TouchableOpacity>
              </View>
            ) : null,
          headerStyle: {
            backgroundColor: theme.colors.card,
          },
          headerTintColor: theme.colors.text,
          headerTitleAlign: "center",
          headerBackVisible: false,
          headerShadowVisible: false,
        }}
      />

      {/* Active Call Banner */}
      {channel && (
        <ActiveCallBanner
          channelId={channel.id as string}
          // @ts-ignore - temporary fix for channel.data.name type
          channelName={channel.data?.name}
        />
      )}

      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color={theme.colors.text} />
          <Text className="mt-4 text-foreground">Loading chat...</Text>
        </View>
      ) : error ? (
        <View className="flex-1 justify-center items-center px-4">
          <Text className="mb-4 text-center text-destructive">{error}</Text>
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
          onPressMessage={({
            additionalInfo,
            defaultHandler,
            emitter,
            message,
          }) => {
            const handleEventSelect = async (eventData: Event) => {
              try {
                console.log("[EventMessage] Sending event message:", eventData);
                const message = {
                  text: `Shared event: ${eventData.name}`,
                  attachments: [
                    {
                      type: "event",
                      title: eventData.name,
                      text: `${new Date(eventData.startDate).toLocaleString()}${
                        eventData.location
                          ? `\nLocation: ${eventData.location}`
                          : ""
                      }`,
                      event_data: eventData,
                    },
                  ],
                };
                console.log("[EventMessage] Sending message:", message);
                const response = await channel?.sendMessage(message);
                console.log("[EventMessage] Message sent:", response);
              } catch (error) {
                console.error("[EventMessage] Error sharing event:", error);
                Alert.alert("Error", "Failed to share event");
              }
            };

            console.log("[Channel] Message pressed:", {
              additionalInfo,
              emitter,
              messageType: message?.type,
              attachments: message?.attachments,
            });

            // Check if this is an event message
            const eventAttachment = message?.attachments?.find(
              (att: any) => att.type === "event"
            ) as EventAttachment | undefined;

            if (eventAttachment?.event_data) {
              console.log(
                "[Channel] Found event data:",
                eventAttachment.event_data
              );
              router.push({
                pathname: "/(app)/(map)",
                params: { eventId: eventAttachment.event_data.id },
              });
              return;
            }

            // Handle event card selection
            const attachment = additionalInfo?.attachment as
              | EventAttachment
              | undefined;
            if (attachment?.type === "event_card") {
              handleEventSelect(attachment.event_data as Event);
              return;
            }

            defaultHandler?.();
          }}
          doSendMessageRequest={async (channelId, message) => {
            if (message.text?.startsWith("/event")) {
              const searchTerm = message.text.replace("/event", "").trim();
              if (searchTerm) {
                await handleCommand("event", searchTerm);
                return new Promise(() => {}); // Prevent default message sending
              } else {
                Alert.alert(
                  "Error",
                  "Please provide a search term after /event"
                );
                return new Promise(() => {});
              }
            }

            console.log("LKL>>", channel?.data?.member_count);
            const name = channel?.data?.name as string;
            const chnlId = channel?.data?.id as string;
            const memberCount = channel?.data?.member_count as number;
            if (memberCount > 2) {
              //group
              console.log("LKLchannelId>>", chnlId);
              hitNoificationApi("new_group_message", chnlId, name);
            } else {
              hitNoificationApi("new_message", chnlId, name);
            }
            return channel?.sendMessage(message);
          }}
        >
          {thread ? (
            <Thread />
          ) : (
            <>
              {channel?.data?.name === "Orbit App" ? (
                <View
                  style={{
                    flex: 1,
                    justifyContent: "flex-end", // align children to bottom
                    alignItems: "flex-start", // align to the left
                    padding: 16,
                    backgroundColor: theme.colors.card,
                  }}
                >
                  <View className="w-[80%] p-4 border bg-muted/50 border-border rounded-tl-3xl rounded-tr-3xl rounded-bl-none rounded-br-3xl">
                    <Text className="text-foreground">
                      {" "}
                      {orbitMsg?.text || "No orbit message"}
                    </Text>
                  </View>
                </View>
              ) : (
                <>
                  <MessageList
                    onThreadSelect={setThread}
                    // Enable typing indicator
                    TypingIndicator={TypingIndicator}
                    additionalFlatListProps={{
                      initialNumToRender: 30,
                      maxToRenderPerBatch: 10,
                      windowSize: 10,
                      removeClippedSubviews: false,
                      inverted: Platform.OS === "ios" ? true : false,
                      style: {
                        backgroundColor: theme.colors.card,
                      },
                      contentContainerStyle: {
                        backgroundColor: theme.colors.card,
                      },
                    }}
                    loadMore={() => {
                      console.log("[ChatChannel] Loading more messages...");
                      return Promise.resolve();
                    }}
                  />
                  <MessageInput
                    audioRecordingEnabled={true}
                    AudioRecordingLockIndicator={() => (
                      <View className="w-10 h-10 bg-red-500" />
                    )}
                  />
                </>
              )}
            </>
          )}
        </Channel>
      ) : null}
    </View>
  );
}
