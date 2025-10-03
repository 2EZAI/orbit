import React from "react";
import { ScrollView, TouchableOpacity, View, ActivityIndicator } from "react-native";
import { Calendar, Users } from "lucide-react-native";
import { useTheme } from "~/src/components/ThemeProvider";
import { Text } from "~/src/components/ui/text";
import { OptimizedImage } from "~/src/components/ui/optimized-image";
import { useSimilarItems } from "~/src/hooks/useSimilarItems";
import { useUser } from "~/src/lib/UserProvider";

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
  const { userlocation } = useUser();

  // Use the similar items API like web app
  const { events: similarEvents, isLoading, error, hasResults } = useSimilarItems({
    itemType: 'event',
    itemId: data.id,
    category: data.categories?.[0]?.name || data.type,
    name: data.name,
    latitude: userlocation?.latitude ? parseFloat(userlocation.latitude) : 0,
    longitude: userlocation?.longitude ? parseFloat(userlocation.longitude) : 0,
    limit: 6,
    enabled: !!data.id && !!userlocation?.latitude && !!userlocation?.longitude,
  });

  // Debug logging for similar events
  console.log('🎯 [EventSimilarSection] Debug:', {
    dataId: data.id,
    dataName: data.name,
    dataCategories: data.categories,
    userlocation,
    latitude: userlocation?.latitude ? parseFloat(userlocation.latitude) : 0,
    longitude: userlocation?.longitude ? parseFloat(userlocation.longitude) : 0,
    enabled: !!data.id && !!userlocation?.latitude && !!userlocation?.longitude,
    isLoading,
    error,
    hasResults,
    similarEventsCount: similarEvents.length,
    similarEventsIds: similarEvents.map((item: any) => item.id),
  });

  if (isLoading) {
    return (
      <View className="mb-6">
        <View className="flex-row items-center mb-4">
          <Calendar size={20} color="#8B5CF6" />
          <Text
            className="ml-2 text-lg font-bold"
            style={{ color: theme.colors.text }}
          >
            Similar Events
          </Text>
        </View>
        <View className="flex-row justify-center py-4">
          <ActivityIndicator size="small" color="#8B5CF6" />
        </View>
      </View>
    );
  }

  if (error || !hasResults) {
    console.log('❌ [EventSimilarSection] No similar events found, returning null');
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
    <View className="mb-6 mt-6">
      <View className="flex-row items-center mb-4">
        <Calendar size={20} color="#8B5CF6" />
        <Text
          className="ml-2 text-lg font-bold"
          style={{ color: theme.colors.text }}
        >
          Similar Events
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
              onPress={() => {
                if (onDataSelect) {
                  onDataSelect(item);
                }
              }}
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
                  className="mb-1 text-sm font-bold mt-2"
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


