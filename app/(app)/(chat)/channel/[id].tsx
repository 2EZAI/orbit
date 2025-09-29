import {
  Channel,
  MessageInput,
  MessageList,
  Thread,
  MessageSimple,
  useChannelContext,
  Message,
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
  StyleSheet,
  Image,
} from "react-native";
import { Text } from "~/src/components/ui/text";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "~/src/components/ui/avatar";
import { Info, Calendar } from "lucide-react-native";
import { Icon } from "react-native-elements";
import type {
  Channel as ChannelType,
  DefaultGenerics,
  Attachment as StreamAttachment,
} from "stream-chat";

import { useTheme } from "~/src/components/ThemeProvider";
import { ArrowLeft, Phone, Video } from "lucide-react-native";
import { useVideo } from "~/src/lib/video";
import ActiveCallBanner from "~/src/components/chat/ActiveCallBanner";
import { useMessageContext } from "stream-chat-expo";

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

// BULLETPROOF Message Component - ONLY renders polls, returns NULL for everything else
// This forces Stream to use its default components for all non-poll messages
const BulletproofMessage = (props: any) => {
  const message = props.message;

  // ONLY handle actual poll messages
  const isActualPoll =
    message &&
    message.poll &&
    message.poll.id &&
    typeof message.poll.id === "string" &&
    message.poll.id.length > 0;

  if (isActualPoll) {
    console.log(
      "BulletproofMessage: Rendering custom poll for message:",
      message.id
    );
    // Return ONLY our custom poll - no MessageSimple wrapper
    return <CustomPollComponent key={`poll-${message.id}`} message={message} />;
  }

  // For ALL other messages: use Stream's default Message component (NOT MessageSimple)
  // This avoids the MessageSimple crash while showing all messages
  return <Message {...props} />;
};

