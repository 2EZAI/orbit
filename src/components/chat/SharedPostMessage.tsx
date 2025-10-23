import React from "react";
import { View, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { SharedPostCard } from "~/src/components/social/SharedPostCard";

interface SharedPostMessageProps {
  postData: any;
  onPress?: () => void;
}

export function SharedPostMessage({ postData, onPress }: SharedPostMessageProps) {
  const router = useRouter();

  const handleViewPost = () => {
    if (onPress) {
      onPress();
    } else {
      // Navigate to the post
      router.push(`/(app)/post/${postData.id}`);
    }
  };

  return (
    <View style={{ maxWidth: 240, marginVertical: 2 }}>
      <SharedPostCard
        post={postData}
        onViewPost={handleViewPost}
      />
    </View>
  );
}
