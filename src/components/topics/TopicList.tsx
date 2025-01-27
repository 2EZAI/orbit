import React, { useEffect, useState } from "react";
import { View, TouchableOpacity, ActivityIndicator } from "react-native";
import { Text } from "~/src/components/ui/text";
import { supabase } from "~/src/lib/supabase";

interface TopicListProps {
  selectedTopics: string[];
  onSelectTopic: (topics: string[]) => void;
}

export function TopicList({ selectedTopics, onSelectTopic }: TopicListProps) {
  const [topics, setTopics] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTopics() {
      try {
        const { data, error } = await supabase
          .from("topics")
          .select("name")
          .order("name");

        if (error) throw error;

        setTopics(data.map((topic) => topic.name));
      } catch (error) {
        console.error("Error fetching topics:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchTopics();
  }, []);

  const toggleTopic = (topic: string) => {
    if (selectedTopics.includes(topic)) {
      onSelectTopic(selectedTopics.filter((t) => t !== topic));
    } else {
      onSelectTopic([...selectedTopics, topic]);
    }
  };

  if (loading) {
    return (
      <View className="items-center justify-center py-8">
        <ActivityIndicator size="large" className="text-primary" />
      </View>
    );
  }

  return (
    <View className="flex-row flex-wrap gap-2">
      {topics.map((topic) => {
        const isSelected = selectedTopics.includes(topic);
        return (
          <TouchableOpacity
            key={topic}
            onPress={() => toggleTopic(topic)}
            className={`px-4 py-2 rounded-full border ${
              isSelected
                ? "bg-primary border-primary"
                : "bg-transparent border-border"
            }`}
          >
            <Text
              className={
                isSelected ? "text-primary-foreground" : "text-foreground"
              }
            >
              {topic}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
