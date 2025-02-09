import React, { useEffect, useState } from "react";
import {
  View,
  ScrollView,
  Image,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
} from "react-native";
import { Text } from "~/src/components/ui/text";
import { useLocalSearchParams, Stack, router } from "expo-router";
import { supabase } from "~/src/lib/supabase";
import { useAuth } from "~/src/lib/auth";
import {
  Heart,
  MessageCircle,
  MoreHorizontal,
  ArrowLeft,
} from "lucide-react-native";
import { format } from "date-fns";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface Post {
  id: string;
  content: string;
  media_urls: string[];
  created_at: string;
  user: {
    id: string;
    username: string | null;
    avatar_url: string | null;
  };
  like_count: number;
  comment_count: number;
}

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user: {
    username: string | null;
    avatar_url: string | null;
  };
}

export default function PostView() {
  const params = useLocalSearchParams();
  const id = typeof params.id === "string" ? params.id : null;
  const { session } = useAuth();
  const insets = useSafeAreaInsets();
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log("[PostView] Received post ID:", id);
    if (!id) {
      setError("Invalid post ID");
      setLoading(false);
      return;
    }

    fetchPost();
    checkIfLiked();
    fetchComments();
  }, [id]);

  const fetchPost = async () => {
    if (!id) return;

    try {
      console.log("[PostView] Fetching post with ID:", id);
      const { data: rawData, error } = await supabase
        .from("posts")
        .select(
          `
          id,
          content,
          media_urls,
          created_at,
          like_count,
          comment_count,
          user:users!inner (
            id,
            username,
            avatar_url
          )
        `
        )
        .eq("id", id)
        .single();

      console.log("[PostView] Fetch result:", { data: rawData, error });
      if (error) throw error;
      if (!rawData) throw new Error("Post not found");

      // Extract user data from the array
      const userData = Array.isArray(rawData.user)
        ? rawData.user[0]
        : rawData.user;

      // Transform the data to match the Post type
      const transformedPost: Post = {
        id: rawData.id,
        content: rawData.content,
        media_urls: rawData.media_urls || [],
        created_at: rawData.created_at,
        like_count: rawData.like_count || 0,
        comment_count: rawData.comment_count || 0,
        user: {
          id: userData?.id || "",
          username: userData?.username || null,
          avatar_url: userData?.avatar_url || null,
        },
      };

      setPost(transformedPost);
      setError(null);
    } catch (error) {
      console.error("[PostView] Error fetching post:", error);
      setError("Failed to load post");
      setPost(null);
    } finally {
      setLoading(false);
    }
  };

  const checkIfLiked = async () => {
    if (!session?.user.id) return;

    try {
      const { data, error } = await supabase
        .from("post_likes")
        .select("id")
        .eq("post_id", id)
        .eq("user_id", session.user.id)
        .single();

      if (error && error.code !== "PGRST116") throw error;
      setLiked(!!data);
    } catch (error) {
      console.error("Error checking like status:", error);
    }
  };

  const fetchComments = async () => {
    try {
      const { data, error } = await supabase
        .from("post_comments")
        .select(
          `
          *,
          user:users!inner (
            username,
            avatar_url
          )
        `
        )
        .eq("post_id", id)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setComments(data || []);
    } catch (error) {
      console.error("Error fetching comments:", error);
    }
  };

  const toggleLike = async () => {
    if (!session?.user.id) {
      Alert.alert("Error", "Please sign in to like posts");
      return;
    }

    try {
      if (liked) {
        const { error } = await supabase
          .from("post_likes")
          .delete()
          .eq("post_id", id)
          .eq("user_id", session.user.id);

        if (error) throw error;
        setLiked(false);
        setPost((post) =>
          post ? { ...post, like_count: post.like_count - 1 } : null
        );
      } else {
        const { error } = await supabase
          .from("post_likes")
          .insert([{ post_id: id, user_id: session.user.id }]);

        if (error) throw error;
        setLiked(true);
        setPost((post) =>
          post ? { ...post, like_count: post.like_count + 1 } : null
        );
      }
    } catch (error) {
      console.error("Error toggling like:", error);
      Alert.alert("Error", "Failed to update like");
    }
  };

  const submitComment = async () => {
    if (!session?.user.id || !newComment.trim()) return;

    setSubmittingComment(true);
    try {
      const { error } = await supabase.from("post_comments").insert([
        {
          post_id: id,
          user_id: session.user.id,
          content: newComment.trim(),
        },
      ]);

      if (error) throw error;

      setNewComment("");
      fetchComments();
      setPost((post) =>
        post ? { ...post, comment_count: post.comment_count + 1 } : null
      );
    } catch (error) {
      console.error("Error submitting comment:", error);
      Alert.alert("Error", "Failed to submit comment");
    } finally {
      setSubmittingComment(false);
    }
  };

  return (
    <View
      className="flex-1 bg-background"
      style={{ paddingBottom: insets.bottom }}
    >
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: "Post",
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()}>
              <ArrowLeft size={24} className="text-foreground" />
            </TouchableOpacity>
          ),
        }}
      />

      {loading ? (
        <View className="items-center justify-center flex-1">
          <ActivityIndicator size="large" />
        </View>
      ) : error ? (
        <View className="items-center justify-center flex-1">
          <Text className="text-foreground">{error}</Text>
        </View>
      ) : !post ? (
        <View className="items-center justify-center flex-1">
          <Text className="text-foreground">Post not found</Text>
        </View>
      ) : (
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          className="flex-1"
          keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
          style={{ paddingBottom: insets.bottom + 60 }}
        >
          <ScrollView className="flex-1">
            {/* Post Header */}
            <View className="flex-row items-center p-4">
              <TouchableOpacity
                onPress={() => router.push(`/profile/${post.user.id}`)}
                className="flex-row items-center flex-1"
              >
                <Image
                  source={
                    post.user.avatar_url
                      ? { uri: post.user.avatar_url }
                      : require("~/assets/favicon.png")
                  }
                  className="w-10 h-10 rounded-full bg-muted"
                />
                <View className="ml-3">
                  <Text className="font-medium">
                    {post.user.username ? `@${post.user.username}` : "User"}
                  </Text>
                  <Text className="text-sm text-muted-foreground">
                    {format(new Date(post.created_at), "MMM d, yyyy")}
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity>
                <MoreHorizontal size={24} className="text-foreground" />
              </TouchableOpacity>
            </View>

            {/* Post Content */}
            <View className="p-4 pt-0">
              <Text className="text-foreground">{post.content}</Text>
            </View>

            {/* Post Media */}
            {post.media_urls && post.media_urls.length > 0 && (
              <ScrollView
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                className="w-full"
              >
                {post.media_urls.map((url, index) => (
                  <Image
                    key={index}
                    source={{ uri: url }}
                    className="w-screen aspect-square"
                    resizeMode="cover"
                  />
                ))}
              </ScrollView>
            )}

            {/* Post Actions */}
            <View className="flex-row items-center p-4 border-t border-border">
              <TouchableOpacity
                onPress={toggleLike}
                className="flex-row items-center mr-6"
              >
                <Heart
                  size={24}
                  className={liked ? "text-red-500" : "text-foreground"}
                  fill={liked ? "#ef4444" : "none"}
                />
                <Text className="ml-2">{post.like_count}</Text>
              </TouchableOpacity>

              <View className="flex-row items-center">
                <MessageCircle size={24} className="text-foreground" />
                <Text className="ml-2">{post.comment_count}</Text>
              </View>
            </View>

            {/* Comments */}
            <View className="p-4 border-t border-border">
              <Text className="mb-4 font-medium">Comments</Text>
              {comments.map((comment) => (
                <View key={comment.id} className="flex-row mb-4">
                  <Image
                    source={
                      comment.user.avatar_url
                        ? { uri: comment.user.avatar_url }
                        : require("~/assets/favicon.png")
                    }
                    className="w-8 h-8 rounded-full bg-muted"
                  />
                  <View className="flex-1 ml-3">
                    <Text className="font-medium">
                      {comment.user.username
                        ? `@${comment.user.username}`
                        : "User"}
                    </Text>
                    <Text className="text-foreground">{comment.content}</Text>
                    <Text className="text-sm text-muted-foreground">
                      {format(new Date(comment.created_at), "MMM d, yyyy")}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </ScrollView>

          {/* Comment Input */}
          <View className="p-4 border-t border-border bg-background">
            <View className="flex-row items-center px-4 rounded-full bg-muted">
              <TextInput
                className="flex-1 py-2 text-foreground"
                placeholder="Add a comment..."
                placeholderTextColor="#666"
                value={newComment}
                onChangeText={setNewComment}
                multiline
              />
              <TouchableOpacity
                onPress={submitComment}
                disabled={!newComment.trim() || submittingComment}
              >
                <Text
                  className={`font-medium ${
                    !newComment.trim() || submittingComment
                      ? "text-muted-foreground"
                      : "text-primary"
                  }`}
                >
                  {submittingComment ? "Sending..." : "Send"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      )}
    </View>
  );
}
