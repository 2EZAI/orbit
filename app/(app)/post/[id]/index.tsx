import { format } from "date-fns";
import * as Haptics from "expo-haptics";
import { Stack, router, useLocalSearchParams } from "expo-router";
import { ArrowLeft, Heart, MapPin, MessageCircle } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  DeviceEventEmitter,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Icon } from "react-native-elements";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { Channel } from "stream-chat";
import { useFlagging } from "~/hooks/useFlagging";
import { useNotificationsApi } from "~/hooks/useNotificationsApi";
import { IProposal } from "~/hooks/useProposals";
import {
  UnifiedData,
  UnifiedDetailsSheet,
} from "~/src/components/map/UnifiedDetailsSheet";
import UnifiedShareSheet from "~/src/components/map/UnifiedShareSheet";
import FlagContentModal from "~/src/components/modals/FlagContentModal";
import { ChatSelectionModal } from "~/src/components/social/ChatSelectionModal";
import { CommentActionSheet } from "~/src/components/social/CommentActionSheet";
import { PostMenuDropdown } from "~/src/components/social/PostMenuDropdown";
import { SocialEventCard } from "~/src/components/social/SocialEventCard";
import { useTheme } from "~/src/components/ThemeProvider";
import { Text } from "~/src/components/ui/text";
import { useAuth } from "~/src/lib/auth";
import { usePostRefresh } from "~/src/lib/postProvider";
import { supabase } from "~/src/lib/supabase";
import { IPost, socialPostService } from "~/src/services/socialPostService";

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user: {
    id: string;
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
  const { sendNotification } = useNotificationsApi();
  const insets = useSafeAreaInsets();
  const [post, setPost] = useState<IPost | null>(null);
  const [likeCount, setLikeCount] = useState(0);
  const [commentCount, setCommentCount] = useState(0);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isShowEvent, setIsShowEvent] = useState(false);
  const [refreshing] = useState<boolean>(false);
  const [shareData, setShareData] = useState<{
    data: UnifiedData;
    isEventType: boolean;
  } | null>(null);
  const [chatShareSelection, setChatShareSelection] = useState<{
    proposal: IProposal | null;
    show: boolean;
    event: UnifiedData | null;
    isEventType: boolean;
  }>({
    proposal: null,
    show: false,
    event: null,
    isEventType: false,
  });
  const { isRefreshRequired, setRefreshRequired } = usePostRefresh();

  const handleChatSelect = async (channel: Channel) => {
    if (!channel) return;
    try {
      // Ensure channel is watched before sending
      await channel.watch();
      if (chatShareSelection.proposal) {
        await channel.sendMessage({
          text: "Check out this proposal!",
          type: "regular",
          data: {
            proposal: chatShareSelection.proposal,
            type: "proposal/share",
          },
        });
        // router.push(`/(app)/(chat)/channel/${channel.id}`);
      }
      if (chatShareSelection.event) {
        const attachmentType =
          chatShareSelection.event?.source === "ticketmaster"
            ? "ticketmaster"
            : chatShareSelection.isEventType
            ? "event"
            : "location";
        const createPostShareAttachment = (
          type: "event" | "location" | "ticketmaster"
        ) => {
          switch (type) {
            case "event":
              const eventData = chatShareSelection.event;
              return {
                type: "event_share",
                event_id: eventData?.id || "",
                event_data: eventData,
              };
            case "location":
              const locationData = chatShareSelection.event;
              return {
                type: "location_share",
                location_id: locationData?.id || "",
                location_data: locationData,
              };
            case "ticketmaster":
              const ticketmasterData = chatShareSelection.event;
              return {
                type: "ticketmaster_share",
                event_id: ticketmasterData?.id || "",
                event_data: {
                  id: ticketmasterData?.id,
                  name: ticketmasterData?.name,
                  description: ticketmasterData?.description,
                  image_urls: ticketmasterData?.image_urls,
                  start_datetime: ticketmasterData?.start_datetime,
                  venue_name: ticketmasterData?.venue_name,
                  address: ticketmasterData?.address,
                  city: ticketmasterData?.city,
                  state: ticketmasterData?.state,
                  source: "ticketmaster",
                },
              };
            default:
              return null;
          }
        };
        const attachment = createPostShareAttachment(attachmentType);
        await channel.sendMessage({
          text: `Check out ${chatShareSelection.event?.name} on Orbit!`,
          type: "regular",
          // Send attachment (like web app) for cross-platform compatibility
          attachments: attachment ? [attachment] : [],
        });
      }
      // Send the post as a custom message with attachment

      // Navigate to the chat
    } catch (error) {
      console.error("Error sharing post:", error);
      // You could show a toast or alert here
    }
  };
  useEffect(() => {
    // console.log("[PostView] Received post ID:", id);
    if (!id) {
      setError("Invalid post ID");
      setLoading(false);
      return;
    }

    fetchPost();
  }, [id]);

  useEffect(() => {
    DeviceEventEmitter.addListener("refreshPost", (valueEvent) => {
      console.log("event----refreshPost");

      checkIfLiked();
    });
  }, []);

  const onRefresh = async () => {
    checkIfLiked();
  };

  const { event } = useLocalSearchParams();
  const [eventObj, setEventObj] = useState<EventObject | null>(null);
  const [flagOpen, setFlagOpen] = useState({
    open: false,
    id: "",
    type: "post" as "post" | "comment",
  });
  const [commentActionSheet, setCommentActionSheet] = useState<{
    visible: boolean;
    commentId: string;
  }>({ visible: false, commentId: "" });
  const { createFlag } = useFlagging();
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
      // Get fresh session token
      const {
        data: { session: currentSession },
      } = await supabase.auth.getSession();
      const authToken =
        currentSession?.access_token || session?.access_token || "";

      if (!authToken) {
        console.warn(
          "⚠️ [PostView] No auth token available for fetching post details"
        );
        setError("Please sign in to view post details");
        setLoading(false);
        return;
      }

      const postDetails = await socialPostService.getPostDetails(id, authToken);

      if (!postDetails) {
        console.error("❌ [PostView] Post details returned null");
        setError("Failed to load post");
        setPost(null);
        setLoading(false);
        return;
      }

      // Handle both new API structure (data) and legacy structure (post) - matching web app
      const postData = postDetails?.data || postDetails?.post || null;

      if (!postData) {
        setError("Failed to load post");
        setPost(null);
        setLoading(false);
        return;
      }

      setPost(postData);

      // Extract comments exactly like web app CommentSection does:
      // if (postData?.post?.comments?.items) return postData.post.comments.items
      // if (postData?.comments && Array.isArray(postData.comments)) return postData.comments
      let commentsData: Comment[] = [];
      if (postDetails?.post?.comments?.items) {
        commentsData = postDetails.post.comments.items;
      } else if (postDetails?.comments && Array.isArray(postDetails.comments)) {
        commentsData = postDetails.comments;
      } else if (postDetails?.data?.comments?.items) {
        commentsData = postDetails.data.comments.items;
      }

      setComments(commentsData);

      setLikeCount(postData.like_count ?? 0);
      setCommentCount(commentsData.length ?? 0);

      if (postData.is_liked !== null && postData.is_liked !== undefined) {
        setLiked(postData.is_liked);
        console.log("✅ [PostDetail] Using API is_liked:", postData.is_liked);
      } else {
        // Fallback: check Supabase directly if API doesn't provide is_liked
        console.log(
          "⚠️ [PostDetail] API didn't provide is_liked, checking Supabase"
        );
        checkIfLiked();
      }

      setError(null);
    } catch (error) {
      console.error("❌ [PostView] Error fetching post:", error);
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

  const toggleLike = async () => {
    if (!session?.user.id || !session?.access_token) {
      Alert.alert("Error", "Please sign in to like posts");
      return;
    }

    if (!id) return;

    try {
      if (liked) {
        await socialPostService.unlikePost(id, session.access_token);
        setLiked(false);
        setLikeCount((prev) => prev - 1);
        setPost((post) =>
          post ? { ...post, like_count: post.like_count - 1 } : null
        );
      } else {
        await socialPostService.likePost(id, session.access_token);
        setLiked(true);
        setLikeCount((prev) => prev + 1);
        setPost((post) =>
          post ? { ...post, like_count: post.like_count + 1 } : null
        );
        sendNotification({
          type: "like",
          userId: post?.user?.id,
          postId: id,
        });
      }

      // Notify list screen to refresh when navigating back
      setRefreshRequired(true);
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
      if (!isRefreshRequired) {
        setRefreshRequired(true);
      }
      // Refresh post data to get updated comments and counts
      fetchPost();

      sendNotification({
        type: "comment",
        userId: post?.user?.id,
        postId: id || undefined,
      });
    } catch (error) {
      console.error("Error submitting comment:", error);
      Alert.alert("Error", "Failed to submit comment");
    } finally {
      setSubmittingComment(false);
    }
  };

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: theme.colors.card,
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
          headerRight: () => (
            <PostMenuDropdown
              postId={post?.id || ""}
              isOwner={post?.user?.id === session?.user.id}
              onReport={(postId) =>
                setFlagOpen({ open: true, id: postId, type: "post" })
              }
            />
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
                  router.push(`/profile/${post.user.id}`);
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

            {post?.location_data?.address &&
              post?.location_data?.city &&
              post?.location_data?.state && (
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
                    <MapPin
                      size={20}
                      color={theme.colors.primary || "#239ED0"}
                    />
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
                    {post?.location_data?.address} {post?.location_data?.city}{" "}
                    {post?.location_data?.state}
                  </Text>
                </View>
              )}

            {/* Event Card */}
            {eventObj != null && (
              <View style={{ paddingHorizontal: 16, marginBottom: 16 }}>
                <SocialEventCard
                  data={post?.event as any}
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
                  {commentCount}
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
                <Pressable
                  key={comment.id}
                  onLongPress={() => {
                    if (comment.user.id !== session?.user.id) {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      setCommentActionSheet({
                        visible: true,
                        commentId: comment.id,
                      });
                    }
                  }}
                  delayLongPress={400}
                  style={{ flexDirection: "row", marginBottom: 16 }}
                >
                  <TouchableOpacity
                    onPress={() => {
                      router.push({
                        pathname: "/profile/[username]",
                        params: { username: comment.user.id },
                      });
                    }}
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
                  </TouchableOpacity>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <TouchableOpacity
                      onPress={() => {
                        router.push({
                          pathname: "/profile/[username]",
                          params: { username: comment.user.id },
                        });
                      }}
                    >
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
                    </TouchableOpacity>
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
                </Pressable>
              ))}
            </View>
          </ScrollView>

          {/* Comment Input */}
          <View
            style={{
              padding: 16,
              marginBottom: Platform.OS === "ios" ? 56 : 90,
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
              onShare={(data, isEvent) => {
                setIsShowEvent(false);
                setShareData({ data, isEventType: isEvent });
              }}
            />
          )}
          {shareData && (
            <UnifiedShareSheet
              isOpen={!!shareData}
              onClose={() => {
                setIsShowEvent(true);
                setShareData(null);
              }}
              data={shareData?.data}
              isEventType={shareData?.isEventType}
              onProposalShare={(proposal: IProposal) => {
                setShareData(null);
                setChatShareSelection({
                  show: true,
                  proposal: proposal || null,
                  event: null,
                  isEventType: false,
                });
              }}
              onEventShare={(event) => {
                setShareData(null);
                setChatShareSelection({
                  show: true,
                  proposal: null,
                  event: event || null,
                  isEventType: shareData?.isEventType,
                });
              }}
            />
          )}
          <ChatSelectionModal
            isOpen={chatShareSelection.show}
            onClose={() => {
              setChatShareSelection({
                show: false,
                proposal: null,
                event: null,
                isEventType: false,
              });
            }}
            onSelectChat={handleChatSelect}
          />
        </KeyboardAvoidingView>
      )}
      <FlagContentModal
        visible={flagOpen.open}
        contentTitle={flagOpen.type === "comment" ? "Comment" : "Post"}
        variant="sheet"
        onClose={() => setFlagOpen({ open: false, id: "", type: "post" })}
        onSubmit={async ({ reason, explanation }) => {
          console.log("flagOpen>", flagOpen);
          if (flagOpen.type === "comment") {
            const response = await createFlag({
              reason,
              explanation,
              post_comment_id: flagOpen.id,
            });

            if (response) {
              await fetchPost();
              setFlagOpen({ open: false, id: "", type: "post" });
            }
          } else {
            const response = await createFlag({
              reason,
              explanation,
              post_id: flagOpen.id,
            });
            console.log("response>", response);
            if (response.ok) {
              setFlagOpen({ open: false, id: "", type: "post" });
              router.push({
                pathname: "/(app)/(social)",
                params: {
                  refreshRequired: "true",
                },
              });
            }
          }
        }}
      />

      <CommentActionSheet
        visible={commentActionSheet.visible}
        onClose={() => setCommentActionSheet({ visible: false, commentId: "" })}
        onReport={() => {
          setFlagOpen({
            open: true,
            id: commentActionSheet.commentId,
            type: "comment",
          });
        }}
      />
    </View>
  );
}
