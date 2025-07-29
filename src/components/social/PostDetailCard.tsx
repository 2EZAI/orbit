import React, { useState } from "react";
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
  Share2,
  MapPin,
  Users,
  ArrowLeft,
  Send,
} from "lucide-react-native";
import { router } from "expo-router";
import { UserAvatar } from "~/src/components/ui/user-avatar";
import { UnifiedDetailsSheet } from "~/src/components/map/UnifiedDetailsSheet";

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

  const handleSubmitComment = () => {
    if (newComment.trim()) {
      onComment(newComment.trim());
      setNewComment("");
    }
  };

  const renderComment = (comment: Comment) => (
    <View key={comment.id} className="flex-row p-4 border-b border-gray-100">
      <UserAvatar
        size={32}
        user={{
          id: comment.user.id,
          name: comment.user.username || "Anonymous",
          image: comment.user.avatar_url,
        }}
      />
      <View className="flex-1 ml-3">
        <View className="flex-row items-center">
          <Text className="text-sm font-semibold">
            {comment.user.username || "Anonymous"}
          </Text>
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
                onPress={() => {
                  setSelectedEvent(post.event);
                  setIsSelectedItemLocation(false);
                }}
                className="p-4 mb-4 bg-blue-50 rounded-xl border border-blue-200"
              >
                <View className="flex-row items-center">
                  <View className="flex-1">
                    <Text className="text-lg font-semibold text-blue-900">
                      {post.event.name}
                    </Text>
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
                  <Share2 size={24} color="#666" />
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
            data={selectedEvent as any}
            isOpen={!!selectedEvent}
            onClose={() => {
              setSelectedEvent(null);
              setIsSelectedItemLocation(false);
            }}
            nearbyData={[]}
            onDataSelect={(data) => {
              setSelectedEvent(data as any);
              setIsSelectedItemLocation(false);
            }}
            onShowControler={() => {}}
            isEvent={!isSelectedItemLocation}
          />
        </>
      )}
    </SafeAreaView>
  );
}
