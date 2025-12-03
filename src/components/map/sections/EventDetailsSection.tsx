import {
  initPaymentSheet,
  presentPaymentSheet,
} from "@stripe/stripe-react-native";
import { Calendar, MapPin, Navigation, User } from "lucide-react-native";
import React from "react";
import { ActivityIndicator, TouchableOpacity, View } from "react-native";
import Toast from "react-native-toast-message";
import Payment from "~/assets/svg/Payment";
import { useCheckoutSession } from "~/hooks/useCheckoutSession";
import { useUserData } from "~/hooks/useUserData";
import { useTheme } from "~/src/components/ThemeProvider";
import { Text } from "~/src/components/ui/text";
import { openMapDirections } from "~/src/lib/nativeActions";
interface EventDetailsSectionProps {
  data: any;
  isCreator: boolean;
  isJoined: boolean;
  hasTickets: boolean;
}

export function EventDetailsSection({
  data,
  isCreator,
  isJoined,
  hasTickets,
}: EventDetailsSectionProps) {
  const { theme, isDarkMode } = useTheme();
  const { createCheckoutSession, loading } = useCheckoutSession();
  const { user } = useUserData();
  const formatEventDateTime = () => {
    const startDate = new Date(data.start_datetime);
    const endDate = data.end_datetime ? new Date(data.end_datetime) : null;

    const isSameDay =
      endDate && startDate.toDateString() === endDate.toDateString();

    const startDateStr = startDate.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const startTimeStr = startDate.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });

    if (!endDate) {
      return `${startDateStr} at ${startTimeStr}`;
    }

    if (isSameDay) {
      const endTimeStr = endDate.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
      return `${startDateStr} from ${startTimeStr} to ${endTimeStr}`;
    } else {
      const endDateStr = endDate.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      const endTimeStr = endDate.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
      return `${startDateStr} at ${startTimeStr} to ${endDateStr} at ${endTimeStr}`;
    }
  };

  const handleDirections = async () => {
    const lat = data.location?.coordinates?.[1];
    const lng = data.location?.coordinates?.[0];

    if (lat && lng) {
      await openMapDirections(lat, lng, data.address || data.venue_name);
    }
  };
  const handleTicketPurchase = async () => {
    const key = `${user?.id}-${data.id}-${Date.now()}`;
    const checkoutSessionData = await createCheckoutSession({
      eventId: data.id,
      idempotencyKey: key,
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
    <View className="mb-6">
      {/* Description Section - Matches web EventDescription component */}
      {data.description && (
        <View className="mb-4">
          <Text
            className="mb-2 text-lg font-bold"
            style={{ color: theme.colors.text }}
          >
            About This Event
          </Text>
          <Text
            className="text-base leading-relaxed"
            style={{ color: isDarkMode ? theme.colors.text : "#6B7280" }}
          >
            {data.description}
          </Text>
        </View>
      )}

      {/* Event Details Card - Matches web EventDetails component */}
      <View
        className="p-4 rounded-xl border"
        style={{
          backgroundColor: isDarkMode
            ? "rgba(255,255,255,0.05)"
            : theme.colors.card,
          borderColor: isDarkMode
            ? "rgba(255,255,255,0.1)"
            : theme.colors.border,
        }}
      >
        {/* Section Header */}
        <View className="flex-row items-center mb-3">
          <Calendar
            size={16}
            color={isDarkMode ? "rgba(255,255,255,0.6)" : "#6B7280"}
          />
          <Text
            className="ml-2 text-sm"
            style={{ color: isDarkMode ? "rgba(255,255,255,0.6)" : "#6B7280" }}
          >
            Event Details
          </Text>
        </View>

        <View style={{ gap: 12 }}>
          {/* Event Date/Time */}
          {data.start_datetime && (
            <View className="flex-row items-start" style={{ gap: 8 }}>
              <View
                className="p-1.5 rounded"
                style={{
                  backgroundColor: isDarkMode
                    ? "rgba(139, 92, 246, 0.2)"
                    : "rgba(139, 92, 246, 0.1)",
                }}
              >
                <Calendar size={12} color="#8B5CF6" />
              </View>
              <View className="flex-1">
                <Text
                  className="font-medium"
                  style={{ color: theme.colors.text }}
                >
                  {formatEventDateTime()}
                </Text>
              </View>
            </View>
          )}

          {/* Venue Information */}
          {(data.venue_name || data.address) && (
            <View className="flex-row items-start" style={{ gap: 8 }}>
              <View
                className="p-1.5 rounded"
                style={{
                  backgroundColor: isDarkMode
                    ? "rgba(107, 114, 128, 0.2)"
                    : "rgba(107, 114, 128, 0.1)",
                }}
              >
                <MapPin size={12} color="#6B7280" />
              </View>
              <View className="flex-1">
                {data.venue_name && (
                  <Text
                    className="font-medium"
                    style={{ color: theme.colors.text }}
                  >
                    {data.venue_name}
                  </Text>
                )}
                {data.address && (
                  <Text
                    className="text-sm"
                    style={{
                      color: isDarkMode ? "rgba(255,255,255,0.7)" : "#6B7280",
                    }}
                  >
                    {data.address}
                  </Text>
                )}
              </View>
            </View>
          )}

          {/* Creator Information */}
          {data.created_by && (
            <View className="flex-row items-center" style={{ gap: 8 }}>
              <View
                className="p-1.5 rounded"
                style={{
                  backgroundColor: isDarkMode
                    ? "rgba(16, 185, 129, 0.2)"
                    : "rgba(16, 185, 129, 0.1)",
                }}
              >
                <User size={12} color="#10B981" />
              </View>
              <View className="flex-1">
                <Text
                  className="font-medium"
                  style={{ color: theme.colors.text }}
                >
                  Created by{" "}
                  {data.created_by.username || data.created_by.name || "Host"}
                </Text>
                {data.created_by.username && (
                  <Text
                    className="text-xs"
                    style={{
                      color: isDarkMode ? "rgba(255,255,255,0.6)" : "#6B7280",
                    }}
                  >
                    @{data.created_by.username}
                  </Text>
                )}
              </View>
            </View>
          )}
        </View>

        {/* Action Buttons */}
        {data?.ticket_status === "sales_live" && (
          <View className="flex-row mt-4" style={{ gap: 8 }}>
            <TouchableOpacity
              onPress={handleTicketPurchase}
              className="flex-1 flex-row items-center justify-center py-2.5 px-3 rounded-lg bg-green-500"
            >
              <Payment width={16} height={16} fill={"white"} />
              <Text className="ml-1.5 text-sm font-semibold text-white">
                Purchase Tickets{" "}
                {data.ticket_price_cents &&
                  `$${(data.ticket_price_cents / 100).toFixed(2)}`}
              </Text>
              {loading && <ActivityIndicator size="small" color="white" />}
            </TouchableOpacity>
          </View>
        )}
        <View className="flex-row mt-4" style={{ gap: 8 }}>
          <TouchableOpacity
            onPress={handleDirections}
            className="flex-1 flex-row items-center justify-center py-2.5 px-3 rounded-lg bg-purple-500"
          >
            <Navigation size={14} color="white" />
            <Text className="ml-1.5 text-sm font-semibold text-white">
              Get Directions
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
