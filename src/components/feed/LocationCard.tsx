import React from "react";
import { TouchableOpacity, View, StyleSheet } from "react-native";
import { Text } from "~/src/components/ui/text";
import { OptimizedImage } from "~/src/components/ui/optimized-image";

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=600&q=80";

function isValidImage(url: string | undefined | null) {
  if (!url) return false;
  if (typeof url !== "string") return false;
  if (url.trim() === "") return false;
  if (url.includes("placehold.co") || url.includes("fpoimg.com")) return false;
  return true;
}

interface LocationCardProps {
  item: any;
  onPress: () => void;
}

export function LocationCard({ item, onPress }: LocationCardProps) {
  return (
    <TouchableOpacity
      style={styles.airbnbLocationCard}
      activeOpacity={0.9}
      onPress={onPress}
    >
      {/* Location Image */}
      <OptimizedImage
        uri={item.image_urls?.[0]}
        width={280}
        height={120}
        quality={75}
        thumbnail={true}
        lazy={true}
        style={styles.airbnbLocationImage}
        resizeMode="cover"
      />
      <View style={styles.airbnbLocationContent}>
        <Text style={styles.airbnbLocationTitle} numberOfLines={2}>
          {item.title}
        </Text>
        {item.location && (
          <Text style={styles.airbnbLocationSubtitle} numberOfLines={1}>
            {item.location}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  airbnbLocationCard: {
    width: "100%",
    height: 120,
    borderRadius: 18,
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 12,
    overflow: "hidden",
    flexDirection: "row",
    alignItems: "center",
  },
  airbnbLocationImage: {
    width: 100,
    height: "100%",
    borderTopLeftRadius: 18,
    borderBottomLeftRadius: 18,
  },
  airbnbLocationContent: {
    flex: 1,
    paddingLeft: 12,
  },
  airbnbLocationTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#222",
    marginBottom: 2,
  },
  airbnbLocationSubtitle: {
    fontSize: 13,
    color: "#888",
    fontWeight: "500",
  },
});
