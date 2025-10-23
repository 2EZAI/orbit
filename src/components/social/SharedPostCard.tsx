import React from "react";
import { View, TouchableOpacity, Image } from "react-native";
import { Text } from "~/src/components/ui/text";
import { useTheme } from "~/src/components/ThemeProvider";
import { UserAvatar } from "~/src/components/ui/user-avatar";
import { format } from "date-fns";
import { MapPin, Calendar, Users } from "lucide-react-native";

interface SharedPostCardProps {
  post: {
    id: string;
    content: string;
    media_urls: string[];
    created_at: string;
    address?: string;
    city?: string;
    state?: string;
    user: {
      id: string;
      username: string | null;
      avatar_url: string | null;
      first_name?: string | null;
      last_name?: string | null;
    };
    event?: any;
    like_count: number;
    comment_count: number;
  };
  onViewPost: () => void;
}

export function SharedPostCard({ post, onViewPost }: SharedPostCardProps) {
  const { theme, isDarkMode } = useTheme();
  
  const hasImages = post.media_urls && post.media_urls.length > 0;
  const hasLocation = post.address || post.city || post.state;
  const hasEvent = post.event;

  return (
    <View
      className="rounded-xl overflow-hidden"
      style={{
        backgroundColor: theme.colors.card,
        borderWidth: 1,
        borderColor: theme.colors.border,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
      }}
    >
      {/* Header */}
      <View className="flex-row items-center p-3 border-b" style={{ borderBottomColor: theme.colors.border }}>
        <UserAvatar
          size={32}
          user={{
            id: post.user.id,
            name: post.user.first_name && post.user.last_name
              ? `${post.user.first_name} ${post.user.last_name}`
              : post.user.username || "Anonymous",
            image: post.user.avatar_url,
          }}
        />
        <View className="flex-1 ml-2">
          <Text
            className="text-sm font-semibold"
            style={{ color: theme.colors.text }}
          >
            {post.user.first_name && post.user.last_name
              ? `${post.user.first_name} ${post.user.last_name}`
              : post.user.username || "Anonymous"}
          </Text>
          <Text
            className="text-xs"
            style={{ color: isDarkMode ? "#9CA3AF" : "#6B7280" }}
          >
            {format(new Date(post.created_at), "MMM d • h:mm a")}
          </Text>
        </View>
      </View>

      {/* Content */}
      <View className="p-3">
        {/* Post Text */}
        {post.content && (
          <Text
            className="text-sm leading-5 mb-2"
            style={{ color: theme.colors.text }}
            numberOfLines={2}
          >
            {post.content}
          </Text>
        )}

        {/* Post Image */}
        {hasImages && (
          <View className="mb-2 rounded-lg overflow-hidden">
            <Image
              source={{ uri: post.media_urls[0] }}
              className="w-full h-32"
              style={{ resizeMode: "cover" }}
            />
          </View>
        )}

        {/* Location */}
        {hasLocation && (
          <View className="flex-row items-center mb-2">
            <MapPin size={14} color={isDarkMode ? "#9CA3AF" : "#6B7280"} />
            <Text
              className="ml-1 text-xs"
              style={{ color: isDarkMode ? "#9CA3AF" : "#6B7280" }}
              numberOfLines={1}
            >
              {post.address}
              {post.city && `, ${post.city}`}
              {post.state && `, ${post.state}`}
            </Text>
          </View>
        )}

        {/* Event Card */}
        {hasEvent && (
          <View
            className="p-2 rounded-lg mb-2"
            style={{ backgroundColor: isDarkMode ? "rgba(139, 92, 246, 0.1)" : "rgba(139, 92, 246, 0.05)" }}
          >
            <View className="flex-row items-center">
              <Calendar size={14} color="#8B5CF6" />
              <Text
                className="ml-1 text-xs font-semibold"
                style={{ color: "#8B5CF6" }}
                numberOfLines={1}
              >
                {post.event.name}
              </Text>
            </View>
          </View>
        )}

        {/* Stats */}
        <View className="flex-row items-center justify-between mb-3">
          <View className="flex-row items-center">
            <Users size={14} color={isDarkMode ? "#9CA3AF" : "#6B7280"} />
            <Text
              className="ml-1 text-xs"
              style={{ color: isDarkMode ? "#9CA3AF" : "#6B7280" }}
            >
              {post.like_count} likes • {post.comment_count} comments
            </Text>
          </View>
        </View>

        {/* View Post Button */}
        <TouchableOpacity
          onPress={onViewPost}
          className="w-full py-2 rounded-lg items-center"
          style={{ backgroundColor: "#8B5CF6" }}
        >
          <Text className="text-sm font-semibold text-white">
            View Post
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
