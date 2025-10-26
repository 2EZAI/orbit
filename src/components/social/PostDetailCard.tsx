import React, { useState, useEffect } from "react";
import {
  View,
  TouchableOpacity,
  Image,
  ScrollView,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
} from "react-native";
import { Text } from "~/src/components/ui/text";
import { format } from "date-fns";
import { Icon } from "react-native-elements";
import {
  Heart,
  MessageCircle,
  Send,
  MapPin,
  Users,
  ArrowLeft,
} from "lucide-react-native";
import type { Channel } from "stream-chat";
import { router } from "expo-router";
import { UserAvatar } from "~/src/components/ui/user-avatar";
import {
  UnifiedData,
  UnifiedDetailsSheet,
} from "~/src/components/map/UnifiedDetailsSheet";
import { useUpdateEvents } from "~/hooks/useUpdateEvents";
import { supabase } from "~/src/lib/supabase";
import { IProposal } from "~/hooks/useProposals";
import UnifiedShareSheet from "../map/UnifiedShareSheet";
import { ChatSelectionModal } from "./ChatSelectionModal";

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

interface PostDetailCardProps {
  post: Post;
  comments: Comment[];
  onLike: (postId: string) => void;
  onComment: (content: string) => void;
  loading: boolean;
  submittingComment: boolean;
}

