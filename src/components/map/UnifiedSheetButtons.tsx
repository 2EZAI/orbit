import React from "react";
import { ActivityIndicator, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "~/src/components/ThemeProvider";
import { Text } from "~/src/components/ui/text";
import { useAuth } from "~/src/lib/auth";

export interface UnifiedSheetButtonsProps {
  data: any;
  isEventType: boolean;
  loading: boolean;
  isJoined: boolean;
  hasTickets: boolean;
  isCreator: boolean;
  onTicketPurchase: () => void;
  onJoinEvent: () => void;
  onLeaveEvent: () => void;
  onCreateOrbit: () => void;
  onCreateEvent: () => void;
  onEdit: () => void;
  onShare: () => void;
}

export function UnifiedSheetButtons({
  data,
  isEventType,
  loading,
  isJoined,
  hasTickets,
  isCreator,
  onTicketPurchase,
  onJoinEvent,
  onLeaveEvent,
  onCreateOrbit,
  onCreateEvent,
  onEdit,
  onShare,
}: UnifiedSheetButtonsProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  // Determine event source and type for proper button logic
  const eventSource = data?.source;
  const isTicketmasterEvent =
    data?.is_ticketmaster === true ||
    eventSource === "ticketmaster" ||
    Boolean(data?.ticketmaster_details);

  const isUserEvent = eventSource === "user";

  if (loading) {
    return (
      <View
        className="absolute right-0 bottom-0 left-0 px-6 py-4 border-t"
        style={{
          paddingBottom: insets.bottom + 16,
          backgroundColor: theme.colors.card,
          borderTopColor: theme.colors.border,
        }}
      >
        <View className="flex-1 items-center py-4 bg-purple-600 rounded-2xl">
          <ActivityIndicator size="small" color="white" />
        </View>
      </View>
    );
  }

  if (isEventType) {
    // EVENT BUTTONS
    if (isTicketmasterEvent) {
      // TICKETMASTER EVENTS
      return (
        <View
          className="absolute right-0 bottom-0 left-0 px-6 py-4 border-t"
          style={{
            paddingBottom: insets.bottom + 16,
            backgroundColor: theme.colors.card,
            borderTopColor: theme.colors.border,
          }}
        >
          <View className="flex-col gap-3">
            {/* Primary Action Row */}
            {session ? (
              <View className="flex-row gap-3">
                <TouchableOpacity
                  onPress={onTicketPurchase}
                  className="flex-1 items-center py-4 bg-purple-600 rounded-2xl"
                >
                  <Text className="text-lg font-semibold text-white">
                    Buy Tickets
                  </Text>
                </TouchableOpacity>

                {isJoined && (
                  <TouchableOpacity
                    onPress={onCreateOrbit}
                    className="flex-1 items-center py-4 bg-blue-600 rounded-2xl"
                  >
                    <Text className="text-lg font-semibold text-white">
                      Create Orbit
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : null}

            {/* Secondary Action Row */}
            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={onShare}
                style={{ backgroundColor: theme.colors.card }}
                className="flex-1 items-center py-4 bg-white rounded-2xl border-2 border-purple-600"
              >
                <Text className="text-lg font-semibold text-purple-600">
                  Share
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      );
    } else {
      // REGULAR EVENTS (User Events)
      return (
        <View
          className="absolute right-0 bottom-0 left-0 px-6 py-4 border-t"
          style={{
            paddingBottom: insets.bottom + 16,
            backgroundColor: theme.colors.card,
            borderTopColor: theme.colors.border,
          }}
        >
          <View className="flex-col gap-3">
            {/* Primary Action Row - Edit for creators, Join/Leave for others */}
            {session ? (
              <View className="flex-row gap-3">
                {isCreator ? (
                  // CREATOR: Show Edit button
                  <TouchableOpacity
                    onPress={onEdit}
                    className="flex-1 items-center py-4 bg-purple-600 rounded-2xl"
                  >
                    <Text className="text-lg font-semibold text-white">
                      Edit Event
                    </Text>
                  </TouchableOpacity>
                ) : // NON-CREATOR: Show Join/Leave button
                isJoined ? (
                  <TouchableOpacity
                    onPress={onCreateOrbit}
                    className="flex-1 items-center py-4 bg-purple-600 rounded-2xl"
                  >
                    <Text className="text-lg font-semibold text-white">
                      Create Orbit
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    onPress={onJoinEvent}
                    className="flex-1 items-center py-4 bg-purple-600 rounded-2xl"
                  >
                    <Text className="text-lg font-semibold text-white">
                      Join Event
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : null}

            {/* Secondary Action Row */}
            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={onShare}
                style={{ backgroundColor: theme.colors.card }}
                className="flex-1 items-center py-4 bg-white rounded-2xl border-2 border-purple-600"
              >
                <Text className="text-lg font-semibold text-purple-600">
                  Share
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      );
    }
  } else {
    // LOCATION BUTTONS
    return (
      <View
        className="absolute right-0 bottom-0 left-0 px-6 py-4 border-t"
        style={{
          paddingBottom: insets.bottom + 16,
          backgroundColor: theme.colors.card,
          borderTopColor: theme.colors.border,
        }}
      >
        <View className="flex-col gap-3">
          {/* Primary Action Row */}
          {session ? (
            <TouchableOpacity
              onPress={onCreateEvent}
              className="items-center py-4 bg-purple-600 rounded-2xl"
            >
              <Text className="text-lg font-semibold text-white">
                Create Event
              </Text>
            </TouchableOpacity>
          ) : null}

          {/* Secondary Action Row */}
          <View className="flex-row gap-3">
            <TouchableOpacity
              onPress={onShare}
              style={{ backgroundColor: theme.colors.card }}
              className="flex-1 items-center py-4 rounded-2xl border-2 border-purple-600"
            >
              <Text className="text-lg font-semibold text-purple-600">
                Share
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }
}
