import { View, Text } from "react-native";
import { Button } from "~/src/components/ui/button";
import { router } from "expo-router";
import { useAuth } from "~/src/lib/auth";
import { useEffect } from "react";

export default function Intro() {
  const { session } = useAuth();

  // Redirect to home if already logged in
  useEffect(() => {
    if (session) {
      router.replace("/(app)/home");
    }
  }, [session]);

  return (
    <View className="flex-1 bg-background p-4">
      <View className="flex-1 justify-center space-y-4">
        <View className="space-y-2">
          <Text className="text-4xl font-bold text-center text-foreground">
            Welcome to Orbit
          </Text>
          <Text className="text-base text-center text-muted-foreground">
            Connect with friends around the world
          </Text>
        </View>

        <View className="space-y-4 mt-6 gap-4">
          <Button onPress={() => router.push("/(auth)/sign-in")}>
            <Text className="text-white">Sign In</Text>
          </Button>

          <Button
            variant="outline"
            onPress={() => router.push("/(auth)/sign-up")}
          >
            <Text>Create Account</Text>
          </Button>
        </View>
      </View>
    </View>
  );
}
