import React from "react";
import { View } from "react-native";
import { Calendar, DollarSign, Star, Ticket } from "lucide-react-native";
import { useTheme } from "~/src/components/ThemeProvider";
import { Text } from "~/src/components/ui/text";

interface TicketmasterDetailsSectionProps {
  data: any;
}

export function TicketmasterDetailsSection({ data }: TicketmasterDetailsSectionProps) {
  const { theme, isDarkMode } = useTheme();

  const formatEventDateTime = () => {
    const startDate = new Date(data.start_datetime);
    const endDate = data.end_datetime ? new Date(data.end_datetime) : null;

    const isSameDay = endDate && startDate.toDateString() === endDate.toDateString();

    const startDateStr = startDate.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const startTimeStr = startDate.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });

    if (!endDate) {
      return `${startDateStr} at ${startTimeStr}`;
    }

    if (isSameDay) {
      const endTimeStr = endDate.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
      return `${startDateStr} from ${startTimeStr} to ${endTimeStr}`;
    } else {
      const endDateStr = endDate.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      const endTimeStr = endDate.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
      return `${startDateStr} at ${startTimeStr} to ${endDateStr} at ${endTimeStr}`;
    }
  };

  return (
    <View className="mb-6">
      {/* Event Date & Time */}
      {data.start_datetime && (
        <View
          className="flex-row items-center p-3 mb-3 rounded-xl"
          style={{
            backgroundColor: isDarkMode
              ? "rgba(139, 92, 246, 0.1)"
              : "rgb(245, 243, 255)",
          }}
        >
          <View className="justify-center items-center mr-3 w-10 h-10 bg-purple-500 rounded-full">
            <Calendar size={20} color="white" />
          </View>
          <View className="flex-1">
            <Text className="mb-1 text-xs font-medium tracking-wide text-purple-600 uppercase">
              When
            </Text>
            <Text
              className="text-base font-bold leading-tight"
              style={{ color: theme.colors.text }}
            >
              {formatEventDateTime()}
            </Text>
          </View>
        </View>
      )}

      {/* Venue Information */}
      {(data.venue_name || data.address) && (
        <View
          className="flex-row items-start p-3 mb-4 rounded-xl"
          style={{
            backgroundColor: isDarkMode
              ? "rgba(59, 130, 246, 0.1)"
              : "rgb(239, 246, 255)",
          }}
        >
          <View className="justify-center items-center mt-0.5 mr-3 w-10 h-10 bg-blue-500 rounded-full">
            <Ticket size={20} color="white" />
          </View>
          <View className="flex-1">
            <Text className="mb-1 text-xs font-medium tracking-wide text-blue-600 uppercase">
              Venue
            </Text>
            {data.venue_name && (
              <Text
                className="text-base font-bold leading-tight mb-1"
                style={{ color: theme.colors.text }}
              >
                {data.venue_name}
              </Text>
            )}
            {data.address && (
              <Text
                className="text-sm leading-relaxed"
                style={{
                  color: isDarkMode ? theme.colors.text : "#6B7280",
                }}
              >
                {data.address}
              </Text>
            )}
          </View>
        </View>
      )}

      {/* Pricing Information */}
      {data.ticketmaster_details?.priceRanges && data.ticketmaster_details.priceRanges.length > 0 && (
        <View
          className="p-3 mb-4 rounded-xl"
          style={{
            backgroundColor: isDarkMode
              ? "rgba(34, 197, 94, 0.1)"
              : "rgb(240, 253, 244)",
          }}
        >
          <View className="flex-row items-center mb-3">
            <View className="justify-center items-center mr-3 w-10 h-10 bg-green-500 rounded-full">
              <DollarSign size={20} color="white" />
            </View>
            <Text className="text-xs font-medium tracking-wide text-green-600 uppercase">
              Pricing
            </Text>
          </View>

          {data.ticketmaster_details.priceRanges.map((priceRange: any, index: number) => {
            const min = String(priceRange.min || '0');
            const max = String(priceRange.max || '0');
            const currency = String(priceRange.currency || 'USD');
            const isSamePrice = min === max;

            return (
              <View key={index} className="mb-2">
                <Text
                  className="text-base font-bold"
                  style={{ color: theme.colors.text }}
                >
                  {currency} {isSamePrice ? min : `${min} - ${max}`}
                </Text>
                <Text
                  className="text-sm"
                  style={{
                    color: isDarkMode ? theme.colors.text : "#6B7280",
                  }}
                >
                  {isSamePrice ? 'Fixed price' : 'Price range'}
                </Text>
              </View>
            );
          })}
        </View>
      )}

      {/* Event Classifications */}
      {data.ticketmaster_details?.classifications && data.ticketmaster_details.classifications.length > 0 && (
        <View
          className="p-3 mb-4 rounded-xl"
          style={{
            backgroundColor: isDarkMode
              ? "rgba(245, 158, 11, 0.1)"
              : "rgb(255, 251, 235)",
          }}
        >
          <View className="flex-row items-center mb-3">
            <View className="justify-center items-center mr-3 w-10 h-10 bg-amber-500 rounded-full">
              <Star size={20} color="white" />
            </View>
            <Text className="text-xs font-medium tracking-wide text-amber-600 uppercase">
              Categories
            </Text>
          </View>

          <View className="flex-row flex-wrap gap-2">
            {data.ticketmaster_details.classifications.map((classification: any, index: number) => (
              <View
                key={index}
                className="px-3 py-1 rounded-full"
                style={{
                  backgroundColor: isDarkMode
                    ? "rgba(245, 158, 11, 0.2)"
                    : "rgb(252, 211, 153)",
                }}
              >
                <Text
                  className="text-sm font-medium"
                  style={{
                    color: isDarkMode ? "#FCD34D" : "#92400E",
                  }}
                >
                  {classification.segment?.name || classification.genre?.name || 'Event'}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}
