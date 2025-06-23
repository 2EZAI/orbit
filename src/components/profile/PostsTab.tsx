import React, { useEffect, useState } from "react";
import {
  View,
  RefreshControl,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from "react-native";
import { Text } from "~/src/components/ui/text";
import PostGrid from "./PostGrid";
import CreatePostButton from "./CreatePostButton";
import { supabase } from "~/src/lib/supabase";
import { router } from "expo-router";
import { useUser } from "~/hooks/useUserData";
import { SafeAreaView } from "react-native-safe-area-context";
import { format } from "date-fns";
import { Icon } from "react-native-elements";

interface Post {
  id: string;
  content: string;
  media_urls: string[];
  created_at: string;
  user: {
    username: string;
    avatar_url: string;
  };
  like_count: number;
  comment_count: number;
}

interface PostsTabProps {
  userId: string;
}

export default function PostsTab({ userId }: PostsTabProps) {
  const { user } = useUser();
  const [posts, setPosts] = useState<Post[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const PAGE_SIZE = 20;

  const loadPosts = async () => {
    if (loading || !hasMore) return;
    setLoading(true);

    try {
      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const { data, error } = await supabase
        .from("posts")
        .select(
          `
        *,
        user:users!inner (
          username,
          avatar_url
        )
        `
        )
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .range(from, to); // <-- Pagination here
      console.warn("from.", from);
      console.warn("to.", to);
      if (error) throw error;

      if (!data || data.length === 0) {
        console.warn("No more posts.");
        setHasMore(false);
        // Optional: setHasMore(false);
      } else {
        console.warn("data.>", data);
        setPosts((prev) => [...prev, ...data]);
        setPage((prev) => prev + 1);
      }
    } catch (error) {
      console.error("Error fetching posts:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPosts();
  }, [userId]);

  const renderItem = ({ item: post }: { item: Post }) => (
    <>
      <TouchableOpacity
        className="mx-4 mb-4 overflow-hidden border rounded-3xl border-border"
        onPress={() => router.push(`/post/${post.id}`)}
      >
        <View className="relative">
          {post?.media_urls?.[0] ? (
            <Image
              source={{ uri: post?.media_urls[0] }}
              className="w-full h-48"
              style={{ resizeMode: "cover" }}
            />
          ) : (
            <View className="w-full h-48 bg-gray-300" />
          )}
        </View>

        <View className="p-4">
          {/* Title */}
          <Text className="mb-2 text-xl font-semibold">{post?.content}</Text>

          {/* Time */}
          <View className="flex-row items-center mb-2">
            <Icon
              name="clock-time-four-outline"
              type="material-community"
              size={16}
              color="#239ED0"
            />

            <Text className="text-muted-foreground">
              {format(new Date(post?.created_at), "yyyy-MM-dd h:mm a")}
            </Text>
          </View>

          {/* Location */}
          <TouchableOpacity>
            <View className="flex-row items-center mb-3">
              <Icon
                name="map-marker"
                type="material-community"
                size={16}
                color="#239ED0"
              />
              <View className="flex-1">
                <Text className="text-sm text-muted-foreground">
                  {post?.address}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </>
  );

  return (
    <View className="flex-1">
      {user?.id === userId && <CreatePostButton />}
      {posts.length === 0 ? (
        <View className="flex-1 items-center justify-center p-4">
          <Text className="text-muted-foreground">No posts yet</Text>
        </View>
      ) : (
        <FlatList
          data={posts}
          renderItem={renderItem}
          keyExtractor={(item) => item.id.toString}
          onEndReached={(d) => {
            console.log("onEndReached", d.distanceFromEnd);

            loadPosts();
          }}
          onEndReachedThreshold={0.2}
          ListFooterComponent={loading && hasMore && <ActivityIndicator />}
        />
      )}
      {loading && hasMore && (
        <SafeAreaView className="absolute left-0 right-0 mb-[20%] bottom-0 items-center justify-center ">
          <ActivityIndicator size="large" color="#000080" />
        </SafeAreaView>
      )}
    </View>
  );
}
