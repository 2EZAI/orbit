import React, { useEffect, useState } from "react";
import {
  View,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Dimensions,
} from "react-native";
import { Text } from "~/src/components/ui/text";
import { supabase } from "~/src/lib/supabase";
import { useAuth } from "~/src/lib/auth";
import { format } from "date-fns";
import {
  Heart,
  MessageCircle,
  Share2,
  MapPin,
  MoreHorizontal,
} from "lucide-react-native";
import { router } from "expo-router";
import { UserAvatar } from "~/src/components/ui/user-avatar";
import { SocialEventCard } from "~/src/components/social/SocialEventCard";
import { useTheme } from "~/src/components/ThemeProvider";

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

interface UnifiedPostsTabProps {
  userId: string;
  isCurrentUser: boolean;
  onScroll?: any;
  refreshControl?: any;
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

export default function UnifiedPostsTab({
  userId,
  isCurrentUser,
  onScroll,
  refreshControl,
}: UnifiedPostsTabProps) {
  const { session } = useAuth();
  const { theme, isDarkMode } = useTheme();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const PAGE_SIZE = 20;

  useEffect(() => {
    loadPosts(true);
  }, [userId]);

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
      // Fetch posts for specific user
      const { data: postsData, error } = await supabase
        .from("posts")
        .select(
          `
          id,
          content,
          media_urls,
          created_at,
          address,
          city,
          state,
          like_count,
          comment_count,
          event_id,
          user_id,
          users!user_id (
            id,
            username,
            avatar_url,
            first_name,
            last_name
          )
        `
        )
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .range((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE - 1);

      if (error) throw error;

      const transformedPosts: Post[] = (postsData || []).map((post: any) => ({
        id: post.id,
        content: post.content,
        media_urls: post.media_urls || [],
        created_at: post.created_at,
        address: post.address,
        city: post.city,
        state: post.state,
        like_count: Math.max(0, post.like_count || 0),
        comment_count: Math.max(0, post.comment_count || 0),
        user: post.users || {
          id: post.user_id,
          username: null,
          avatar_url: null,
          first_name: null,
          last_name: null,
        },
        event: null, // Set to null for now, since we only have event_id
        isLiked: false,
      }));

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
                router.push(`/(app)/profile/${post.user.id}`);
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

          <TouchableOpacity className="p-2">
            <MoreHorizontal
              size={20}
              color={isDarkMode ? "#9CA3AF" : "#6B7280"}
            />
          </TouchableOpacity>
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
                // Handle event selection if needed
              }}
              onShowDetails={() => {
                // Handle show details if needed
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
                <Share2 size={20} color={isDarkMode ? "#9CA3AF" : "#6B7280"} />
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
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          paddingVertical: 40,
          backgroundColor: theme.colors.card,
        }}
      >
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text
          style={{
            marginTop: 16,
            color: theme.colors.text + "80",
          }}
        >
          Loading posts...
        </Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.card }}>
      <FlatList
        data={posts}
        renderItem={renderPost}
        keyExtractor={(item) => item.id}
        refreshControl={
          refreshControl || (
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[theme.colors.primary]}
              tintColor={theme.colors.primary}
            />
          )
        }
        onScroll={onScroll}
        scrollEventThrottle={16}
        bounces={true}
        overScrollMode="always"
        onEndReached={() => {
          if (hasMore && !loading) {
            loadPosts();
          }
        }}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          loading && hasMore ? (
            <View className="py-8">
              <ActivityIndicator size="small" color={theme.colors.primary} />
            </View>
          ) : null
        }
        ListEmptyComponent={
          !loading ? (
            <View
              style={{
                flex: 1,
                justifyContent: "center",
                alignItems: "center",
                paddingVertical: 60,
              }}
            >
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: "600",
                  color: theme.colors.text,
                }}
              >
                No posts yet
              </Text>
              <Text
                style={{
                  marginTop: 8,
                  fontSize: 14,
                  color: theme.colors.text + "80",
                  textAlign: "center",
                }}
              >
                {isCurrentUser
                  ? "Share your thoughts and experiences"
                  : "This user hasn't posted anything yet"}
              </Text>
            </View>
          ) : null
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}
