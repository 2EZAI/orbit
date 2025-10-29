import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Info } from "lucide-react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import type { Channel as ChannelType } from "stream-chat";
import {
  Channel,
  Message,
  MessageInput,
  MessageList,
  Thread,
  useChannelContext,
} from "stream-chat-expo";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "~/src/components/ui/avatar";
import { Text } from "~/src/components/ui/text";
import { useAuth } from "~/src/lib/auth";
import { useChat } from "~/src/lib/chat";

import { ArrowLeft } from "lucide-react-native";
import ChatEventComponent from "~/src/components/chat/ChatEventComponent";
import { SharedPostMessage } from "~/src/components/chat/SharedPostMessage";
import { useTheme } from "~/src/components/ThemeProvider";
import { useUserData } from "~/hooks/useUserData";
import { useVideo } from "~/src/lib/video";
import {
  UnifiedData,
  UnifiedDetailsSheet,
} from "~/src/components/map/UnifiedDetailsSheet";
import UnifiedShareSheet from "~/src/components/map/UnifiedShareSheet";
import ChatProposalComponent from "~/src/components/chat/ChatProposalComponent";
import { IProposal } from "~/hooks/useProposals";
import UnifiedProposalSheet from "~/src/components/map/UnifiedProposalSheet";
import { ChatSelectionModal } from "~/src/components/social/ChatSelectionModal";

// BULLETPROOF Message Component - ONLY renders polls, returns NULL for everything else
// This forces Stream to use its default components for all non-poll messages

