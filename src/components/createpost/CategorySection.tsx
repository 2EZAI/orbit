import React from "react";
import { View } from "react-native";
import { useTheme } from "~/src/components/ThemeProvider";
import TopicSingleSelectDropdown from "~/src/components/topics/TopicSingleSelectDropdown";
import { Text } from "~/src/components/ui/text";

interface CategorySectionProps {
  selectedTopics: string;
  selectedTopicsName: string;
  onSelectTopic: (topic: string) => void;
}

export default function CategorySection({
  selectedTopics,
  selectedTopicsName,
  onSelectTopic,
}: CategorySectionProps) {
  const { theme } = useTheme();

  return (
    <View
      style={{
        backgroundColor: theme.dark
          ? "rgba(139, 92, 246, 0.1)"
          : "rgba(255, 255, 255, 0.8)",
        borderRadius: 32,
        padding: 20,
        borderWidth: 1,
        borderColor: theme.dark
          ? "rgba(139, 92, 246, 0.2)"
          : "rgba(139, 92, 246, 0.1)",
        shadowColor: "#8B5CF6",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: theme.dark ? 0.3 : 0.1,
        shadowRadius: 24,
        elevation: 12,
        marginBottom: 24,
      }}
    >
      <View style={{ marginBottom: 24 }}>
        <Text
          style={{
            fontSize: 22,
            fontWeight: "700",
            color: theme.colors.text,
            marginBottom: 8,
          }}
        >
          Activity Category
        </Text>
        <Text
          style={{
            fontSize: 16,
            color: theme.colors.text + "CC",
            lineHeight: 22,
          }}
        >
          Choose a category for your activity
        </Text>
      </View>

      <TopicSingleSelectDropdown
        selectedId={selectedTopics}
        selectedName={selectedTopicsName}
        onSelect={onSelectTopic}
        placeholder="Choose a category"
      />
    </View>
  );
}
