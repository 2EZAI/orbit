import { router } from "expo-router";
import { View, Text, Button, Pressable } from "react-native";
import { supabase } from "~/src/lib/supabase";

export default function Home() {
  return (
    <View className="items-center justify-center flex-1">
      <Text className="text-xl">Welcome to Orbit!</Text>
      <Pressable
        onPress={() => {
          supabase.auth.signOut();
        }}
        className="p-2 bg-blue-500 rounded"
      >
        <Text className="text-foreground">Sign Out</Text>
      </Pressable>
    </View>
  );
}
