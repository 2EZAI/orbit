import React, { useState, useEffect } from "react";
import {
  View,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
  Dimensions,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Text } from "~/src/components/ui/text";
import { supabase } from "~/src/lib/supabase";
import { useAuth } from "~/src/lib/auth";
import { useUser } from "~/src/lib/UserProvider";
import { format } from "date-fns";
import { Icon } from "react-native-elements";
import {
  Heart,
  MessageCircle,
  Send,
  MapPin,
  MoreHorizontal,
  Bell,
  Plus,
} from "lucide-react-native";
import { router } from "expo-router";
import { UserAvatar } from "~/src/components/ui/user-avatar";
import { UnifiedDetailsSheet } from "~/src/components/map/UnifiedDetailsSheet";
import { SocialEventCard } from "~/src/components/social/SocialEventCard";
import { ScreenHeader } from "~/src/components/ui/screen-header";
import { useTheme } from "~/src/components/ThemeProvider";
import { useNotificationsApi } from "~/hooks/useNotificationsApi";

interface Post {
  id: string;
  content: string;
  media_urls: string[];
  created_at: string;
  address: string;
  city: string;
  state: string;
  like_count: number;
  comment_count: number;
  user: {
    id: string;
    username: string | null;
    avatar_url: string | null;
    first_name?: string | null;
    last_name?: string | null;
  };
  event?: any;
  isLiked?: boolean;
}

const { width: screenWidth } = Dimensions.get("window");

