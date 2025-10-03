import React, { useState } from "react";
import { ActivityIndicator, ScrollView, TouchableOpacity, View } from "react-native";
import { Calendar, Users } from "lucide-react-native";
import { useTheme } from "~/src/components/ThemeProvider";
import { Text } from "~/src/components/ui/text";
import { OptimizedImage } from "~/src/components/ui/optimized-image";

interface LocationEventsSectionProps {
  data: any;
  locationEvents: any[];
  loadingLocationEvents: boolean;
  onDataSelect: (data: any) => void;
}

export function LocationEventsSection({ 
  data, 
  locationEvents, 
  loadingLocationEvents, 
  onDataSelect 
}: LocationEventsSectionProps) {
  const { theme, isDarkMode } = useTheme();
  const [showAllEvents, setShowAllEvents] = useState(false);

  const formatDate = (date: string) => {
    try {
      return new Date(date).toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    } catch (error) {
      return "";
    }
  };

  if (loadingLocationEvents) {
    return (
      <View className="flex-row justify-center items-center py-4 mb-6">
        <ActivityIndicator size="small" color="#8B5CF6" />
        <Text
          className="ml-2"
          style={{
            color: isDarkMode ? theme.colors.text : "#6B7280",
          }}
        >
          Loading events...
        </Text>
      </View>
    );
  }

  if (locationEvents.length === 0) {
    return (
      <View className="mb-6">
        <View className="flex-row items-center mb-3">
          <Calendar size={20} color="#8B5CF6" />
          <Text
            className="ml-2 text-lg font-bold"
            style={{ color: theme.colors.text }}
          >
            Events at This Location
          </Text>
        </View>
        <View
          className="p-4 rounded-xl"
          style={{
            backgroundColor: isDarkMode
              ? theme.colors.border
              : "#F9FAFB",
          }}
        >
          <Text
            className="text-center"
            style={{
              color: isDarkMode ? theme.colors.text : "#6B7280",
            }}
          >
            No events have been created at this location yet.
          </Text>
          <Text
            className="mt-1 text-sm text-center"
            style={{
              color: isDarkMode
                ? "rgba(255,255,255,0.6)"
                : "#9CA3AF",
            }}
          >
            Be the first to create an event here!
          </Text>
        </View>
      </View>
    );
  }

  const displayedEvents = showAllEvents ? locationEvents : locationEvents.slice(0, 4);

  return (
    <View className="mb-6">
      <View className="flex-row items-center mb-4">
        <Calendar size={20} color="#8B5CF6" />
        <Text
          className="ml-2 text-lg font-bold"
          style={{ color: theme.colors.text }}
        >
          Recent Events at This Location
        </Text>
      </View>
      
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        nestedScrollEnabled={true}
      >
        <View className="flex-row gap-3">
          {displayedEvents.map((event: any, index: number) => (
            <TouchableOpacity
              key={`location-event-${event.id}-${index}`}
              onPress={() => onDataSelect(event)}
              className="overflow-hidden rounded-xl border"
              style={{
                width: 200,
                backgroundColor: theme.colors.card,
                borderColor: theme.colors.border,
              }}
            >
              <OptimizedImage
                uri={event.image_urls?.[0]}
                width={300}
                height={96}
                quality={80}
                className="w-full h-24"
                resizeMode="cover"
              />
              <View className="p-3">
                <Text
                  className="text-sm font-bold"
                  style={{ color: theme.colors.text }}
                  numberOfLines={2}
                >
                  {event.name}
                </Text>
                <Text
                  className="mt-1 text-xs"
                  style={{
                    color: isDarkMode
                      ? theme.colors.text
                      : "#6B7280",
                  }}
                  numberOfLines={1}
                >
                  {formatDate(event.start_datetime)}
                </Text>
                {event.attendees?.count > 0 && (
                  <View className="flex-row items-center mt-2">
                    <Users size={12} color="#6B7280" />
                    <Text
                      className="ml-1 text-xs"
                      style={{
                        color: isDarkMode
                          ? theme.colors.text
                          : "#6B7280",
                      }}
                    >
                      {event.attendees.count} going
                    </Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Show more/less button if there are more events */}
      {locationEvents.length > 4 && (
        <View className="mt-3 text-center">
          <TouchableOpacity
            onPress={() => setShowAllEvents(!showAllEvents)}
            className="px-3 py-2 rounded-full"
            style={{
              backgroundColor: isDarkMode
                ? "rgba(139, 92, 246, 0.2)"
                : "rgba(139, 92, 246, 0.1)",
            }}
          >
            <Text
              className="text-sm font-medium"
              style={{
                color: isDarkMode ? "#A78BFA" : "#6B46C1",
              }}
            >
              {showAllEvents
                ? 'Show less'
                : `View ${locationEvents.length - 4} more events`}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}


