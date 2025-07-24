import { View, Image ,Text} from "react-native";
import { useEffect, useState } from "react";

interface UserMarkerWithCountProps {
  avatarUrl?: string | null;
  heading?: number;
  count?: number;
  showCount?:boolean;
}

export const UserMarkerWithCount = ({ avatarUrl, heading,count,showCount }: UserMarkerWithCountProps) => {
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    // console.log("[UserMarker] Rendering with avatar URL:", avatarUrl);
    setImageError(false); // Reset error state when URL changes
  }, [avatarUrl]);

  return (
    <View className="items-center w-20 justify-center">
      <View
        className="p-6 rounded-full bg-white shadow-lg"
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
          className="absolute w-12 h-12 rounded-full bg-muted border-2 border-white"
          onError={(e) => {
            console.error(
              "[UserMarker] Failed to load avatar:",
              e.nativeEvent.error
            );
            setImageError(true);
          }}
        />
       <View className="absolute items-center justify-center mt-2 w-4 h-4 border rounded-full -top-1 -left-1 bg-green-400">
  <View className="w-2 h-2 rounded-full bg-white" />
</View>

         {showCount && count > 8 && (
        <View className="absolute w-12 h-12 justify-center rounded-full bg-muted border-2 border-white">
          <Text className="text-xs text-center font-bold text-black">{count+"+"}</Text>
        </View>
      )}
      </View>
      <View className="w-2 h-2 -mt-1 rounded-full bg-black/20" />
    </View>
  );
};
