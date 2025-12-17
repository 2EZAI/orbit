import React from "react";
import { View, TouchableOpacity, ScrollView } from "react-native";
import { Text } from "~/src/components/ui/text";
import { Prompt } from "~/hooks/useMapEvents";
import { useTheme } from "~/src/components/ThemeProvider";

interface PromptsSectionProps {
  prompts: Partial<Prompt[]>;
  selectedPrompts: Partial<Prompt>;
  setSelectedPrompts: (prompts: Partial<Prompt>) => void;
}

export default function PromptsSection({
  prompts,
  selectedPrompts,
  setSelectedPrompts,
}: PromptsSectionProps) {
  const { theme } = useTheme();
  console.log("typeof prompts:", typeof prompts);
  console.log("is array?", Array.isArray(prompts));
  console.log("prompts:", prompts);

  let parsedPrompts: Prompt[] = [];

  if (typeof prompts === "string") {
    try {
      const parsed = JSON.parse(prompts);
      if (Array.isArray(parsed)) {
        parsedPrompts = parsed;
      }
    } catch (e) {
      console.error("Invalid JSON passed to prompts", e);
    }
  } else if (Array.isArray(prompts)) {
    parsedPrompts = prompts;
  }
  if (!prompts || prompts.length === 0) {
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
          Activity Prompts
        </Text>
        <Text
          style={{
            fontSize: 16,
            color: theme.colors.text + "CC",
            lineHeight: 22,
          }}
        >
          Choose prompts to guide your activity
        </Text>
      </View>

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {parsedPrompts?.length > 0 &&
          parsedPrompts?.map((promptItem) => {
            const isSelected = selectedPrompts?.id === promptItem?.id;
            return (
              <TouchableOpacity
                key={promptItem.id}
                onPress={() => {
                  setSelectedPrompts(promptItem);
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
                  {promptItem.name}
                </Text>
              </TouchableOpacity>
            );
          })}
      </View>
    </View>
  );
}
