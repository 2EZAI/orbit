import { useRouter } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";
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
  const router = useRouter();
  // Determine event source and type for proper button logic
  const eventSource = data?.source;
  const isTicketmasterEvent =
    data?.is_ticketmaster === true ||
    eventSource === "ticketmaster" ||
    Boolean(data?.ticketmaster_details);

  const isUserEvent = eventSource === "user";
  const onUnAuth = () => {
    Toast.show({
      type: "info",
      text1: "Please Log In",
      text2: "You need to be logged in to perform this action.",
    });
    router.dismissAll();
  };
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

            <View className="flex-row gap-3">
              <TouchableOpacity
                style={!session ? styles.disabledButton : {}}
                onPress={() => (session ? onTicketPurchase() : onUnAuth())}
                className="flex-1 items-center py-4 bg-purple-600 rounded-2xl"
              >
                <Text className="text-lg font-semibold text-white">
                  Buy Tickets
                </Text>
              </TouchableOpacity>

              {isJoined && (
                <TouchableOpacity
                  style={!session ? styles.disabledButton : {}}
                  onPress={() => (session ? onCreateOrbit() : onUnAuth())}
                  className="flex-1 items-center py-4 bg-blue-600 rounded-2xl"
                >
                  <Text className="text-lg font-semibold text-white">
                    Create Orbit
                  </Text>
                </TouchableOpacity>
              )}
            </View>

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

            <View className="flex-row gap-3">
              {isCreator ? (
                // CREATOR: Show Edit button
                <TouchableOpacity
                  style={!session ? styles.disabledButton : {}}
                  onPress={() => (session ? onEdit() : onUnAuth())}
                  className="flex-1 items-center py-4 bg-purple-600 rounded-2xl"
                >
                  <Text className="text-lg font-semibold text-white">
                    Edit Event
                  </Text>
                </TouchableOpacity>
              ) : // NON-CREATOR: Show Join/Leave button
              isJoined ? (
                <TouchableOpacity
                  style={!session ? styles.disabledButton : {}}
                  onPress={() => (session ? onCreateOrbit() : onUnAuth())}
                  className="flex-1 items-center py-4 bg-purple-600 rounded-2xl"
                >
                  <Text className="text-lg font-semibold text-white">
                    Create Orbit
                  </Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={!session ? styles.disabledButton : {}}
                  onPress={() => (session ? onJoinEvent() : onUnAuth())}
                  className="flex-1 items-center py-4 bg-purple-600 rounded-2xl"
                >
                  <Text className="text-lg font-semibold text-white">
                    Join Event
                  </Text>
                </TouchableOpacity>
              )}
            </View>

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

          <TouchableOpacity
            style={!session ? styles.disabledButton : {}}
            onPress={() => (session ? onCreateEvent() : onUnAuth())}
            className="items-center py-4 bg-purple-600 rounded-2xl"
          >
            <Text className="text-lg font-semibold text-white">
              Create Event
            </Text>
          </TouchableOpacity>

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
        <Toast />
      </View>
    );
  }
}
const styles = StyleSheet.create({
  disabledButton: {
    // backgroundColor: "#A9A9A9",
    opacity: 0.6,
  },
});
