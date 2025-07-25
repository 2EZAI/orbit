import React from "react";
import { View, TouchableOpacity, StyleSheet } from "react-native";
import { Text } from "~/src/components/ui/text";
import { OptimizedImage } from "~/src/components/ui/optimized-image";
import { MapPin, Clock, Users } from "lucide-react-native";

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=600&q=80";

function isValidImage(url: string | undefined | null) {
  if (!url) return false;
  if (typeof url !== "string") return false;
  if (url.trim() === "") return false;
  if (url.includes("placehold.co") || url.includes("fpoimg.com")) return false;
  return true;
}

interface EventCardProps {
  item: any;
  onPress: () => void;
}

export function EventCard({ item, onPress }: EventCardProps) {
  return (
    <TouchableOpacity
      style={styles.airbnbEventCard}
      activeOpacity={0.9}
      onPress={onPress}
    >
      {/* Event Image */}
      <OptimizedImage
        uri={item.image_urls?.[0]}
        width={280}
        height={120}
        quality={75}
        thumbnail={true}
        lazy={true}
        style={styles.airbnbEventImage}
        resizeMode="cover"
      />
      <View style={styles.airbnbEventContent}>
        <Text style={styles.airbnbEventTitle} numberOfLines={2}>
          {item.title}
        </Text>
        <View style={styles.airbnbEventMeta}>
          <View style={styles.airbnbMetaRow}>
            <Clock size={12} color="#666" />
            <Text style={styles.airbnbEventMetaText}>{item.date}</Text>
          </View>
          {item.location && (
            <View style={styles.airbnbMetaRow}>
              <MapPin size={12} color="#666" />
              <Text style={styles.airbnbEventMetaText} numberOfLines={1}>
                {item.location}
              </Text>
            </View>
          )}
        </View>
        {item.attendees > 0 && (
          <View style={styles.airbnbAttendeesChip}>
            <Users size={10} color="#6c47ff" />
            <Text style={styles.airbnbAttendeesText}>{item.attendees}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  airbnbEventCard: {
    width: 220,
    borderRadius: 16,
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
    marginRight: 12,
    overflow: "hidden",
    position: "relative",
  },
  airbnbEventImage: {
    width: "100%",
    height: 140,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  airbnbEventContent: {
    padding: 12,
  },
  airbnbEventTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#222",
    marginBottom: 6,
  },
  airbnbEventMeta: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 3,
  },
  airbnbMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 12,
  },
  airbnbEventMetaText: {
    fontSize: 12,
    color: "#666",
    fontWeight: "500",
    marginLeft: 3,
  },
  airbnbAttendeesChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    backgroundColor: "#f0f0ff",
    alignSelf: "flex-start",
    marginTop: 3,
  },
  airbnbAttendeesText: {
    fontSize: 11,
    color: "#6c47ff",
    fontWeight: "600",
    marginLeft: 3,
  },
});
