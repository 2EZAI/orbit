import { router } from "expo-router";
import { View, Text, Button, Pressable } from "react-native";

export default function Home() {
  return (
    <View className="flex-1 justify-center items-center">
      <Text className="text-xl">Welcome to Orbit!</Text>
      <Pressable
        onPress={() => {
          router.push("/profile");
        }}
        className="bg-blue-500 p-2 rounded"
      >
        <Text className="text-white">Sign Out</Text>
      </Pressable>
    </View>
  );
}
