import React, { useEffect, useState } from "react";
import { View, RefreshControl } from "react-native";
import { Text } from "~/src/components/ui/text";
import PostGridWithName from "./PostGridWithName";
import { supabase } from "~/src/lib/supabase";
import { useAuth } from "~/src/lib/auth";

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

interface AllPostsTabProps {
  userId: string;
}

export default function AllPostsTab({ userId }: AllPostsTabProps) {
   const { session } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchPosts = async () => {
      if (!session?.user.id) return;
    try {
      const { data, error } = await supabase

  .from("posts")

  .select(`
    *,
    users (username,avatar_url )
  `)
   .neq("user_id", session.user.id) // <- filter out posts from this user
  .order("created_at", { ascending: false });

console.log('dataposts>',data);
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
  }, []);

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
     
      {posts.length === 0 ? (
        <View className="flex-1 items-center justify-center p-4">
          <Text className="text-muted-foreground">No posts yet</Text>
        </View>
      ) : (
        
        <PostGridWithName
          posts={posts}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
     
      )}
    </View>
  );
}
