import React from "react";
import {
  View,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Dimensions,
} from "react-native";
import { Text } from "~/src/components/ui/text";
import { OptimizedImage } from "~/src/components/ui/optimized-image";
import { MapPin, Users, Calendar, Star } from "lucide-react-native";
import { useTheme } from "~/src/components/ThemeProvider";
import { LinearGradient } from "expo-linear-gradient";

const { width: screenWidth } = Dimensions.get("window");
const FEATURED_CARD_WIDTH = screenWidth * 0.82; // Larger, more prominent cards
const FEATURED_CARD_HEIGHT = 220; // Taller cards for better content display

interface FeaturedSectionProps {
  events: any[];
  currentIndex: number;
  onEventSelect: (event: any) => void;
  onIndexChange: (index: number) => void;
}

export function FeaturedSection({
  events,
  currentIndex,
  onEventSelect,
  onIndexChange,
}: FeaturedSectionProps) {
  const { theme } = useTheme();

  if (!events || events.length === 0) return null;

  return (
    <View style={styles.featuredSection}>
      {/* Section Header */}
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
          ✨ Featured Events
        </Text>
        <Text
          style={[styles.sectionSubtitle, { color: theme.colors.text + "80" }]}
        >
          Don't miss these amazing events happening near you
        </Text>
      </View>

      <FlatList
        data={events}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.id}
        snapToInterval={FEATURED_CARD_WIDTH + 20}
        decelerationRate="fast"
        renderItem={({ item, index }) => (
          <TouchableOpacity
            style={[
              styles.featuredCard,
              {
                backgroundColor: theme.colors.card,
                borderColor: theme.colors.border + "30",
              },
            ]}
            activeOpacity={0.96}
            onPress={() => onEventSelect(item)}
          >
            {/* Background Image */}
            <View style={styles.imageContainer}>
              <OptimizedImage
                uri={item.image || item.image_urls?.[0]}
                width={FEATURED_CARD_WIDTH}
                height={FEATURED_CARD_HEIGHT}
                quality={90}
                thumbnail={false}
                lazy={false}
                style={styles.featuredImage}
                resizeMode="cover"
              />

              {/* Enhanced Gradient Overlay */}
              <LinearGradient
                colors={[
                  "transparent",
                  "rgba(0,0,0,0.2)",
                  "rgba(0,0,0,0.6)",
                  "rgba(0,0,0,0.8)",
                ]}
                style={styles.gradientOverlay}
              />

              {/* Featured Badge */}
              <View
                style={[
                  styles.featuredBadge,
                  { backgroundColor: theme.colors.primary },
                ]}
              >
                <Star size={12} color="white" fill="white" />
                <Text style={styles.badgeText}>Featured</Text>
              </View>

              {/* Attendees Badge - Only for events */}
              {!item.isLocation && item.attendees > 0 && (
                <View style={styles.attendeesBadge}>
                  <Users size={12} color="white" />
                  <Text style={styles.attendeesText}>
                    {item.attendees || 0}
                  </Text>
                </View>
              )}
            </View>

            {/* Content Section - Better Organized */}
            <View style={styles.contentSection}>
              {/* Date Badge - Only for events */}
              {!item.isLocation && (
                <View style={styles.dateBadge}>
                  <Calendar size={12} color="white" />
                  <Text style={styles.dateText}>{item.date || "TBD"}</Text>
                </View>
              )}

              {/* Category Badge - For locations */}
              {item.isLocation && (
                <View style={styles.dateBadge}>
                  <MapPin size={12} color="white" />
                  <Text style={styles.dateText}>
                    {item.category || item.type || "Place"}
                  </Text>
                </View>
              )}

              {/* Event Title - More space and better typography */}
              <Text style={styles.eventTitle} numberOfLines={2}>
                {item.title || item.name || "Untitled Event"}
              </Text>

              {/* Location Row - Better spacing */}
              {item.location && (
                <View style={styles.locationRow}>
                  <MapPin size={13} color="rgba(255,255,255,0.9)" />
                  <Text style={styles.locationText} numberOfLines={1}>
                    {item.location}
                  </Text>
                </View>
              )}

              {/* Action Hint */}
              <Text style={styles.actionHint}>Tap to view details</Text>
            </View>
          </TouchableOpacity>
        )}
        contentContainerStyle={styles.featuredListContent}
        onMomentumScrollEnd={(event) => {
          const offsetX = event.nativeEvent.contentOffset.x;
          const cardWidth = FEATURED_CARD_WIDTH + 20; // Card width + margin
          const newIndex = Math.round(offsetX / cardWidth);
          const clampedIndex = Math.max(0, Math.min(newIndex, events.length - 1));
          onIndexChange(clampedIndex);
        }}
        onScroll={(event) => {
          const offsetX = event.nativeEvent.contentOffset.x;
          const cardWidth = FEATURED_CARD_WIDTH + 20;
          const newIndex = Math.round(offsetX / cardWidth);
          const clampedIndex = Math.max(0, Math.min(newIndex, events.length - 1));
          onIndexChange(clampedIndex);
        }}
        scrollEventThrottle={16}
      />

      {/* Scroll Indicator Dots */}
      <View style={styles.scrollIndicator}>
        {events.map((_, index) => (
          <View
            key={index}
            style={[
              styles.dot,
              {
                backgroundColor:
                  index === currentIndex
                    ? theme.colors.primary
                    : theme.colors.border,
              },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  featuredSection: {
    marginBottom: 28,
  },
  sectionHeader: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: "800",
    marginBottom: 6,
    lineHeight: 30,
    paddingVertical: 2,
  },
  sectionSubtitle: {
    fontSize: 14,
    fontWeight: "500",
    lineHeight: 20,
  },
  featuredListContent: {
    paddingLeft: 20,
    paddingRight: 20,
  },
  featuredCard: {
    width: FEATURED_CARD_WIDTH,
    height: FEATURED_CARD_HEIGHT,
    borderRadius: 24,
    borderWidth: 1,
    shadowColor: "#8B5CF6",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
    marginRight: 20,
    overflow: "hidden",
    backgroundColor: "#FFFFFF", // Add solid background color to fix shadow warning
  },
  imageContainer: {
    position: "relative",
    flex: 1,
  },
  featuredImage: {
    width: "100%",
    height: "100%",
    borderRadius: 24,
  },
  gradientOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 24,
  },
  featuredBadge: {
    position: "absolute",
    top: 16,
    left: 16,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  badgeText: {
    color: "white",
    fontSize: 12,
    fontWeight: "700",
    marginLeft: 4,
  },
  attendeesBadge: {
    position: "absolute",
    top: 16,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 12,
    // backdropFilter: "blur(10px)",
  },
  attendeesText: {
    color: "white",
    fontSize: 11,
    fontWeight: "600",
    marginLeft: 4,
  },
  contentSection: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    paddingTop: 24,
  },
  dateBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 12,
  },
  dateText: {
    color: "white",
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 4,
  },
  eventTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "white",
    marginBottom: 8,
    lineHeight: 24,
    textShadowColor: "rgba(0,0,0,0.3)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  locationText: {
    fontSize: 13,
    color: "rgba(255,255,255,0.95)",
    fontWeight: "500",
    marginLeft: 6,
    flex: 1,
    textShadowColor: "rgba(0,0,0,0.3)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  actionHint: {
    fontSize: 11,
    color: "rgba(255,255,255,0.7)",
    fontWeight: "500",
    textAlign: "center",
  },
  scrollIndicator: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 16,
    paddingHorizontal: 20,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
});