export function PostDetailCard({
  post,
  comments,
  onLike,
  onComment,
  loading,
  submittingComment,
}: PostDetailCardProps) {
  const [newComment, setNewComment] = useState("");
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null);
  const [isSelectedItemLocation, setIsSelectedItemLocation] = useState(false);
  const [eventDetailData, setEventDetailData] = useState<any | null>(null);
  const [loadingEventDetail, setLoadingEventDetail] = useState(false);
  const [shareData, setShareData] = useState<{
    data: UnifiedData;
    isEventType: boolean;
  } | null>(null);
  const [chatShareSelection, setChatShareSelection] = useState<{
    proposal: IProposal | null;
    show: boolean;
    event: UnifiedData | null;
  }>({
    proposal: null,
    show: false,
    event: null,
  });
  const handleChatSelect = async (channel: Channel) => {
    if (!channel) return;
    try {
      // Ensure channel is watched before sending
      await channel.watch();
      if (chatShareSelection.proposal) {
        const message = await channel.sendMessage({
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
        await channel.sendMessage({
          text: `Check out ${chatShareSelection.event?.name} on Orbit! ${chatShareSelection.event?.description}`,
          data: {
            type: "event/share",
            eventId: chatShareSelection.event?.id || null,
            source: chatShareSelection.event?.source || "event",
          },
        });
      }
      // Send the post as a custom message with attachment

      // Navigate to the chat
    } catch (error) {
      console.error("Error sharing post:", error);
      // You could show a toast or alert here
    }
  };
  const { fetchEventDetail } = useUpdateEvents();

  // Fetch complete event details when an event is selected
  const fetchCompleteEventDetails = async (event: any) => {
    if (!event?.id) return;

    setLoadingEventDetail(true);
    try {
      // Always fetch from API directly to get complete data
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.access_token) {
        const response = await fetch(
          `${process.env.BACKEND_MAP_URL}/api/events/${event.id}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({
              source: event.is_ticketmaster ? "ticketmaster" : "supabase",
            }),
          }
        );

        if (response.ok) {
          const completeData = await response.json();
          console.log("✅ Fetched complete event data:", {
            id: completeData.id,
            name: completeData.name,
            created_by: completeData.created_by,
            type: completeData.type,
            attendees: completeData.attendees,
            categories: completeData.categories,
          });
          setEventDetailData(completeData);
          return completeData;
        } else {
          console.error("❌ Failed to fetch event details:", response.status);
        }
      }

      // Fallback: try the update events hook
      const detailData = await fetchEventDetail(event);
      if (detailData) {
        console.log("✅ Fallback event data:", {
          id: detailData.id,
          name: detailData.name,
          created_by: detailData.created_by,
          type: detailData.type,
        });
        setEventDetailData(detailData);
        return detailData;
      }

      // Final fallback: use original event data
      console.log("⚠️ Using original event data as fallback");
      setEventDetailData(event);
      return event;
    } catch (error) {
      console.error("❌ Error fetching complete event details:", error);
      // Fallback to original event data
      setEventDetailData(event);
      return event;
    } finally {
      setLoadingEventDetail(false);
    }
  };

  const handleSubmitComment = () => {
    if (newComment.trim()) {
      onComment(newComment.trim());
      setNewComment("");
    }
  };

  const renderComment = (comment: Comment) => (
    <View key={comment.id} className="flex-row p-4 border-b border-gray-100">
      <TouchableOpacity
        onPress={() => {
          router.push({
            pathname: "/(app)/profile/[username]",
            params: { username: comment.user.id },
          });
        }}
      >
        <UserAvatar
          size={32}
          user={{
            id: comment.user.id,
            name: comment.user.username || "Anonymous",
            image: comment.user.avatar_url,
          }}
        />
      </TouchableOpacity>
      <View className="flex-1 ml-3">
        <View className="flex-row items-center">
          <TouchableOpacity
            onPress={() => {
              router.push({
                pathname: "/(app)/profile/[username]",
                params: { username: comment.user.id },
              });
            }}
          >
            <Text className="text-sm font-semibold">
              {comment.user.username || "Anonymous"}
            </Text>
          </TouchableOpacity>
          <Text className="ml-2 text-sm text-gray-500">
            {format(new Date(comment.created_at), "MMM d")}
          </Text>
        </View>
        <Text className="mt-1 text-base">{comment.content}</Text>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center">
        <ActivityIndicator size="large" color="#1d4ed8" />
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* Header */}
      <View className="flex-row items-center p-4 border-b border-gray-200">
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft size={24} color="#000" />
        </TouchableOpacity>
        <Text className="ml-4 text-lg font-semibold">Post</Text>
      </View>

      <ScrollView className="flex-1">
        {/* Main Post */}
        <View className="border-b border-gray-200">
          {/* Post Header */}
          <View className="flex-row items-center p-4">
            <TouchableOpacity
              onPress={() => {
                if (post.user?.username) {
                  router.push(`/(app)/profile/${post.user.id}`);
                }
              }}
              className="flex-row flex-1 items-center"
            >
              <UserAvatar
                size={48}
                user={{
                  id: post.user.id,
                  name: post.user.username || "Anonymous",
                  image: post.user.avatar_url,
                }}
              />
              <View className="flex-1 ml-3">
                <Text className="text-base font-semibold">
                  {post.user.username || "Anonymous"}
                </Text>
                <Text className="text-sm text-gray-500">
                  {format(new Date(post.created_at), "MMM d, yyyy")}
                </Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity className="p-2">
              <Icon
                name="dots-horizontal"
                type="material-community"
                size={20}
                color="#666"
              />
            </TouchableOpacity>
          </View>

          {/* Post Content */}
          <View className="px-4 pb-4">
            <Text className="mb-4 text-lg leading-7">{post.content}</Text>

            {/* Media */}
            {post.media_urls && post.media_urls.length > 0 && (
              <View className="overflow-hidden mb-4 rounded-2xl">
                <Image
                  source={{ uri: post.media_urls[0] }}
                  className="w-full h-80"
                  style={{ resizeMode: "cover" }}
                />
              </View>
            )}

            {/* Location */}
            {post.address && (
              <View className="flex-row items-center mb-4">
                <MapPin size={16} color="#666" />
                <Text className="ml-1 text-sm text-gray-600">
                  {post.address}
                  {post.city && `, ${post.city}`}
                  {post.state && `, ${post.state}`}
                </Text>
              </View>
            )}

            {/* Event Card */}
            {post.event && (
              <TouchableOpacity
                onPress={async () => {
                  setSelectedEvent(post.event);
                  setIsSelectedItemLocation(false);
                  // Fetch complete event details
                  await fetchCompleteEventDetails(post.event);
                }}
                className="p-4 mb-4 bg-blue-50 rounded-xl border border-blue-200"
                disabled={loadingEventDetail}
              >
                <View className="flex-row items-center">
                  <View className="flex-1">
                    <Text className="text-lg font-semibold text-blue-900">
                      {post.event.name}
                    </Text>
                    {loadingEventDetail && (
                      <View className="flex-row items-center mt-1">
                        <ActivityIndicator size="small" color="#3B82F6" />
                        <Text className="ml-2 text-xs text-blue-600">
                          Loading event details...
                        </Text>
                      </View>
                    )}
                    <Text className="mt-1 text-sm text-blue-700">
                      {format(
                        new Date(post.event.start_datetime),
                        "MMM d • h:mm a"
                      )}
                    </Text>
                    <View className="flex-row items-center mt-2">
                      <Users size={16} color="#1e40af" />
                      <Text className="ml-1 text-sm text-blue-700">
                        {post.event.attendees_count || 0} attending
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity className="px-4 py-2 bg-blue-600 rounded-full">
                    <Text className="text-sm font-medium text-white">
                      View Event
                    </Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            )}

            {/* Post Actions */}
            <View className="flex-row justify-between items-center pt-4 border-t border-gray-100">
              <View className="flex-row items-center space-x-8">
                <TouchableOpacity
                  onPress={() => onLike(post.id)}
                  className="flex-row items-center"
                >
                  <Heart
                    size={24}
                    color={post.isLiked ? "#e11d48" : "#666"}
                    fill={post.isLiked ? "#e11d48" : "none"}
                  />
                  <Text
                    className={`ml-2 text-base ${
                      post.isLiked ? "text-red-600" : "text-gray-600"
                    }`}
                  >
                    {post.like_count}
                  </Text>
                </TouchableOpacity>

                <View className="flex-row items-center">
                  <MessageCircle size={24} color="#666" />
                  <Text className="ml-2 text-base text-gray-600">
                    {post.comment_count}
                  </Text>
                </View>

                <TouchableOpacity className="flex-row items-center">
                  <Send size={24} color="#666" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>

        {/* Comments */}
        <View>
          <View className="p-4 border-b border-gray-200">
            <Text className="text-lg font-semibold">Comments</Text>
          </View>

          {comments.length === 0 ? (
            <View className="items-center p-8">
              <Text className="text-lg text-gray-500">No comments yet</Text>
              <Text className="mt-2 text-sm text-gray-400">
                Be the first to comment!
              </Text>
            </View>
          ) : (
            comments.map(renderComment)
          )}
        </View>
      </ScrollView>

      {/* Comment Input */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="bg-white border-t border-gray-200"
      >
        <View className="flex-row items-center p-4">
          <TextInput
            value={newComment}
            onChangeText={setNewComment}
            placeholder="Add a comment..."
            className="flex-1 px-4 py-2 mr-3 rounded-full border border-gray-300"
            multiline
            maxLength={280}
          />
          <TouchableOpacity
            onPress={handleSubmitComment}
            disabled={!newComment.trim() || submittingComment}
            className={`p-2 rounded-full ${
              newComment.trim() && !submittingComment
                ? "bg-blue-600"
                : "bg-gray-300"
            }`}
          >
            {submittingComment ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Send size={20} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Event Details Sheet */}
      {selectedEvent && (
        <>
          <UnifiedDetailsSheet
            data={eventDetailData || selectedEvent}
            isOpen={!!selectedEvent}
            onClose={() => {
              setSelectedEvent(null);
              setIsSelectedItemLocation(false);
              setEventDetailData(null);
            }}
            nearbyData={[]}
            onDataSelect={(data) => {
              setSelectedEvent(data as any);
              setIsSelectedItemLocation(false);
            }}
            onShare={(data, isEvent) => {
              setSelectedEvent(null);
              setShareData({ data, isEventType: isEvent });
            }}
            onShowControler={() => {}}
            isEvent={!isSelectedItemLocation}
          />
        </>
      )}
      {shareData && (
        <UnifiedShareSheet
          isOpen={!!shareData}
          onClose={() => {
            setSelectedEvent(shareData.data);
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
            });
          }}
          onEventShare={(event) => {
            setShareData(null);
            setChatShareSelection({
              show: true,
              proposal: null,
              event: event || null,
            });
          }}
        />
      )}
      <ChatSelectionModal
        isOpen={chatShareSelection.show}
        onClose={() => {
          setChatShareSelection({ show: false, proposal: null, event: null });
        }}
        onSelectChat={handleChatSelect}
      />
    </SafeAreaView>
  );
}
