import { useFocusEffect } from "@react-navigation/native";
import { router } from "expo-router";
import {
  ArrowLeft,
  MessageCircle,
  Settings,
  Send,
  UserMinus,
  UserPlus,
  Flag,
  Ban,
} from "lucide-react-native";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  Share,
  StatusBar,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";
import { useFollow } from "~/hooks/useFollow";
import { useTheme } from "~/src/components/ThemeProvider";
import { RichText } from "~/src/components/ui/rich-text";
import { Text } from "~/src/components/ui/text";
import { UserAvatar } from "~/src/components/ui/user-avatar";
import { SocialMediaLinks } from "~/src/components/profile/SocialMediaLinks";
import { useAuth } from "~/src/lib/auth";
import { useChat } from "~/src/lib/chat";
import { supabase } from "~/src/lib/supabase";
import { useUser } from "~/src/lib/UserProvider";

// Import tab components
import UnifiedEventsTab from "./UnifiedEventsTab";
import UnifiedInfoTab from "./UnifiedInfoTab";
import UnifiedPostsTab from "./UnifiedPostsTab";
import FollowerSheet from "./FollowerSheet";
import FollowingSheet from "./FollowingSheet";
import { useBlocking } from "~/hooks/useBlocking";
import { set } from "lodash";
import { FlagContentModal } from "~/src/components/modals/FlagContentModal";
import { useFlagging, FlagReason } from "~/hooks/useFlagging";

type Tab = "Posts" | "Events" | "Info";

interface UserProfile {
  id: string;
  username: string | null;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  followers_count: number;
  following_count: number;
  posts_count: number;
  events_count: number;
  instagram?: string | null;
  twitter?: string | null;
  facebook?: string | null;
  linkedin?: string | null;
  tiktok?: string | null;
  customLink?: string | null;
}

interface UnifiedProfilePageProps {
  userId?: string;
  showBackButton?: boolean;
  onBack?: () => void;
  from?: string;
}

