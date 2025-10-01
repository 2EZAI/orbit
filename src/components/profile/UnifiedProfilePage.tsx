import { useFocusEffect } from "@react-navigation/native";
import { router } from "expo-router";
import {
  ArrowLeft,
  MessageCircle,
  Settings,
  Share2,
  UserMinus,
  UserPlus,
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
import { useAuth } from "~/src/lib/auth";
import { useChat } from "~/src/lib/chat";
import { supabase } from "~/src/lib/supabase";
import { useUser } from "~/src/lib/UserProvider";

// Import tab components
import UnifiedEventsTab from "./UnifiedEventsTab";
import UnifiedInfoTab from "./UnifiedInfoTab";
import UnifiedPostsTab from "./UnifiedPostsTab";

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
}

interface UnifiedProfilePageProps {
  userId?: string;
  showBackButton?: boolean;
  onBack?: () => void;
}

export function UnifiedProfilePage({
  userId,
  showBackButton = false,
  onBack,
}: UnifiedProfilePageProps) {
  const { session } = useAuth();
  const { user: currentUser } = useUser();
  const { theme, isDarkMode } = useTheme();
  const { followUser, unfollowUser, getFollowCounts } = useFollow();
  const { client } = useChat();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("Posts");
  const [isLoading, setIsLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isFollowBack, setIsFollowBack] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

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
    if (!session?.user?.id || !profile) return;

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
    if (!client || !session?.user?.id || !profile || isCurrentUser) {
      console.log("Cannot start DM: Missing requirements", {
        hasClient: !!client,
        hasCurrentUserId: !!session?.user?.id,
        hasProfile: !!profile,
        isCurrentUser,
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
            onPress={onBack || (() => router.back())}
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
            <TouchableOpacity style={{ alignItems: "center" }}>
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

            <TouchableOpacity style={{ alignItems: "center" }}>
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

            <TouchableOpacity style={{ alignItems: "center" }}>
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

            <TouchableOpacity style={{ alignItems: "center" }}>
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
            <View style={{ flexDirection: "row", gap: 12, marginBottom: 20 }}>
              <TouchableOpacity
                onPress={handleFollowToggle}
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
                  borderWidth: isFollowing ? 1 : 0,
                  borderColor: theme.colors.border,
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
                style={{
                  paddingHorizontal: 20,
                  paddingVertical: 14,
                  borderRadius: 24,
                  backgroundColor: theme.colors.card,
                  borderWidth: 1,
                  borderColor: theme.colors.border,
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
                style={{
                  paddingHorizontal: 20,
                  paddingVertical: 14,
                  borderRadius: 24,
                  backgroundColor: theme.colors.card,
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                }}
              >
                <Share2 size={18} color={theme.colors.text} strokeWidth={2.5} />
              </TouchableOpacity>
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
    </SafeAreaView>
  );
}
