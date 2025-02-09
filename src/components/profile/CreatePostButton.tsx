import React from "react";
import { TouchableOpacity } from "react-native";
import { Text } from "~/src/components/ui/text";
import { Plus } from "lucide-react-native";
import { router } from "expo-router";

export default function CreatePostButton() {
  return (
    <TouchableOpacity
      className="flex-row items-center justify-center p-4 mb-4 mx-4 bg-primary rounded-lg"
      onPress={() => router.push("/post/create")}
    >
      <Plus size={20} className="text-primary-foreground mr-2" />
      <Text className="font-medium text-primary-foreground">
        Create New Post
      </Text>
    </TouchableOpacity>
  );
}
