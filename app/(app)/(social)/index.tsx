import React, { useState, useEffect } from "react";
import {
  View,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
  StatusBar,
  Dimensions,
} from "react-native";
import { Text } from "~/src/components/ui/text";
import { supabase } from "~/src/lib/supabase";
import { useAuth } from "~/src/lib/auth";
import { useUser } from "~/hooks/useUserData";
import { format } from "date-fns";
import { Icon } from "react-native-elements";
import {
  Heart,
  MessageCircle,
  Share2,
  MapPin,
  Users,
} from "lucide-react-native";
import { router } from "expo-router";
import { UserAvatar } from "~/src/components/ui/user-avatar";
import { EventDetailsSheet } from "~/src/components/map/EventDetailsSheet";
import { LocationDetailsSheet } from "~/src/components/map/LocationDetailsSheet";

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
  };
  event?: any;
  isLiked?: boolean;
}

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=600&q=80";

const { width: screenWidth } = Dimensions.get("window");

const ImageCarousel = ({
  images,
  postId,
  event,
}: {
  images: string[];
  postId: string;
  event?: any;
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  const handleScroll = (event: any) => {
    const contentOffset = event.nativeEvent.contentOffset.x;
    const index = Math.round(contentOffset / screenWidth);
    setCurrentIndex(index);
  };

  const handleImagePress = () => {
    console.log("Image pressed, navigating to post:", postId);
    router.push({
      pathname: `/post/${postId}`,
      params: { event: event ? JSON.stringify(event) : "" },
    });
  };

  return (
    <View className="relative">
      <TouchableOpacity
        onPress={handleImagePress}
        activeOpacity={0.95}
        style={{ flex: 1 }}
      >
        <FlatList
          data={images}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          keyExtractor={(_, index) => `image-${postId}-${index}`}
          renderItem={({ item }) => (
            <View style={{ width: screenWidth - 32 }}>
              <Image
                source={{ uri: item }}
                className="w-full h-48"
                style={{ resizeMode: "cover" }}
              />
            </View>
          )}
        />
      </TouchableOpacity>

      {/* Pagination Dots */}
      {images.length > 1 && (
        <View className="absolute right-0 left-0 bottom-2 flex-row justify-center">
          {images.map((_, index) => (
            <View
              key={`dot-${postId}-${index}`}
              className={`w-1.5 h-1.5 rounded-full mx-0.5 ${
                index === currentIndex ? "bg-white" : "bg-white/60"
              }`}
            />
          ))}
        </View>
      )}
    </View>
  );
};

export default function SocialFeed() {
  const { session } = useAuth();
  const { user } = useUser();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null);
  const [isSelectedItemLocation, setIsSelectedItemLocation] = useState(false);

  const PAGE_SIZE = 20;

  const loadPosts = async (isRefresh = false) => {
    console.log(
      "loadPosts called, loading:",
      loading,
      "hasMore:",
      hasMore,
      "isRefresh:",
      isRefresh,
      "current page:",
      page
    );

    if (loading || (!hasMore && !isRefresh)) {
      console.log("Early return from loadPosts");
      return;
    }

    // Calculate the correct page for this request
    const currentPage = isRefresh ? 1 : page;

    if (isRefresh) {
      setPage(1);
      setHasMore(true);
    }

    setLoading(true);
    console.log("Starting to fetch posts...");

    try {
      const from = (currentPage - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      console.log(
        "Querying posts from",
        from,
        "to",
        to,
        "for page:",
        currentPage
      );

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
          user:users!posts_user_id_fkey (
            id,
            username,
            avatar_url
          ),
          event:events!posts_event_id_fkey (
            id,
            name,
            description,
            start_datetime,
            end_datetime,
            venue_name,
            address,
            city,
            state
          )
        `
        )
        .order("created_at", { ascending: false })
        .range(from, to);

      console.log("Supabase response:", { postsData, error });

      if (error) {
        console.error("Error fetching posts:", error);
        setLoading(false);
        setRefreshing(false);
        setHasMore(false);
        return;
      }

      console.log("Raw postsData:", postsData);
      if (postsData && postsData.length > 0) {
        console.log("First post date:", postsData[0].created_at);
        console.log(
          "Last post date:",
          postsData[postsData.length - 1].created_at
        );
      }

      // Transform the data to match our Post interface
      const transformedPosts =
        postsData?.map((post: any) => ({
          id: post.id,
          content: post.content,
          media_urls: post.media_urls || [],
          created_at: post.created_at,
          address: post.address,
          city: post.city,
          state: post.state,
          like_count: Math.max(0, post.like_count || 0),
          comment_count: Math.max(0, post.comment_count || 0),
          user: post.user || {
            id: post.user_id,
            username: "Unknown User",
            avatar_url: null,
          },
          event: post.event,
          isLiked: false, // We'll check this separately
        })) || [];

      console.log("Transformed posts:", transformedPosts);

      // Check which posts are liked by the current user
      if (session?.user?.id) {
        try {
          const { data: likedPosts } = await supabase
            .from("post_likes")
            .select("post_id")
            .eq("user_id", session.user.id);

          const likedPostIds = new Set(likedPosts?.map((p) => p.post_id) || []);
          transformedPosts.forEach((post) => {
            post.isLiked = likedPostIds.has(post.id);
          });
        } catch (error) {
          console.error("Error checking likes:", error);
        }
      }

      console.log("Final transformed posts length:", transformedPosts.length);
      console.log("Sample post data:", transformedPosts[0]);

      if (transformedPosts.length === 0) {
        console.log("No posts found, setting hasMore to false");
        setHasMore(false);
      } else {
        console.log("Setting posts, isRefresh:", isRefresh);
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
      console.log("Setting loading to false");
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadPosts(true);
  }, []);

  const onRefresh = () => {
    console.log("onRefresh called, resetting state");
    setRefreshing(true);
    setPage(1);
    setHasMore(true);
    setPosts([]); // Clear existing posts
    loadPosts(true);
  };

  const toggleLike = async (postId: string) => {
    if (!session?.user?.id) return;

    try {
      const post = posts.find((p) => p.id === postId);
      if (!post) return;

      if (post.isLiked) {
        // Unlike
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
        // Like
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

  const renderPost = ({ item: post }: { item: Post }) => (
    <View className="mb-2 bg-white border-b border-gray-100">
      {/* Post Header */}
      <View className="flex-row items-center p-3">
        <TouchableOpacity
          onPress={() => {
            if (post.user?.id) {
              router.push(`/(app)/profile/${post.user.id}`);
            }
          }}
          className="flex-row flex-1 items-center"
        >
          <UserAvatar
            size={36}
            user={{
              id: post.user.id,
              name: post.user.username || "Anonymous",
              image: post.user.avatar_url,
            }}
          />
          <View className="flex-1 ml-3">
            <Text className="text-sm font-semibold text-gray-900">
              {post.user.username || "Anonymous"}
            </Text>
            <Text className="text-xs text-gray-500">
              {format(new Date(post.created_at), "MMM d • h:mm a")}
            </Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity className="p-1">
          <Icon
            name="dots-horizontal"
            type="material-community"
            size={18}
            color="#9ca3af"
          />
        </TouchableOpacity>
      </View>

      {/* Post Content */}
      <View className="px-3">
        {/* Text Content - Only show if there's text */}
        {post.content && post.content.trim() && (
          <TouchableOpacity
            onPress={() => {
              router.push({
                pathname: `/post/${post.id}`,
                params: { event: post.event ? JSON.stringify(post.event) : "" },
              });
            }}
          >
            <Text className="mb-3 text-sm leading-5 text-gray-800">
              {post.content}
            </Text>
          </TouchableOpacity>
        )}

        {/* Media - Dynamic height based on content */}
        {post.media_urls && post.media_urls.length > 0 && (
          <View className="overflow-hidden mb-3 rounded-xl">
            {post.media_urls.length === 1 ? (
              <TouchableOpacity
                onPress={() => {
                  router.push({
                    pathname: `/post/${post.id}`,
                    params: {
                      event: post.event ? JSON.stringify(post.event) : "",
                    },
                  });
                }}
              >
                <Image
                  source={{ uri: post.media_urls[0] }}
                  className="w-full h-48"
                  style={{ resizeMode: "cover" }}
                />
              </TouchableOpacity>
            ) : (
              <ImageCarousel
                images={post.media_urls}
                postId={post.id}
                event={post.event}
              />
            )}
          </View>
        )}

        {/* Location - Only show if there's an address */}
        {post.address && (
          <TouchableOpacity
            onPress={() => {
              router.push({
                pathname: `/post/${post.id}`,
                params: { event: post.event ? JSON.stringify(post.event) : "" },
              });
            }}
          >
            <View className="flex-row items-center mb-3">
              <MapPin size={14} color="#6b7280" />
              <Text className="ml-1 text-xs text-gray-600">
                {post.address}
                {post.city && `, ${post.city}`}
                {post.state && `, ${post.state}`}
              </Text>
            </View>
          </TouchableOpacity>
        )}

        {/* Event Card - Redesigned */}
        {post.event && (
          <TouchableOpacity
            onPress={() => {
              setSelectedEvent(post.event);
              setIsSelectedItemLocation(false);
            }}
            className="p-3 mb-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100"
          >
            <View className="flex-row items-center">
              <View className="flex-1">
                <Text className="text-sm font-semibold text-blue-900">
                  {post.event.name}
                </Text>
                <Text className="mt-1 text-xs text-blue-700">
                  {format(
                    new Date(post.event.start_datetime),
                    "MMM d • h:mm a"
                  )}
                </Text>
                <View className="flex-row items-center mt-1">
                  <Users size={12} color="#3b82f6" />
                  <Text className="ml-1 text-xs text-blue-700">
                    {post.event.venue_name || post.event.address || "Event"}
                  </Text>
                </View>
              </View>
              <View className="px-3 py-1 bg-blue-600 rounded-full">
                <Text className="text-xs font-medium text-white">View</Text>
              </View>
            </View>
          </TouchableOpacity>
        )}
      </View>

      {/* Post Actions - Redesigned */}
      <View className="flex-row justify-between items-center px-3 pb-3">
        <View className="flex-row items-center space-x-8">
          <TouchableOpacity
            onPress={() => toggleLike(post.id)}
            className="flex-row items-center"
          >
            <Heart
              size={18}
              color={post.isLiked ? "#ef4444" : "#6b7280"}
              fill={post.isLiked ? "#ef4444" : "none"}
            />
            <Text
              className={`ml-1 text-xs ${
                post.isLiked ? "text-red-500" : "text-gray-500"
              }`}
            >
              {post.like_count}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              router.push({
                pathname: `/post/${post.id}`,
                params: { event: post.event ? JSON.stringify(post.event) : "" },
              });
            }}
            className="flex-row items-center"
          >
            <MessageCircle size={18} color="#6b7280" />
            <Text className="ml-1 text-xs text-gray-500">
              {post.comment_count}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity className="flex-row items-center">
            <Share2 size={18} color="#6b7280" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  if (loading && posts.length === 0) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />

        {/* Header */}
        <View className="flex-row justify-between items-center p-4 border-b border-gray-200">
          <Text className="text-xl font-bold">Social Feed</Text>
          <TouchableOpacity
            onPress={() => router.push("/(app)/(create)")}
            className="px-4 py-2 bg-blue-600 rounded-full"
          >
            <Text className="font-medium text-white">Post</Text>
          </TouchableOpacity>
        </View>

        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#1d4ed8" />
          <Text className="mt-4 text-gray-500">Loading posts...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Header */}
      <View className="flex-row justify-between items-center p-4 border-b border-gray-200">
        <Text className="text-xl font-bold">Social Feed</Text>
        <TouchableOpacity
          onPress={() => router.push("/(app)/(create)")}
          className="px-4 py-2 bg-blue-600 rounded-full"
        >
          <Text className="font-medium text-white">Post</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={posts}
        renderItem={renderPost}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        onEndReached={() => {
          if (hasMore && !loading) {
            loadPosts();
          }
        }}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          loading && hasMore ? (
            <View className="py-4">
              <ActivityIndicator size="small" color="#1d4ed8" />
            </View>
          ) : null
        }
        ListEmptyComponent={
          !loading ? (
            <View className="flex-1 justify-center items-center py-20">
              <Text className="text-lg text-gray-500">No posts yet</Text>
              <Text className="mt-2 text-sm text-gray-400">
                Follow people to see their posts here
              </Text>
            </View>
          ) : null
        }
      />

      {/* Event Details Sheet */}
      {selectedEvent && (
        <>
          {isSelectedItemLocation ? (
            <LocationDetailsSheet
              event={selectedEvent}
              isOpen={!!selectedEvent}
              onClose={() => {
                setSelectedEvent(null);
                setIsSelectedItemLocation(false);
              }}
              nearbyEvents={[]}
              onEventSelect={(e) => {
                setSelectedEvent(e);
                setIsSelectedItemLocation(false);
              }}
              onShowControler={() => {}}
            />
          ) : (
            <EventDetailsSheet
              event={selectedEvent}
              isOpen={!!selectedEvent}
              onClose={() => {
                setSelectedEvent(null);
                setIsSelectedItemLocation(false);
              }}
              nearbyEvents={[]}
              onEventSelect={(e) => {
                setSelectedEvent(e);
                setIsSelectedItemLocation(false);
              }}
              onShowControler={() => {}}
            />
          )}
        </>
      )}
    </SafeAreaView>
  );
}
