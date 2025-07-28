import React from "react";
import { View, TouchableOpacity } from "react-native";
import { Text } from "~/src/components/ui/text";
import { Category, Prompt } from "~/hooks/useMapEvents";
import { useTheme } from "~/src/components/ThemeProvider";

interface PromptsSectionProps {
  categoryList: Partial<Category>;
  selectedPrompts: Partial<Prompt>;
  setSelectedPrompts: (prompts: Partial<Prompt>) => void;
}

export default function PromptsSection({
  categoryList,
  selectedPrompts,
  setSelectedPrompts,
}: PromptsSectionProps) {
  const { theme } = useTheme();

  if (!categoryList?.prompts || categoryList.prompts.length === 0) {
    return null;
  }

  return (
    <View
      style={{
        backgroundColor: theme.dark
          ? "rgba(139, 92, 246, 0.1)"
          : "rgba(255, 255, 255, 0.8)",
        borderRadius: 32,
        padding: 32,
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
            fontSize: 24,
            fontWeight: "700",
            color: theme.colors.text,
            marginBottom: 8,
          }}
        >
          Event Prompts
        </Text>
        <Text
          style={{
            fontSize: 16,
            color: theme.colors.text + "CC",
            lineHeight: 22,
          }}
        >
          Choose prompts to guide your event
        </Text>
      </View>

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {categoryList.prompts?.map((prompt) => {
          const isSelected = selectedPrompts?.id === prompt?.id;
          return (
            <TouchableOpacity
              key={prompt.id}
              onPress={() => {
                setSelectedPrompts(prompt);
              }}
              style={{
                paddingHorizontal: 16,
                paddingVertical: 8,
                borderRadius: 20,
                borderWidth: 1,
                backgroundColor: isSelected ? "#8B5CF6" : "transparent",
                borderColor: isSelected
                  ? "#8B5CF6"
                  : theme.dark
                  ? "rgba(139, 92, 246, 0.2)"
                  : "rgba(139, 92, 246, 0.15)",
              }}
            >
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "500",
                  color: isSelected ? "white" : theme.colors.text,
                }}
              >
                {prompt.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}
