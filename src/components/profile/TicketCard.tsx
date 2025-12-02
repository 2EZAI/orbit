import React, { useEffect, useState } from "react";
import { View, TouchableOpacity } from "react-native";
import { Ticket } from "~/hooks/useMyTickets";
import { useTheme } from "../ThemeProvider";
import { Text } from "~/src/components/ui/text";
import { UnifiedData } from "../map/UnifiedDetailsSheet";
import { useEventDetails } from "~/hooks/useEventDetails";

function formatDate(dateString: string | null) {
  if (!dateString) return "TBA";
  const d = new Date(dateString);
  if (Number.isNaN(d.getTime())) return "TBA";
  return d.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(dateString: string | null) {
  if (!dateString) return "";
  const d = new Date(dateString);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatTicketId(id: string) {
  if (!id) return "";
  return (
    id
      .match(/.{1,4}/g)
      ?.join("-")
      .toUpperCase() ?? id
  );
}

export function TicketCard({
  ticket,
  onShowDetails,
  onViewEvent,
}: {
  ticket: Ticket;
  onShowDetails?: (event: UnifiedData | null) => void;
  onViewEvent?: (event: UnifiedData | null) => void;
}) {
  const { theme, isDarkMode } = useTheme();
  const [eventData, setEventData] = useState<UnifiedData | null>(null);
  const { getEventDetails } = useEventDetails();

  const eventDate = formatDate(ticket.event_start_datetime || ticket.issued_at);
  const eventTime = formatTime(ticket.event_start_datetime || ticket.issued_at);
  const issuedDate = formatDate(ticket.issued_at);

  useEffect(() => {
    if (eventData) return;
    const fetchEventDetails = async () => {
      const eventDetails = await getEventDetails(ticket.event_id, "supabase");
      console.log(
        "🔍 [TicketCard] eventDetails:😅😅😅😅😅😅🥶🥶🥶",
        eventDetails
      );
      setEventData(eventDetails);
    };
    fetchEventDetails();
  }, [ticket.event_id]);
  return (
    <View
      style={{
        borderRadius: 24,
        padding: 16,
        marginBottom: 16,
        backgroundColor: isDarkMode
          ? "rgba(15,23,42,0.95)"
          : "rgba(255,255,255,0.95)",
        borderWidth: 1,
        borderColor: isDarkMode ? "#4C1D95" : theme.colors.border,
        shadowColor: "#000",
        shadowOpacity: 0.25,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 8 },
        elevation: 6,
      }}
    >
      {/* Top row: pin + status pill */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 8,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Text style={{ fontSize: 18, marginRight: 6 }}>📍</Text>
          <View
            style={{
              paddingHorizontal: 10,
              paddingVertical: 4,
              borderRadius: 999,
              backgroundColor: theme.colors.primary,
            }}
          >
            <Text
              style={{
                fontSize: 11,
                fontWeight: "700",
                color: "white",
              }}
            >
              {ticket.status === "active" ? "Active Ticket" : ticket.status}
            </Text>
          </View>
        </View>
      </View>

      {/* Title + meta */}
      <View style={{ marginBottom: 12 }}>
        <Text
          style={{
            fontSize: 16,
            fontWeight: "800",
            color: theme.colors.text,
            marginBottom: 4,
          }}
          numberOfLines={2}
        >
          {ticket.event_name || "Orbit Event"}
        </Text>

        <Text
          style={{
            fontSize: 13,
            color: theme.colors.text + "CC",
          }}
        >
          {eventDate}
          {eventTime ? ` • ${eventTime}` : ""}
        </Text>

        <Text
          style={{
            fontSize: 12,
            color: theme.colors.text + "88",
            marginTop: 4,
          }}
        >
          Ticket ID {formatTicketId(ticket.id)} · Issued {issuedDate}
        </Text>
      </View>

      {/* Bottom pill buttons */}
      <View
        style={{
          flexDirection: "row",
          marginTop: 4,
          gap: 12,
        }}
      >
        <TouchableOpacity
          style={{
            flex: 1,
            height: 42,
            borderRadius: 999,
            backgroundColor: isDarkMode ? "#111827" : "white",
            justifyContent: "center",
            alignItems: "center",
          }}
          onPress={() => onShowDetails?.(eventData)}
        >
          <Text
            style={{
              fontSize: 14,
              fontWeight: "700",
              color: theme.colors.text,
            }}
          >
            Show QR Code
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={{
            flex: 1,
            height: 42,
            borderRadius: 999,
            backgroundColor: theme.colors.primary,
            justifyContent: "center",
            alignItems: "center",
          }}
          onPress={() => {
            console.log(
              "🔍 [TicketCard] eventData:😅😅😅😅😅😅🥶🥶🥶",
              eventData
            );
            onViewEvent?.(eventData);
          }}
        >
          <Text
            style={{
              fontSize: 14,
              fontWeight: "700",
              color: "white",
            }}
          >
            View Event
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default TicketCard;