// Custom Poll Component - Uses Stream's proper Poll component prop
const CustomPollComponent = ({ message }: { message: any }) => {
  // Extra safety checks for poll component
  if (!message || !message.id || !message.poll || !message.poll.id) {
    console.warn(
      "CustomPollComponent: Invalid message or poll data, returning null"
    );
    return null;
  }

  const { channel } = useChannelContext();
  const { theme } = useTheme();
  const [isVoting, setIsVoting] = useState(false);

  // Additional safety check
  if (!channel || !theme) {
    console.warn("CustomPollComponent: Missing channel or theme context");
    return null;
  }

  const poll = message.poll;
  const options = poll.options || [];

  const handleVote = async (optionId: string) => {
    if (isVoting) return; // Prevent double-voting

    setIsVoting(true);

    // Try multiple voting methods since Stream's API is broken
    try {
      console.log("🔄 Method 1: Trying poll.vote()...");
      if (poll && typeof poll.vote === "function") {
        const voteResult = await poll.vote({ option_id: optionId });
        console.log("✅ Poll.vote() succeeded:", voteResult);
        setIsVoting(false);
        return;
      }
    } catch (error: any) {
      console.log("❌ Method 1 failed:", error.message);
    }

    try {
      console.log("🔄 Method 2: Trying channel.castPollVote()...");
      if (channel && typeof (channel as any).castPollVote === "function") {
        const voteResult = await (channel as any).castPollVote(poll.id, {
          option_id: optionId,
        });
        console.log("✅ Channel.castPollVote() succeeded:", voteResult);
        setIsVoting(false);
        return;
      }
    } catch (error: any) {
      console.log("❌ Method 2 failed:", error.message);
    }

    // Method 3: Fall back to the broken client API
    try {
      console.log("🔄 Method 3: Trying broken client.castPollVote()...");

      const voteResult = await channel._client.castPollVote(
        message.id,
        poll.id,
        {
          option_id: optionId,
        }
      );

      console.log("✅ Vote result:", voteResult);
      setIsVoting(false);
    } catch (error: any) {
      console.error("❌ Vote failed:", error);

      // This is a known Stream Chat API issue - votes usually succeed despite error
      if (
        error.status === 500 ||
        error.code === -1 ||
        error.message === "" ||
        error.message.includes('CastPollVote failed with error: ""')
      ) {
        console.log("🎯 Known Stream API error - vote likely succeeded");

        // First refresh to show updated poll data
        setTimeout(async () => {
          console.log("🔄 First refresh for poll update...");
          try {
            await channel.query({ messages: { limit: 50 }, presence: true });
          } catch (e) {
            console.log("🔄 Refresh error (expected):", e);
          }
          setIsVoting(false);
        }, 1000);

        // Second refresh to ensure poll state is fully updated
        setTimeout(async () => {
          console.log("🔄 Second refresh for poll update...");
          try {
            await channel.query({ watch: true, messages: { limit: 50 } });
            await channel.queryMembers({});
          } catch (e) {
            console.log("🔄 Second refresh error (expected):", e);
          }
        }, 2000);
      } else {
        setIsVoting(false);
        console.error("❌ Unexpected voting error:", error);
      }
    }
  };

  const getTotalVotes = (): number => {
    if (!poll.vote_counts_by_option) return 0;
    return Object.values(poll.vote_counts_by_option).reduce(
      (sum: number, count: any) => sum + (Number(count) || 0),
      0
    );
  };

  const getVoteCount = (optionId: string): number => {
    return Number(poll.vote_counts_by_option?.[optionId]) || 0;
  };

  const getVotePercentage = (optionId: string): number => {
    const total = getTotalVotes();
    if (total === 0) return 0;
    return Math.round((getVoteCount(optionId) / total) * 100);
  };

  const hasUserVoted = (optionId: string) => {
    return (
      poll.own_votes?.some((vote: any) => vote.option_id === optionId) || false
    );
  };

  const getVotersForOption = (optionId: string): any[] => {
    // Get all votes for this option from poll.votes
    const optionVotes =
      poll.votes?.filter((vote: any) => vote.option_id === optionId) || [];

    // Get unique users who voted for this option
    const voterIds = [...new Set(optionVotes.map((vote: any) => vote.user_id))];

    // Get user details from channel members
    const voters = voterIds
      .map((userId) => {
        const member = Object.values(channel.state.members || {}).find(
          (m: any) => m.user_id === userId
        );
        return member?.user;
      })
      .filter(Boolean);

    return voters;
  };

  const getVoterDisplayName = (user: any): string => {
    if (user?.first_name || user?.last_name) {
      return `${user.first_name || ""} ${user.last_name || ""}`.trim();
    }
    return user?.username || "Unknown User";
  };

  return (
    <View style={styles.fullWidthPollContainer}>
      <View
        style={[
          styles.pollCard,
          {
            backgroundColor: theme.colors.card,
            borderColor: theme.colors.border,
          },
        ]}
      >
        {/* Poll Header */}
        <View style={styles.pollHeader}>
          <Text style={[styles.pollTitle, { color: theme.colors.text }]}>
            📊 {poll.name}
          </Text>
          <Text style={[styles.pollDescription, { color: theme.colors.text }]}>
            {poll.description || "Choose your option"}
          </Text>
        </View>

        {/* Poll Options */}
        <View style={styles.pollOptionsContainer}>
          {options.map((option: any, index: number) => {
            const voteCount = getVoteCount(option.id);
            const percentage = getVotePercentage(option.id);
            const userVoted = hasUserVoted(option.id);
            const totalVotes = getTotalVotes();

            return (
              <TouchableOpacity
                key={option.id}
                style={[
                  styles.pollOptionFull,
                  {
                    backgroundColor: userVoted
                      ? theme.colors.primary + "20"
                      : theme.colors.background,
                    borderColor: userVoted
                      ? theme.colors.primary
                      : theme.colors.border,
                    borderWidth: userVoted ? 2 : 1,
                  },
                ]}
                onPress={() => handleVote(option.id)}
                activeOpacity={0.7}
                disabled={isVoting}
              >
                {/* Progress Background */}
                {totalVotes > 0 && (
                  <View
                    style={[
                      styles.pollOptionProgress,
                      {
                        width: `${percentage}%`,
                        backgroundColor: userVoted
                          ? theme.colors.primary + "30"
                          : theme.colors.notification + "30",
                      },
                    ]}
                  />
                )}

                {/* Option Content */}
                <View style={styles.pollOptionContent}>
                  <View style={styles.pollOptionLeft}>
                    <Text style={styles.optionNumber}>
                      {String.fromCharCode(65 + index)} {/* A, B, C, etc */}
                    </Text>
                    <View style={styles.pollOptionTextContainer}>
                      <Text
                        style={[
                          styles.pollOptionText,
                          { color: theme.colors.text },
                        ]}
                      >
                        {userVoted ? "✅ " : ""}
                        {option.text}
                      </Text>

                      {/* Voter Avatars */}
                      {(() => {
                        const voters = getVotersForOption(option.id);
                        const displayVoters = voters.slice(0, 5);
                        const remainingCount =
                          voters.length - displayVoters.length;

                        if (voters.length === 0) return null;

                        return (
                          <View style={styles.voterAvatarsContainer}>
                            {displayVoters.map(
                              (user: any, voterIndex: number) => (
                                <Avatar
                                  key={user?.id || voterIndex}
                                  style={[
                                    styles.voterAvatar,
                                    { marginLeft: voterIndex > 0 ? -8 : 0 },
                                  ]}
                                  alt={getVoterDisplayName(user)}
                                >
                                  {user?.image ? (
                                    <AvatarImage source={{ uri: user.image }} />
                                  ) : (
                                    <AvatarFallback>
                                      <Text style={styles.voterInitials}>
                                        {(
                                          user?.first_name?.[0] ||
                                          user?.username?.[0] ||
                                          "?"
                                        ).toUpperCase()}
                                      </Text>
                                    </AvatarFallback>
                                  )}
                                </Avatar>
                              )
                            )}
                            {remainingCount > 0 && (
                              <View
                                style={[
                                  styles.voterAvatar,
                                  styles.voterCountBadge,
                                  { marginLeft: -8 },
                                ]}
                              >
                                <Text style={styles.voterCountText}>
                                  +{remainingCount}
                                </Text>
                              </View>
                            )}
                          </View>
                        );
                      })()}
                    </View>
                  </View>

                  <View style={styles.pollOptionRight}>
                    {isVoting ? (
                      <ActivityIndicator
                        size="small"
                        color={theme.colors.primary}
                      />
                    ) : (
                      <>
                        <Text
                          style={[
                            styles.pollOptionVotes,
                            { color: theme.colors.text },
                          ]}
                        >
                          {voteCount}
                        </Text>
                        <Text
                          style={[
                            styles.pollOptionPercentage,
                            { color: theme.colors.text },
                          ]}
                        >
                          {percentage}%
                        </Text>
                      </>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Poll Footer */}
        <View style={styles.pollFooterContainer}>
          <Text style={[styles.pollFooterText, { color: theme.colors.text }]}>
            👥 {getTotalVotes()} total votes
          </Text>
          {poll.enforce_unique_vote && (
            <Text
              style={[styles.pollFooterSubtext, { color: theme.colors.text }]}
            >
              • One vote per person
            </Text>
          )}
        </View>
      </View>
    </View>
  );
};

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

export default function ChannelScreen() {
  const { session } = useAuth();
  const { id } = useLocalSearchParams();
  const {from} =  useLocalSearchParams();
  const { client } = useChat();
  const router = useRouter();
  const [channel, setChannel] = useState<ChannelType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [thread, setThread] = useState<any>(null);
  const [memberCount, setMemberCount] = useState<number>(0);
  const channelRef = useRef<ChannelType | null>(null);
  const { theme } = useTheme();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Event[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [orbitMsg, setorbitMsg] = useState<any>(null);
  const [isCreatingCall, setIsCreatingCall] = useState(false);
  const { videoClient } = useVideo();

  const handleInfoPress = useCallback(() => {
    if (!channel) return;

    // Navigate to the settings screen
    router.push(`/(app)/(chat)/channel/${channel.id}/settings`);
  }, [channel, router]);

  const handleVideoCall = useCallback(async () => {
    if (!channel || !videoClient) {
      Alert.alert("Error", "Unable to start video call");
      return;
    }

    try {
      setIsCreatingCall(true);
      
      // Generate a unique call ID based on channel ID
      const callId = `channel-call-${channel.id}-${Date.now()}`;

      console.log("🎥 Starting video call:", callId);

      // Send notification message to channel members
      try {
        await channel.sendMessage({
          text: "📹 Started a video call",
          type: "system",
          custom: {
            callId,
            callType: "default",
            action: "call_started",
          },
        });
        console.log("📢 Call notification sent to channel");
      } catch (notificationError) {
        console.warn("Failed to send call notification:", notificationError);
        // Continue anyway - call should still work
      }

      router.push({
        pathname: "/call/[id]" as const,
        params: {
          id: callId,
          type: "default",
          create: "true",
        },
      });
    } catch (error) {
      console.error("Error starting video call:", error);
      Alert.alert("Error", "Failed to start video call");
    } finally {
      setIsCreatingCall(false);
    }
  }, [channel, videoClient, router]);

  const handleAudioCall = useCallback(async () => {
    if (!channel || !videoClient) {
      Alert.alert("Error", "Unable to start audio call");
      return;
    }

    try {
      setIsCreatingCall(true);
      
      // Generate a unique call ID based on channel ID
      const callId = `channel-call-${channel.id}-${Date.now()}`;

      console.log("📞 Starting audio call:", callId);

      // Send notification message to channel members
      try {
        await channel.sendMessage({
          text: "📞 Started an audio call",
          type: "system",
          custom: {
            callId,
            callType: "audio_room",
            action: "call_started",
          },
        });
        console.log("📢 Call notification sent to channel");
      } catch (notificationError) {
        console.warn("Failed to send call notification:", notificationError);
        // Continue anyway - call should still work
      }

      router.push({
        pathname: "/call/[id]" as const,
        params: {
          id: callId,
          type: "audio_room",
          create: "true",
        },
      });
    } catch (error) {
      console.error("Error starting audio call:", error);
      Alert.alert("Error", "Failed to start audio call");
    } finally {
      setIsCreatingCall(false);
    }
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
        // console.log("[ChatChannel] Loading channel:", id);
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
          messages: messages.messages
            ?.filter((m) => m)
            .map((m) => ({
              id: m?.id || "unknown",
              text: m?.text || "",
              user: m?.user?.id || "unknown",
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

      if (channel?.data?.name === "Orbit Social App") {
    // console.log("messages???", channel?.state?.messages);
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
          // console.log("[EventSearch] Searching with query:", value);
          // console.log(
          //   "[EventSearch] Backend URL:",
          //   process.env.BACKEND_CHAT_URL
          // );
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
          // console.log("[EventSearch] Response:", data);

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
        // console.log("requestData", reuestData);

        if (!response.ok) {
          // console.log("error>",response);
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
              onPress={() => {
                 if(from === 'home' || from === 'social' 
                 || from === 'map') {
                 router.push({
                  pathname: `/(app)/(notification)`,
                  params: { from:from },
                });
                }
               
               else{
                router.back()
               }
              }}
            >
              <ArrowLeft size={22} color={theme.colors.text} strokeWidth={2} />
           {/*<Text
                style={{
                  fontSize: 17,
                  color: theme.colors.text,
                  marginLeft: 6,
                }}
              >
                Messages
              </Text>
               */}  
            </TouchableOpacity>
          ),
          headerRight: () =>
            channel?.data?.name !== "Orbit App" ? (
              <View style={{ flexDirection: "row", paddingRight: 8, gap: 12 }}>
                {/* Audio Call Button */}
                <TouchableOpacity
                  onPress={handleAudioCall}
                  style={{ padding: 4 }}
                  disabled={isCreatingCall}
                >
                  {isCreatingCall ? (
                    <ActivityIndicator size="small" color={theme.colors.text} />
                  ) : (
                    <Phone size={20} color={theme.colors.text} strokeWidth={2} />
                  )}
                </TouchableOpacity>

                {/* Video Call Button */}
                <TouchableOpacity
                  onPress={handleVideoCall}
                  style={{ padding: 4 }}
                  disabled={isCreatingCall}
                >
                  {isCreatingCall ? (
                    <ActivityIndicator size="small" color={theme.colors.text} />
                  ) : (
                    <Video size={20} color={theme.colors.text} strokeWidth={2} />
                  )}
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

      {/* Active Call Banner - HIDDEN during development */}
      {/* 
      {channel && (
        <ActiveCallBanner
          channelId={channel.id as string}
          // @ts-ignore - temporary fix for channel.data.name type
          channelName={channel.data?.name}
        />
      )}
      */}

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
          Message={BulletproofMessage}
        >
          {thread ? (
            <View style={{ flex: 1, backgroundColor: theme.colors.card }}>
              <Thread />
            </View>
          ) : (
            <>
              {channel?.data?.name === "Orbit Social App" ? (
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
                    <Text className="text-text">
                      {" "}
                      {orbitMsg?.text || "No orbit message"}
                    </Text>
                  </View>
                </View>
              ) : (
                <>
                  <MessageList onThreadSelect={setThread} />
                  <MessageInput />
                </>
              )}
            </>
          )}
        </Channel>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  // Full-width poll container
  fullWidthPollContainer: {
    width: "100%",
    marginVertical: 8,
  },

  // Poll card with shadow and border
  pollCard: {
    marginHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 6,
    overflow: "hidden",
  },

  // Poll header section
  pollHeader: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(128,128,128,0.2)",
  },

  pollTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 4,
  },

  pollDescription: {
    fontSize: 14,
    opacity: 0.7,
    fontWeight: "400",
  },

  // Poll options container
  pollOptionsContainer: {
    padding: 16,
  },

  // Individual poll option (full width)
  pollOptionFull: {
    marginBottom: 12,
    borderRadius: 12,
    overflow: "hidden",
    position: "relative",
    minHeight: 56,
  },

  // Progress bar background
  pollOptionProgress: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 12,
  },

  // Option content layout
  pollOptionContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    zIndex: 1,
  },

  pollOptionLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },

  optionNumber: {
    fontSize: 16,
    fontWeight: "700",
    marginRight: 12,
    minWidth: 24,
    textAlign: "center",
    color: "#888",
  },

  pollOptionTextContainer: {
    flex: 1,
  },

  pollOptionText: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 4,
  },

  // Voter avatars
  voterAvatarsContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },

  voterAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "white",
  },

  voterInitials: {
    fontSize: 10,
    fontWeight: "600",
    color: "white",
  },

  voterCountBadge: {
    backgroundColor: "#888",
    alignItems: "center",
    justifyContent: "center",
  },

  voterCountText: {
    fontSize: 9,
    fontWeight: "600",
    color: "white",
  },

  pollOptionRight: {
    alignItems: "flex-end",
    minWidth: 60,
  },

  pollOptionVotes: {
    fontSize: 16,
    fontWeight: "700",
  },

  pollOptionPercentage: {
    fontSize: 12,
    fontWeight: "600",
    opacity: 0.7,
  },

  // Poll footer
  pollFooterContainer: {
    padding: 16,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(128,128,128,0.2)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  pollFooterText: {
    fontSize: 14,
    fontWeight: "600",
  },

  pollFooterSubtext: {
    fontSize: 12,
    opacity: 0.7,
  },
});
