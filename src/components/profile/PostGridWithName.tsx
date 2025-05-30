import React from "react";
import {
  View,
  FlatList,
  TouchableOpacity,
  Image,
  RefreshControl,
  DeviceEventEmitter,
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

interface PostGridWithNameProps {
  posts: Post[];
  refreshControl?: React.ReactElement;
}

export default function PostGridWithName({ posts, refreshControl }: PostGridWithNameProps) {
  
  const renderItem = ({ item: post }: { item: Post }) => (
    <TouchableOpacity
  className="w-[49%] mt-3 aspect-square border rounded-2xl border-border"
 onPress={() => {
  router.push(`/post/${post.id}`);
   DeviceEventEmitter.emit('refreshPost', true);
  }
  } >
      {post.media_urls && post.media_urls.length > 0 ? (
        <View className="w-full">
  <View className="relative overflow-hidden rounded-t-2xl">
    <Image
      source={{ uri: post.media_urls[0] }}
      className="w-full h-[74%]"
       style={{ resizeMode: "cover" }}
    />
     <Text className="mt-2 p-1 font-medium" numberOfLines={1} >
      {post.content}
    </Text>
  </View>
</View>
      ) : (
        <View className="w-full h-full bg-muted justify-center items-center">
          <View className="p-2">
            <Text
              className="text-xs text-center text-muted-foreground"
              numberOfLines={3} >
              {post.content}
            </Text>
          </View>
        </View>
      )
      }
    </TouchableOpacity>
  );

  return (
    <FlatList
      data={posts}
      columnWrapperStyle={{ justifyContent: 'space-between' }}
      renderItem={renderItem}
      keyExtractor={(item) => item.id}
      numColumns={2}
      refreshControl={refreshControl}
      className="flex-1"
    />
  );
}