const ImageGallery = ({
  images,
  postId,
  event,
}: {
  images: string[];
  postId: string;
  event?: any;
}) => {
  const { theme, isDarkMode } = useTheme();

  const handleImagePress = () => {
    router.push({
      pathname: `/post/${postId}`,
      params: { event: event ? JSON.stringify(event) : "" },
    });
  };

  if (images.length === 0) return null;

  return (
    <View className="px-4 pb-3">
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View className="flex-row gap-2">
          {images.map((imageUrl, index) => (
            <TouchableOpacity
              key={`${postId}-image-${index}`}
              onPress={handleImagePress}
              className="overflow-hidden rounded-xl"
              style={{
                width: 120,
                height: 120,
              }}
            >
              <Image
                source={{ uri: imageUrl }}
                style={{
                  width: 120,
                  height: 120,
                  resizeMode: "cover",
                }}
              />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
};

export default function SocialFeed() {
  const { session } = useAuth();
  const { user } = useUser();
  const { theme, isDarkMode } = useTheme();
  const { fetchAllNoifications, unReadCount } = useNotificationsApi();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null);
  const [isSelectedItemLocation, setIsSelectedItemLocation] = useState(false);
  const [showUnifiedCard, setShowUnifiedCard] = useState(false);

  const PAGE_SIZE = 20;

  useEffect(() => {
    fetchAllNoifications(1, 20);
  }, []);

  const loadPosts = async (isRefresh = false) => {
    if (loading || (!hasMore && !isRefresh)) {
      return;
    }

    const currentPage = isRefresh ? 1 : page;

    if (isRefresh) {
      setPage(1);
      setHasMore(true);
    }

    setLoading(true);

    try {
      const response = await fetch(
        `${process.env.BACKEND_MAP_URL}/api/posts/all?page=${currentPage}&limit=${PAGE_SIZE}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token}`,
          },
        }
      );

      if (!response.ok) {
        setLoading(false);
        setRefreshing(false);
        setHasMore(false);
        throw new Error(await response.text());
      }

      const response_ = await response.json();
      const postsData = response_?.data;
// console.log("postsData>",postsData);
      const transformedPosts =
        postsData?.map((post: any) => ({
          id: post.id,
          content: post.content,
          media_urls: post.media_urls || [],
          created_at: post.created_at,
          address: post.address,
          city: post.city,
          state: post.state,
          like_count: Math.max(0, post?.likes?.count || 0),
          comment_count: Math.max(0, post?.comments?.count || 0),
          user: post.created_by || {
            id: post.id,
            username: post.username,
            avatar_url: post.avatar_url,
            first_name: post.first_name,
            last_name: post.last_name,
          },
          event: post.event,
          isLiked: false,
        })) || [];

      // Check which posts are liked by the current user
      if (session?.user?.id) {
        try {
          const { data: likedPosts } = await supabase
            .from("post_likes")
            .select("post_id")
            .eq("user_id", session.user.id);

          const likedPostIds = new Set(likedPosts?.map((p) => p.post_id) || []);
          transformedPosts.forEach((post: Post) => {
            post.isLiked = likedPostIds.has(post.id);
          });
        } catch (error) {
          console.error("Error checking likes:", error);
        }
      }

      if (transformedPosts.length === 0) {
        setHasMore(false);
      } else {
        if (isRefresh) {
          setPosts(transformedPosts);
        } else {
          setPosts((prev) => [...prev, ...transformedPosts]);
        }
        setPage((prev) => prev + 1);
      }
    } catch (error) {
      console.error("Error fetching posts:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadPosts(true);
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    setPage(1);
    setHasMore(true);
    setPosts([]);
    loadPosts(true);
  };

  const toggleLike = async (postId: string) => {
    if (!session?.user?.id) return;

    try {
      const post = posts.find((p) => p.id === postId);
      if (!post) return;

      if (post.isLiked) {
        const { error } = await supabase
          .from("post_likes")
          .delete()
          .eq("post_id", postId)
          .eq("user_id", session.user.id);

        if (!error) {
          setPosts((prevPosts) =>
            prevPosts.map((p) =>
              p.id === postId
                ? {
                    ...p,
                    like_count: Math.max(0, p.like_count - 1),
                    isLiked: false,
                  }
                : p
            )
          );
        }
      } else {
        const { error } = await supabase.from("post_likes").insert({
          post_id: postId,
          user_id: session.user.id,
        });

        if (!error) {
          setPosts((prevPosts) =>
            prevPosts.map((p) =>
              p.id === postId
                ? {
                    ...p,
                    like_count: Math.max(0, p.like_count + 1),
                    isLiked: true,
                  }
                : p
            )
          );
        }
      }
    } catch (error) {
      console.error("Error toggling like:", error);
    }
  };

  const renderPost = ({ item: post, index }: { item: Post; index: number }) => {
    const hasEvent = post.event;
    const hasImages = post.media_urls && post.media_urls.length > 0;
    const hasContent = post.content && post.content.trim();

    return (
      <View style={{ backgroundColor: theme.colors.card }}>
        {/* Post Header */}
        <View
          className={`flex-row items-center px-4 py-4 ${
            index === 0 ? "pt-6" : ""
          }`}
        >
          <TouchableOpacity
            onPress={() => {
              if (post.user?.id) {
                router.push({
                  pathname: `/(app)/profile/${post.user.id}`,
                  params: { from: 'social' }
                });
              }
            }}
            className="flex-row flex-1 items-center"
          >
            <UserAvatar
              size={40}
              user={{
                id: post.user.id,
                name:
                  post.user.first_name && post.user.last_name
                    ? `${post.user.first_name} ${post.user.last_name}`
                    : post.user.username || "Anonymous",
                image: post.user.avatar_url,
              }}
            />
            <View className="flex-1 ml-3">
              {(post.user.first_name || post.user.last_name) && (
                <Text
                  className="text-base font-semibold"
                  style={{ color: theme.colors.text }}
                >
                  {post.user.first_name} {post.user.last_name}
                </Text>
              )}
              <Text
                className="text-sm font-medium"
                style={{ color: theme.colors.text }}
              >
                @{post.user.username || "Anonymous"}
              </Text>
              <Text
                className="text-sm"
                style={{ color: isDarkMode ? "#9CA3AF" : "#6B7280" }}
              >
                {format(new Date(post.created_at), "MMM d • h:mm a")}
              </Text>
            </View>
          </TouchableOpacity>

         {/*  <TouchableOpacity className="p-2">
            <MoreHorizontal
              size={20}
              color={isDarkMode ? "#9CA3AF" : "#6B7280"}
            />
          </TouchableOpacity>*/}
        </View>

        {/* Post Content */}
        {hasContent && (
          <TouchableOpacity
            onPress={() => {
              router.push({
                pathname: `/post/${post.id}`,
                params: { event: post.event ? JSON.stringify(post.event) : "" },
              });
            }}
            className="px-4 pb-3"
          >
            <Text
              className="text-base leading-6"
              style={{ color: theme.colors.text }}
            >
              {post.content}
            </Text>
          </TouchableOpacity>
        )}

        {/* Image Gallery */}
        {hasImages && (
          <ImageGallery
            images={post.media_urls}
            postId={post.id}
            event={post.event}
          />
        )}

        {/* Event Card */}
        {hasEvent && (
          <View className="px-4 pb-3">
            <SocialEventCard
              data={post.event}
              onDataSelect={(data) => {
                setSelectedEvent(data);
                setIsSelectedItemLocation(false);
                setShowUnifiedCard(true);
              }}
              onShowDetails={() => {
                setSelectedEvent(post.event);
                setIsSelectedItemLocation(false);
                setShowUnifiedCard(true);
              }}
              treatAsEvent={true}
            />
          </View>
        )}

        {/* Location */}
        {post.address && (
          <TouchableOpacity
            onPress={() => {
              router.push({
                pathname: `/post/${post.id}`,
                params: { event: post.event ? JSON.stringify(post.event) : "" },
              });
            }}
            className="flex-row items-center px-4 pb-3"
          >
            <MapPin size={16} color={isDarkMode ? "#9CA3AF" : "#6B7280"} />
            <Text
              className="ml-2 text-sm"
              style={{ color: isDarkMode ? "#9CA3AF" : "#6B7280" }}
            >
              {post.address}
              {post.city && `, ${post.city}`}
              {post.state && `, ${post.state}`}
            </Text>
          </TouchableOpacity>
        )}

        {/* Post Actions */}
        <View className="px-4 py-4">
          <View className="flex-row justify-between items-center">
            <View className="flex-row items-center">
              <TouchableOpacity
                onPress={() => toggleLike(post.id)}
                className="flex-row items-center mr-8"
              >
                <Heart
                  size={20}
                  color={
                    post.isLiked
                      ? "#ef4444"
                      : isDarkMode
                      ? "#9CA3AF"
                      : "#6B7280"
                  }
                  fill={post.isLiked ? "#ef4444" : "none"}
                />
                <Text
                  className="ml-2 text-sm font-medium"
                  style={{
                    color: post.isLiked
                      ? "#ef4444"
                      : isDarkMode
                      ? "#9CA3AF"
                      : "#6B7280",
                  }}
                >
                  {post.like_count}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  router.push({
                    pathname: `/post/${post.id}`,
                    params: {
                      event: post.event ? JSON.stringify(post.event) : "",
                    },
                  });
                }}
                className="flex-row items-center mr-8"
              >
                <MessageCircle
                  size={20}
                  color={isDarkMode ? "#9CA3AF" : "#6B7280"}
                />
                <Text
                  className="ml-2 text-sm font-medium"
                  style={{ color: isDarkMode ? "#9CA3AF" : "#6B7280" }}
                >
                  {post.comment_count}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity className="flex-row items-center">
                <Send size={20} color={isDarkMode ? "#9CA3AF" : "#6B7280"} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Divider */}
        <View
          className="mx-4 h-px"
          style={{ backgroundColor: theme.colors.border }}
        />
      </View>
    );
  };

  if (loading && posts.length === 0) {
    return (
      <SafeAreaView
        className="flex-1"
        style={{ backgroundColor: theme.colors.card }}
      >
        <StatusBar
          barStyle={isDarkMode ? "light-content" : "dark-content"}
          backgroundColor={theme.colors.card}
        />

        <ScreenHeader
          title="Social Feed"
          actions={[
            {
              icon: <Bell size={18} color="white" strokeWidth={2.5} />,
              onPress: () =>{
               
                router.push({
        pathname:`/(app)/(notification)`,
        params: { from: "social"},
      });
                },
              backgroundColor: theme.colors.primary,
              badge: !!(unReadCount && unReadCount > 0) ? (
                <View
                  style={{
                    position: "absolute",
                    top: -4,
                    right: -4,
                    backgroundColor: "#ff3b30",
                    borderRadius: 10,
                    minWidth: 20,
                    height: 20,
                    justifyContent: "center",
                    alignItems: "center",
                    borderWidth: 2,
                    borderColor: "white",
                  }}
                >
                  <Text
                    style={{ color: "white", fontSize: 12, fontWeight: "bold" }}
                  >
                    {unReadCount > 99 ? "99+" : String(unReadCount)}
                  </Text>
                </View>
              ) : undefined,
            },
            {
              icon: (
                <Image
                  source={
                    user?.avatar_url
                      ? { uri: user.avatar_url }
                      : require("~/assets/favicon.png")
                  }
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    borderWidth: 2,
                    borderColor: theme.colors.primary,
                  }}
                />
              ),
              onPress: () => router.push("/(app)/(profile)"),
            },
          ]}
        />

        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text
            className="mt-4"
            style={{ color: isDarkMode ? "#9CA3AF" : "#6B7280" }}
          >
            Loading posts...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      className="flex-1"
      style={{ backgroundColor: theme.colors.card }}
    >
      <StatusBar
        barStyle={isDarkMode ? "light-content" : "dark-content"}
        backgroundColor={theme.colors.card}
      />

      <ScreenHeader
        title="Social Feed"
        actions={[
          {
            icon: <Bell size={18} color="white" strokeWidth={2.5} />,
            onPress: () => {
                router.push({
        pathname:`/(app)/(notification)`,
        params: { from: "social"},
      });
            },
            backgroundColor: theme.colors.primary,
            badge: !!(unReadCount && unReadCount > 0) ? (
              <View
                style={{
                  position: "absolute",
                  top: -4,
                  right: -4,
                  backgroundColor: "#ff3b30",
                  borderRadius: 10,
                  minWidth: 20,
                  height: 20,
                  justifyContent: "center",
                  alignItems: "center",
                  borderWidth: 2,
                  borderColor: "white",
                }}
              >
                <Text
                  style={{ color: "white", fontSize: 12, fontWeight: "bold" }}
                >
                  {unReadCount > 99 ? "99+" : String(unReadCount)}
                </Text>
              </View>
            ) : undefined,
          },
          {
            icon: (
              <Image
                source={
                  user?.avatar_url
                    ? { uri: user.avatar_url }
                    : require("~/assets/favicon.png")
                }
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  borderWidth: 2,
                  borderColor: theme.colors.primary,
                }}
              />
            ),
            onPress: () => router.push("/(app)/(profile)"),
          },
        ]}
      />

      <FlatList
        data={posts}
        renderItem={renderPost}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#3B82F6"]}
            tintColor="#3B82F6"
          />
        }
        onEndReached={() => {
          if (hasMore && !loading) {
            loadPosts();
          }
        }}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          loading && hasMore ? (
            <View className="py-8">
              <ActivityIndicator size="small" color="#3B82F6" />
            </View>
          ) : null
        }
        ListEmptyComponent={
          !loading ? (
            <View className="flex-1 justify-center items-center py-20">
              <Text
                className="text-xl font-medium"
                style={{ color: theme.colors.text }}
              >
                No posts yet
              </Text>
              <Text
                className="mt-2 text-base text-center"
                style={{ color: isDarkMode ? "#9CA3AF" : "#6B7280" }}
              >
                Follow people to see their posts here
              </Text>
            </View>
          ) : null
        }
        showsVerticalScrollIndicator={false}
      />

      {/* Event Details Sheet */}
      {selectedEvent && showUnifiedCard && (
        <UnifiedDetailsSheet
          data={selectedEvent as any}
          isOpen={!!selectedEvent && showUnifiedCard}
          onClose={() => {
            setSelectedEvent(null);
            setIsSelectedItemLocation(false);
            setShowUnifiedCard(false);
          }}
          nearbyData={[]}
          onDataSelect={(data) => {
            setSelectedEvent(data as any);
            setIsSelectedItemLocation(false);
          }}
          onShowControler={() => {}}
          isEvent={!isSelectedItemLocation}
        />
      )}

      {/* Floating Action Button */}
      <TouchableOpacity
        onPress={() => router.push("/(app)/post/create")}
        accessibilityLabel="Create new post"
        accessibilityHint="Navigate to create a new post"
        accessibilityRole="button"
        style={{
          position: "absolute",
          bottom: 120, // Above the tab bar
          right: 20,
          width: 60,
          height: 60,
          borderRadius: 40,
          backgroundColor: "#8B5CF6",
          justifyContent: "center",
          alignItems: "center",
          shadowColor: isDarkMode ? theme.colors.primary : "#000",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: isDarkMode ? 0.4 : 0.25,
          shadowRadius: 8,
          elevation: 8,
          zIndex: 1000,
        }}
      >
        <Plus size={24} color="white" strokeWidth={2.5} />
      </TouchableOpacity>
    </SafeAreaView>
  );
}
