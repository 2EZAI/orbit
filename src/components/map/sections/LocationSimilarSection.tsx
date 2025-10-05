import React from "react";
import { ScrollView, TouchableOpacity, View, ActivityIndicator } from "react-native";
import { MapPin, Star } from "lucide-react-native";
import { useTheme } from "~/src/components/ThemeProvider";
import { Text } from "~/src/components/ui/text";
import { OptimizedImage } from "~/src/components/ui/optimized-image";
import { useSimilarItems } from "~/src/hooks/useSimilarItems";
import { useUser } from "~/src/lib/UserProvider";

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
  const { userlocation } = useUser();

  // Use the similar items API like web app
  // Get coordinates from userlocation or fallback to location coordinates
  const userLat = userlocation?.latitude ? parseFloat(userlocation.latitude) : null;
  const userLng = userlocation?.longitude ? parseFloat(userlocation.longitude) : null;
  
  // Use location's own coordinates as fallback if user location is not available
  let locationLat = null;
  let locationLng = null;
  
  if (data.coordinates) {
    // Direct coordinates object: {latitude, longitude}
    locationLat = data.coordinates.latitude;
    locationLng = data.coordinates.longitude;
  }
  
  // Use userLocation if available, otherwise use location coordinates
  const latitude = userLat || locationLat;
  const longitude = userLng || locationLng;

  const { locations: similarLocations, isLoading, error, hasResults } = useSimilarItems({
    itemType: 'location',
    itemId: data.id,
    category: data.category?.name || data.type, // Match web app exactly
    name: data.name,
    latitude: latitude || 0,
    longitude: longitude || 0,
    limit: 6, // Match web app exactly
    proximityKm: 50, // Match web app exactly
    enabled: !!data.id && !!latitude && !!longitude, // Use coordinates when available
  });

  // Debug logging for similar locations
  console.log('📍 [LocationSimilarSection] Debug:', {
    dataId: data.id,
    dataName: data.name,
    dataCategory: data.category,
    dataType: data.type,
    userlocation,
    userLat,
    userLng,
    locationLat,
    locationLng,
    finalLatitude: latitude,
    finalLongitude: longitude,
    enabled: !!data.id && !!latitude && !!longitude,
    isLoading,
    error,
    hasResults,
    similarLocationsCount: similarLocations.length,
    similarLocationsIds: similarLocations.map((item: any) => item.id),
  });

  if (isLoading) {
    return (
      <View className="mb-6">
        <View className="flex-row items-center mb-4">
          <MapPin size={20} color="#8B5CF6" />
          <Text
            className="ml-2 text-lg font-bold"
            style={{ color: theme.colors.text }}
          >
            Similar Places
          </Text>
        </View>
        <View className="flex-row justify-center py-4">
          <ActivityIndicator size="small" color="#8B5CF6" />
        </View>
      </View>
    );
  }

  if (error || !hasResults) {
    console.log('❌ [LocationSimilarSection] No similar locations found, returning null');
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
    <View className="mb-6 mt-6">
      <View className="flex-row items-center mb-4">
        <MapPin size={20} color="#8B5CF6" />
        <Text
          className="ml-2 text-lg font-bold"
          style={{ color: theme.colors.text }}
        >
          Similar Places
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
              onPress={() => {
                console.log('📍 [LocationSimilarSection] Similar location clicked:', {
                  locationId: item.id,
                  locationName: item.name,
                  locationType: item.type,
                  hasOnDataSelect: !!onDataSelect,
                });
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


