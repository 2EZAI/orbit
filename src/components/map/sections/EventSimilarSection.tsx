import React from "react";
import { ScrollView, TouchableOpacity, View } from "react-native";
import { TrendingUp, Users } from "lucide-react-native";
import { useTheme } from "~/src/components/ThemeProvider";
import { Text } from "~/src/components/ui/text";
import { OptimizedImage } from "~/src/components/ui/optimized-image";

interface EventSimilarSectionProps {
  data: any;
  nearbyData: any[];
  onDataSelect: (data: any) => void;
}

export function EventSimilarSection({ 
  data, 
  nearbyData, 
  onDataSelect 
}: EventSimilarSectionProps) {
  const { theme, isDarkMode } = useTheme();

  // Get similar events from nearbyData
  const getSimilarEvents = () => {
    const currentCategories = data.categories || [];
    const categoryNames = currentCategories.map((cat: any) =>
      cat.name?.toLowerCase()
    );

    // First try to find events with matching categories
    const categoryMatches = nearbyData.filter((item) => {
      if (item.id === data.id) return false;
      const itemCategories = item.categories || [];
      return itemCategories.some((cat: any) =>
        categoryNames.includes(cat.name?.toLowerCase())
      );
    });

    // If we have category matches, return those
    if (categoryMatches.length > 0) {
      return categoryMatches.slice(0, 5);
    }

    // Otherwise, return any other events
    return nearbyData
      .filter((item) => {
        if (item.id === data.id) return false;
        return item.start_datetime; // Has event fields
      })
      .slice(0, 5);
  };

  const similarEvents = getSimilarEvents();

  if (similarEvents.length === 0) {
    return null;
  }

  const formatDate = (date: string) => {
    try {
      return new Date(date).toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      });
    } catch (error) {
      return "";
    }
  };

  return (
    <View className="mb-6">
      <View className="flex-row items-center mb-4">
        <TrendingUp size={20} color="#8B5CF6" />
        <Text
          className="ml-2 text-lg font-bold"
          style={{ color: theme.colors.text }}
        >
          Similar Events Nearby
        </Text>
      </View>
      
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        nestedScrollEnabled={true}
      >
        <View className="flex-row gap-4">
          {similarEvents.map((item: any, index: number) => (
            <TouchableOpacity
              key={`${item.id}-${index}`}
              onPress={() => onDataSelect(item)}
              className="overflow-hidden w-48 rounded-2xl border shadow-sm"
              style={{
                backgroundColor: theme.colors.card,
                borderColor: theme.colors.border,
              }}
            >
              <OptimizedImage
                uri={item.image_urls?.[0]}
                width={192}
                height={112}
                quality={80}
                className="w-full h-28"
                resizeMode="cover"
              />
              <View className="p-3">
                <Text
                  className="mb-1 text-sm font-bold"
                  style={{ color: theme.colors.text }}
                  numberOfLines={2}
                >
                  {item.name}
                </Text>
                {item.start_datetime && (
                  <Text
                    className="text-xs"
                    style={{
                      color: isDarkMode
                        ? "rgba(255,255,255,0.7)"
                        : "#6B7280",
                    }}
                  >
                    {formatDate(item.start_datetime)}
                  </Text>
                )}
                {item.attendees?.count > 0 && (
                  <View className="flex-row items-center mt-1">
                    <Users size={12} color="#8B5CF6" />
                    <Text className="ml-1 text-xs font-medium text-purple-600">
                      {item.attendees.count} going
                    </Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
