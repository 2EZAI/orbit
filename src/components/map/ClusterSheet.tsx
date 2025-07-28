import React from "react";
import {
  View,
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
} from "react-native";
import { Text } from "../ui/text";
import { Sheet } from "../ui/sheet";
import { MapEvent } from "~/hooks/useMapEvents";
import { formatTime, formatDate } from "~/src/lib/date";
import { MapPin, Calendar, X, Users } from "lucide-react-native";
import { useTheme } from "~/src/components/ThemeProvider";

interface ClusterSheetProps {
  events: MapEvent[];
  onEventSelect: (event: MapEvent) => void;
  onClose: () => void;
}

export function ClusterSheet({
  events,
  onEventSelect,
  onClose,
}: ClusterSheetProps) {
  const { theme } = useTheme();

  return (
    <Sheet isOpen onClose={onClose}>
      <View
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        {/* Header */}
        <View
          style={[styles.header, { borderBottomColor: theme.colors.border }]}
        >
          <View style={styles.headerLeft}>
            <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
              {events?.[0]?.type === "googleApi" ||
              events?.[0]?.type === "static"
                ? `${events.length} Locations`
                : `${events.length} Events at this location`}
            </Text>
            <Text
              style={[
                styles.headerSubtitle,
                { color: theme.colors.text + "CC" },
              ]}
            >
              Tap to view details
            </Text>
          </View>

          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <X size={20} color="#8B5CF6" />
          </TouchableOpacity>
        </View>

        {/* Events List */}
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
        >
          {events.map((event) => (
            <TouchableOpacity
              key={event.id}
              onPress={() => {
                onEventSelect(event);
                onClose();
              }}
              style={[styles.eventCard, { backgroundColor: theme.colors.card }]}
              activeOpacity={0.8}
            >
              {/* Event Image */}
              <View style={styles.imageContainer}>
                <Image
                  source={{
                    uri:
                      event?.image_urls?.[0] ||
                      "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=600&q=80",
                  }}
                  style={styles.eventImage}
                  resizeMode="cover"
                />

                {/* Event Type Badge */}
                {(event as any).is_ticketmaster && (
                  <View style={styles.ticketmasterBadge}>
                    <Text style={styles.badgeText}>Ticketmaster</Text>
                  </View>
                )}
              </View>

              {/* Event Details */}
              <View style={styles.eventContent}>
                <Text
                  style={[styles.eventTitle, { color: theme.colors.text }]}
                  numberOfLines={2}
                >
                  {event.name}
                </Text>

                {/* Date and Time */}
                {event?.start_datetime && (
                  <View style={styles.metaRow}>
                    <Calendar size={14} color={theme.colors.text + "CC"} />
                    <Text
                      style={[
                        styles.metaText,
                        { color: theme.colors.text + "CC" },
                      ]}
                    >
                      {formatDate(event?.start_datetime)} •{" "}
                      {formatTime(event?.start_datetime)}
                    </Text>
                  </View>
                )}

                {/* Venue */}
                {event.venue_name && (
                  <View style={styles.metaRow}>
                    <MapPin size={14} color={theme.colors.text + "CC"} />
                    <Text
                      style={[
                        styles.metaText,
                        { color: theme.colors.text + "CC" },
                      ]}
                      numberOfLines={1}
                    >
                      {event.venue_name}
                    </Text>
                  </View>
                )}

                {/* Attendee count */}
                {event?.attendees?.count > 0 && (
                  <View style={styles.metaRow}>
                    <Users size={14} color={theme.colors.primary} />
                    <Text
                      style={[styles.metaText, { color: theme.colors.primary }]}
                    >
                      {event.attendees.count}{" "}
                      {event.attendees.count === 1 ? "attendee" : "attendees"}
                    </Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    shadowColor: "#8B5CF6",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    fontWeight: "500",
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(139, 92, 246, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 16,
    borderWidth: 1,
    borderColor: "rgba(139, 92, 246, 0.2)",
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  eventCard: {
    flexDirection: "row",
    padding: 16,
    marginBottom: 12,
    borderRadius: 16,
    shadowColor: "#8B5CF6",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  imageContainer: {
    width: 80,
    height: 80,
    borderRadius: 12,
    marginRight: 16,
    overflow: "hidden",
    position: "relative",
  },
  eventImage: {
    width: "100%",
    height: "100%",
  },
  ticketmasterBadge: {
    position: "absolute",
    top: 4,
    left: 4,
    backgroundColor: "#ff6b6b",
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeText: {
    color: "white",
    fontSize: 10,
    fontWeight: "600",
  },
  eventContent: {
    flex: 1,
    justifyContent: "space-between",
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 8,
    lineHeight: 20,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  metaText: {
    fontSize: 12,
    fontWeight: "500",
    marginLeft: 6,
    flex: 1,
  },
});
