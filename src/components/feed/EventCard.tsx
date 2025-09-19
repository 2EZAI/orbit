import React from "react";
import { View, TouchableOpacity, StyleSheet, Dimensions } from "react-native";
import { Text } from "~/src/components/ui/text";
import { OptimizedImage } from "~/src/components/ui/optimized-image";
import { MapPin, Users, Calendar } from "lucide-react-native";
import { useTheme } from "~/src/components/ThemeProvider";
import { LinearGradient } from "expo-linear-gradient";

const { width: screenWidth } = Dimensions.get("window");
const CARD_WIDTH = screenWidth * 0.72; // More responsive card width

interface EventCardProps {
  item: any;
  onPress: () => void;
}

export function EventCard({ item, onPress }: EventCardProps) {
  const { theme } = useTheme();

  return (
    <TouchableOpacity
      style={[
        styles.modernEventCard,
        {
          backgroundColor: theme.colors.border,
          borderColor: theme.colors.border,
          shadowColor: theme.colors.primary,
        },
      ]}
      activeOpacity={0.95}
      onPress={onPress}
    >
      {/* Event Image with Overlay */}
      <View style={styles.imageContainer}>
        <OptimizedImage
          uri={item.image_urls?.[0]}
          width={CARD_WIDTH}
          height={160}
          quality={85}
          thumbnail={true}
          lazy={true}
          style={styles.eventImage}
          resizeMode="cover"
        />

        {/* Subtle gradient overlay for better text readability */}
        <LinearGradient
          colors={["transparent", "rgba(0,0,0,0.1)"]}
          style={styles.imageGradient}
        />

        {/* Attendees badge on image - Only for events */}
        {!item.isLocation &&
          typeof item.attendees === "number" &&
          item.attendees > 0 && (
            <View
              style={[
                styles.attendeesBadge,
                { backgroundColor: theme.colors.primary },
              ]}
            >
              <Users size={12} color="white" />
              <Text style={styles.attendeesBadgeText}>{item.attendees}</Text>
            </View>
          )}
      </View>

      {/* Content Section with Better Spacing */}
      <View style={styles.contentContainer}>
        {/* Date Badge - Only for events */}
        {!item.isLocation && (
          <View
            style={[
              styles.dateBadge,
              { backgroundColor: theme.colors.primary + "15" },
            ]}
          >
            <Calendar size={14} color={theme.colors.primary} />
            <Text style={[styles.dateText, { color: theme.colors.primary }]}>
              {item.date || "TBD"}
            </Text>
          </View>
        )}

        {/* Event Title - More space, better line height */}
        <Text
          style={[styles.eventTitle, { color: theme.colors.text }]}
          numberOfLines={2}
        >
          {item.title || item.name || "Untitled Event"}
        </Text>

        {/* Location with Icon */}
        {item.location && (
          <View style={styles.locationContainer}>
            <MapPin size={14} color={theme.colors.text + "80"} />
            <Text
              style={[styles.locationText, { color: theme.colors.text + "80" }]}
              numberOfLines={2}
            >
              {item.location}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  modernEventCard: {
    width: CARD_WIDTH,
    borderRadius: 20,
    borderWidth: 1.5,
    shadowColor: "#8B5CF6",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
    marginRight: 16,
    overflow: "hidden",
    backgroundColor: "#FFFFFF",
  },
  imageContainer: {
    position: "relative",
  },
  eventImage: {
    width: "100%",
    height: 160,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  imageGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  attendeesBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  attendeesBadgeText: {
    color: "white",
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 4,
  },
  contentContainer: {
    padding: 16,
    paddingTop: 12,
  },
  dateBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 10,
  },
  dateText: {
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 4,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: "700",
    lineHeight: 22,
    marginBottom: 10,
    minHeight: 44, // Ensures consistent height for 2 lines
  },
  locationContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  locationText: {
    fontSize: 13,
    fontWeight: "500",
    marginLeft: 6,
    flex: 1,
    lineHeight: 18,
  },
  timeContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  timeText: {
    fontSize: 12,
    fontWeight: "500",
    marginLeft: 6,
  },
});
