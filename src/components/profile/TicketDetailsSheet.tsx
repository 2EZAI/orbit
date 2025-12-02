import React from "react";
import {
  Dimensions,
  Image,
  Modal,
  ScrollView,
  TouchableOpacity,
  View,
} from "react-native";
import { ArrowLeft, Flag } from "lucide-react-native";
import QRCode from "react-native-qrcode-svg";
import { Ticket } from "~/hooks/useMyTickets";
import { useTheme } from "../ThemeProvider";
import { Text } from "~/src/components/ui/text";
import { Sheet } from "../ui/sheet";
import { UnifiedData } from "../map/UnifiedDetailsSheet";
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

interface TicketDetailsSheetProps {
  visible: boolean;
  onClose: () => void;
  ticket: Ticket | null;

  eventData?: UnifiedData | null;
}

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
  return id.slice(0, 12).toUpperCase() ?? id;
}

export const TicketDetailsSheet: React.FC<TicketDetailsSheetProps> = ({
  visible,
  onClose,
  ticket,
  eventData,
}) => {
  const { theme, isDarkMode } = useTheme();
  console.log("🔍 [TicketDetailsSheet] ticket:😅😅😅😅😅😅🥶🥶🥶", ticket);
  if (!ticket) return null;

  const eventDate = formatDate(ticket.event_start_datetime || ticket.issued_at);
  const eventTime = formatTime(ticket.event_start_datetime || ticket.issued_at);
  const issuedDate = formatDate(ticket.issued_at);

  return (
    <Sheet isOpen={visible} onClose={onClose}>
      <View
        style={{
          flex: 1,
          backgroundColor: theme.colors.background,
        }}
      >
        {/* Hero header */}
        <View
          style={{
            height: SCREEN_HEIGHT * 0.35,
            width: "100%",
            overflow: "hidden",
          }}
        >
          {eventData?.image_urls?.[0] ? (
            <Image
              source={{ uri: eventData.image_urls[0] }}
              style={{ width: "100%", height: "100%" }}
              resizeMode="cover"
            />
          ) : (
            <View
              style={{
                flex: 1,
                backgroundColor: "#991b1b",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  fontSize: 28,
                  fontWeight: "900",
                  letterSpacing: 4,
                  color: "white",
                  textTransform: "uppercase",
                }}
              >
                Ticket
              </Text>
            </View>
          )}

          {/* Top controls over image */}
          <View
            style={{
              position: "absolute",
              top: 48,
              left: 16,
              right: 16,
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <TouchableOpacity
              onPress={onClose}
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: "rgba(0,0,0,0.6)",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <ArrowLeft size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Content */}
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingTop: 20,
            paddingBottom: 32,
          }}
          showsVerticalScrollIndicator={false}
        >
          {/* Event title */}
          <Text
            style={{
              fontSize: 20,
              fontWeight: "800",
              color: theme.colors.text,
              marginBottom: 8,
            }}
          >
            {ticket.event_name || "Orbit Event"}
          </Text>

          {/* WHEN card */}
          <View
            style={{
              marginTop: 12,
              marginBottom: 12,
              borderRadius: 20,
              backgroundColor: "#1f2937",
              padding: 16,
            }}
          >
            <Text
              style={{
                fontSize: 11,
                fontWeight: "700",
                color: "#a855f7",
                marginBottom: 4,
                textTransform: "uppercase",
                letterSpacing: 1,
              }}
            >
              When
            </Text>
            <Text
              style={{
                fontSize: 15,
                fontWeight: "700",
                color: "#e5e7eb",
              }}
            >
              {eventDate}
            </Text>
            {eventTime ? (
              <Text
                style={{
                  fontSize: 14,
                  color: "#e5e7eb",
                  marginTop: 2,
                }}
              >
                {eventTime}
              </Text>
            ) : null}
          </View>

          {/* Ticket meta card */}
          <View
            style={{
              marginBottom: 16,
              borderRadius: 20,
              backgroundColor: isDarkMode ? "#020617" : "#0f172a",
              padding: 16,
            }}
          >
            <Text
              style={{
                fontSize: 11,
                fontWeight: "700",
                color: "#38bdf8",
                marginBottom: 4,
                textTransform: "uppercase",
                letterSpacing: 1,
              }}
            >
              Ticket Details
            </Text>
            <View
              style={{
                marginTop: 4,
              }}
            >
              <View style={{ flex: 1, marginRight: 12 }}>
                <Text
                  style={{
                    fontSize: 12,
                    color: theme.colors.text + "88",
                    fontWeight: "600",
                  }}
                >
                  Ticket ID
                </Text>
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: "800",
                    color: theme.colors.primary,
                    marginTop: 2,
                  }}
                  numberOfLines={1}
                >
                  {formatTicketId(ticket.id)}
                </Text>
              </View>
              <View style={{ marginTop: 8 }}>
                <Text
                  style={{
                    fontSize: 12,
                    color: theme.colors.text + "88",
                    fontWeight: "600",
                  }}
                >
                  Issued
                </Text>
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: "600",
                    color: "#e5e7eb",
                    marginTop: 2,
                  }}
                >
                  {issuedDate}
                </Text>
              </View>
            </View>
          </View>

          {/* QR code card */}
          <View
            style={{
              borderRadius: 24,
              backgroundColor: isDarkMode ? "#020617" : "#ffffff",
              paddingVertical: 40,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <QRCode
              value={ticket.qr_code}
              size={SCREEN_WIDTH * 0.8}
              backgroundColor="transparent"
              logo={require("~/assets/bg-images/OrbitLogo.png")}
              color={isDarkMode ? "#ffffff" : "#000000"}
            />

            <Text
              style={{
                marginTop: 16,
                fontSize: 12,
                color: theme.colors.text + "AA",
                textAlign: "center",
              }}
            >
              Present this QR code at the event entrance for scanning
            </Text>
          </View>
        </ScrollView>
      </View>
    </Sheet>
  );
};
