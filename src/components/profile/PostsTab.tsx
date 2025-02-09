import React, { useEffect, useState } from "react";
import { View, RefreshControl } from "react-native";
import { Text } from "~/src/components/ui/text";
import PostGrid from "./PostGrid";
import CreatePostButton from "./CreatePostButton";
import { supabase } from "~/src/lib/supabase";

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
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchPosts = async () => {
    try {
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
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPosts(data || []);
    } catch (error) {
      console.error("Error fetching posts:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, [userId]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchPosts();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center">
        <Text className="text-muted-foreground">Loading posts...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1">
      <CreatePostButton />
      {posts.length === 0 ? (
        <View className="flex-1 items-center justify-center p-4">
          <Text className="text-muted-foreground">No posts yet</Text>
        </View>
      ) : (
        <PostGrid
          posts={posts}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      )}
    </View>
  );
}
