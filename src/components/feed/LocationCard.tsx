import React from "react";
import { TouchableOpacity, View, StyleSheet, Dimensions } from "react-native";
import { Text } from "~/src/components/ui/text";
import { OptimizedImage } from "~/src/components/ui/optimized-image";
import { useTheme } from "~/src/components/ThemeProvider";
import { MapPin, Star, ArrowRight } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";

const { width: screenWidth } = Dimensions.get("window");
const LOCATION_CARD_WIDTH = screenWidth - 40; // Full width with margins

interface LocationCardProps {
  item: any;
  onPress: () => void;
}

export function LocationCard({ item, onPress }: LocationCardProps) {
  const { theme } = useTheme();

  return (
    <TouchableOpacity
      style={[
        styles.modernLocationCard,
        {
          backgroundColor: theme.colors.card,
          borderColor: theme.colors.border,
          shadowColor: theme.colors.primary,
        },
      ]}
      activeOpacity={0.96}
      onPress={onPress}
    >
      {/* Location Image with Overlay */}
      <View style={styles.imageSection}>
        <OptimizedImage
          uri={item.image_urls?.[0]}
          width={140}
          height={160}
          quality={85}
          thumbnail={true}
          lazy={true}
          style={styles.locationImage}
          resizeMode="cover"
        />

        {/* Subtle overlay for image */}
        <LinearGradient
          colors={["transparent", "rgba(0,0,0,0.1)"]}
          style={styles.imageOverlay}
        />

        {/* Rating/Popularity Badge - Only show if rating exists */}
        {item.rating && (
          <View
            style={[
              styles.ratingBadge,
              { backgroundColor: theme.colors.primary },
            ]}
          >
            <Star size={10} color="white" fill="white" />
            <Text style={styles.ratingText}>{item.rating}</Text>
          </View>
        )}
      </View>

      {/* Content Section with Better Layout */}
      <View style={styles.contentSection}>
        {/* Location Category */}
        <View
          style={[
            styles.categoryBadge,
            { backgroundColor: theme.colors.primary + "15" },
          ]}
        >
          <MapPin size={12} color={theme.colors.primary} />
          <Text style={[styles.categoryText, { color: theme.colors.primary }]}>
            {item.category || item.type || "Place"}
          </Text>
        </View>

        {/* Location Title - More space */}
        <Text
          style={[styles.locationTitle, { color: theme.colors.text }]}
          numberOfLines={2}
        >
          {item.title || item.name}
        </Text>

        {/* Location Address/Description */}
        {(item.location || item.address || item.description) && (
          <Text
            style={[
              styles.locationSubtitle,
              { color: theme.colors.text + "80" },
            ]}
            numberOfLines={2}
          >
            {item.location || item.address || item.description}
          </Text>
        )}

        {/* Action Section */}
        <View style={styles.actionSection}>
          <Text
            style={[styles.actionText, { color: theme.colors.text + "60" }]}
          >
            Explore location
          </Text>
          <ArrowRight size={14} color={theme.colors.text + "60"} />
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  modernLocationCard: {
    width: LOCATION_CARD_WIDTH,
    minHeight: 140,
    borderRadius: 20,
    borderWidth: 1.5,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 6,
    marginBottom: 16,
    overflow: "hidden",
    flexDirection: "row",
  },
  imageSection: {
    position: "relative",
    width: 140,
  },
  locationImage: {
    width: 140,
    height: 160,
    borderTopLeftRadius: 20,
    borderBottomLeftRadius: 20,
  },
  imageOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: 20,
    borderBottomLeftRadius: 20,
  },
  ratingBadge: {
    position: "absolute",
    top: 12,
    left: 12,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  ratingText: {
    color: "white",
    fontSize: 10,
    fontWeight: "600",
    marginLeft: 2,
  },
  contentSection: {
    flex: 1,
    padding: 10,
    justifyContent: "space-between",
  },
  categoryBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    marginBottom: 8,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: "600",
    marginLeft: 4,
  },
  locationTitle: {
    fontSize: 16,
    fontWeight: "700",
    lineHeight: 18,
    marginBottom: 1,
  },
  locationSubtitle: {
    fontSize: 13,
    fontWeight: "500",
    lineHeight: 15,
    marginBottom: 6,
  },
  actionSection: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  actionText: {
    fontSize: 12,
    fontWeight: "500",
  },
});
