import React from "react";
import { TouchableOpacity, View } from "react-native";
import { MapPin, Navigation } from "lucide-react-native";
import { useTheme } from "~/src/components/ThemeProvider";
import { Text } from "~/src/components/ui/text";

interface LocationDetailsSectionProps {
  data: any;
}

export function LocationDetailsSection({ data }: LocationDetailsSectionProps) {
  const { theme, isDarkMode } = useTheme();

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
      {/* Location Address */}
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
            Location
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
    </View>
  );
}
