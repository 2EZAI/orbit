import React, { useEffect } from "react";
import { View, Image, StyleSheet } from "react-native";
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
    <View style={[styles.container, isSelected && styles.selected]}>
      {imageUrl ? (
        <Image
          source={{ uri: imageUrl }}
          style={styles.image}
          onError={(e) =>
            console.error(
              "[EventMarker] Image load error:",
              e.nativeEvent.error
            )
          }
        />
      ) : (
        <View style={styles.placeholder} />
      )}
      {count > 1 && (
        <View style={styles.countBadge}>
          <Text style={styles.countText}>{count}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#ffffff",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    borderWidth: 2,
    borderColor: "#ffffff",
  },
  selected: {
    borderColor: "#007AFF",
    transform: [{ scale: 1.1 }],
  },
  image: {
    width: "100%",
    height: "100%",
    borderRadius: 18,
  },
  placeholder: {
    width: "100%",
    height: "100%",
    borderRadius: 18,
    backgroundColor: "#E1E1E1",
  },
  countBadge: {
    position: "absolute",
    top: -5,
    right: -5,
    backgroundColor: "#007AFF",
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ffffff",
  },
  countText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "bold",
  },
});
