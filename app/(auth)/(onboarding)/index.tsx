import { useEffect, useState } from "react";
import { View, ScrollView, ActivityIndicator } from "react-native";
import { router } from "expo-router";
import { supabase } from "~/src/lib/supabase";
import { Text } from "~/src/components/ui/text";
import { Button } from "~/src/components/ui/button";
import { useUser } from "~/src/lib/UserProvider";
import { TopicList } from "~/src/components/topics/TopicList";

export default function Onboarding() {
  const { user, loading } = useUser();
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);

  useEffect(() => {
    // Only redirect if we're sure there's no user and we're not loading
    if (!user && !loading) {
      router.replace("/(auth)/sign-in");
    }
  }, [user, loading]);

  const handleContinue = async () => {
    if (!user) return;

    try {
      const { error } = await supabase.from("user_topics").insert(
        selectedTopics.map((topic) => ({
          user_id: user.id,
          topic,
        }))
      );

      if (error) throw error;

      // Route to app after completing onboarding
      router.replace("/(app)/(map)");
    } catch (error) {
      console.error("Error saving topics:", error);
    }
  };

  // Show loading state while checking user status
  if (loading) {
    return (
      <View className="items-center justify-center flex-1 bg-background">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!user) return null;

  return (
    <View className="flex-1 bg-background">
      <ScrollView className="flex-1 px-4">
        <View className="py-8">
          <Text className="text-2xl font-bold">Welcome to Orbit Social App!</Text>
          <Text className="mt-2 text-base text-muted-foreground">
            Select topics you're interested in to personalize your experience.
          </Text>
        </View>

        <TopicList
          selectedTopics={selectedTopics}
          onSelectTopic={setSelectedTopics}
        />
      </ScrollView>

      <View className="p-4 border-t border-border">
        <Button onPress={handleContinue} disabled={selectedTopics.length === 0}>
          <Text className="text-lg font-medium text-primary-foreground">
            Continue
          </Text>
        </Button>
      </View>
    </View>
  );
}
