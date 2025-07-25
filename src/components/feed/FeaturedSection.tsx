import React from "react";
import { View, TouchableOpacity, FlatList, StyleSheet } from "react-native";
import { Text } from "~/src/components/ui/text";
import { OptimizedImage } from "~/src/components/ui/optimized-image";
import { MapPin, Users } from "lucide-react-native";

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=600&q=80";

function isValidImage(url: string | undefined | null) {
  if (!url) return false;
  if (typeof url !== "string") return false;
  if (url.trim() === "") return false;
  if (url.includes("placehold.co") || url.includes("fpoimg.com")) return false;
  return true;
}

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
  if (!events || events.length === 0) return null;

  return (
    <View style={styles.featuredSection}>
      <FlatList
        data={events}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.unifiedFeaturedCard}
            activeOpacity={0.9}
            onPress={() => onEventSelect(item)}
          >
            {/* Background Image */}
            <OptimizedImage
              uri={item.image || item.image_urls?.[0]}
              width={280}
              height={160}
              quality={85}
              thumbnail={false}
              lazy={false}
              style={styles.unifiedFeaturedImage}
              resizeMode="cover"
            />

            {/* Gradient Overlay */}
            <View style={styles.unifiedGradientOverlay} />

            {/* Featured Badge */}
            <View style={styles.unifiedFeaturedBadge}>
              <Text style={styles.unifiedBadgeText}>Featured Event</Text>
            </View>

            {/* Content Overlay */}
            <View style={styles.unifiedContentOverlay}>
              {/* Event Title - Allow more lines */}
              <Text style={styles.unifiedEventTitle} numberOfLines={3}>
                {item.title}
              </Text>

              {/* Event Date */}
              <Text style={styles.unifiedEventDate}>{item.date}</Text>

              {/* Location Row */}
              {item.location && (
                <View style={styles.unifiedLocationRow}>
                  <MapPin size={12} color="rgba(255,255,255,0.9)" />
                  <Text style={styles.unifiedLocationText} numberOfLines={2}>
                    {item.location}
                  </Text>
                </View>
              )}

              {/* Bottom Row - Attendees */}
              {item.attendees > 0 && (
                <View style={styles.unifiedAttendeesRow}>
                  <Users size={12} color="rgba(255,255,255,0.9)" />
                  <Text style={styles.unifiedAttendeesText}>
                    {item.attendees} people going
                  </Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        )}
        contentContainerStyle={styles.featuredListContent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  featuredSection: {
    marginBottom: 24,
  },
  featuredListContent: {
    paddingLeft: 20,
    paddingRight: 8,
  },
  unifiedFeaturedCard: {
    width: 260,
    height: 180,
    borderRadius: 16,
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
    marginRight: 12,
    overflow: "hidden",
    position: "relative",
  },
  unifiedFeaturedImage: {
    width: "100%",
    height: "100%",
    borderRadius: 16,
  },
  unifiedGradientOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.4)",
    borderRadius: 16,
  },
  unifiedFeaturedBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    backgroundColor: "#00D4AA",
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  unifiedBadgeText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 9,
  },
  unifiedContentOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 12,
    paddingTop: 16,
    backgroundColor: "rgba(0,0,0,0.7)",
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  unifiedEventTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 4,
    lineHeight: 20,
  },
  unifiedEventDate: {
    fontSize: 12,
    color: "rgba(255,255,255,0.9)",
    fontWeight: "500",
    marginBottom: 3,
  },
  unifiedLocationRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 3,
  },
  unifiedLocationText: {
    fontSize: 11,
    color: "rgba(255,255,255,0.9)",
    fontWeight: "500",
    marginLeft: 3,
    flex: 1,
  },
  unifiedAttendeesRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  unifiedAttendeesText: {
    fontSize: 11,
    color: "rgba(255,255,255,0.9)",
    fontWeight: "500",
    marginLeft: 3,
  },
});
