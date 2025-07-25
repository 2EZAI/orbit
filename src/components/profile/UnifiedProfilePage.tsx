import React, { useEffect, useState, useRef } from "react";
import {
  View,
  TouchableOpacity,
  Image,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Pressable,
  Share,
  Alert,
  Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Text } from "~/src/components/ui/text";
import { useAuth } from "~/src/lib/auth";
import { useUser } from "~/hooks/useUserData";
import { useFollow } from "~/hooks/useFollow";
import {
  Settings,
  ArrowLeft,
  UserPlus,
  UserMinus,
  Share2,
} from "lucide-react-native";
import { router } from "expo-router";
import { Button } from "~/src/components/ui/button";
import { UserAvatar } from "~/src/components/ui/user-avatar";
import { ScreenHeader } from "~/src/components/ui/screen-header";
import { RichText } from "~/src/components/ui/rich-text";
import { useTheme } from "~/src/components/ThemeProvider";
import { supabase } from "~/src/lib/supabase";
import Toast from "react-native-toast-message";

// Import tab components
import UnifiedPostsTab from "./UnifiedPostsTab";
import UnifiedEventsTab from "./UnifiedEventsTab";
import UnifiedInfoTab from "./UnifiedInfoTab";

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
  userId?: string; // If not provided, shows current user
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

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("Posts");
  const [isLoading, setIsLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isFollowBack, setIsFollowBack] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Animation values for collapsible header
  const scrollY = useRef(new Animated.Value(0)).current;
  const headerHeight = 250; // Height of full profile header
  const minHeaderHeight = 60; // Height of minimized header
  const scrollThreshold = 200; // More gradual minimization threshold

  // Determine if this is the current user's profile
  const isCurrentUser = !userId || userId === session?.user?.id;
  const targetUserId = userId || session?.user?.id;

  useEffect(() => {
    if (targetUserId) {
      loadProfile();
    }
  }, [targetUserId]);

  const loadProfile = async () => {
    if (!targetUserId) return;

    setIsLoading(true);
    try {
      if (isCurrentUser && currentUser) {
        // Use current user data
        const counts = await getFollowCounts(currentUser.id);
        setProfile({
          id: currentUser.id,
          username: currentUser.username,
          first_name: currentUser.first_name,
          last_name: currentUser.last_name,
          avatar_url: currentUser.avatar_url,
          bio: currentUser.bio,
          followers_count: counts.followerCount,
          following_count: counts.followingCount,
          posts_count: 0, // Will be loaded by PostsTab
          events_count: 0, // Will be loaded by EventsTab
        });
      } else {
        // Fetch other user's profile
        const { data: userData, error: userError } = await supabase
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

        // Get counts
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
            .from("event_attendees")
            .select("*", { count: "exact" })
            .eq("user_id", userData.id),
        ]);

        setProfile({
          ...userData,
          followers_count: followersCount || 0,
          following_count: followingCount || 0,
          posts_count: postsCount || 0,
          events_count: eventsCount || 0,
        });

        // Check follow status
        if (session?.user?.id && userData.id !== session.user.id) {
          await checkFollowStatus(userData.id);
        }
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

      // Check if they follow back
      const { data: followBackData } = await supabase
        .from("follows")
        .select("id")
        .eq("follower_id", profileUserId)
        .eq("following_id", session.user.id)
        .single();

      setIsFollowBack(!!followBackData);
    } catch (error) {
      // No follow relationship found
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

  const getActionButtons = () => {
    if (isCurrentUser) {
      return [
        {
          icon: <Settings size={18} color="white" strokeWidth={2.5} />,
          onPress: () =>
            router.push(`/(app)/(profile)/${session?.user?.id}` as any),
          backgroundColor: theme.colors.primary,
        },
      ];
    } else {
      return showBackButton
        ? [
            {
              icon: (
                <ArrowLeft
                  size={18}
                  color={theme.colors.text}
                  strokeWidth={2.5}
                />
              ),
              onPress: onBack || (() => router.back()),
            },
          ]
        : [];
    }
  };

  if (isLoading || !profile) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.card }}>
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <ActivityIndicator size="large" color={theme.colors.text} />
          <Text style={{ marginTop: 16, color: theme.colors.text }}>
            Loading profile...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Create animated interpolations for header with gradual minimization
  const headerOpacity = scrollY.interpolate({
    inputRange: [0, scrollThreshold * 0.7, scrollThreshold],
    outputRange: [1, 0.3, 0],
    extrapolate: "clamp",
  });

  // Keep action buttons visible
  const buttonsOpacity = scrollY.interpolate({
    inputRange: [0, scrollThreshold * 0.8, scrollThreshold],
    outputRange: [1, 1, 1], // Always visible
    extrapolate: "clamp",
  });

  const headerTranslateY = scrollY.interpolate({
    inputRange: [0, scrollThreshold],
    outputRange: [0, -80],
    extrapolate: "clamp",
  });

  const headerScale = scrollY.interpolate({
    inputRange: [0, scrollThreshold * 0.4],
    outputRange: [1, 0.95],
    extrapolate: "clamp",
  });

  const minimizedHeaderOpacity = scrollY.interpolate({
    inputRange: [scrollThreshold * 0.7, scrollThreshold],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });

  // Tabs no longer need to translate since header properly collapses

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.card }}>
      {/* Minimized Header - Shows when scrolled */}
      <Animated.View
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: minHeaderHeight + 44, // Include status bar
          backgroundColor: theme.colors.card,
          borderBottomWidth: 1,
          borderBottomColor: theme.colors.border,
          zIndex: 1000,
          opacity: minimizedHeaderOpacity,
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 16,
          paddingTop: 44, // Status bar height
        }}
      >
        {showBackButton && (
          <TouchableOpacity
            onPress={onBack || (() => router.back())}
            style={{ marginRight: 12 }}
          >
            <ArrowLeft size={24} color={theme.colors.text} />
          </TouchableOpacity>
        )}
        {profile && (
          <>
            <UserAvatar
              size={32}
              user={{
                id: profile.id,
                name: getDisplayName(),
                image: profile.avatar_url,
              }}
            />
            <View style={{ marginLeft: 12, flex: 1 }}>
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "bold",
                  color: theme.colors.text,
                }}
                numberOfLines={1}
              >
                {getDisplayName()}
              </Text>
              <Text
                style={{
                  fontSize: 12,
                  color: theme.colors.text + "80",
                }}
                numberOfLines={1}
              >
                @{profile.username || "user"}
              </Text>
            </View>

            {/* Actions in minimized header */}
            <View style={{ flexDirection: "row", gap: 8 }}>
              {getActionButtons().map((action, index) => (
                <TouchableOpacity
                  key={index}
                  onPress={action.onPress}
                  style={{
                    padding: 8,
                    borderRadius: 20,
                    backgroundColor: theme.colors.card,
                  }}
                >
                  {action.icon}
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}
      </Animated.View>

      {/* Profile Header - Collapsible */}
      <Animated.View
        style={{
          height: scrollY.interpolate({
            inputRange: [0, scrollThreshold],
            outputRange: [headerHeight, 120], // Increased space for buttons and padding
            extrapolate: "clamp",
          }),
          overflow: "hidden",
        }}
      >
        {/* Animated Profile Header */}
        <Animated.View
          style={{
            paddingHorizontal: 20,
            paddingBottom: 20,
            backgroundColor: theme.colors.card,
            opacity: headerOpacity,
            transform: [
              { translateY: headerTranslateY },
              { scale: headerScale },
            ],
          }}
        >
          {/* Back Button */}
          <View style={{ position: "absolute", top: 20, left: 0, zIndex: 10 }}>
            <TouchableOpacity
              onPress={onBack || (() => router.back())}
              style={{
                padding: 8,
                borderRadius: 20,
                backgroundColor: theme.colors.card + "80",
              }}
            >
              <ArrowLeft
                size={24}
                color={theme.colors.text}
                strokeWidth={2.5}
              />
            </TouchableOpacity>
          </View>

          {/* Avatar and Name */}
          <View style={{ alignItems: "center", marginBottom: 16 }}>
            <UserAvatar
              size={80}
              user={{
                id: profile.id,
                name: getDisplayName(),
                image: profile.avatar_url,
              }}
            />
            <Text
              style={{
                fontSize: 24,
                fontWeight: "bold",
                color: theme.colors.text,
                marginTop: 12,
              }}
            >
              {getDisplayName()}
            </Text>
            <Text
              style={{
                fontSize: 16,
                color: theme.colors.text + "80",
                marginTop: 4,
              }}
            >
              @{profile.username || "anonymous"}
            </Text>
          </View>

          {/* Bio */}
          {profile.bio && (
            <View style={{ marginBottom: 16, alignItems: "center" }}>
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

          {/* Stats */}
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-around",
              marginBottom: 20,
            }}
          >
            <View style={{ alignItems: "center" }}>
              <Text
                style={{
                  fontSize: 20,
                  fontWeight: "bold",
                  color: theme.colors.text,
                }}
              >
                {profile.posts_count}
              </Text>
              <Text
                style={{
                  fontSize: 14,
                  color: theme.colors.text + "80",
                }}
              >
                Posts
              </Text>
            </View>
            <View style={{ alignItems: "center" }}>
              <Text
                style={{
                  fontSize: 20,
                  fontWeight: "bold",
                  color: theme.colors.text,
                }}
              >
                {profile.followers_count}
              </Text>
              <Text
                style={{
                  fontSize: 14,
                  color: theme.colors.text + "80",
                }}
              >
                Followers
              </Text>
            </View>
            <View style={{ alignItems: "center" }}>
              <Text
                style={{
                  fontSize: 20,
                  fontWeight: "bold",
                  color: theme.colors.text,
                }}
              >
                {profile.following_count}
              </Text>
              <Text
                style={{
                  fontSize: 14,
                  color: theme.colors.text + "80",
                }}
              >
                Following
              </Text>
            </View>
            <View style={{ alignItems: "center" }}>
              <Text
                style={{
                  fontSize: 20,
                  fontWeight: "bold",
                  color: theme.colors.text,
                }}
              >
                {profile.events_count}
              </Text>
              <Text
                style={{
                  fontSize: 14,
                  color: theme.colors.text + "80",
                }}
              >
                Events
              </Text>
            </View>
          </View>

          {/* Action Buttons - Always Visible */}
          <Animated.View
            style={{
              flexDirection: "row",
              gap: 12,
              opacity: buttonsOpacity,
            }}
          >
            {!isCurrentUser ? (
              <>
                <Button
                  onPress={handleFollowToggle}
                  style={{
                    flex: 1,
                    backgroundColor: isFollowing
                      ? theme.colors.border
                      : theme.colors.primary,
                  }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    {isFollowing ? (
                      <UserMinus size={18} color={theme.colors.text} />
                    ) : (
                      <UserPlus size={18} color="white" />
                    )}
                    <Text
                      style={{
                        color: isFollowing ? theme.colors.text : "white",
                        fontWeight: "600",
                      }}
                    >
                      {isFollowing ? "Unfollow" : "Follow"}
                      {isFollowBack && isFollowing ? " Back" : ""}
                    </Text>
                  </View>
                </Button>
                <Button
                  onPress={handleShareProfile}
                  style={{
                    backgroundColor: theme.colors.card,
                    borderWidth: 1,
                    borderColor: theme.colors.border,
                    paddingHorizontal: 16,
                  }}
                >
                  <Share2 size={18} color={theme.colors.text} />
                </Button>
              </>
            ) : (
              <>
                <Button
                  onPress={() =>
                    router.push(`/(app)/(profile)/${session?.user?.id}` as any)
                  }
                  style={{
                    backgroundColor: theme.colors.primary,
                    paddingHorizontal: 16,
                  }}
                >
                  <Settings size={18} color="white" strokeWidth={2.5} />
                </Button>
                <Button
                  onPress={handleShareProfile}
                  style={{
                    flex: 1,
                    backgroundColor: theme.colors.card,
                    borderWidth: 1,
                    borderColor: theme.colors.border,
                  }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <Share2 size={18} color={theme.colors.text} />
                    <Text
                      style={{
                        color: theme.colors.text,
                        fontWeight: "600",
                      }}
                    >
                      Share Profile
                    </Text>
                  </View>
                </Button>
              </>
            )}
          </Animated.View>
        </Animated.View>
      </Animated.View>

      {/* Tabs and Content Container */}
      <Animated.View
        style={{
          flex: 1,
          paddingTop: scrollY.interpolate({
            inputRange: [scrollThreshold * 0.7, scrollThreshold],
            outputRange: [0, minHeaderHeight - 55], // Account for larger collapsed header height (60 - 55 = 5px)
            extrapolate: "clamp",
          }),
        }}
      >
        {/* Tabs Navigation */}
        <View
          style={{
            flexDirection: "row",
            backgroundColor: theme.colors.card,
            borderBottomWidth: 1,
            borderBottomColor: theme.colors.border,
          }}
        >
          {(["Posts", "Events", "Info"] as Tab[]).map((tab) => (
            <Pressable
              key={tab}
              onPress={() => setActiveTab(tab)}
              style={{
                flex: 1,
                paddingVertical: 16,
                borderBottomWidth: activeTab === tab ? 2 : 0,
                borderBottomColor: theme.colors.primary,
              }}
            >
              <Text
                style={{
                  textAlign: "center",
                  fontSize: 16,
                  fontWeight: activeTab === tab ? "600" : "400",
                  color:
                    activeTab === tab
                      ? theme.colors.primary
                      : theme.colors.text + "80",
                }}
              >
                {tab}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Tab Content - Each tab handles its own scrolling */}
        <View style={{ flex: 1, backgroundColor: theme.colors.card }}>
          {activeTab === "Posts" && (
            <UnifiedPostsTab
              userId={targetUserId || ""}
              isCurrentUser={isCurrentUser}
              onScroll={Animated.event(
                [{ nativeEvent: { contentOffset: { y: scrollY } } }],
                { useNativeDriver: false }
              )}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  colors={[theme.colors.primary]}
                  tintColor={theme.colors.primary}
                />
              }
            />
          )}
          {activeTab === "Events" && (
            <UnifiedEventsTab
              userId={targetUserId || ""}
              isCurrentUser={isCurrentUser}
              onScroll={Animated.event(
                [{ nativeEvent: { contentOffset: { y: scrollY } } }],
                { useNativeDriver: false }
              )}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  colors={[theme.colors.primary]}
                  tintColor={theme.colors.primary}
                />
              }
            />
          )}
          {activeTab === "Info" && (
            <UnifiedInfoTab
              userId={targetUserId || ""}
              isCurrentUser={isCurrentUser}
              onScroll={Animated.event(
                [{ nativeEvent: { contentOffset: { y: scrollY } } }],
                { useNativeDriver: false }
              )}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  colors={[theme.colors.primary]}
                  tintColor={theme.colors.primary}
                />
              }
            />
          )}
        </View>
      </Animated.View>
    </SafeAreaView>
  );
}