// Custom Post Share Component
const CustomPostShareComponent = ({ message }: { message: any }) => {
  const router = useRouter();

  console.log(
    "CustomPostShareComponent: Checking message:",
    message?.id,
    "attachments:",
    message?.attachments
  );

  // Check if this message has post share attachments
  if (
    !message ||
    !message.id ||
    !message.attachments ||
    message.attachments.length === 0
  ) {
    console.log("CustomPostShareComponent: No attachments found");
    return null;
  }

  const postShareAttachment = message.attachments.find(
    (attachment: any) => attachment.type === "post_share"
  );

  console.log(
    "CustomPostShareComponent: Post share attachment:",
    postShareAttachment
  );

  if (!postShareAttachment || !postShareAttachment.post_data) {
    console.log(
      "CustomPostShareComponent: No post share attachment or post data"
    );
    return null;
  }

  console.log("CustomPostShareComponent: Rendering SharedPostMessage");
  return (
    <SharedPostMessage
      postData={postShareAttachment.post_data}
      onPress={() => {
        // Navigate to the post
        router.push(`/(app)/post/${postShareAttachment.post_id}`);
      }}
    />
  );
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

export default function ChannelScreen() {
  const { session } = useAuth();
  const { id } = useLocalSearchParams();
  const { from } = useLocalSearchParams();
  const { client } = useChat();
  const router = useRouter();
  const [shareData, setShareData] = useState<{
    data: UnifiedData;
    isEventType: boolean;
  } | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null);
  const [selectedProposal, setSelectedProposal] = useState<IProposal | null>(
    null
  );
  const [channel, setChannel] = useState<ChannelType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [thread, setThread] = useState<any>(null);
  const [memberCount, setMemberCount] = useState<number>(0);
  const channelRef = useRef<ChannelType | null>(null);
  const { theme } = useTheme();
  const { user } = useUserData();
  const [orbitMsg, setorbitMsg] = useState<any>(null);
  const { videoClient } = useVideo();
  const [chatShareSelection, setChatShareSelection] = useState<{
    proposal: IProposal | null;
    event: UnifiedData | null;
    show: boolean;
    isEventType: boolean;
  }>({
    proposal: null,
    event: null,
    show: false,
    isEventType: false,
  });
  const BulletproofMessage = (props: any) => {
    const eventId = props.message?.data?.eventId;
    const proposal = props.message?.data?.proposal;
    const eventSource = props.message?.data?.source;
    const message = props.message;
    console.log(proposal);
    // Check for post share attachments
    const hasPostShare = message?.attachments?.some(
      (attachment: any) => attachment.type === "post_share"
    );

    // Check for event/location/ticketmaster share attachments (from web app)
    const eventShareAttachment = message?.attachments?.find(
      (attachment: any) =>
        attachment.type === "event_share" ||
        attachment.type === "location_share" ||
        attachment.type === "ticketmaster_share"
    );

    console.log(
      "BulletproofMessage: Message",
      message?.id,
      "hasPostShare:",
      hasPostShare,
      "eventShareAttachment:",
      eventShareAttachment,
      "attachments:",
      message?.attachments
    );

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
      return (
        <CustomPollComponent key={`poll-${message.id}`} message={message} />
      );
    }
    if (hasPostShare) {
      console.log(
        "BulletproofMessage: Rendering custom post share for message:",
        message.id
      );
      // Return ONLY our custom post share - no MessageSimple wrapper
      return (
        <CustomPostShareComponent
          key={`post-${message.id}`}
          message={message}
        />
      );
    }

    // Handle event/location/ticketmaster share attachments (from web app)
    if (eventShareAttachment) {
      const attachmentEventId =
        eventShareAttachment.event_id || eventShareAttachment.location_id;
      const attachmentSource =
        eventShareAttachment.type === "ticketmaster_share"
          ? "ticketmaster"
          : eventShareAttachment.type === "location_share"
          ? "location"
          : "event";

      // For ALL attachment types, use data directly (like web app) - no API calls
      let unifiedData: UnifiedData;

      if (
        eventShareAttachment.type === "location_share" &&
        eventShareAttachment.location_data
      ) {
        // Transform location data to match UnifiedData format
        const locationData = eventShareAttachment.location_data;
        unifiedData = {
          id: locationData.id,
          name: locationData.name,
          description: locationData.description,
          image_urls: locationData.image_urls || [],
          start_datetime: new Date().toISOString(), // Locations don't have start time
          address: locationData.address,
          venue_name: locationData.name,
          city: locationData.city,
          state: locationData.state,
          latitude: locationData.latitude,
          longitude: locationData.longitude,
          source: "location",
          is_ticketmaster: false,
        };
      } else if (eventShareAttachment.event_data) {
        // Use event_data directly for events and ticketmaster
        const eventData = eventShareAttachment.event_data;
        unifiedData = {
          id: eventData.id,
          name: eventData.name,
          description: eventData.description,
          image_urls: eventData.image_urls || [],
          start_datetime: eventData.start_datetime || new Date().toISOString(),
          address: eventData.address,
          venue_name: eventData.venue_name || eventData.name,
          city: eventData.city,
          state: eventData.state,
          latitude: eventData.latitude,
          longitude: eventData.longitude,
          source: attachmentSource,
          is_ticketmaster: attachmentSource === "ticketmaster",
        };
      } else {
        // Fallback: use ChatEventComponent with API call (for backwards compatibility)
        return (
          <ChatEventComponent
            key={`event-attachment-${message.id}`}
            message={message}
            eventId={attachmentEventId}
            source={attachmentSource}
            handleEventPress={(data: UnifiedData) => {
              setSelectedEvent(data);
            }}
            userId={user?.id || ""}
          />
        );
      }

      // Use ChatEventComponent with direct data (no API call)
      return (
        <ChatEventComponent
          key={`attachment-${message.id}`}
          message={message}
          eventId={attachmentEventId}
          source={attachmentSource}
          directData={unifiedData}
          handleEventPress={(data: UnifiedData) => {
            setSelectedEvent(data);
          }}
          userId={user?.id || ""}
        />
      );
    }

    if (proposal) {
      return (
        <ChatProposalComponent
          proposal={proposal}
          message={message}
          handleProposalPress={(proposalData) =>
            setSelectedProposal(proposalData)
          }
        />
      );
    }

    // Handle legacy message.data format (for backwards compatibility)
    if (eventId && eventSource) {
      return (
        <ChatEventComponent
          key={`event-${message.id}`}
          message={message}
          eventId={eventId}
          source={eventSource}
          handleEventPress={(data: UnifiedData) => {
            setSelectedEvent(data);
          }}
        />
      );
    }
    // For ALL other messages: use Stream's default Message component (NOT MessageSimple)
    // This avoids the MessageSimple crash while showing all messages
    return <Message {...props} />;
  };
  const handleChatSelect = async (channel: any) => {
    if (!channel) return;
    try {
      console.log("handleChatSelect", chatShareSelection.event);
      // Ensure channel is watched before sending
      await channel.watch();
      if (chatShareSelection.proposal) {
        const message = await channel.sendMessage({
          text: "Check out this proposal!",

          data: {
            proposal: chatShareSelection.proposal,
            type: "proposal/share",
          },
        });
        // router.push(`/(app)/(chat)/channel/${channel.id}`);
      }
      if (chatShareSelection.event) {
        const attachmentType =
          chatShareSelection.event?.source === "ticketmaster"
            ? "ticketmaster"
            : chatShareSelection.isEventType
            ? "event"
            : "location";
        const createPostShareAttachment = (
          type: "event" | "location" | "ticketmaster"
        ) => {
          switch (type) {
            case "event":
              const eventData = chatShareSelection.event;
              return {
                type: "event_share",
                event_id: eventData?.id || "",
                event_data: {
                  id: eventData?.id,
                  name: eventData?.name,
                  description: eventData?.description,
                },
              };
            case "location":
              const locationData = chatShareSelection.event;
              return {
                type: "location_share",
                location_id: locationData?.id || "",
                location_data: locationData,
              };
            case "ticketmaster":
              const ticketmasterData = chatShareSelection.event;
              return {
                type: "ticketmaster_share",
                event_id: ticketmasterData?.id || "",
                event_data: ticketmasterData,
              };
            default:
              return null;
          }
        };
        const attachment = createPostShareAttachment(attachmentType);
        await channel.sendMessage({
          text: `Check out ${chatShareSelection.event?.name} on Orbit!`,
          type: "regular",
          // Send attachment (like web app) for cross-platform compatibility
          attachments: attachment ? [attachment] : [],
        });
      }
      // Send the post as a custom message with attachment

      // Navigate to the chat
    } catch (error) {
      console.error("Error sharing post:", error);
      // You could show a toast or alert here
    }
  };
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
        // console.log("[ChatChannel] Loading channel:", id);
        const newChannel = client.channel("messaging", id as string);
        console.log("[ChatChannel] Created channel instance");

        await newChannel.watch();
        console.log("[ChatChannel] Channel watched");

        const messages = await newChannel.query({
          messages: { limit: 30 },
          watch: true,
        });

        // console.log("[ChatChannel] Channel loaded with query:", {
        //   id: newChannel.id,
        //   type: newChannel.type,
        //   memberCount: Object.keys(newChannel.state.members || {}).length,
        //   messageCount: messages.messages?.length || 0,
        //   messages: messages.messages
        //     ?.filter((m) => m)
        //     .map((m) => ({
        //       id: m?.id || "unknown",
        //       text: m?.text || "",
        //       user: m?.user?.id || "unknown",
        //     })),
        // });

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
                if (from === "home" || from === "social" || from === "map") {
                  router.push({
                    pathname: `/(app)/(notification)`,
                    params: { from: from },
                  });
                } else {
                  router.back();
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
                {/* Audio Call Button - HIDDEN during development */}
                {/* 
                <TouchableOpacity
                  onPress={handleAudioCall}
                  style={{ padding: 4 }}
                >
                  <Phone size={20} color={theme.colors.text} strokeWidth={2} />
                </TouchableOpacity>
                */}

                {/* Video Call Button - HIDDEN during development */}
                {/* 
                <TouchableOpacity
                  onPress={handleVideoCall}
                  style={{ padding: 4 }}
                >
                  <Video size={20} color={theme.colors.text} strokeWidth={2} />
                </TouchableOpacity>
                */}

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
      {selectedEvent && (
        <UnifiedDetailsSheet
          data={selectedEvent}
          isOpen={!!selectedEvent}
          onClose={() => {
            setSelectedEvent(null);
            // Don't reset isSelectedItemLocation - it should keep its current state
          }}
          nearbyData={[]}
          onDataSelect={(data) => {
            setSelectedEvent(data);
          }}
          onShare={(data, isEvent) => {
            setSelectedEvent(null);
            setShareData({ data, isEventType: isEvent });
          }}
          onShowControler={() => {}}
        />
      )}
      {shareData && (
        <UnifiedShareSheet
          isOpen={!!shareData}
          onClose={() => setShareData(null)}
          data={shareData?.data}
          isEventType={shareData?.isEventType}
          onProposalShare={(proposal: IProposal) => {
            setShareData(null);
            setChatShareSelection({
              show: true,
              proposal: proposal || null,
              event: null,
              isEventType: false,
            });
          }}
          onEventShare={(event) => {
            setShareData(null);
            setChatShareSelection({
              show: true,
              proposal: null,
              event: event || null,
              isEventType: shareData?.isEventType,
            });
          }}
        />
      )}
      {selectedProposal && (
        <UnifiedProposalSheet
          show={!!selectedProposal}
          onClose={() => setSelectedProposal(null)}
          onProposalShare={(proposal: IProposal) => {
            setSelectedProposal(null);
            setChatShareSelection({
              show: true,
              proposal: proposal || null,
              event: null,
              isEventType: false,
            });
          }}
          proposal={selectedProposal}
        />
      )}
      <ChatSelectionModal
        isOpen={chatShareSelection.show}
        onClose={() => {
          setChatShareSelection({
            show: false,
            proposal: null,
            event: null,
            isEventType: false,
          });
        }}
        onSelectChat={handleChatSelect}
      />
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

  container: {
    width: "70%",
  },
});
