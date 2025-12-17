import { View, Image, TouchableOpacity } from "react-native";
import { useEffect, useState } from "react";

interface UserMarkerProps {
  avatarUrl?: string | null;
  heading?: number;
  onPress?: () => void;
}

export const UserMarker = ({ avatarUrl, heading, onPress }: UserMarkerProps) => {
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    // console.log("[UserMarker] Rendering with avatar URL:", avatarUrl);
    setImageError(false); // Reset error state when URL changes
  }, [avatarUrl]);

  const content = (
    <View className="items-center justify-center">
      <View
        className="p-[3px] rounded-full bg-white shadow-lg"
        style={{
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.25,
          shadowRadius: 3.84,
          elevation: 5,
        }}
      >
        <Image
          source={
            !imageError && avatarUrl
              ? { uri: avatarUrl }
              : require("~/assets/favicon.png")
          }
          className="w-12 h-12 rounded-full bg-muted"
          onError={(e) => {
            console.error(
              "[UserMarker] Failed to load avatar:",
              e.nativeEvent.error
            );
            setImageError(true);
          }}
        />
      </View>
      <View className="w-2 h-2 -mt-1 rounded-full bg-black/20" />
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
};
