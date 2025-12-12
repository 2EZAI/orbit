import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  DeviceEventEmitter,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";
import { useTheme } from "~/src/components/ThemeProvider";
import { Text } from "~/src/components/ui/text";
import { useAuth } from "~/src/lib/auth";
import { supabase } from "~/src/lib/supabase";

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
  onViewOnMap: () => void;
  onEdit: () => void;
  onShare: () => void;
  onDelete?: () => void;
  from?: string; // Track where user came from for navigation after delete
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
  onDelete,
  onViewOnMap,
  from,
}: UnifiedSheetButtonsProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
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

  const handleDeleteEvent = () => {
    Alert.alert(
      "Delete Event",
      "Are you sure you want to delete this event? This action cannot be undone.",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            // Use event_id if available, otherwise use id
            const eventId = data?.event_id || data?.id;

            if (!session || !eventId) {
              Toast.show({
                type: "error",
                text1: "Error",
                text2: "Unable to delete event. Please try again.",
              });
              return;
            }

            setIsDeleting(true);
            try {
              if (!eventId) {
                throw new Error("Event ID not found");
              }

              const { error } = await supabase
                .from("events")
                .delete()
                .eq("id", eventId);

              if (error) {
                throw error;
              }

              Toast.show({
                type: "success",
                text1: "Event Deleted",
                text2: "The event has been successfully deleted.",
              });

              // Emit event to refresh map and remove event from list
              DeviceEventEmitter.emit("mapReload", true);
              DeviceEventEmitter.emit("eventDeleted", { eventId: eventId });

              // Call the optional callback if provided (should handle closing sheet)
              if (onDelete) {
                onDelete();
              }

              // Navigate back to the screen user came from
              if (from) {
                // Navigate to specific screen based on 'from' parameter
                switch (from) {
                  case "home":
                    router.replace("/(app)/(home)");
                    break;
                  case "profile":
                    router.replace("/(app)/(profile)");
                    break;
                  case "social":
                    router.replace("/(app)/(social)");
                    break;
                  case "map":
                    router.replace("/(app)/(map)");
                    break;
                  default:
                    router.back();
                }
              } else {
                // Fallback to router.back() if no 'from' parameter
                router.back();
              }
            } catch (error: any) {
              console.error("Error deleting event:", error);
              Toast.show({
                type: "error",
                text1: "Error",
                text2:
                  error?.message || "Failed to delete event. Please try again.",
              });
            } finally {
              setIsDeleting(false);
            }
          },
        },
      ]
    );
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
            <TouchableOpacity
              style={!session ? styles.disabledButton : {}}
              onPress={() => onViewOnMap()}
              className="flex-1 items-center py-4 bg-white rounded-2xl"
            >
              <Text className="text-lg font-semibold text-purple-600">
                View on Map
              </Text>
            </TouchableOpacity>
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
              {isCreator && (
                <TouchableOpacity
                  onPress={handleDeleteEvent}
                  disabled={isDeleting}
                  style={{
                    backgroundColor: theme.colors.notification + "20",
                    opacity: isDeleting ? 0.6 : 1,
                    borderColor: theme.colors.notification,
                    borderWidth: 2,
                  }}
                  className="flex-1 items-center py-4 rounded-2xl"
                >
                  {isDeleting ? (
                    <ActivityIndicator
                      size="small"
                      color={theme.colors.notification}
                    />
                  ) : (
                    <Text
                      className="text-lg font-semibold"
                      style={{ color: theme.colors.notification }}
                    >
                      Delete Event
                    </Text>
                  )}
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      );
    }
  } else {
    // LOCATION BUTTONS
    return (
      <>
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
        {/* {eventLocation && (
          <LocationChangeModal
            isOpen={showLocationChangeModal}
            onClose={() => setShowLocationChangeModal(false)}
            onConfirm={handleLocationChangeConfirm}
            eventLocation={eventLocation}
            currentCenter={{
              latitude: parseFloat(params.currentLat as string) || 0,
              longitude: parseFloat(params.currentLng as string) || 0,
            }}
            distance={distance}
          />
        )} */}
      </>
    );
  }
}
const styles = StyleSheet.create({
  disabledButton: {
    // backgroundColor: "#A9A9A9",
    opacity: 0.6,
  },
});