export function UnifiedProfilePage({
  userId,
  showBackButton = false,
  onBack,
  from,
}: UnifiedProfilePageProps) {
  const { session } = useAuth();
  const { user: currentUser } = useUser();
  const { theme, isDarkMode } = useTheme();
  const { followUser, unfollowUser, getFollowCounts } = useFollow();
  const { client } = useChat();
  const { getBlockStatus, blockUser, unblockUser } = useBlocking();
  const { createFlag } = useFlagging();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("Posts");
  const [isLoading, setIsLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isFollowBack, setIsFollowBack] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isFollowerSheetOpen, setIsFollowerSheetOpen] = useState(false);
  const [isFollowingSheetOpen, setIsFollowingSheetOpen] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const isCurrentUser = !userId || userId === session?.user?.id;
  const targetUserId = userId || session?.user?.id;

  useFocusEffect(
    useCallback(() => {
      if (targetUserId) {
        loadProfile();
      }
      return () => {
        console.log("Screen is unfocused");
      };
    }, [targetUserId])
  );

  const loadProfile = async () => {
    if (!targetUserId) return;

    setIsLoading(true);
    try {
      // Get user data
      let userData;
      if (isCurrentUser && currentUser) {
        userData = {
          ...currentUser,
          id: currentUser.id,
          username: currentUser.username,
          first_name: currentUser.first_name,
          last_name: currentUser.last_name,
          avatar_url: currentUser.avatar_url,
          bio: currentUser.bio,
        };
      } else {
        const { data: fetchedUserData, error: userError } = await supabase
          .from("users")
          .select(
            `
            id,
            username,
            first_name,
            last_name,
            avatar_url,
            bio
          `
          )
          .eq("id", targetUserId)
          .single();

        if (userError) throw userError;
        userData = fetchedUserData;
      }

      // Get all counts for any user (current or other)
      const [
        { count: followersCount },
        { count: followingCount },
        { count: postsCount },
        { count: eventsCount },
      ] = await Promise.all([
        supabase
          .from("follows")
          .select("*", { count: "exact" })
          .eq("following_id", userData.id),
        supabase
          .from("follows")
          .select("*", { count: "exact" })
          .eq("follower_id", userData.id),
        supabase
          .from("posts")
          .select("*", { count: "exact" })
          .eq("user_id", userData.id),
        supabase
          .from("events")
          .select("*", { count: "exact" })
          .eq("created_by", userData.id),
      ]);
      setProfile({
        ...userData,
        followers_count: followersCount || 0,
        following_count: followingCount || 0,
        posts_count: postsCount || 0,
        events_count: eventsCount || 0,
      });

      // Check follow status only for non-current users
      if (
        !isCurrentUser &&
        session?.user?.id &&
        userData.id !== session.user.id
      ) {
        await checkFollowStatus(userData.id);
        await checkBlockStatus(userData.id);
      }
    } catch (error) {
      console.error("Error loading profile:", error);
      Toast.show({
        type: "error",
        text1: "Error loading profile",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const checkFollowStatus = async (profileUserId: string) => {
    if (!session?.user?.id) return;

    try {
      const { data: followData } = await supabase
        .from("follows")
        .select("id")
        .eq("follower_id", session.user.id)
        .eq("following_id", profileUserId)
        .single();

      setIsFollowing(!!followData);

      const { data: followBackData } = await supabase
        .from("follows")
        .select("id")
        .eq("follower_id", profileUserId)
        .eq("following_id", session.user.id)
        .single();

      setIsFollowBack(!!followBackData);
    } catch (error) {
      setIsFollowing(false);
      setIsFollowBack(false);
    }
  };

  const handleFollowToggle = async () => {
    if (!session?.user?.id || !profile || isBlocked) return;

    try {
      if (isFollowing) {
        await unfollowUser(profile.id);
        setIsFollowing(false);
        setProfile((prev) =>
          prev
            ? {
                ...prev,
                followers_count: Math.max(0, prev.followers_count - 1),
              }
            : null
        );
      } else {
        await followUser(profile.id);
        setIsFollowing(true);
        setProfile((prev) =>
          prev ? { ...prev, followers_count: prev.followers_count + 1 } : null
        );
      }
    } catch (error) {
      console.error("Error toggling follow:", error);
      Toast.show({
        type: "error",
        text1: "Error updating follow status",
      });
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadProfile();
    setRefreshing(false);
  };

  const handleShareProfile = async () => {
    if (!profile) return;

    try {
      const profileUrl = `https://yourapp.com/profile/${profile.id}`;
      const displayName = getDisplayName();
      const username = profile.username || "anonymous";

      const shareContent = {
        title: `Check out ${displayName}'s profile`,
        message: `Hey! Check out ${displayName} (@${username}) on our app: ${profileUrl}`,
        url: profileUrl,
      };

      const result = await Share.share(shareContent);

      if (result.action === Share.sharedAction) {
        Toast.show({
          type: "success",
          text1: "Profile shared successfully!",
        });
      }
    } catch (error) {
      console.error("Error sharing profile:", error);
      Alert.alert("Error", "Failed to share profile. Please try again.");
    }
  };

  const getDisplayName = () => {
    if (!profile) return "";
    if (profile.first_name || profile.last_name) {
      return `${profile.first_name || ""} ${profile.last_name || ""}`.trim();
    }
    return profile.username || "Anonymous";
  };

  const handleDirectMessage = async () => {
    if (
      !client ||
      !session?.user?.id ||
      !profile ||
      isCurrentUser ||
      isBlocked
    ) {
      console.log("Cannot start DM: Missing requirements", {
        hasClient: !!client,
        hasCurrentUserId: !!session?.user?.id,
        hasProfile: !!profile,
        isCurrentUser,
        isBlocked,
      });
      return;
    }

    try {
      const currentUserId = session.user.id;
      const otherUserId = profile.id;

      console.log("Starting DM check between users:", {
        currentUserId,
        otherUserId,
      });

      // Check if a DM channel already exists between these two users
      const existingChannels = await client.queryChannels({
        type: "messaging",
        members: { $eq: [currentUserId, otherUserId] }, // Exactly these two members
      });

      console.log("Found existing channels:", existingChannels.length);

      if (existingChannels.length > 0) {
        // DM already exists, navigate to it
        const existingChannel = existingChannels[0];
        console.log("Opening existing DM:", existingChannel.id);

        router.push({
          pathname: "/(app)/(chat)/channel/[id]",
          params: {
            id: existingChannel.id,
            name: getDisplayName(),
          },
        });
      } else {
        // No DM exists, create a new one
        console.log("Creating new DM channel");

        // Generate a unique channel ID
        const timestamp = Date.now();
        const randomStr = Math.random().toString(36).substring(7);
        const uniqueChannelId = `dm-${timestamp}-${randomStr}`;

        // Create the DM channel
        const channel = client.channel("messaging", uniqueChannelId, {
          members: [currentUserId, otherUserId],
          name: getDisplayName(), // Use the other user's display name
          // created_by: currentUserId,
        });

        // Watch the channel (this creates it)
        await channel.watch();
        console.log("New DM channel created:", channel.id);

        // Create channel record in Supabase
        const { error: channelError } = await supabase
          .from("chat_channels")
          .insert({
            stream_channel_id: channel.id,
            channel_type: "messaging",
            created_by: currentUserId,
            name: getDisplayName(),
          });

        if (channelError) {
          console.error("Error saving channel to Supabase:", channelError);
          // Continue anyway since the Stream channel was created successfully
        }

        // Navigate to the new channel
        router.push({
          pathname: "/(app)/(chat)/channel/[id]",
          params: {
            id: channel.id,
            name: getDisplayName(),
          },
        });
      }

      Toast.show({
        type: "success",
        text1: "Opening conversation...",
      });
    } catch (error) {
      console.error("Error handling direct message:", error);
      Toast.show({
        type: "error",
        text1: "Failed to open conversation",
        text2: "Please try again later",
      });
    }
  };
  const handleCloseFollowerSheet = () => {
    setIsFollowerSheetOpen(false);
  };
  const handleCloseFollowingSheet = () => {
    setIsFollowingSheetOpen(false);
  };

  const checkBlockStatus = async (profileUserId: string) => {
    if (!session?.user?.id) return;
    try {
      const status = await getBlockStatus(profileUserId);
      console.log(status);
      setIsBlocked(status);
    } catch (e) {
      setIsBlocked(false);
    }
  };

  const handleBlockToggle = async () => {
    console.log(targetUserId, session?.user.id);
    try {
      if (!isBlocked) {
        const res = await blockUser(targetUserId!);
        console.log(res);
        setIsBlocked(res);
      } else {
        const res = await unblockUser(targetUserId!);
        setIsBlocked(!res);
      }
    } catch (error) {
      console.error("Error toggling block:", error);
      Toast.show({ type: "error", text1: "Error updating block status" });
    }
  };

  const handleReportUser = async ({
    reason,
    explanation,
  }: {
    reason: FlagReason;
    explanation: string;
  }) => {
    if (!profile || !targetUserId) return;

    try {
      const res = await createFlag({
        user_id: targetUserId,
        reason,
        explanation: explanation || undefined,
      });

      if (res) {
        Toast.show({
          type: "success",
          text1: "Report submitted",
          text2: "Thank you for helping keep our community safe.",
          position: "top",
          visibilityTime: 3000,
          autoHide: true,
          topOffset: 50,
        });
        setIsReportModalOpen(false);
      }
    } catch (error) {
      console.error("Error reporting user:", error);
      Toast.show({
        type: "error",
        text1: "Failed to submit report",
        text2: "Please try again later.",
        position: "top",
        visibilityTime: 3000,
        autoHide: true,
        topOffset: 50,
      });
    }
  };

  if (isLoading || !profile) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.card }}>
        <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} />
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={{ marginTop: 16, color: theme.colors.text }}>
            Loading profile...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Removed scroll animations since we're using fixed layout

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.card }}>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} />

      {/* Fixed Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 16,
          paddingVertical: 12,
          backgroundColor: theme.colors.card,
          borderBottomWidth: 1,
          borderBottomColor: theme.colors.border,
          minHeight: 60,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <TouchableOpacity
            onPress={
              onBack ||
              (() => {
                if (from === "social") {
                  router.push("/(app)/(social)");
                } else if (from === "home") {
                  router.push("/(app)/(home)");
                } else {
                  router.back();
                }
              })
            }
            style={{
              marginRight: 12,
              padding: 8,
              borderRadius: 20,
              backgroundColor: theme.colors.background,
              borderWidth: 1,
              borderColor: theme.colors.border,
            }}
          >
            <ArrowLeft size={20} color={theme.colors.text} />
          </TouchableOpacity>

          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              flex: 1,
              maxWidth: "70%", // Prevent overflow
            }}
          >
            <UserAvatar
              size={32}
              user={{
                id: profile.id,
                name: getDisplayName(),
                image: profile.avatar_url,
              }}
            />
            <View style={{ marginLeft: 12, flex: 1, minWidth: 0 }}>
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "700",
                  color: theme.colors.text,
                }}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {getDisplayName()}
              </Text>
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: "500",
                  color: theme.colors.text + "80",
                }}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                @{profile.username || "anonymous"}
              </Text>
            </View>
          </View>
        </View>

        <View style={{ flexDirection: "row", gap: 8, minWidth: 40 }}>
          {isCurrentUser && (
            <TouchableOpacity
              onPress={() => router.push("/(app)/(profile)/settings")}
              style={{
                padding: 8,
                borderRadius: 20,
                backgroundColor: theme.colors.background,
                borderWidth: 1,
                borderColor: theme.colors.border,
              }}
            >
              <Settings size={20} color={theme.colors.text} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Scrollable Content */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[theme.colors.primary]}
            tintColor={theme.colors.primary}
          />
        }
      >
        {/* Profile Section */}
        <View
          style={{
            padding: 20,
            backgroundColor: theme.colors.card,
          }}
        >
          {/* Profile Picture */}

          <View style={{ alignItems: "center", marginBottom: 16 }}>
            <UserAvatar
              size={100}
              user={{
                id: profile.id,
                name: getDisplayName(),
                image: profile.avatar_url,
              }}
            />
          </View>

          {/* Name and Username */}
          <View style={{ alignItems: "center", marginBottom: 16 }}>
            <Text
              style={{
                fontSize: 24,
                lineHeight: 26,
                fontWeight: "800",
                color: theme.colors.text,
                marginBottom: 4,
                textAlign: "center",
              }}
            >
              {getDisplayName()}
            </Text>
            <Text
              style={{
                fontSize: 16,
                fontWeight: "500",
                color: theme.colors.text + "80",
                marginBottom: 8,
              }}
            >
              @{profile.username || "anonymous"}
            </Text>

            {/* Follows you badge */}
            {isFollowBack && !isCurrentUser && (
              <View
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 4,
                  backgroundColor: theme.colors.primary + "20",
                  borderRadius: 12,
                }}
              >
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: "600",
                    color: theme.colors.primary,
                  }}
                >
                  Follows you
                </Text>
              </View>
            )}
          </View>

          {/* Bio */}
          {profile.bio && (
            <View
              style={{
                marginBottom: 20,
                paddingHorizontal: 16,
                paddingVertical: 12,
                backgroundColor: theme.colors.card,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: theme.colors.border,
              }}
            >
              <RichText
                style={{
                  fontSize: 16,
                  color: theme.colors.text,
                  textAlign: "center",
                  lineHeight: 22,
                }}
              >
                {profile.bio}
              </RichText>
            </View>
          )}

          {/* Social Media Links */}
          <View style={{ alignItems: "center", marginBottom: 20 }}>
            <SocialMediaLinks
              instagram={profile.instagram}
              twitter={profile.twitter}
              facebook={profile.facebook}
              linkedin={profile.linkedin}
              tiktok={profile.tiktok}
              customLink={profile.customLink}
            />
          </View>

          {/* Stats Row */}
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-around",
              marginBottom: 20,
              paddingVertical: 16,
              backgroundColor: theme.colors.card,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: theme.colors.border,
            }}
          >
            <TouchableOpacity
              style={{ alignItems: "center" }}
              onPress={() => setActiveTab("Posts")}
            >
              <Text
                style={{
                  fontSize: 20,
                  fontWeight: "800",
                  color: theme.colors.text,
                  marginBottom: 4,
                }}
              >
                {profile.posts_count.toLocaleString()}
              </Text>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "600",
                  color: theme.colors.text + "80",
                }}
              >
                Posts
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{ alignItems: "center" }}
              onPress={() => {
                if (profile.followers_count > 0) {
                  setIsFollowerSheetOpen(true);
                }
              }}
            >
              <Text
                style={{
                  fontSize: 20,
                  fontWeight: "800",
                  color: theme.colors.text,
                  marginBottom: 4,
                }}
              >
                {profile.followers_count.toLocaleString()}
              </Text>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "600",
                  color: theme.colors.text + "80",
                }}
              >
                Followers
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{ alignItems: "center" }}
              onPress={() => {
                if (profile.following_count > 0) {
                  setIsFollowingSheetOpen(true);
                }
              }}
            >
              <Text
                style={{
                  fontSize: 20,
                  fontWeight: "800",
                  color: theme.colors.text,
                  marginBottom: 4,
                }}
              >
                {profile.following_count.toLocaleString()}
              </Text>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "600",
                  color: theme.colors.text + "80",
                }}
              >
                Following
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{ alignItems: "center" }}
              onPress={() => setActiveTab("Events")}
            >
              <Text
                style={{
                  fontSize: 20,
                  fontWeight: "800",
                  color: theme.colors.text,
                  marginBottom: 4,
                }}
              >
                {profile.events_count.toLocaleString()}
              </Text>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "600",
                  color: theme.colors.text + "80",
                }}
              >
                Events
              </Text>
            </TouchableOpacity>
          </View>

          {/* Action Buttons - Only for non-current users */}
          {!isCurrentUser && (
            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                gap: 12,
                marginBottom: 20,
              }}
            >
              {isBlocked ? (
                <View style={{ flexGrow: 1, flexBasis: "100%", gap: 14 }}>
                  <View
                    style={{
                      paddingHorizontal: 16,
                      paddingVertical: 12,
                      borderRadius: 16,
                      backgroundColor: isDarkMode
                        ? "rgba(255,255,255,0.06)"
                        : "rgba(0,0,0,0.04)",
                      borderWidth: 1,
                      borderColor: theme.colors.border,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: "700",
                        color: theme.colors.text,
                        marginBottom: 4,
                      }}
                    >
                      You have blocked this user.
                    </Text>
                    <Text
                      style={{
                        fontSize: 14,
                        lineHeight: 20,
                        color: theme.colors.text + "80",
                      }}
                    >
                      You can see their profile but cannot interact with them.
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={handleBlockToggle}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "center",
                      paddingVertical: 14,
                      borderRadius: 24,
                      backgroundColor: theme.colors.primary + "60",
                      borderWidth: 1,
                      borderColor: theme.colors.border,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 16,
                        fontWeight: "700",
                        color: theme.colors.text,
                      }}
                    >
                      Unblock User
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View
                  style={{
                    flexGrow: 1,
                    flexBasis: "100%",
                    gap: 10,
                  }}
                >
                  {/* Primary Row - Follow + Actions */}
                  <View
                    style={{
                      flexDirection: "row",
                      gap: 10,
                    }}
                  >
                    <TouchableOpacity
                      onPress={handleFollowToggle}
                      disabled={isBlocked}
                      style={{
                        flex: 1,
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "center",
                        paddingVertical: 14,
                        borderRadius: 24,
                        backgroundColor: isFollowing
                          ? theme.colors.card
                          : theme.colors.primary,
                        borderWidth: 1,
                        borderColor: isFollowing
                          ? theme.colors.border
                          : theme.colors.primary,
                        opacity: isBlocked ? 0.5 : 1,
                      }}
                    >
                      {isFollowing ? (
                        <UserMinus
                          size={18}
                          color={theme.colors.text}
                          strokeWidth={2.5}
                        />
                      ) : (
                        <UserPlus size={18} color="white" strokeWidth={2.5} />
                      )}
                      <Text
                        style={{
                          marginLeft: 8,
                          fontSize: 16,
                          fontWeight: "700",
                          color: isFollowing ? theme.colors.text : "white",
                        }}
                      >
                        {isFollowing ? "Following" : "Follow"}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={handleDirectMessage}
                      disabled={isBlocked}
                      style={{
                        paddingHorizontal: 20,
                        paddingVertical: 14,
                        borderRadius: 24,
                        backgroundColor: theme.colors.card,
                        borderWidth: 1,
                        borderColor: theme.colors.border,
                        opacity: isBlocked ? 0.5 : 1,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <MessageCircle
                        size={18}
                        color={theme.colors.text}
                        strokeWidth={2.5}
                      />
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={handleShareProfile}
                      disabled={isBlocked}
                      style={{
                        paddingHorizontal: 20,
                        paddingVertical: 14,
                        borderRadius: 24,
                        backgroundColor: theme.colors.card,
                        borderWidth: 1,
                        borderColor: theme.colors.border,
                        opacity: isBlocked ? 0.5 : 1,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Send
                        size={18}
                        color={theme.colors.text}
                        strokeWidth={2.5}
                      />
                    </TouchableOpacity>
                  </View>

                  {/* Secondary Row - Block + Report */}
                  <View
                    style={{
                      flexDirection: "row",
                      gap: 10,
                    }}
                  >
                    <TouchableOpacity
                      onPress={handleBlockToggle}
                      style={{
                        flex: 1,
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "center",
                        paddingVertical: 14,
                        borderRadius: 24,
                        backgroundColor: "#ff2d55",
                        borderWidth: 1,
                        borderColor: "#ff2d55",
                      }}
                    >
                      <Ban size={18} color="white" strokeWidth={2.5} />
                      <Text
                        style={{
                          marginLeft: 8,
                          fontSize: 16,
                          fontWeight: "700",
                          color: "white",
                        }}
                      >
                        Block
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => setIsReportModalOpen(true)}
                      disabled={isBlocked}
                      style={{
                        flex: 1,
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "center",
                        paddingVertical: 14,
                        borderRadius: 24,
                        backgroundColor: theme.colors.card,
                        borderWidth: 1,
                        borderColor: theme.colors.border,
                        opacity: isBlocked ? 0.5 : 1,
                      }}
                    >
                      <Flag
                        size={18}
                        color={theme.colors.text}
                        strokeWidth={2.5}
                      />
                      <Text
                        style={{
                          marginLeft: 8,
                          fontSize: 16,
                          fontWeight: "700",
                          color: theme.colors.text,
                        }}
                      >
                        Report User
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          )}
        </View>

        {/* Tabs */}
        <View
          style={{
            backgroundColor: theme.colors.card,
            borderTopWidth: 1,
            borderTopColor: theme.colors.border,
            paddingTop: 0,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              backgroundColor: theme.colors.background,
              borderRadius: 16,
              margin: 16,
              padding: 4,
              borderWidth: 1,
              borderColor: theme.colors.border,
            }}
          >
            {(["Posts", "Events", "Info"] as Tab[]).map((tab) => (
              <Pressable
                key={tab}
                onPress={() => setActiveTab(tab)}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  alignItems: "center",
                  borderRadius: 12,
                  backgroundColor:
                    activeTab === tab ? theme.colors.primary : "transparent",
                }}
              >
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: "700",
                    color:
                      activeTab === tab ? "white" : theme.colors.text + "80",
                  }}
                >
                  {tab}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Tab Content */}
        <View
          style={{
            flex: 1,
            backgroundColor: theme.colors.card,
            minHeight: 400,
          }}
        >
          {activeTab === "Posts" && (
            <UnifiedPostsTab
              userId={targetUserId || ""}
              isCurrentUser={isCurrentUser}
            />
          )}
          {activeTab === "Events" && (
            <UnifiedEventsTab
              userId={targetUserId || ""}
              isCurrentUser={isCurrentUser}
            />
          )}
          {activeTab === "Info" && (
            <UnifiedInfoTab
              userId={targetUserId || ""}
              isCurrentUser={isCurrentUser}
            />
          )}
        </View>
      </ScrollView>
      <FollowerSheet
        isOpen={isFollowerSheetOpen}
        onClose={handleCloseFollowerSheet}
        userId={profile.id}
      />
      <FollowingSheet
        isOpen={isFollowingSheetOpen}
        onClose={handleCloseFollowingSheet}
        userId={profile.id}
      />
      <FlagContentModal
        visible={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        onSubmit={handleReportUser}
        contentTitle={`Report ${getDisplayName()}`}
        variant="sheet"
      />
    </SafeAreaView>
  );
}
