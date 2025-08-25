import React, { useState } from "react";
import { View, TouchableOpacity, StyleSheet, Dimensions } from "react-native";
import { Text } from "~/src/components/ui/text";
import { OptimizedImage } from "~/src/components/ui/optimized-image";
import { MapEvent } from "~/hooks/useUnifiedMapData";
import { Clock, MapPin, User, Calendar, Users } from "lucide-react-native";
import { format } from "date-fns";
import { UnifiedDetailsSheet } from "../map/UnifiedDetailsSheet";
import { useTheme } from "~/src/components/ThemeProvider";
import { LinearGradient } from "expo-linear-gradient";

const { width: screenWidth } = Dimensions.get("window");
const CARD_WIDTH = screenWidth - 32; // Full width with margins

interface FeedEventCardProps {
  event: MapEvent;
  onEventSelect?: (event: MapEvent, locationDetail: boolean) => void;
  nearbyEvents?: MapEvent[];
}

export function FeedEventCard({
  event,
  onEventSelect,
  nearbyEvents,
}: FeedEventCardProps) {
  const { theme } = useTheme();
  const [showDetails, setShowDetails] = useState(false);
  const startTime = new Date(event?.start_datetime);
  const endTime = event?.end_datetime ? new Date(event.end_datetime) : null;

  return (
    <>
      <TouchableOpacity
        style={[
          styles.eventCard,
          {
            backgroundColor: theme.colors.card,
            borderColor: theme.colors.border,
            shadowColor: theme.colors.primary,
          },
        ]}
        onPress={() => {
          setShowDetails(true);
          onEventSelect?.(event, false);
        }}
        activeOpacity={0.96}
      >
        {/* Event Image Section */}
        {event?.image_urls?.[0] && (
          <View style={styles.imageContainer}>
            <OptimizedImage
              uri={event?.image_urls[0]}
              width={CARD_WIDTH}
              height={200}
              quality={85}
              thumbnail={true}
              lazy={true}
              style={styles.eventImage}
              resizeMode="cover"
            />

            {/* Image overlay for better badge visibility */}
            <LinearGradient
              colors={["transparent", "rgba(0,0,0,0.1)"]}
              style={styles.imageOverlay}
            />

            {/* Date Badge */}
            <View style={styles.dateBadge}>
              <Text style={styles.dateBadgeDay}>{format(startTime, "d")}</Text>
              <Text style={styles.dateBadgeMonth}>
                {format(startTime, "MMM")}
              </Text>
            </View>

            {/* Attendees Badge */}
            {event?.attendees?.count && event.attendees.count > 0 && (
              <View
                style={[
                  styles.attendeesBadge,
                  { backgroundColor: theme.colors.primary },
                ]}
              >
                <Users size={12} color="white" />
                <Text style={styles.attendeesBadgeText}>
                  {event?.attendees?.count || 0}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Content Section */}
        <View style={styles.contentContainer}>
          {/* Host Information */}
          <View style={styles.hostSection}>
            <User size={14} color={theme.colors.text + "60"} />
            <Text
              style={[styles.hostText, { color: theme.colors.text + "60" }]}
            >
              @
              {event.created_by?.name ||
                event?.created_by?.username ||
                "Unknown"}
            </Text>
          </View>

          {/* Event Title */}
          <Text style={[styles.eventTitle, { color: theme.colors.text }]}>
            {event?.name || "Untitled Event"}
          </Text>

          {/* Time Information */}
          <View style={styles.timeSection}>
            <Clock size={16} color={theme.colors.text + "80"} />
            <Text
              style={[styles.timeText, { color: theme.colors.text + "80" }]}
            >
              {startTime && endTime
                ? `${format(startTime, "h:mm a")} - ${format(
                    endTime,
                    "h:mm a"
                  )}`
                : "Time TBD"}
            </Text>
          </View>

          {/* Location Section - Clickable */}
          <TouchableOpacity
            style={styles.locationSection}
            onPress={() => {
              setShowDetails(true);
              onEventSelect?.(event, true);
            }}
            activeOpacity={0.7}
          >
            <MapPin size={16} color={theme.colors.primary} />
            <View style={styles.locationTextContainer}>
              {event?.venue_name ? (
                <>
                  <Text
                    style={[styles.venueText, { color: theme.colors.text }]}
                  >
                    {event?.venue_name}
                  </Text>
                  <Text
                    style={[
                      styles.addressText,
                      { color: theme.colors.text + "80" },
                    ]}
                  >
                    {event?.address}
                  </Text>
                </>
              ) : (
                <Text
                  style={[
                    styles.addressText,
                    { color: theme.colors.text + "80" },
                  ]}
                >
                  {event?.address}
                </Text>
              )}
            </View>
          </TouchableOpacity>

          {/* Categories */}
          {event?.categories && event.categories.length > 0 && (
            <View style={styles.categoriesContainer}>
              {event.categories.map((category) => (
                <View
                  key={category.id}
                  style={[
                    styles.categoryChip,
                    { backgroundColor: theme.colors.primary + "15" },
                  ]}
                >
                  <Text
                    style={[
                      styles.categoryText,
                      { color: theme.colors.primary },
                    ]}
                  >
                    {category?.name}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </TouchableOpacity>

      {showDetails && (
        <UnifiedDetailsSheet
          data={event as any}
          isOpen={showDetails}
          onClose={() => setShowDetails(false)}
          nearbyData={(nearbyEvents || []) as any}
          onDataSelect={(data) => onEventSelect?.(data as MapEvent, false)}
          onShowControler={() => {}}
          isEvent={true}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  eventCard: {
    width: CARD_WIDTH,
    borderRadius: 24,
    borderWidth: 1.5,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 6,
    marginHorizontal: 16,
    marginBottom: 20,
    overflow: "hidden",
  },
  imageContainer: {
    position: "relative",
  },
  eventImage: {
    width: "100%",
    height: 200,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  imageOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  dateBadge: {
    position: "absolute",
    top: 16,
    left: 16,
    backgroundColor: "rgba(255,255,255,0.95)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  dateBadgeDay: {
    fontSize: 16,
    fontWeight: "800",
    color: "#333",
    lineHeight: 18,
  },
  dateBadgeMonth: {
    fontSize: 11,
    fontWeight: "600",
    color: "#666",
    marginTop: 1,
  },
  attendeesBadge: {
    position: "absolute",
    top: 16,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  attendeesBadgeText: {
    color: "white",
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 4,
  },
  contentContainer: {
    padding: 20,
  },
  hostSection: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  hostText: {
    fontSize: 13,
    fontWeight: "500",
    marginLeft: 6,
  },
  eventTitle: {
    fontSize: 20,
    fontWeight: "700",
    lineHeight: 26,
    marginBottom: 16,
  },
  timeSection: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  timeText: {
    fontSize: 14,
    fontWeight: "500",
    marginLeft: 8,
  },
  locationSection: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 16,
    padding: 12,
    backgroundColor: "rgba(139, 92, 246, 0.05)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(139, 92, 246, 0.1)",
  },
  locationTextContainer: {
    flex: 1,
    marginLeft: 8,
  },
  venueText: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 2,
  },
  addressText: {
    fontSize: 13,
    fontWeight: "500",
    lineHeight: 18,
  },
  categoriesContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: "600",
  },
});
