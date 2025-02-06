import { useEffect, useState } from "react";
import {
  View,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  SafeAreaView,
  BackHandler,
} from "react-native";
import { supabase } from "../../../src/lib/supabase";
import { router } from "expo-router";
import { Button } from "~/src/components/ui/button";
import { Text } from "~/src/components/ui/text";
import { MotiView } from "moti";
import Toast from "react-native-toast-message";
import { useAuth } from "~/src/lib/auth";

interface Topic {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
}

export default function Onboarding() {
  const { session } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);

  // Prevent back button
  useEffect(() => {
    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      () => true
    );
    return () => backHandler.remove();
  }, []);

  useEffect(() => {
    if (!session?.user) {
      router.replace("/sign-in");
      return;
    }
    fetchTopics();
  }, [session]);

  async function fetchTopics() {
    try {
      const { data, error } = await supabase
        .from("topics")
        .select("*")
        .order("name");

      if (error) throw error;
      setTopics(data || []);
    } catch (error) {
      console.error("Error fetching topics:", error);
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Failed to load topics",
      });
    } finally {
      setLoading(false);
    }
  }

  const toggleTopic = (topicName: string) => {
    setSelectedTopics((prev) =>
      prev.includes(topicName)
        ? prev.filter((t) => t !== topicName)
        : [...prev, topicName]
    );
  };

  const handleContinue = async () => {
    if (selectedTopics.length === 0) {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Please select at least one topic",
      });
      return;
    }

    setSaving(true);
    try {
      const userTopics = selectedTopics.map((topic) => ({
        user_id: session?.user.id,
        topic,
      }));

      const { error } = await supabase.from("user_topics").insert(userTopics);

      if (error) throw error;

      Toast.show({
        type: "success",
        text1: "Success",
        text2: "Topics saved successfully",
      });

      // Navigate to the main app with correct path
      router.replace("/(app)/home");
    } catch (error) {
      console.error("Error saving topics:", error);
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Failed to save topics",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View className="items-center justify-center flex-1 bg-background">
        <ActivityIndicator size="large" className="text-primary" />
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView
        className="flex-1 px-6"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* Header */}
        <MotiView
          from={{ opacity: 0, translateY: -20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: "timing", duration: 1000 }}
          className="pt-12 pb-8"
        >
          <Text className="text-4xl font-bold">Choose Your Interests</Text>
          <Text className="mt-3 text-base text-muted-foreground">
            Select topics that interest you to personalize your experience
          </Text>
        </MotiView>

        {/* Topics Grid */}
        <View className="flex-row flex-wrap gap-2">
          {topics.map((topic) => (
            <TouchableOpacity
              key={topic.id}
              onPress={() => toggleTopic(topic.name)}
              className={`px-4 py-2 rounded-full border ${
                selectedTopics.includes(topic.name)
                  ? "bg-primary border-primary"
                  : "bg-transparent border-border"
              }`}
            >
              <Text
                className={`text-base ${
                  selectedTopics.includes(topic.name)
                    ? "text-primary-foreground font-medium"
                    : "text-foreground"
                }`}
              >
                {topic.icon} {topic.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Continue Button */}
        <View className="mt-8">
          <Button
            onPress={handleContinue}
            disabled={saving || selectedTopics.length === 0}
            className="h-14 bg-primary rounded-xl"
          >
            {saving ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-lg font-medium text-primary-foreground">
                Continue
              </Text>
            )}
          </Button>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
