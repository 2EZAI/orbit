import React from "react";
import { TouchableOpacity, View } from "react-native";
import { Calendar, MapPin, Navigation, User } from "lucide-react-native";
import { useTheme } from "~/src/components/ThemeProvider";
import { Text } from "~/src/components/ui/text";
import { UserAvatar } from "~/src/components/ui/user-avatar";

interface EventDetailsSectionProps {
  data: any;
  isCreator: boolean;
  isJoined: boolean;
  hasTickets: boolean;
}

export function EventDetailsSection({ 
  data, 
  isCreator, 
  isJoined, 
  hasTickets 
}: EventDetailsSectionProps) {
  const { theme, isDarkMode } = useTheme();

  const formatEventDateTime = () => {
    const startDate = new Date(data.start_datetime);
    const endDate = data.end_datetime ? new Date(data.end_datetime) : null;

    const isSameDay = endDate && startDate.toDateString() === endDate.toDateString();

    const startDateStr = startDate.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const startTimeStr = startDate.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });

    if (!endDate) {
      return `${startDateStr} at ${startTimeStr}`;
    }

    if (isSameDay) {
      const endTimeStr = endDate.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
      return `${startDateStr} from ${startTimeStr} to ${endTimeStr}`;
    } else {
      const endDateStr = endDate.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      const endTimeStr = endDate.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
      return `${startDateStr} at ${startTimeStr} to ${endDateStr} at ${endTimeStr}`;
    }
  };

  const handleDirections = () => {
    const lat = data.location?.coordinates[1];
    const lng = data.location?.coordinates[0];

    if (lat && lng) {
      const url = `https://maps.apple.com/?daddr=${lat},${lng}`;
      // Linking.openURL(url); // You'll need to import Linking
    }
  };

  return (
    <View className="mb-6">
      {/* Event Date & Time */}
      {data.start_datetime && (
        <View
          className="flex-row items-center p-3 mb-3 rounded-xl"
          style={{
            backgroundColor: isDarkMode
              ? "rgba(139, 92, 246, 0.1)"
              : "rgb(245, 243, 255)",
          }}
        >
          <View className="justify-center items-center mr-3 w-10 h-10 bg-purple-500 rounded-full">
            <Calendar size={20} color="white" />
          </View>
          <View className="flex-1">
            <Text className="mb-1 text-xs font-medium tracking-wide text-purple-600 uppercase">
              When
            </Text>
            <Text
              className="text-base font-bold leading-tight"
              style={{ color: theme.colors.text }}
            >
              {formatEventDateTime()}
            </Text>
          </View>
        </View>
      )}

      {/* Venue & Address */}
      <View
        className="flex-row items-start p-3 mb-4 rounded-xl"
        style={{
          backgroundColor: isDarkMode
            ? "rgba(59, 130, 246, 0.1)"
            : "rgb(239, 246, 255)",
        }}
      >
        <View className="justify-center items-center mt-0.5 mr-3 w-10 h-10 bg-blue-500 rounded-full">
          <MapPin size={20} color="white" />
        </View>
        <View className="flex-1">
          <Text className="mb-1 text-xs font-medium tracking-wide text-blue-600 uppercase">
            Where
          </Text>
          <Text
            className="mb-2 text-sm leading-relaxed"
            style={{
              color: isDarkMode ? theme.colors.text : "#6B7280",
            }}
          >
            {data.address}
          </Text>
          <TouchableOpacity
            onPress={handleDirections}
            className="flex-row items-center self-start px-3 py-1.5 bg-blue-500 rounded-full"
          >
            <Navigation size={14} color="white" />
            <Text className="ml-1.5 text-sm font-semibold text-white">
              Directions
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Creator Information */}
      {data.created_by && (
        <TouchableOpacity
          className="flex-row items-center px-4 py-3 mb-6 rounded-2xl"
          style={{
            backgroundColor: isDarkMode
              ? "rgba(59, 130, 246, 0.1)"
              : "rgb(239, 246, 255)",
          }}
        >
          <UserAvatar
            size={36}
            user={{
              id: data.created_by.id,
              name: data.created_by.name || "Host",
              image: data.created_by.avatar_url,
            }}
          />
          <View className="flex-1 ml-3">
            <Text className="text-sm font-medium text-blue-600">
              Created by
            </Text>
            <Text
              className="text-base font-semibold"
              style={{ color: theme.colors.text }}
            >
              {data.created_by.name ||
                `@${data.created_by.username}` ||
                "Community Member"}
            </Text>
          </View>
        </TouchableOpacity>
      )}
    </View>
  );
}


