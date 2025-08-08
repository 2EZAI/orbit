import React from "react";
import { View, TouchableOpacity, StyleSheet, Dimensions } from "react-native";
import { Text } from "~/src/components/ui/text";
import { OptimizedImage } from "~/src/components/ui/optimized-image";
import { MapPin, Calendar } from "lucide-react-native";
import { useTheme } from "~/src/components/ThemeProvider";

const { width: screenWidth } = Dimensions.get("window");

interface CompactEventCardProps {
  item: any;
  onPress: () => void;
}

export function CompactEventCard({ item, onPress }: CompactEventCardProps) {
  const { theme } = useTheme();

  const isEvent = item.start_datetime || item.type === "event";
  const imageUrl = item.image_urls?.[0] || item.image;

  return (
    <TouchableOpacity
      style={[
        styles.compactCard,
        {
          backgroundColor: theme.colors.card,
          borderColor: theme.colors.border,
          shadowColor: theme.colors.primary,
        },
      ]}
      activeOpacity={0.95}
      onPress={onPress}
    >
      {/* Image Section */}
      <View style={styles.imageContainer}>
        <OptimizedImage
          uri={imageUrl}
          width={80}
          height={80}
          quality={85}
          thumbnail={true}
          lazy={true}
          style={styles.cardImage}
          resizeMode="cover"
        />
      </View>

      {/* Content Section */}
      <View style={styles.contentContainer}>
        {/* Title */}
        <Text
          style={[styles.cardTitle, { color: theme.colors.text }]}
          numberOfLines={2}
        >
          {item.title || item.name || "Untitled Event"}
        </Text>

        {/* Meta Info */}
        <View style={styles.metaContainer}>
          {isEvent && item.start_datetime && (
            <View style={styles.metaItem}>
              <Calendar size={12} color={theme.colors.text + "80"} />
              <Text
                style={[styles.metaText, { color: theme.colors.text + "80" }]}
              >
                {new Date(item.start_datetime).toLocaleDateString()}
              </Text>
            </View>
          )}

          {item.location && (
            <View style={styles.metaItem}>
              <MapPin size={12} color={theme.colors.text + "80"} />
              <Text
                style={[styles.metaText, { color: theme.colors.text + "80" }]}
                numberOfLines={1}
              >
                {item.location}
              </Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  compactCard: {
    width: screenWidth - 40,
    height: 90,
    borderRadius: 16,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    flexDirection: "row",
    overflow: "hidden",
    marginHorizontal: 4,
    marginVertical: 8,
  },
  imageContainer: {
    width: 80,
    height: 80,
    margin: 5,
    borderRadius: 12,
    overflow: "hidden",
  },
  cardImage: {
    width: "100%",
    height: "100%",
  },
  contentContainer: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 12,
    justifyContent: "space-between",
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 18,
  },
  metaContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaText: {
    fontSize: 11,
    fontWeight: "500",
  },
});
