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
  DeviceEventEmitter,
} from "react-native";
import Toast from "react-native-toast-message";
import { Text } from "~/src/components/ui/text";
import { useLocalSearchParams, Stack, router } from "expo-router";
import { supabase } from "~/src/lib/supabase";
import { useAuth } from "~/src/lib/auth";
import {
  Heart,
  MessageCircle,
  MoreHorizontal,
  ArrowLeft,
  MapPin,
  Share2,
  Users,
} from "lucide-react-native";
import { format } from "date-fns";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon } from "react-native-elements";
import { MapEvent } from "~/hooks/useMapEvents";
import { EventDetailsSheet } from "~/src/components/map/EventDetailsSheet";
import { LocationDetailsSheet } from "~/src/components/map/LocationDetailsSheet";

interface Post {
  id: string;
  content: string;
  address: string;
  media_urls: string[];
  created_at: string;
  user: {
    id: string;
    username: string | null;
    avatar_url: string | null;
  };
  like_count: number;
  comment_count: number;
  event: MapEvent;
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
  const marginBottom_ = Platform.OS === "android" ? "2%" : "8%";
  const params = useLocalSearchParams();
  const id = typeof params.id === "string" ? params.id : null;
  const { session } = useAuth();
  const insets = useSafeAreaInsets();
  const [post, setPost] = useState<Post | null>(null);
  const [likeCount, setLikeCount] = useState(0);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isShowEvent, setIsShowEvent] = useState(false);

  useEffect(() => {
    console.log("[PostView] Received post ID:", id);
    if (!id) {
      setError("Invalid post ID");
      setLoading(false);
      return;
    }

    fetchPost();
    getLikeCount();
    checkIfLiked();
    fetchComments();
  }, [id]);

  useEffect(() => {
    DeviceEventEmitter.addListener("refreshPost", (valueEvent) => {
      console.log("event----refreshPost");
      getLikeCount();
      checkIfLiked();
      fetchComments();
    });
  }, []);

  const { event } = useLocalSearchParams();
  const [eventObj, setEventObj] = useState(null);

  useEffect(() => {
    if (event) {
      try {
        const parsed = typeof event === "string" ? JSON.parse(event) : event;
        setEventObj(parsed);
      } catch (e) {
        console.error("Failed to parse event:", e);
      }
    }
  }, [event]);

  //   const fetchPost = async () => {
  //     if (!id) return;

  //     try {
  //       console.log("[PostView] Fetching post with ID:", id);
  //       const { data: rawData, error } = await supabase
  //         .from("posts")
  //         .select(
  //           `
  //           id,
  //           content,
  //           address,
  //           media_urls,
  //           created_at,
  //           like_count,
  //           comment_count,
  //           user:users!inner (
  //             id,
  //             username,
  //             avatar_url
  //           )
  //         `
  //         )
  //         .eq("id", id)
  //         .single();

  //       console.log("[PostView] Fetch resulttt:", { data: rawData, error });
  //       if (error) throw error;
  //       if (!rawData) throw new Error("Post not found");

  //       // Extract user data from the array
  //       const userData = Array.isArray(rawData.user)
  //         ? rawData.user[0]
  //         : rawData.user;

  //       // Transform the data to match the Post type
  //       const transformedPost: Post = {
  //         id: rawData.id,
  //         content: rawData.content,
  //         address:rawData.address,
  //         media_urls: rawData.media_urls || [],
  //         created_at: rawData.created_at,
  //         like_count: rawData.like_count || 0,
  //         comment_count: rawData.comment_count || 0,
  //         user: {
  //           id: userData?.id || "",
  //           username: userData?.username || null,
  //           avatar_url: userData?.avatar_url || null,
  //         },
  //       };
  // console.log("transformedPost>",transformedPost);
  //       setPost(transformedPost);
  //       setError(null);
  //     } catch (error) {
  //       console.error("[PostView] Error fetching post:", error);
  //       setError("Failed to load post");
  //       setPost(null);
  //     } finally {
  //       setLoading(false);
  //     }
  //   };

  const fetchPost = async () => {
    if (!id) return;

    try {
      const { data: rawData, error } = await supabase
        .from("posts")
        .select(
          `
    id,
    content,
    address,
    media_urls,
    created_at,
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
      start_datetime,
      end_datetime,
      venue_name,
      address,
      city,
      state
    )
  `
        )
        .eq("id", id)
        .single();

      if (error) throw error;
      if (!rawData) throw new Error("Post not found");

      // user is an object (not array)
      const userData = rawData.user;

      const transformedPost: Post = {
        id: rawData.id,
        content: rawData.content,
        address: rawData.address,
        media_urls: rawData.media_urls || [],
        created_at: rawData.created_at,
        like_count: rawData.like_count || 0,
        comment_count: rawData.comment_count || 0,
        user: {
          id: userData?.id || "",
          username: userData?.username || null,
          avatar_url: userData?.avatar_url || null,
        },
        event: rawData?.event || null,
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

  const getLikeCount = async () => {
    try {
      const { count, error } = await supabase
        .from("post_likes")
        .select("id", { count: "exact", head: true })
        .eq("post_id", id);

      if (error) throw error;

      console.log("Like count:", count);
      setLikeCount(count || 0); // if you have a state to store it
    } catch (error) {
      console.error("Error fetching like count:", error);
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
        setLikeCount((prev) => prev - 1);
        setPost((post) =>
          post ? { ...post, like_count: post.like_count - 1 } : null
        );
      } else {
        const { error } = await supabase
          .from("post_likes")
          .insert([{ post_id: id, user_id: session.user.id }]);

        if (error) throw error;
        setLiked(true);
        setLikeCount((prev) => prev + 1);
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
      style={{ paddingBottom: insets.bottom, marginBottom: marginBottom_ }}
    >
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: "Post",
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()}>
              {Platform.OS == "ios" ? (
                <ArrowLeft size={24} className="text-foreground" />
              ) : (
                <Icon
                  name="arrow-left"
                  type="material-community"
                  size={24}
                  color="#239ED0"
                />
              )}
            </TouchableOpacity>
          ),
        }}
      />

      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" />
        </View>
      ) : error ? (
        <View className="flex-1 justify-center items-center">
          <Text className="text-foreground">{error}</Text>
        </View>
      ) : !post ? (
        <View className="flex-1 justify-center items-center">
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
            {session.user.id !== post.user.id && (
              <View className="flex-row items-center p-4">
                <TouchableOpacity
                  onPress={() => {
                    router.push(`/profile/${post.user.id}`);
                  }}
                  className="flex-row flex-1 items-center"
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
            )}

            {/* Post Content */}
            <View className="p-4 pt-0 mt-6">
              <Text className="text-foreground">{post.content}</Text>
            </View>

            {/* Post address */}
            <View className="flex-row items-center p-3 pt-0">
              {Platform.OS == "ios" ? (
                <MapPin size={20} className="text-primary" />
              ) : (
                <Icon
                  name="map-marker"
                  type="material-community"
                  size={20}
                  color="#239ED0"
                />
              )}

              <Text className="ml-2 text-sm text-muted-foreground">
                {post?.address}
              </Text>
            </View>

            {/* event */}
            {eventObj != null && (
              <View className="flex-row justify-between items-center px-4 mb-3">
                <Text className="text-sm text-primary">{eventObj?.name}</Text>
                <TouchableOpacity
                  onPress={() => {
                    setIsShowEvent(!isShowEvent);
                  }}
                  className="px-4 py-2 rounded-full bg-primary"
                >
                  <Text className="text-sm text-white">View Event</Text>
                </TouchableOpacity>
              </View>
            )}

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
                {Platform.OS === "ios" ? (
                  <Heart
                    size={24}
                    className={liked ? "text-red-500" : "text-foreground"}
                    fill={liked ? "#ef4444" : "none"}
                  />
                ) : (
                  <Icon
                    name={liked ? "heart" : "heart-outline"}
                    type="material-community"
                    size={24}
                    color={liked ? "#ef4444" : "#239ED0"}
                  />
                )}
                <Text className="ml-2">{likeCount}</Text>
              </TouchableOpacity>

              <View className="flex-row items-center">
                {Platform.OS === "ios" ? (
                  <MessageCircle size={24} className="text-foreground" />
                ) : (
                  <Icon
                    name="chat-outline"
                    type="material-community"
                    size={24}
                    color="#239ED0"
                  />
                )}
                {/*  <Text className="ml-2">{post.comment_count}</Text>*/}
                <Text className="ml-2">{comments?.length}</Text>
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

          {eventObj != null && isShowEvent && (
            <EventDetailsSheet
              nearbyEvents={[]}
              onEventSelect={() => {}}
              event={eventObj}
              isOpen={!!isShowEvent}
              onClose={() => setIsShowEvent(false)}
              // nearbyEvents={events}
              // onEventSelect={setSelectedEvent}
              onShowControler={() => {}}
            />
          )}
        </KeyboardAvoidingView>
      )}
    </View>
  );
}
