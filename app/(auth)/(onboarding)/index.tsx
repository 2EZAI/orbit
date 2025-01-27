import { useEffect, useState } from "react";
import { View, ScrollView } from "react-native";
import { router } from "expo-router";
import { supabase } from "~/src/lib/supabase";
import { Text } from "~/src/components/ui/text";
import { Button } from "~/src/components/ui/button";
import { useUser } from "~/hooks/useUserData";
import { TopicList } from "~/src/components/topics/TopicList";

export default function Onboarding() {
  const { user } = useUser();
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);

  useEffect(() => {
    if (!user) {
      router.replace("/(auth)/sign-in");
    }
  }, [user]);

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

      router.replace("/(app)/home");
    } catch (error) {
      console.error("Error saving topics:", error);
    }
  };

  if (!user) return null;

  return (
    <View className="flex-1 bg-background">
      <ScrollView className="flex-1 px-4">
        <View className="py-8">
          <Text className="text-2xl font-bold">Welcome to Orbit!</Text>
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
          Continue
        </Button>
      </View>
    </View>
  );
}
