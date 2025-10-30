import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { ClipboardList, Share2, Users } from "lucide-react-native";
import { MotiView } from "moti";
import React, { useEffect, useState } from "react";
import { ScrollView, Share, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "~/src/components/ui/avatar";
import { useAuth } from "~/src/lib/auth";
import { useChat } from "~/src/lib/chat";
import { useTheme } from "../ThemeProvider";
import { UnifiedData } from "./UnifiedDetailsSheet";
import SuccessMessageModal from "../SuccessMessageModal";

interface IProps {
  onClose: () => void;
  data: UnifiedData | undefined;
  isEventType?: boolean;
  onChangeType: (type: "share" | "add-proposal") => void;
  onEventShare: (event: UnifiedData) => void;
}
const ShareContent: React.FC<IProps> = ({
  onClose,
  data,
  isEventType,
  onChangeType,
  onEventShare,
}) => {
  const { theme, isDarkMode } = useTheme();
  const insets = useSafeAreaInsets();
  const [isSharing, setIsSharing] = useState(false);
  const [recentChats, setRecentChats] = useState<any[]>([]);
  const [loadingChats, setLoadingChats] = useState(true);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const { client } = useChat();
  const { session } = useAuth();

  // Fetch recent chats from Stream
  useEffect(() => {
    const fetchRecentChats = async () => {
      if (!client || !session?.user?.id) {
        setLoadingChats(false);
        return;
      }

      try {
        setLoadingChats(true);

        // Get recent channels (last 3)
        const channels = await client.queryChannels(
          {
            type: "messaging",
            members: { $in: [session.user.id] },
          },
          {
            last_message_at: -1,
          },
          {
            limit: 3,
          }
        );

        // Extract user info from channels
        const recentUsers = channels
          .map((channel) => {
            // Access members as object values (not membersArray)
            const members = Object.values(channel.state.members || {});
            const otherMembers = members
              .filter((member: any) => member.user?.id !== session.user?.id)
              .map((member: any) => ({
                id: member.user?.id,
                name: member.user?.name || member.user?.username || "Unknown",
                avatar: member.user?.image || null,
                lastMessage: channel.state.messages?.[0]?.text || "",
                isOnline: member.user?.online || false,
                channelId: channel.id,
              }));
            return otherMembers[0]; // Get the other user from each channel
          })
          .filter(Boolean);

        setRecentChats(recentUsers);
      } catch (error) {
        console.error("Error fetching recent chats:", error);
        setRecentChats([]);
      } finally {
        setLoadingChats(false);
      }
    };

    fetchRecentChats();
  }, [client, session?.user?.id]);

  const handleShareToChat = async (chatUser: any) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const attachmentType =
      data?.source === "ticketmaster"
        ? "ticketmaster"
        : isEventType
        ? "event"
        : "location";
    const createPostShareAttachment = (
      type: "event" | "location" | "ticketmaster"
    ) => {
      switch (type) {
        case "event":
          const eventData = data;
          return {
            type: "event_share",
            event_id: eventData?.id || "",
            event_data: eventData,
          };
        case "location":
          const locationData = data;
          return {
            type: "location_share",
            location_id: locationData?.id || "",
            location_data: locationData,
          };
        case "ticketmaster":
          const ticketmasterData = data;
          return {
            type: "ticketmaster_share",
            event_id: ticketmasterData?.id || "",
            event_data: {
              id: ticketmasterData?.id,
              name: ticketmasterData?.name,
              description: ticketmasterData?.description,
              image_urls: ticketmasterData?.image_urls,
              start_datetime: ticketmasterData?.start_datetime,
              venue_name: ticketmasterData?.venue_name,
              address: ticketmasterData?.address,
              city: ticketmasterData?.city,
              state: ticketmasterData?.state,
              source: "ticketmaster",
            },
          };
        default:
          return null;
      }
    };
    // Send the share message with attachment (for web compatibility)
    const attachment = createPostShareAttachment(attachmentType);
    try {
      if (!client || !session?.user?.id) return;

      // Check if we already have a channel with this user

      if (chatUser.channelId) {
        // Use existing channel
        const channel = client.channel("messaging", chatUser.channelId);

        // Ensure both users are members (handles reused DM after leaving)
        try {
          await channel.watch();
          const members = Object.values(channel.state.members || {});
          const memberIds = members.map((m: any) => m.user?.id).filter(Boolean);
          const needed = [session.user.id, chatUser.id].filter(
            (id) => id && !memberIds.includes(id)
          ) as string[];
          if (needed.length > 0) {
            await channel.addMembers(needed);
          }
        } catch (e) {
          // non-fatal
        }

        await channel.sendMessage({
          text: `Check out ${data?.name} on Orbit!`,
          type: "regular",
          // Send attachment (like web app) for cross-platform compatibility
          attachments: attachment ? [attachment] : [],
        });
      } else {
        // Create new channel with this user (following your existing pattern)
        const timestamp = Date.now();
        const randomStr = Math.random().toString(36).substring(7);
        const uniqueChannelId = `${timestamp}-${randomStr}`;

        const channel = client.channel("messaging", uniqueChannelId, {
          members: [session.user.id, chatUser.id],
        });

        await channel.watch();
        // Send the share message with attachment (for web compatibility)
        await channel.sendMessage({
          text: `Check out ${data?.name} on Orbit!`,
          type: "regular",
          // Send attachment (like web app) for cross-platform compatibility
          attachments: attachment ? [attachment] : [],
        });
      }
      setShowSuccessModal(true);
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (error) {
      console.error("Error sharing to chat:", error);
    }
  };

  const handleCreateProposal = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onChangeType("add-proposal");
  };

  const handleNativeShare = async () => {
    const currentData = data;
    setIsSharing(true);

    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await Share.share({
        message: `Check out ${currentData?.name} on Orbit!
                ${currentData?.description}
      
                https://orbit-redirects.vercel.app/?action=share&eventId=${
                  currentData?.id || ""
                }
                `,
        title: isEventType ? "Activity on Orbit" : "Location on Orbit",
      }).then((result) => {
        if (result.action === "sharedAction") {
          onClose();
        }
      });
    } catch (error) {
      // Silent error handling for better UX
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      {/* Header */}
      <MotiView
        from={{ opacity: 0, translateY: -20 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: "timing", duration: 300 }}
        style={styles.header}
      >
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
          Share {isEventType ? "Activity" : "Location"}
        </Text>
      </MotiView>

      {/* Recent Chats Section */}
      <MotiView
        from={{ opacity: 0, translateY: 20 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: "timing", duration: 300, delay: 100 }}
        style={styles.recentContactsContainer}
      >
        {loadingChats ? (
          <View style={styles.loadingContainer}>
            <Text style={[styles.loadingText, { color: theme.colors.text }]}>
              Loading recent chats...
            </Text>
          </View>
        ) : recentChats.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.recentContactsScroll}
          >
            {recentChats.map((chatUser, index) => (
              <MotiView
                key={chatUser.id}
                from={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{
                  type: "timing",
                  duration: 200,
                  delay: 150 + index * 50,
                }}
              >
                <TouchableOpacity
                  style={styles.contactItem}
                  activeOpacity={0.7}
                  onPress={() => handleShareToChat(chatUser)}
                >
                  <View
                    style={[
                      styles.contactAvatar,
                      {
                        borderColor: chatUser.isOnline
                          ? "#10B981"
                          : theme.colors.border,
                      },
                    ]}
                  >
                    <Avatar
                      alt={chatUser.name || "Avatar"}
                      style={styles.avatarComponent}
                    >
                      {chatUser.avatar ? (
                        <AvatarImage source={{ uri: chatUser.avatar }} />
                      ) : null}
                      <AvatarFallback
                        style={[
                          styles.avatarFallback,
                          { backgroundColor: theme.colors.card },
                        ]}
                      >
                        <Text style={styles.avatarInitial}>
                          {chatUser.name.charAt(0).toUpperCase()}
                        </Text>
                      </AvatarFallback>
                    </Avatar>
                    {chatUser.isOnline && (
                      <View style={styles.onlineIndicator} />
                    )}
                  </View>
                  <Text
                    style={[styles.contactName, { color: theme.colors.text }]}
                  >
                    {chatUser.name}
                  </Text>
                </TouchableOpacity>
              </MotiView>
            ))}
            <MotiView
              from={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{
                type: "timing",
                duration: 200,
                delay: 150 + 3 * 50,
              }}
            >
              <TouchableOpacity
                style={styles.contactItem}
                activeOpacity={0.7}
                onPress={() => onEventShare(data!)}
              >
                <View
                  style={[
                    styles.contactAvatar,
                    {
                      borderColor: theme.colors.border,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.avatarComponent,
                      { alignItems: "center", justifyContent: "center" },
                    ]}
                  >
                    <Users size={24} color={theme.colors.text} />
                  </View>
                </View>
                <Text
                  style={[styles.contactName, { color: theme.colors.text }]}
                >
                  More
                </Text>
              </TouchableOpacity>
            </MotiView>
          </ScrollView>
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: theme.colors.text }]}>
              No recent chats
            </Text>
          </View>
        )}
      </MotiView>

      {/* Divider */}
      <MotiView
        from={{ opacity: 0, scaleX: 0 }}
        animate={{ opacity: 1, scaleX: 1 }}
        transition={{ type: "timing", duration: 300, delay: 400 }}
        style={[styles.divider, { backgroundColor: theme.colors.border }]}
      />

      {/* Action Buttons */}
      <MotiView
        from={{ opacity: 0, translateY: 20 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: "timing", duration: 300, delay: 500 }}
        style={styles.actionsContainer}
      >
        {/* Create Proposal Button */}
        <MotiView
          from={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "timing", duration: 300, delay: 600 }}
        >
          <TouchableOpacity
            style={[
              styles.actionButton,
              {
                backgroundColor: theme.colors.card,
                borderColor: theme.colors.border,
              },
            ]}
            activeOpacity={0.7}
            onPress={handleCreateProposal}
          >
            <LinearGradient
              colors={["#8B5CF6", "#A855F7"]}
              style={styles.actionButtonIcon}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <ClipboardList size={20} color="white" />
            </LinearGradient>
            <View style={styles.actionButtonContent}>
              <Text
                style={[styles.actionButtonTitle, { color: theme.colors.text }]}
              >
                Create Proposal
              </Text>
              <Text
                style={[
                  styles.actionButtonSubtitle,
                  { color: theme.colors.text + "70" },
                ]}
              >
                Plan together
              </Text>
            </View>
            <Share2 size={20} color={theme.colors.text + "40"} />
          </TouchableOpacity>
        </MotiView>

        {/* Native Share Button */}
        <MotiView
          from={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "timing", duration: 300, delay: 700 }}
        >
          <TouchableOpacity
            style={[
              styles.actionButton,
              {
                backgroundColor: theme.colors.card,
                borderColor: theme.colors.border,
              },
            ]}
            activeOpacity={0.7}
            onPress={handleNativeShare}
            disabled={isSharing}
          >
            <View
              style={[
                styles.actionButtonIcon,
                { backgroundColor: theme.colors.primary },
              ]}
            >
              <Share2 size={20} color="white" />
            </View>
            <View style={styles.actionButtonContent}>
              <Text
                style={[styles.actionButtonTitle, { color: theme.colors.text }]}
              >
                {isSharing ? "Sharing..." : "Share"}
              </Text>
              <Text
                style={[
                  styles.actionButtonSubtitle,
                  { color: theme.colors.text + "70" },
                ]}
              >
                External apps
              </Text>
            </View>
            {isSharing ? (
              <View style={styles.loadingSpinner}>
                <Text
                  style={[styles.loadingDots, { color: theme.colors.text }]}
                >
                  ⋯
                </Text>
              </View>
            ) : (
              <Share2 size={20} color={theme.colors.text + "40"} />
            )}
          </TouchableOpacity>
        </MotiView>
      </MotiView>
      {showSuccessModal && (
        <SuccessMessageModal message="Message sent successfully!" />
      )}
      {/* Bottom Padding */}
      <View style={{ height: insets.bottom + 20 }} />
    </View>
  );
};
const styles = {
  container: {
    flex: 1,
    paddingTop: 20,
  },

  // Header
  header: {
    alignItems: "center" as const,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600" as const,
    textAlign: "center" as const,
  },

  // Recent Contacts Section
  recentContactsContainer: {
    paddingBottom: 20,
  },
  recentContactsScroll: {
    paddingHorizontal: 20,
    gap: 16,
  },
  contactItem: {
    alignItems: "center" as const,
    gap: 8,
    minWidth: 70,
  },
  contactAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    justifyContent: "center" as const,
    alignItems: "center" as const,
    position: "relative" as const,
  },
  avatarComponent: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  avatarFallback: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: "center" as const,
    alignItems: "center" as const,
  },
  avatarInitial: {
    fontSize: 20,
    fontWeight: "600" as const,
    color: "white",
  },
  onlineIndicator: {
    position: "absolute" as const,
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#10B981",
    borderWidth: 2,
    borderColor: "white",
  },
  contactName: {
    fontSize: 12,
    fontWeight: "500" as const,
    textAlign: "center" as const,
    maxWidth: 60,
  },
  loadingContainer: {
    alignItems: "center" as const,
    paddingVertical: 20,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: "500" as const,
  },
  emptyContainer: {
    alignItems: "center" as const,
    paddingVertical: 20,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: "500" as const,
    opacity: 0.7,
  },

  // Divider
  divider: {
    height: 1,
    marginHorizontal: 20,
    marginBottom: 20,
  },

  // Action Buttons
  actionsContainer: {
    paddingHorizontal: 20,
    gap: 12,
  },
  actionButton: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  },
  actionButtonIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center" as const,
    alignItems: "center" as const,
  },
  actionButtonContent: {
    flex: 1,
  },
  actionButtonTitle: {
    fontSize: 16,
    fontWeight: "600" as const,
    marginBottom: 2,
  },
  actionButtonSubtitle: {
    fontSize: 12,
    fontWeight: "500" as const,
  },
  loadingSpinner: {
    width: 20,
    height: 20,
    justifyContent: "center" as const,
    alignItems: "center" as const,
  },
  loadingDots: {
    fontSize: 16,
    fontWeight: "600" as const,
  },
};

export default ShareContent;
