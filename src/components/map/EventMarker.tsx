import React, { useEffect } from "react";
import { View, Image } from "react-native";
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
  useEffect(() => {
    console.log("[EventMarker] Rendering marker:", {
      imageUrl,
      count,
      isSelected,
    });
  }, [imageUrl, count, isSelected]);

  return (
    <View
      className={`w-10 h-10 rounded-lg bg-white shadow-lg border-2 border-white ${
        isSelected ? "border-primary scale-110" : ""
      }`}
    >
      {imageUrl ? (
        <Image
          source={{ uri: imageUrl }}
          className="w-full h-full rounded-lg"
          onError={(e) =>
            console.log(
              "[EventMarker] Image load error:",
              e.nativeEvent.error
            )
          }
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
