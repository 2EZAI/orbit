import React from "react";
import {
  View,
  FlatList,
  TouchableOpacity,
  Image,
  RefreshControl,
} from "react-native";
import { router } from "expo-router";
import { Text } from "~/src/components/ui/text";

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

interface PostGridProps {
  posts: Post[];
  refreshControl?: React.ReactElement;
}

export default function PostGrid({ posts, refreshControl }: PostGridProps) {
  const renderItem = ({ item: post }: { item: Post }) => (
    <TouchableOpacity
      className="w-1/3 aspect-square p-0.5"
      onPress={() => router.push(`/post/${post.id}`)}
    >
      {post.media_urls && post.media_urls.length > 0 ? (
        <Image
          source={{ uri: post.media_urls[0] }}
          className="w-full h-full"
          resizeMode="cover"
        />
      ) : (
        <View className="w-full h-full bg-muted justify-center items-center">
          <View className="p-2">
            <Text
              className="text-xs text-center text-muted-foreground"
              numberOfLines={3}
            >
              {post.content}
            </Text>
          </View>
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <FlatList
      data={posts}
      renderItem={renderItem}
      keyExtractor={(item) => item.id}
      numColumns={3}
      refreshControl={refreshControl}
      className="flex-1"
    />
  );
}
