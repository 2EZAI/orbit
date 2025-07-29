import { View, Image, Text } from "react-native";
import { useEffect, useState } from "react";

interface UserMarkerWithCountProps {
  avatarUrl?: string | null;
  heading?: number;
  count?: number;
  showCount?: boolean;
}

export const UserMarkerWithCount = ({
  avatarUrl,
  heading,
  count,
  showCount,
}: UserMarkerWithCountProps) => {
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    // console.log("[UserMarker] Rendering with avatar URL:", avatarUrl);
    setImageError(false); // Reset error state when URL changes
  }, [avatarUrl]);

  return (
    <View className="justify-center items-center w-20">
      <View
        className="p-6 bg-white rounded-full shadow-lg"
        style={{
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.25,
          shadowRadius: 3.84,
          elevation: 5,
          transform:
            heading !== undefined ? [{ rotate: `${heading}deg` }] : undefined,
        }}
      >
        <Image
          source={
            !imageError && avatarUrl
              ? { uri: avatarUrl }
              : require("~/assets/favicon.png")
          }
          className="absolute w-12 h-12 rounded-full border-2 border-white bg-muted"
          onError={(e) => {
            console.error(
              "[UserMarker] Failed to load avatar:",
              e.nativeEvent.error
            );
            setImageError(true);
          }}
        />
        <View className="absolute -top-1 -left-1 justify-center items-center mt-2 w-4 h-4 bg-green-400 rounded-full border">
          <View className="w-2 h-2 bg-white rounded-full" />
        </View>

        {showCount && count && count > 8 && (
          <View className="absolute justify-center w-12 h-12 rounded-full border-2 border-white bg-muted">
            <Text className="text-xs font-bold text-center text-black">
              {String(count || 0) + "+"}
            </Text>
          </View>
        )}
      </View>
      <View className="-mt-1 w-2 h-2 rounded-full bg-black/20" />
    </View>
  );
};
