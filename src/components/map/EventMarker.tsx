import React, { useEffect, useState } from "react";
import { View } from "react-native";
import FastImage from "react-native-fast-image"; // Make sure to install this package
import { Text } from "../ui/text";

interface EventMarkerProps {
  imageUrl?: string;
  count?: number;
  isSelected?: boolean;
}

export function EventMarker({
  imageUrl,
  count = 1,
  isSelected = false,
}: EventMarkerProps) {
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    setImageError(false); // Reset error state when URL changes
  }, [imageUrl]);

  // Always use a thumbnail version for markers (Supabase Storage transformation)
  const optimizedUrl =
    imageUrl && imageUrl.includes("supabase.co")
      ? `${imageUrl}?width=40&height=40&quality=60`
      : imageUrl;

  return (
    <View
      className={`w-10 h-10 rounded-lg bg-white shadow-lg border-2 border-white ${
        isSelected ? "border-primary scale-110" : ""
      }`}
    >
      {optimizedUrl && !imageError ? (
        <FastImage
          source={{ uri: optimizedUrl }}
          style={{ width: "100%", height: "100%", borderRadius: 8 }}
          onError={() => setImageError(true)}
          resizeMode={FastImage.resizeMode.cover}
        />
      ) : (
        <View className="w-full h-full rounded-lg bg-muted" />
      )}
      {count > 1 && (
        <View className="absolute items-center justify-center w-5 h-5 border border-white rounded-full -top-1 -right-1 bg-primary">
          <Text className="text-xs font-bold text-white">{count}</Text>
        </View>
      )}
    </View>
  );
}
// Note: You must install react-native-fast-image and link it according to their docs for best performance.
