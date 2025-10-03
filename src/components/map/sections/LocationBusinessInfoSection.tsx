import React, { useState } from "react";
import { TouchableOpacity, View } from "react-native";
import { Clock, DollarSign, Phone, Star } from "lucide-react-native";
import { useTheme } from "~/src/components/ThemeProvider";
import { Text } from "~/src/components/ui/text";

interface LocationBusinessInfoSectionProps {
  data: any;
}

export function LocationBusinessInfoSection({ data }: LocationBusinessInfoSectionProps) {
  const { theme, isDarkMode } = useTheme();
  const [showFullHours, setShowFullHours] = useState(false);

  // Check if we have any business info to show
  const hasBusinessInfo =
    data.rating ||
    data.rating_count ||
    data.price_level ||
    data.phone ||
    data.operation_hours;

  if (!hasBusinessInfo) {
    return null;
  }

  const getTodaysHours = () => {
    if (!data.operation_hours?.weekday_text) return null;

    const today = new Date().getDay(); // 0 = Sunday, 1 = Monday, etc.
    const dayNames = [
      'Sunday',
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
    ];
    const todayName = dayNames[today];

    // Handle both array and string formats
    if (Array.isArray(data.operation_hours.weekday_text)) {
      const todayHours = data.operation_hours.weekday_text.find((day: string) =>
        day.startsWith(todayName),
      );
      return todayHours || null;
    } else {
      // If it's a string, check if it contains today's name
      return data.operation_hours.weekday_text.includes(todayName)
        ? data.operation_hours.weekday_text
        : null;
    }
  };

  const todaysHours = getTodaysHours();
  const isOpenNow = data.operation_hours?.open_now || false;

  return (
    <View className="mb-6">
      {/* Rating & Reviews */}
      {data.rating && data.rating_count && (
        <View
          className="flex-row items-center p-3 mb-3 rounded-xl"
          style={{
            backgroundColor: isDarkMode
              ? "rgba(245, 158, 11, 0.1)"
              : "rgb(255, 251, 235)",
          }}
        >
          <View className="justify-center items-center mr-3 w-10 h-10 bg-amber-500 rounded-full">
            <Star size={20} color="white" />
          </View>
          <View className="flex-1">
            <Text className="mb-1 text-xs font-medium tracking-wide text-amber-600 uppercase">
              Rating
            </Text>
            <View className="flex-row items-center">
              <Text
                className="mr-2 text-base font-bold leading-tight"
                style={{ color: theme.colors.text }}
              >
                {data.rating.toFixed(1)} ★
              </Text>
              <Text
                className="text-sm"
                style={{
                  color: isDarkMode ? theme.colors.text : "#6B7280",
                }}
              >
                ({data.rating_count.toLocaleString()} reviews)
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Price Level */}
      {data.price_level && data.price_level > 0 && (
        <View
          className="flex-row items-center p-3 mb-3 rounded-xl"
          style={{
            backgroundColor: isDarkMode
              ? "rgba(34, 197, 94, 0.1)"
              : "rgb(240, 253, 244)",
          }}
        >
          <View className="justify-center items-center mr-3 w-10 h-10 bg-green-500 rounded-full">
            <DollarSign size={20} color="white" />
          </View>
          <View className="flex-1">
            <Text className="mb-1 text-xs font-medium tracking-wide text-green-600 uppercase">
              Price Range
            </Text>
            <Text
              className="text-base font-bold leading-tight"
              style={{ color: theme.colors.text }}
            >
              {"$".repeat(data.price_level)}
              <Text
                className="ml-1 text-sm font-normal"
                style={{
                  color: isDarkMode ? theme.colors.text : "#6B7280",
                }}
              >
                (
                {data.price_level === 1
                  ? "Inexpensive"
                  : data.price_level === 2
                  ? "Moderate"
                  : data.price_level === 3
                  ? "Expensive"
                  : "Very Expensive"}
                )
              </Text>
            </Text>
          </View>
        </View>
      )}

      {/* Phone Number */}
      {data.phone && (
        <TouchableOpacity
          onPress={() => {
            // Linking.openURL(`tel:${data.phone}`); // You'll need to import Linking
          }}
          className="flex-row items-center p-3 mb-3 rounded-xl"
          style={{
            backgroundColor: isDarkMode
              ? "rgba(59, 130, 246, 0.1)"
              : "rgb(239, 246, 255)",
          }}
        >
          <View className="justify-center items-center mr-3 w-10 h-10 bg-blue-500 rounded-full">
            <Phone size={20} color="white" />
          </View>
          <View className="flex-1">
            <Text className="mb-1 text-xs font-medium tracking-wide text-blue-600 uppercase">
              Phone
            </Text>
            <Text
              className="text-base font-bold leading-tight"
              style={{ color: theme.colors.text }}
            >
              {data.phone}
            </Text>
            <Text
              className="text-xs mt-0.5"
              style={{
                color: isDarkMode
                  ? "rgba(59, 130, 246, 0.8)"
                  : "#3B82F6",
              }}
            >
              Tap to call
            </Text>
          </View>
        </TouchableOpacity>
      )}

      {/* Operation Hours */}
      {data.operation_hours && (
        <View
          className="p-3 mb-3 rounded-xl"
          style={{
            backgroundColor: isDarkMode
              ? "rgba(34, 197, 94, 0.1)"
              : "rgb(240, 253, 244)",
          }}
        >
          <View className="flex-row items-center mb-3">
            <View className="justify-center items-center mr-3 w-10 h-10 bg-green-500 rounded-full">
              <Clock size={20} color="white" />
            </View>
            <Text className="text-xs font-medium tracking-wide text-green-600 uppercase">
              Hours of Operation
            </Text>
          </View>

          {/* Today's Hours with Open/Closed Status */}
          {todaysHours && (
            <View className="mb-3">
              <View className="flex-row items-center justify-between">
                <Text
                  className="text-base font-bold"
                  style={{ color: theme.colors.text }}
                >
                  Today: {todaysHours.split(': ')[1] || todaysHours}
                </Text>
                <View
                  className="px-2 py-1 rounded-full"
                  style={{
                    backgroundColor: isOpenNow
                      ? isDarkMode
                        ? "rgba(34, 197, 94, 0.2)"
                        : "rgba(34, 197, 94, 0.1)"
                      : isDarkMode
                        ? "rgba(239, 68, 68, 0.2)"
                        : "rgba(239, 68, 68, 0.1)",
                  }}
                >
                  <Text
                    className="text-xs font-medium"
                    style={{
                      color: isOpenNow
                        ? isDarkMode ? "#22C55E" : "#16A34A"
                        : isDarkMode ? "#EF4444" : "#DC2626",
                    }}
                  >
                    {isOpenNow ? 'Open' : 'Closed'}
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Full Week Hours (Toggle) */}
          {data.operation_hours.weekday_text && (
            <View>
              <TouchableOpacity
                onPress={() => setShowFullHours(!showFullHours)}
                className="flex-row items-center justify-between mb-2"
              >
                <Text
                  className="text-sm font-medium"
                  style={{ color: theme.colors.text }}
                >
                  {showFullHours ? 'Show less' : 'Show all hours'}
                </Text>
                <Text
                  className="text-sm"
                  style={{
                    color: isDarkMode ? theme.colors.text : "#6B7280",
                  }}
                >
                  {showFullHours ? '▲' : '▼'}
                </Text>
              </TouchableOpacity>

              {showFullHours && (
                <View
                  className="text-sm space-y-1"
                  style={{
                    color: isDarkMode ? "rgba(255,255,255,0.7)" : "#6B7280",
                  }}
                >
                  {Array.isArray(data.operation_hours.weekday_text) ? (
                    data.operation_hours.weekday_text.map((day: string, index: number) => (
                      <Text key={index} className="text-sm">
                        {day}
                      </Text>
                    ))
                  ) : (
                    <Text className="text-sm">
                      {data.operation_hours.weekday_text}
                    </Text>
                  )}
                </View>
              )}
            </View>
          )}
        </View>
      )}
    </View>
  );
}


