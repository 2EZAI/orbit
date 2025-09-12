import React from "react";
import { View,ScrollView } from "react-native";
import { Text } from "~/src/components/ui/text";
import { Input } from "~/src/components/ui/input";
import { useTheme } from "~/src/components/ThemeProvider";

interface AdditionalInfoSectionProps {
  externalUrl: string;
  setExternalUrl: (url: string) => void;
}

export default function AdditionalInfoSection({
  externalUrl,
  setExternalUrl,
}: AdditionalInfoSectionProps) {
  const { theme } = useTheme();

  return (
    
    <View
      style={{
        backgroundColor: theme.dark
          ? "rgba(139, 92, 246, 0.1)"
          : "rgba(255, 255, 255, 0.8)",
        borderRadius: 32,
        padding: 42,
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
          Additional Info
        </Text>
        <Text
          style={{
            fontSize: 16,
            color: theme.colors.text + "CC",
            lineHeight: 22,
          }}
        >
          Optional details about your event
        </Text>
      </View>

      <View>
        <Text
          style={{
            fontSize: 16,
            fontWeight: "600",
            color: theme.colors.text,
            marginBottom: 12,
          }}
        >
          External URL
        </Text>
        <View
          style={{
            height: 56,
            backgroundColor: theme.dark
              ? "rgba(255, 255, 255, 0.05)"
              : "rgba(255, 255, 255, 0.7)",
            borderRadius: 16,
            borderWidth: 1,
            borderColor: theme.dark
              ? "rgba(139, 92, 246, 0.2)"
              : "rgba(139, 92, 246, 0.15)",
            paddingHorizontal: 16,
          }}
        >
          <Input
            value={externalUrl}
            onChangeText={setExternalUrl}
            placeholder="https://"
            placeholderTextColor={theme.colors.text + "66"}
            style={{
              flex: 1,
              backgroundColor: "transparent",
              borderWidth: 0,
              height: 56,
              fontSize: 16,
              color: theme.colors.text,
            }}
          />
        </View>
      </View>
    </View>
    
  );
}
