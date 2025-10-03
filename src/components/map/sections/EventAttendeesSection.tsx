import React from "react";
import { View } from "react-native";
import { Users } from "lucide-react-native";
import { useTheme } from "~/src/components/ThemeProvider";
import { Text } from "~/src/components/ui/text";
import { UserAvatar } from "~/src/components/ui/user-avatar";

interface EventAttendeesSectionProps {
  data: any;
  attendeeCount: number;
  attendeeProfiles: any[];
}

export function EventAttendeesSection({ 
  data, 
  attendeeCount, 
  attendeeProfiles 
}: EventAttendeesSectionProps) {
  const { theme, isDarkMode } = useTheme();

  if (attendeeProfiles.length === 0) {
    return null;
  }

  return (
    <View className="mb-6">
      <Text
        className="mb-3 text-lg font-bold"
        style={{ color: theme.colors.text }}
      >
        Who's Going
      </Text>
      <View className="flex-row items-center">
        <View className="flex-row mr-4">
          {attendeeProfiles
            .slice(0, 5)
            .map((attendee: any, index: number) => (
              <View
                key={`${attendee.id}-${index}`}
                className="bg-white rounded-full border-white border-3"
                style={{
                  marginLeft: index > 0 ? -12 : 0,
                  backgroundColor: theme.colors.card,
                  borderColor: theme.colors.card,
                }}
              >
                <UserAvatar
                  size={44}
                  user={{
                    id: attendee.id,
                    name: attendee.name,
                    image: attendee.avatar_url,
                  }}
                />
              </View>
            ))}
        </View>
        <View className="flex-1">
          <Text
            className="text-lg font-bold"
            style={{ color: theme.colors.text }}
          >
            {attendeeCount}{" "}
            {attendeeCount === 1 ? "person" : "people"}
          </Text>
          <Text
            className="text-sm"
            style={{
              color: isDarkMode ? theme.colors.text : "#6B7280",
            }}
          >
            {attendeeCount === 1 ? "is going" : "are going"}
          </Text>
        </View>
      </View>
    </View>
  );
}


