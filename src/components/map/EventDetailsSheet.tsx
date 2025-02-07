import { useEffect, useState, useCallback } from "react";
import {
  View,
  TouchableOpacity,
  Image,
  Platform,
  Linking,
  ScrollView,
  Alert,
} from "react-native";
import { Text } from "~/src/components/ui/text";
import { X, Info, MapPin, Users } from "lucide-react-native";
import { Sheet } from "~/src/components/ui/sheet";
import { MapEvent } from "~/hooks/useMapEvents";
import { format } from "date-fns";
import { supabase } from "~/src/lib/supabase";
import { useUser } from "~/hooks/useUserData";
import { CreateOrbitModal } from "~/src/components/map/CreateOrbitModal";

interface EventDetailsSheetProps {
  event: MapEvent;
  nearbyEvents: MapEvent[];
  isOpen: boolean;
  onClose: () => void;
  onEventSelect: (event: MapEvent) => void;
}

export const EventDetailsSheet = ({
  event,
  nearbyEvents,
  isOpen,
  onClose,
  onEventSelect,
}: EventDetailsSheetProps) => {
  const { user } = useUser();
  const [isAttending, setIsAttending] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreateOrbitOpen, setIsCreateOrbitOpen] = useState(false);

  // Check if user is attending when sheet opens
  useEffect(() => {
    if (isOpen && user) {
      checkAttendanceStatus();
    }
  }, [isOpen, user, event.id]);

  const checkAttendanceStatus = async () => {
    try {
      const { data, error } = await supabase
        .from("event_attendees")
        .select("status")
        .eq("event_id", event.id)
        .eq("user_id", user?.id)
        .maybeSingle();

      if (error) throw error;
      setIsAttending(data?.status === "going");
    } catch (error) {
      console.error("Error checking attendance:", error);
      setIsAttending(false);
    }
  };

  const handleAttendance = async () => {
    if (!user) {
      Alert.alert("Please sign in to mark attendance");
      return;
    }

    setIsLoading(true);
    try {
      if (isAttending) {
        // Remove attendance
        const { error } = await supabase
          .from("event_attendees")
          .delete()
          .eq("event_id", event.id)
          .eq("user_id", user.id);

        if (error) throw error;
        setIsAttending(false);
      } else {
        // Add attendance
        const { error } = await supabase.from("event_attendees").insert({
          event_id: event.id,
          user_id: user.id,
          status: "going",
        });

        if (error) throw error;
        setIsAttending(true);
      }
    } catch (error) {
      console.error("Error updating attendance:", error);
      Alert.alert("Error", "Failed to update attendance. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateOrbit = () => {
    setIsCreateOrbitOpen(true);
  };

  useEffect(() => {
    if (isOpen) {
      console.log("=== Event Details ===");
      console.log("Event:", {
        id: event.id,
        name: event.name,
        description: event.description,
        venue_name: event.venue_name,
        start_datetime: event.start_datetime,
        end_datetime: event.end_datetime,
        location: event.location,
        image_urls: event.image_urls,
        distance: event.distance,
        attendees: {
          count: event.attendees.count,
          profiles: event.attendees.profiles.map((p) => ({
            id: p.id,
            name: p.name,
            avatar_url: p.avatar_url,
          })),
        },
        categories: event.categories.map((c) => ({
          id: c.id,
          name: c.name,
          icon: c.icon,
        })),
      });
      console.log("Nearby Events Count:", nearbyEvents.length);
    }
  }, [isOpen, event]);

  const handleOpenDirections = () => {
    const { latitude, longitude } = event.location;
    const url = Platform.select({
      ios: `maps:${latitude},${longitude}?q=${event.venue_name}`,
      android: `geo:${latitude},${longitude}?q=${event.venue_name}`,
    });

    if (url) {
      Linking.openURL(url).catch((err) => {
        console.error("Error opening maps:", err);
      });
    }
  };

  return (
    <>
      <Sheet isOpen={isOpen} onClose={onClose}>
        <View className="flex-1">
          <View className="flex-row items-center justify-between p-4 pb-2">
            <Text className="text-2xl font-bold">{event.name}</Text>
            <TouchableOpacity onPress={onClose}>
              <X size={24} />
            </TouchableOpacity>
          </View>

          <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
            <View className="p-4">
              <Image
                source={{ uri: event.image_urls[0] }}
                className="w-full h-48 mb-4 rounded-lg"
              />

              <View className="flex-row items-center mb-2">
                <MapPin size={20} className="mr-2 text-muted-foreground" />
                <Text className="text-muted-foreground">
                  {event.venue_name}
                </Text>
              </View>

              <Text className="mb-4">{event.description}</Text>

              {/* Categories */}
              <View className="flex-row flex-wrap gap-2 mb-4">
                {event.categories.map((category) => (
                  <View
                    key={category.id}
                    className="px-3 py-1 rounded-full bg-secondary/20"
                  >
                    <Text className="text-sm font-medium text-secondary">
                      {category.name}
                    </Text>
                  </View>
                ))}
              </View>

              {/* Action Buttons */}
              <View className="flex-row gap-3 mb-6">
                <TouchableOpacity
                  className={`items-center flex-1 py-3 rounded-full ${
                    isAttending ? "bg-secondary" : "bg-primary"
                  }`}
                  onPress={handleAttendance}
                  disabled={isLoading}
                >
                  <Text className="font-medium text-white">
                    {isLoading
                      ? "Loading..."
                      : isAttending
                      ? "Attending"
                      : "Mark Attending"}
                  </Text>
                </TouchableOpacity>
                {isAttending && (
                  <TouchableOpacity
                    className="items-center flex-1 py-3 rounded-full bg-primary"
                    onPress={handleCreateOrbit}
                  >
                    <Text className="font-medium text-white">Create Orbit</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  className="items-center flex-1 py-3 rounded-full bg-muted"
                  onPress={handleOpenDirections}
                >
                  <Text className="font-medium">Directions</Text>
                </TouchableOpacity>
              </View>

              {/* Attendees Section */}
              <View className="mb-6">
                <Text className="mb-2 text-lg font-semibold">Attendees</Text>
                <View className="flex-row flex-wrap gap-2">
                  {event.attendees.profiles.map((attendee) => (
                    <View key={attendee.id} className="items-center">
                      <Image
                        source={{ uri: attendee.avatar_url }}
                        className="w-12 h-12 mb-1 border-2 border-white rounded-full"
                      />
                      <Text className="text-xs text-muted-foreground">
                        {attendee.name}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>

              {/* Nearby Events Section */}
              <View>
                <Text className="mb-2 text-lg font-semibold">
                  Nearby Events
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {nearbyEvents.map((nearbyEvent) => (
                    <TouchableOpacity
                      key={nearbyEvent.id}
                      className="w-48 mr-4"
                      onPress={() => {
                        onClose();
                        onEventSelect(nearbyEvent);
                      }}
                    >
                      <Image
                        source={{ uri: nearbyEvent.image_urls[0] }}
                        className="w-full h-24 mb-2 rounded-lg"
                      />
                      <Text className="font-medium" numberOfLines={1}>
                        {nearbyEvent.name}
                      </Text>
                      <Text
                        className="text-sm text-muted-foreground"
                        numberOfLines={1}
                      >
                        {nearbyEvent.venue_name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>
          </ScrollView>
        </View>
      </Sheet>
      {isCreateOrbitOpen && (
        <CreateOrbitModal
          event={event}
          isOpen={isCreateOrbitOpen}
          onClose={() => setIsCreateOrbitOpen(false)}
        />
      )}
    </>
  );
};
