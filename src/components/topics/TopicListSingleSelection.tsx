import React, { useEffect, useState } from "react";
import {
  View,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { Text } from "~/src/components/ui/text";
import { supabase } from "~/src/lib/supabase";
import { useTheme } from "~/src/components/ThemeProvider";

interface TopicListSingleSelectionProps {
  selectedTopics: string;
  selectedTopicsName:string;
  onSelectTopic: (topics: string) => void;
}

export function TopicListSingleSelection({
  selectedTopics,
  selectedTopicsName,
  onSelectTopic,
}: TopicListSingleSelectionProps) {
  const [topics, setTopics] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { theme } = useTheme();

  useEffect(() => {
    async function fetchTopics() {
      try {
        const { data, error } = await supabase
          .from("topics")
          .select(`*`)
          .order("name");

        if (error) throw error;

        setTopics(data);
      } catch (error) {
        console.error("Error fetching topics:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchTopics();
  }, []);

  const toggleTopic = (topic: any) => {
    // if (selectedTopics.includes(topic)) {
    //   onSelectTopic(selectedTopics.filter((t) => t !== topic));
    // } else {
    //   onSelectTopic([...selectedTopics, topic]);
    // }
    // console.log("click>topic?.id>",topic?.id);
    onSelectTopic(topic?.id);
  };

  if (loading) {
    return (
      <View className="items-center justify-center py-8">
        <ActivityIndicator size="large" className="text-primary" />
      </View>
    );
  }

  return (
    
      <View className="  flex-row flex-wrap gap-2">
        {selectedTopics !=='' && selectedTopicsName !== ''?
        
            <View
              className={`px-4 py-2 rounded-full border ${
                 "bg-primary border-primary" }`} >
              <Text
                className={ "text-primary-foreground"}  >
                {selectedTopicsName}
              </Text>
            </View>
          
         :
         topics?.map((topic) => {
          console.log("topic?.id>",topic?.id)
           console.log("selectedTopics>",selectedTopics)
          const isSelected = selectedTopics == topic?.id;
          console.log("isSelected>",isSelected)
          return (
            <TouchableOpacity
              key={topic?.id}
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
                {topic?.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    
  );
}
