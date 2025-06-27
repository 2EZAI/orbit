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
import { useAuth } from "~/src/lib/auth";
import { MapEvent } from "~/hooks/useMapEvents";

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
  event: MapEvent;
}

interface PostsTabProps {
  userId: string;
  selectedItem: any;
}

export default function PostsTab({ userId, selectedItem }: PostsTabProps) {
  const { user } = useUser();
  const { session } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const PAGE_SIZE = 20;

  const loadPosts = async () => {
    if (loading || !hasMore) return;
    setLoading(true);

    try {
      const eventData = {
        user_id: userId,
      };
      const response = await fetch(
        `${process.env.BACKEND_MAP_URL}/api/posts/all/user?page=${page}&limit=${PAGE_SIZE}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify(eventData),
        }
      );
      console.log("session.access_token>>", session.access_token);
      console.log("page>", page);
      console.log("session.access_token>>", session.access_token);

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const data_ = await response.json();
      console.warn("data_>>", data_);
      const data = data_?.data;

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
        onPress={() => {
          // router.push(`/post/${post.id}`)

          router.push({
            pathname: `/post/${post.id}`,
            params: { event: JSON.stringify(post?.event) },
          });
        }}
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

          {/* event */}
          {post?.event && (
            <View className="flex-row items-center mb-3 justify-between">
              <Text className="text-sm text-primary">{post?.event?.name}</Text>
              <TouchableOpacity
                onPress={() => {
                  selectedItem(post?.event);
                }}
                className=" bg-primary rounded-full px-4 py-2"
              >
                <Text className="text-sm text-white">View Event</Text>
              </TouchableOpacity>
            </View>
          )}
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
