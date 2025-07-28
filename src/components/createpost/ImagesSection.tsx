import React from "react";
import { View, TouchableOpacity, Image, Platform } from "react-native";
import { Text } from "~/src/components/ui/text";
import { Plus, X } from "lucide-react-native";
import { Icon } from "react-native-elements";
import { useTheme } from "~/src/components/ThemeProvider";

interface EventImage {
  uri: string;
  type: string;
  name: string;
}

interface ImagesSectionProps {
  images: EventImage[];
  onPickImage: () => void;
  onRemoveImage: (index: number) => void;
}

export default function ImagesSection({
  images,
  onPickImage,
  onRemoveImage,
}: ImagesSectionProps) {
  const { theme } = useTheme();

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
          Event Images
        </Text>
        <Text
          style={{
            fontSize: 16,
            color: theme.colors.text + "CC",
            lineHeight: 22,
          }}
        >
          Add up to 5 images to showcase your event
        </Text>
      </View>

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
        {images.map((image, index) => (
          <View key={index} style={{ position: "relative" }}>
            <Image
              source={{ uri: image.uri }}
              style={{
                width: 100,
                height: 100,
                borderRadius: 16,
              }}
            />
            <TouchableOpacity
              onPress={() => onRemoveImage(index)}
              style={{
                position: "absolute",
                top: -8,
                right: -8,
                justifyContent: "center",
                alignItems: "center",
                width: 24,
                height: 24,
                borderRadius: 12,
                backgroundColor: "#EF4444",
              }}
            >
              <X size={16} color="white" />
            </TouchableOpacity>
          </View>
        ))}
        {images.length < 5 && (
          <TouchableOpacity
            onPress={onPickImage}
            style={{
              alignItems: "center",
              justifyContent: "center",
              width: 100,
              height: 100,
              borderRadius: 16,
              borderWidth: 2,
              borderStyle: "dashed",
              borderColor: theme.colors.text + "30",
              backgroundColor: theme.dark
                ? "rgba(255, 255, 255, 0.05)"
                : "rgba(255, 255, 255, 0.3)",
            }}
          >
            {Platform.OS === "ios" ? (
              <Plus size={24} color={theme.colors.text + "66"} />
            ) : (
              <Icon
                name="plus"
                type="material-community"
                size={24}
                color={theme.colors.text + "66"}
              />
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}
