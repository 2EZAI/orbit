import React from "react";
import { TouchableOpacity } from "react-native";
import { Text } from "~/src/components/ui/text";
import { Plus } from "lucide-react-native";
import { router } from "expo-router";

export default function CreatePostButton() {
  return (
    <TouchableOpacity
      className="flex-row justify-center items-center p-4 mx-4 mb-4 rounded-lg bg-primary"
      onPress={() => router.push("/post/create")}
    >
      <Plus size={20} className="mr-2 text-primary-foreground" />
      <Text className="font-medium text-primary-foreground">
        Create New Post
      </Text>
    </TouchableOpacity>
  );
}
