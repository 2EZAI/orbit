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
  RefreshControl,
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
import { UnifiedDetailsSheet } from "~/src/components/map/UnifiedDetailsSheet";
import { useTheme } from "~/src/components/ThemeProvider";
import { SocialEventCard } from "~/src/components/social/SocialEventCard";

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
  event?: MapEvent | null; // Make event optional
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

// Define eventObj type based on MapEvent
interface EventObject {
  id: string;
  name: string;
  description?: string;
  start_datetime?: string;
  end_datetime?: string;
  venue_name?: string;
  location?: any;
  address?: string;
  image_urls?: string[];
  [key: string]: any; // Allow additional properties
}

export default function PostView() {
  const { theme } = useTheme();
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
  const [refreshing, setRefreshing] = useState<boolean>(false);

  useEffect(() => {
    // console.log("[PostView] Received post ID:", id);
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

  const onRefresh = async () => {
    getLikeCount();
    checkIfLiked();
    fetchComments();
  };

  const { event } = useLocalSearchParams();
  const [eventObj, setEventObj] = useState<EventObject | null>(null);

  useEffect(() => {
    if (event) {
      try {
        const parsed = typeof event === "string" ? JSON.parse(event) : event;
        setEventObj(parsed as EventObject);
      } catch (e) {
        console.error("Failed to parse event:", e);
      }
    }
  }, [event]);

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
    )
  `
        )
        .eq("id", id)
        .single();

      if (error) throw error;
      if (!rawData) throw new Error("Post not found");

      // Handle both array and object cases from Supabase query
      const userData = Array.isArray(rawData.user)
        ? rawData.user[0]
        : rawData.user;

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
        event: null, // Set to null by default, can be populated later if needed
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
      setLikeCount(count || 0);
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
        hitNoificationApi("like");
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
      hitNoificationApi("comment");
    } catch (error) {
      console.error("Error submitting comment:", error);
      Alert.alert("Error", "Failed to submit comment");
    } finally {
      setSubmittingComment(false);
    }
  };

  const hitNoificationApi = async (typee: string) => {
    if (!session?.user.id) return;
    try {
      const reuestData = {
        userId: post?.user?.id,
        senderId: session?.user?.id,
        type: typee,
        data: {
          post_id: id,
        },
      };

      const response = await fetch(
        `${process.env.BACKEND_MAP_URL}/api/notifications/send`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.user.id}`,
          },
          body: JSON.stringify(reuestData),
        }
      );
      console.log("eventData", reuestData);

      if (!response.ok) {
        console.log("error>", response);
        throw new Error(await response.text());
      }

        const data_ = await response.json();
        // console.log("response>",data_);
    }
    catch(e)
    {
console.log("error_catch>",e);
    }
  };

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: theme.colors.background,
        paddingBottom: insets.bottom + parseInt(marginBottom_.replace("%", "")),
      }}
    >
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: "Post",
          headerStyle: {
            backgroundColor: theme.colors.card,
          },
          headerTitleStyle: {
            color: theme.colors.text,
            fontSize: 18,
            fontWeight: "600",
          },
          headerTintColor: theme.colors.text,
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.push("/(app)/(social)")}>
              {Platform.OS === "ios" ? (
                <ArrowLeft size={24} color={theme.colors.text} />
              ) : (
                <Icon
                  name="arrow-left"
                  type="material-community"
                  size={24}
                  color={theme.colors.primary || "#239ED0"}
                />
              )}
            </TouchableOpacity>
          ),
          headerShadowVisible: false,
        }}
      />

      {loading ? (
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : error ? (
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <Text style={{ color: theme.colors.text }}>{error}</Text>
        </View>
      ) : !post ? (
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <Text style={{ color: theme.colors.text }}>Post not found</Text>
        </View>
      ) : (
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
          keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
        >
          <ScrollView
            style={{ flex: 1 }}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
          >
            {/* Post Header - Always show who posted */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                padding: 16,
                backgroundColor: theme.colors.card,
              }}
            >
              <TouchableOpacity
                onPress={() => {
                  router.push(`/(app)/profile/${post.user.id}`);
                }}
                style={{
                  flexDirection: "row",
                  flex: 1,
                  alignItems: "center",
                }}
              >
                <Image
                  source={
                    post.user.avatar_url
                      ? { uri: post.user.avatar_url }
                      : require("~/assets/favicon.png")
                  }
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 24,
                    backgroundColor: theme.colors.border,
                  }}
                />
                <View style={{ marginLeft: 12 }}>
                  <Text
                    style={{
                      fontWeight: "600",
                      color: theme.colors.text,
                      fontSize: 16,
                    }}
                  >
                    {post.user.username ? `@${post.user.username}` : "User"}
                  </Text>
                  <Text
                    style={{
                      fontSize: 14,
                      color: theme.colors.text + "80",
                    }}
                  >
                    {format(
                      new Date(post.created_at),
                      "MMM d, yyyy 'at' h:mm a"
                    )}
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity>
                <MoreHorizontal size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            {/* Post Content */}
            <View
              style={{
                padding: 16,
                paddingTop: 0,
                backgroundColor: theme.colors.card,
              }}
            >
              <Text
                style={{
                  color: theme.colors.text,
                  fontSize: 16,
                  lineHeight: 24,
                }}
              >
                {post.content}
              </Text>
            </View>

            {/* Post address */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                paddingHorizontal: 16,
                paddingBottom: 12,
                backgroundColor: theme.colors.card,
              }}
            >
              {Platform.OS === "ios" ? (
                <MapPin size={20} color={theme.colors.primary || "#239ED0"} />
              ) : (
                <Icon
                  name="map-marker"
                  type="material-community"
                  size={20}
                  color={theme.colors.primary || "#239ED0"}
                />
              )}

              <Text
                style={{
                  marginLeft: 8,
                  fontSize: 14,
                  color: theme.colors.text + "80",
                }}
              >
                {post?.address}
              </Text>
            </View>

            {/* Event Card */}
            {eventObj != null && (
              <View style={{ paddingHorizontal: 16, marginBottom: 16 }}>
                <SocialEventCard
                  data={eventObj as any}
                  onDataSelect={(data) => {
                    setIsShowEvent(true);
                  }}
                  onShowDetails={() => {
                    setIsShowEvent(true);
                  }}
                  treatAsEvent={true}
                />
              </View>
            )}

            {/* Post Media */}
            {post.media_urls && post.media_urls.length > 0 && (
              <ScrollView
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                style={{ width: "100%" }}
              >
                {post.media_urls.map((url, index) => (
                  <Image
                    key={index}
                    source={{ uri: url }}
                    style={{
                      width:
                        Platform.OS === "web"
                          ? 400
                          : require("react-native").Dimensions.get("window")
                              .width,
                      aspectRatio: 1,
                    }}
                    resizeMode="cover"
                  />
                ))}
              </ScrollView>
            )}

            {/* Post Actions */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                padding: 16,
                borderTopWidth: 1,
                borderTopColor: theme.colors.border,
                backgroundColor: theme.colors.card,
              }}
            >
              <TouchableOpacity
                onPress={toggleLike}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginRight: 24,
                }}
              >
                {Platform.OS === "ios" ? (
                  <Heart
                    size={24}
                    color={liked ? "#ef4444" : theme.colors.text}
                    fill={liked ? "#ef4444" : "none"}
                  />
                ) : (
                  <Icon
                    name={liked ? "heart" : "heart-outline"}
                    type="material-community"
                    size={24}
                    color={
                      liked ? "#ef4444" : theme.colors.primary || "#239ED0"
                    }
                  />
                )}
                <Text style={{ marginLeft: 8, color: theme.colors.text }}>
                  {likeCount}
                </Text>
              </TouchableOpacity>

              <View style={{ flexDirection: "row", alignItems: "center" }}>
                {Platform.OS === "ios" ? (
                  <MessageCircle size={24} color={theme.colors.text} />
                ) : (
                  <Icon
                    name="chat-outline"
                    type="material-community"
                    size={24}
                    color={theme.colors.primary || "#239ED0"}
                  />
                )}
                <Text style={{ marginLeft: 8, color: theme.colors.text }}>
                  {comments?.length}
                </Text>
              </View>
            </View>

            {/* Comments */}
            <View
              style={{
                padding: 16,
                borderTopWidth: 1,
                borderTopColor: theme.colors.border,
                backgroundColor: theme.colors.card,
              }}
            >
              <Text
                style={{
                  marginBottom: 16,
                  fontWeight: "500",
                  color: theme.colors.text,
                }}
              >
                Comments
              </Text>
              {comments.map((comment) => (
                <View
                  key={comment.id}
                  style={{ flexDirection: "row", marginBottom: 16 }}
                >
                  <Image
                    source={
                      comment.user.avatar_url
                        ? { uri: comment.user.avatar_url }
                        : require("~/assets/favicon.png")
                    }
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 16,
                      backgroundColor: theme.colors.border,
                    }}
                  />
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text
                      style={{
                        fontWeight: "500",
                        color: theme.colors.text,
                      }}
                    >
                      {comment.user.username
                        ? `@${comment.user.username}`
                        : "User"}
                    </Text>
                    <Text style={{ color: theme.colors.text, marginTop: 2 }}>
                      {comment.content}
                    </Text>
                    <Text
                      style={{
                        fontSize: 14,
                        color: theme.colors.text + "80",
                        marginTop: 4,
                      }}
                    >
                      {format(new Date(comment.created_at), "MMM d, yyyy")}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </ScrollView>

          {/* Comment Input */}
          <View
            style={{
              padding: 16,
              marginBottom: 56,
              borderTopWidth: 1,
              borderTopColor: theme.colors.border,
              backgroundColor: theme.colors.card,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                paddingHorizontal: 16,
                borderRadius: 25,
                backgroundColor: theme.colors.background,
              }}
            >
              <TextInput
                style={{
                  flex: 1,
                  paddingVertical: 8,
                  color: theme.colors.text,
                  fontSize: 16,
                }}
                placeholder="Add a comment..."
                placeholderTextColor={theme.colors.text + "60"}
                value={newComment}
                onChangeText={setNewComment}
                multiline
              />
              <TouchableOpacity
                onPress={submitComment}
                disabled={!newComment.trim() || submittingComment}
              >
                <Text
                  style={{
                    fontWeight: "500",
                    color:
                      !newComment.trim() || submittingComment
                        ? theme.colors.text + "60"
                        : theme.colors.primary || "#239ED0",
                  }}
                >
                  {submittingComment ? "Sending..." : "Send"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {eventObj != null && isShowEvent && (
            <UnifiedDetailsSheet
              nearbyData={[]}
              onDataSelect={() => {}}
              data={eventObj as any}
              isOpen={!!isShowEvent}
              onClose={() => setIsShowEvent(false)}
              onShowControler={() => {}}
              isEvent={true}
            />
          )}
        </KeyboardAvoidingView>
      )}
    </View>
  );
}
