import {
  initPaymentSheet,
  presentPaymentSheet,
} from "@stripe/stripe-react-native";
import { ArrowLeft, ArrowRightLeft, Wallet, X } from "lucide-react-native";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  ScrollView,
  TouchableOpacity,
  View,
} from "react-native";
import QRCode from "react-native-qrcode-svg";
import Toast from "react-native-toast-message";
import { useCheckoutSession } from "~/hooks/useCheckoutSession";
import { Ticket } from "~/hooks/useMyTickets";
import { useCancelTransfer } from "~/hooks/useTicketTransfer";
import { useUserData } from "~/hooks/useUserData";
import { Text } from "~/src/components/ui/text";
import { UnifiedData } from "../map/UnifiedDetailsSheet";
import { PurchaseTicketsModal } from "../modals/PurchaseTicketsModal";
import { TransferTicketModal } from "../modals/TransferTicketModal";
import { useTheme } from "../ThemeProvider";
import { Sheet } from "../ui/sheet";
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
  const { user } = useUserData();

  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  const { cancelTransfer, isLoading: isCancelLoading } = useCancelTransfer();
  const { createCheckoutSession, loading } = useCheckoutSession();

  if (!ticket) return null;

  const eventDate = formatDate(ticket.event_start_datetime || ticket.issued_at);
  const eventTime = formatTime(ticket.event_start_datetime || ticket.issued_at);
  const issuedDate = formatDate(ticket.issued_at);
  const isTransferred = ticket.owner_id !== ticket.purchaser_id;
  const isOwner = ticket.owner_id === user?.id;
  const isPurchaser = ticket.purchaser_id === user?.id;
  const canTransfer = ticket.status === "active" && isOwner;
  const canCancelTransfer =
    ticket.status === "active" &&
    ticket.transfer_count > 0 &&
    isTransferred &&
    (isPurchaser || isOwner);

  const handleCancelTransfer = () => {
    Alert.alert(
      "Cancel Transfer",
      "Are you sure you want to cancel this transfer and return the ticket to the previous owner?",
      [
        {
          text: "No",
          style: "cancel",
        },
        {
          text: "Yes, Cancel",
          style: "destructive",
          onPress: async () => {
            await cancelTransfer(ticket.id);
          },
        },
      ]
    );
  };
  const handleTicketPurchase = async (qty: number) => {
    const key = `${user?.id}-${ticket.event_id}-${Date.now()}`;
    const checkoutSessionData = await createCheckoutSession({
      eventId: ticket.event_id,
      idempotencyKey: key,
      quantity: qty,
    });

    if (
      checkoutSessionData.success &&
      checkoutSessionData.paymentIntent?.clientSecret
    ) {
      const { error: initError } = await initPaymentSheet({
        merchantDisplayName: "Orbit",

        paymentIntentClientSecret:
          checkoutSessionData.paymentIntent?.clientSecret.trim(),
        style: "automatic",
        returnURL: "com.dovydmcnugget.orbit://payment-success",
        // Only include customerId / customerEphemeralKeySecret if your backend
        // actually returns valid Stripe values for them.
      });
      console.log("🔍 [EventDetailsSection] initError:", initError);
      if (initError) {
        Toast.show({
          type: "error",
          text1: "Payment error",
          text2: initError.message,
        });
      } else {
        const { error: presentError } = await presentPaymentSheet();
        if (presentError) {
          console.error("Error presenting payment sheet:", presentError);
          return;
        } else {
          Toast.show({
            type: "success",
            text1: "Payment successful",
          });
        }
      }
    }
  };
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
          {/* Transfers section */}
          {isTransferred ? (
            <View style={{ marginVertical: 20 }}>
              {/* Section header */}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginBottom: 12,
                  gap: 8,
                }}
              >
                <Text
                  style={{
                    fontSize: 18,
                    fontWeight: "800",
                    color: theme.colors.text,
                  }}
                >
                  Transfers
                </Text>
                {ticket.transfer_count > 0 ? (
                  <View
                    style={{
                      backgroundColor: isDarkMode ? "#78716c" : "#a8a29e",
                      paddingHorizontal: 8,
                      paddingVertical: 2,
                      borderRadius: 12,
                      minWidth: 24,
                      alignItems: "center",
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: "700",
                        color: "#1c1917",
                      }}
                    >
                      {ticket.transfer_count}
                    </Text>
                  </View>
                ) : null}
              </View>

              {/* Transfer status card */}
              <View
                style={{
                  borderRadius: 16,
                  backgroundColor: isDarkMode ? "#44403c" : "#78716c",
                  borderWidth: 1,
                  borderColor: isDarkMode ? "#57534e" : "#a8a29e",
                  padding: 16,
                  flexDirection: "row",
                  gap: 12,
                }}
              >
                {/* Icon */}
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    backgroundColor: isDarkMode
                      ? "rgba(251, 146, 60, 0.15)"
                      : "rgba(251, 146, 60, 0.2)",
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  <ArrowRightLeft size={18} color="#fb923c" strokeWidth={2.5} />
                </View>

                {/* Content */}
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: "700",
                      color: "#fef3c7",
                      marginBottom: 4,
                    }}
                  >
                    Transferred
                  </Text>
                  <Text
                    style={{
                      fontSize: 14,
                      lineHeight: 20,
                      color: "#e7e5e4",
                    }}
                  >
                    {"This ticket has been transferred from another user"}
                  </Text>

                  {/* Optional: Show transfer details */}
                </View>
              </View>
            </View>
          ) : null}

          {/* Action Buttons */}
          {ticket.status === "active" ? (
            <View style={{ marginTop: 24, marginBottom: 16, gap: 12 }}>
              {/* Transfer Button */}
              {canTransfer && (
                <TouchableOpacity
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    paddingVertical: 16,
                    borderRadius: 16,
                    backgroundColor: "#fbbf24",
                    gap: 8,
                  }}
                  onPress={() => setIsTransferModalOpen(true)}
                >
                  <ArrowRightLeft size={20} color="#1c1917" strokeWidth={2.5} />
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: "700",
                      color: "#1c1917",
                    }}
                  >
                    Transfer
                  </Text>
                </TouchableOpacity>
              )}

              {/* Buy More Button */}
              <TouchableOpacity
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  paddingVertical: 16,
                  borderRadius: 16,
                  backgroundColor: "#7c3aed",
                  gap: 8,
                }}
                onPress={() => {
                  setIsPurchaseModalOpen(true);
                }}
              >
                <Wallet size={20} color="white" strokeWidth={2.5} />
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: "700",
                    color: "white",
                  }}
                >
                  Buy More
                </Text>
              </TouchableOpacity>

              {/* Cancel Transfer Button */}
              {canCancelTransfer && (
                <TouchableOpacity
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    paddingVertical: 16,
                    borderRadius: 16,
                    backgroundColor: "#ef4444",
                    opacity: isCancelLoading ? 0.6 : 1,
                    gap: 8,
                  }}
                  onPress={handleCancelTransfer}
                  disabled={isCancelLoading}
                >
                  {isCancelLoading ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <>
                      <X size={20} color="white" strokeWidth={2.5} />
                      <Text
                        style={{
                          fontSize: 16,
                          fontWeight: "700",
                          color: "white",
                        }}
                      >
                        Cancel Transfer
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>
          ) : null}
        </ScrollView>
      </View>

      {/* Transfer Modal */}
      <TransferTicketModal
        visible={isTransferModalOpen}
        onClose={() => setIsTransferModalOpen(false)}
        ticketId={ticket.id}
        eventName={ticket.event_name || "Orbit Event"}
      />
      {/* Purchase Tickets Modal */}
      <PurchaseTicketsModal
        visible={isPurchaseModalOpen}
        onClose={() => setIsPurchaseModalOpen(false)}
        eventName={ticket.event_name || "Orbit Event"}
        onContinue={async (qty) => {
          setIsPurchaseModalOpen(false);
          await handleTicketPurchase(qty);
        }}
      />
    </Sheet>
  );
};
