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
import { Icon } from "react-native-elements";
import { format } from "date-fns";

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
  
//   const renderItem = ({ item: post }: { item: Post }) => (
//     <TouchableOpacity
//   className="w-[49%] mt-3 aspect-square border rounded-2xl border-border"
//  onPress={() => {
//   router.push(`/post/${post.id}`);
//    DeviceEventEmitter.emit('refreshPost', true);
//   }
//   } >
//       {post.media_urls && post.media_urls.length > 0 ? (
//         <View className="w-full">
//   <View className="relative overflow-hidden rounded-t-2xl">
//     <Image
//       source={{ uri: post.media_urls[0] }}
//       className="w-full h-[74%]"
//        style={{ resizeMode: "cover" }}
//     />
//      <Text className="mt-2 p-1 font-medium" numberOfLines={1} >
//       {post.content}
//     </Text>
//   </View>
// </View>
//       ) : (
//         <View className="w-full h-full bg-muted justify-center items-center">
//           <View className="p-2">
//             <Text
//               className="text-xs text-center text-muted-foreground"
//               numberOfLines={3} >
//               {post.content}
//             </Text>
//           </View>
//         </View>
//       )
//       }
//     </TouchableOpacity>
//   );

const renderItem = ({ item: post }: { item: Post }) => (
    <>
      <TouchableOpacity
        className="mx-4 mb-4 overflow-hidden border rounded-3xl border-border"
        onPress={() => router.push(`/post/${post.id}`)}
      >
        <View className="relative">
          {post?.media_urls?.[0] ? (
            <Image
              source={{ uri: post?.media_urls[0] }}
              className="w-full h-48"
              style={{ resizeMode: "cover" }}
            />
          ) : (
            <View className="w-full h-48 bg-gray-300" />
          )}
        </View>

        <View className="p-4">
          {/* Title */}
          <Text className="mb-2 text-xl font-semibold">{post?.content}</Text>

          {/* Time */}
          <View className="flex-row items-center mb-2">
            <Icon
              name="clock-time-four-outline"
              type="material-community"
              size={16}
              color="#239ED0"
            />

            <Text className="text-muted-foreground">
              {format(new Date(post?.created_at), "yyyy-MM-dd h:mm a")}
            </Text>
          </View>

          {/* Location */}
          <TouchableOpacity>
            <View className="flex-row items-center mb-3">
              <Icon
                name="map-marker"
                type="material-community"
                size={16}
                color="#239ED0"
              />
              <View className="flex-1">
                <Text className="text-sm text-muted-foreground">
                  {post?.address}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </>
  );

  return (
    <FlatList
      data={posts}
      renderItem={renderItem}
      keyExtractor={(item) => item.id}
      refreshControl={refreshControl}
    />
  );
}
