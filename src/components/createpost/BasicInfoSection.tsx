import React, { useState } from "react";
import { View, TouchableOpacity,ScrollView, Platform } from "react-native";
import { Text } from "~/src/components/ui/text";
import { Input } from "~/src/components/ui/input";
import { Globe, Lock, Sparkles } from "lucide-react-native";
import { Icon } from "react-native-elements";
import { useTheme } from "~/src/components/ThemeProvider";
import { AIDescriptionModal } from "./AIDescriptionModal";

interface BasicInfoSectionProps {
  name: string;
  setName: (name: string) => void;
  description: string;
  setDescription: (description: string) => void;
  isPrivate: boolean;
  setIsPrivate: (isPrivate: boolean) => void;
  startDateTime?: string;
  endDateTime?: string;
  venueName?: string;
  address?: string;
  city?: string;
  state?: string;
  locationId?: string;
}

export default function BasicInfoSection({
  name,
  setName,
  description,
  setDescription,
  isPrivate,
  setIsPrivate,
  startDateTime,
  endDateTime,
  venueName,
  address,
  city,
  state,
  locationId,
}: BasicInfoSectionProps) {
  const { theme } = useTheme();
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);

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
          Basic Information
        </Text>
        <Text
          style={{
            fontSize: 16,
            color: theme.colors.text + "CC",
            lineHeight: 22,
          }}
        >
          Let's start with the essential details
        </Text>
      </View>

      <View style={{ marginBottom: 24 }}>
        <Text
          style={{
            fontSize: 16,
            fontWeight: "600",
            color: theme.colors.text,
            marginBottom: 12,
          }}
        >
          Event Name *
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
            value={name}
            onChangeText={setName}
            placeholder="Give your event a catchy name"
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

      <View style={{ marginBottom: 24 }}>
        <Text
          style={{
            fontSize: 16,
            fontWeight: "600",
            color: theme.colors.text,
            marginBottom: 12,
          }}
        >
          Event Privacy *
        </Text>
        <View style={{ flexDirection: "row", gap: 12 }}>
          <TouchableOpacity
            onPress={() => setIsPrivate(false)}
            style={{
              flex: 1,
              padding: 16,
              borderRadius: 16,
              borderWidth: 1,
              backgroundColor: !isPrivate
                ? "rgba(139, 92, 246, 0.1)"
                : theme.dark
                ? "rgba(255, 255, 255, 0.05)"
                : "rgba(255, 255, 255, 0.7)",
              borderColor: !isPrivate
                ? "#8B5CF6"
                : theme.dark
                ? "rgba(139, 92, 246, 0.2)"
                : "rgba(139, 92, 246, 0.15)",
            }}
          >
            <View style={{ alignItems: "center" }}>
              {Platform.OS === "ios" ? (
                <Globe
                  size={24}
                  color={!isPrivate ? "#8B5CF6" : theme.colors.text + "66"}
                />
              ) : (
                <Icon
                  name="web"
                  type="material-community"
                  size={24}
                  color={!isPrivate ? "#8B5CF6" : theme.colors.text + "66"}
                />
              )}
              <Text
                style={{
                  marginTop: 8,
                  marginBottom: 4,
                  fontSize: 14,
                  fontWeight: "600",
                  color: theme.colors.text,
                }}
              >
                Public
              </Text>
              <Text
                style={{
                  fontSize: 12,
                  textAlign: "center",
                  color: theme.colors.text + "CC",
                }}
              >
                Everyone can see and join
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setIsPrivate(true)}
            style={{
              flex: 1,
              padding: 16,
              borderRadius: 16,
              borderWidth: 1,
              backgroundColor: isPrivate
                ? "rgba(139, 92, 246, 0.1)"
                : theme.dark
                ? "rgba(255, 255, 255, 0.05)"
                : "rgba(255, 255, 255, 0.7)",
              borderColor: isPrivate
                ? "#8B5CF6"
                : theme.dark
                ? "rgba(139, 92, 246, 0.2)"
                : "rgba(139, 92, 246, 0.15)",
            }}
          >
            <View style={{ alignItems: "center" }}>
              {Platform.OS === "ios" ? (
                <Lock
                  size={24}
                  color={isPrivate ? "#8B5CF6" : theme.colors.text + "66"}
                />
              ) : (
                <Icon
                  name="lock-outline"
                  type="material-community"
                  size={24}
                  color={isPrivate ? "#8B5CF6" : theme.colors.text + "66"}
                />
              )}
              <Text
                style={{
                  marginTop: 8,
                  marginBottom: 4,
                  fontSize: 14,
                  fontWeight: "600",
                  color: theme.colors.text,
                }}
              >
                Private
              </Text>
              <Text
                style={{
                  fontSize: 12,
                  textAlign: "center",
                  color: theme.colors.text + "CC",
                }}
              >
                Followers only
              </Text>
            </View>
          </TouchableOpacity>
        </View>
        <Text
          style={{
            marginTop: 8,
            fontSize: 12,
            color: theme.colors.text + "CC",
          }}
        >
          {isPrivate
            ? "Only your followers can see this event. Others will need an invite to join."
            : "This event will be visible to everyone on the map."}
        </Text>
      </View>

      <View>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <Text
            style={{
              fontSize: 16,
              fontWeight: "600",
              color: theme.colors.text,
            }}
          >
            Description *
          </Text>
          <TouchableOpacity
            onPress={() => setIsAIModalOpen(true)}
            disabled={!name.trim()}
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: !name.trim()
                ? theme.dark
                  ? "rgba(255, 255, 255, 0.05)"
                  : "rgba(0, 0, 0, 0.05)"
                : theme.dark
                ? "rgba(168, 85, 247, 0.2)"
                : "rgba(168, 85, 247, 0.1)",
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderRadius: 8,
              borderWidth: 1,
              borderColor: !name.trim()
                ? theme.dark
                  ? "rgba(255, 255, 255, 0.1)"
                  : "rgba(0, 0, 0, 0.1)"
                : theme.dark
                ? "rgba(168, 85, 247, 0.3)"
                : "rgba(168, 85, 247, 0.2)",
              opacity: !name.trim() ? 0.5 : 1,
            }}
          >
            <Sparkles size={16} color={!name.trim() ? theme.colors.text + "66" : "#A855F7"} />
            <Text
              style={{
                color: !name.trim() ? theme.colors.text + "66" : "#A855F7",
                fontSize: 12,
                fontWeight: "600",
                marginLeft: 6,
              }}
            >
              AI Generate
            </Text>
          </TouchableOpacity>
        </View>
        {!name.trim() && (
          <Text
            style={{
              fontSize: 12,
              color: "#F59E0B",
              marginBottom: 12,
              fontStyle: "italic",
            }}
          >
            💡 Enter an event name first to enable AI description generation
          </Text>
        )}
        <View
          style={{
            backgroundColor: theme.dark
              ? "rgba(255, 255, 255, 0.05)"
              : "rgba(255, 255, 255, 0.7)",
            borderRadius: 16,
            borderWidth: 1,
            borderColor: theme.dark
              ? "rgba(139, 92, 246, 0.2)"
              : "rgba(139, 92, 246, 0.15)",
            paddingHorizontal: 16,
            paddingVertical: 12,
            minHeight: 120,
          }}
        >
          <Input
            value={description}
            onChangeText={setDescription}
            placeholder="Tell people what your event is about..."
            placeholderTextColor={theme.colors.text + "66"}
            multiline
            numberOfLines={6}
            textAlignVertical="top"
            style={{
              flex: 1,
              backgroundColor: "transparent",
              borderWidth: 0,
              fontSize: 16,
              color: theme.colors.text,
              minHeight: 120,
              textAlignVertical: "top",
            }}
          />
        </View>
      </View>

      {/* AI Description Modal */}
      <AIDescriptionModal
        isOpen={isAIModalOpen}
        onClose={() => setIsAIModalOpen(false)}
        onDescriptionGenerated={setDescription}
        eventName={name}
        startDateTime={startDateTime || new Date().toISOString()}
        endDateTime={endDateTime}
        venueName={venueName}
        address={address}
        city={city}
        state={state}
        locationId={locationId}
      />
    </View>
  );
}
