import React from "react";
import { ScrollView, TouchableOpacity, View } from "react-native";
import { TrendingUp, Star } from "lucide-react-native";
import { useTheme } from "~/src/components/ThemeProvider";
import { Text } from "~/src/components/ui/text";
import { OptimizedImage } from "~/src/components/ui/optimized-image";

interface LocationSimilarSectionProps {
  data: any;
  nearbyData: any[];
  onDataSelect: (data: any) => void;
}

export function LocationSimilarSection({ 
  data, 
  nearbyData, 
  onDataSelect 
}: LocationSimilarSectionProps) {
  const { theme, isDarkMode } = useTheme();

  // Get similar locations from nearbyData
  const getSimilarLocations = () => {
    const currentCategory = data.category?.name?.toLowerCase();
    const currentType = data.type?.toLowerCase();

    return nearbyData
      .filter((item) => {
        if (item.id === data.id) return false;
        if (item.start_datetime) return false; // Skip events

        const itemCategory = item.category?.name?.toLowerCase();
        const itemType = item.type?.toLowerCase();

        return itemCategory === currentCategory || itemType === currentType;
      })
      .slice(0, 5);
  };

  const similarLocations = getSimilarLocations();

  if (similarLocations.length === 0) {
    return null;
  }

  const getCategoryName = (categoryName?: string) => {
    if (!categoryName) return null;
    if (
      categoryName.toLowerCase().includes("googleapi") ||
      categoryName.toLowerCase().includes("google_api") ||
      categoryName.toLowerCase() === "api"
    ) {
      return null;
    }
    return categoryName;
  };

  return (
    <View className="mb-6">
      <View className="flex-row items-center mb-4">
        <TrendingUp size={20} color="#8B5CF6" />
        <Text
          className="ml-2 text-lg font-bold"
          style={{ color: theme.colors.text }}
        >
          Similar Places Nearby
        </Text>
      </View>
      
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        nestedScrollEnabled={true}
      >
        <View className="flex-row gap-4">
          {similarLocations.map((item: any, index: number) => (
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
                <Text
                  className="text-xs"
                  style={{
                    color: isDarkMode
                      ? "rgba(255,255,255,0.7)"
                      : "#6B7280",
                  }}
                >
                  {getCategoryName(item.category?.name || item.type) || "Place"}
                </Text>
                {item.rating && (
                  <View className="flex-row items-center mt-1">
                    <Star size={12} color="#F59E0B" />
                    <Text
                      className="ml-1 text-xs font-medium"
                      style={{ color: "#F59E0B" }}
                    >
                      {item.rating.toFixed(1)}
                    </Text>
                    {item.rating_count && (
                      <Text
                        className="ml-1 text-xs"
                        style={{
                          color: isDarkMode
                            ? "rgba(255,255,255,0.5)"
                            : "#9CA3AF",
                        }}
                      >
                        ({item.rating_count})
                      </Text>
                    )}
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
