import { useState } from "react";
import { View, TouchableOpacity, Image } from "react-native";
import { Text } from "~/src/components/ui/text";
import { X, Info } from "lucide-react-native";
import { BlurView } from "expo-blur";
import { format, formatDistanceToNow } from "date-fns";
import { EventDetailsSheet } from "~/src/components/map/EventDetailsSheet";
import { MapEvent } from "~/hooks/useMapEvents";

interface EventCardProps {
  event: MapEvent;
  nearbyEvents: MapEvent[];
  onClose: () => void;
  onEventSelect: (event: MapEvent) => void;
}

export const EventCard = ({
  event,
  nearbyEvents,
  onClose,
  onEventSelect,
}: EventCardProps) => {
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const startTime = new Date(event.start_datetime);
  const endTime = new Date(event.end_datetime);
  const startsIn = formatDistanceToNow(startTime);

  return (
    <>
      <View className="absolute left-0 right-0 mx-4 bottom-10 mb-14">
        <TouchableOpacity
          className="absolute z-10 items-center justify-center w-8 h-8 rounded-full right-2 top-2 bg-black/20"
          onPress={onClose}
        >
          <X size={20} color="white" />
        </TouchableOpacity>

        <View className="overflow-hidden rounded-2xl">
          <Image
            source={{ uri: event.image_urls[0] }}
            className="absolute w-full h-full"
            blurRadius={3}
          />
          <BlurView intensity={20} className="p-4">
            <View>
              {/* Event Title */}
              <Text className="mb-2 text-2xl font-semibold text-white">
                {event.name}
              </Text>

              {/* Location and Time */}
              <View className="flex-row items-center mb-4">
                <Text className="text-white/90">
                  {event.venue_name} • {format(startTime, "h:mm a")} -{" "}
                  {format(endTime, "h:mm a")}
                </Text>
              </View>

              {/* Action Buttons */}
              <View className="flex-row gap-3 mb-8">
                <TouchableOpacity className="px-6 py-2 rounded-full bg-primary">
                  <Text className="font-medium text-white">Join Event</Text>
                </TouchableOpacity>
                <TouchableOpacity className="px-6 py-2 rounded-full bg-white/20">
                  <Text className="font-medium text-white">Directions</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  className="items-center justify-center w-10 h-10 rounded-full bg-white/20"
                  onPress={() => setIsDetailsOpen(true)}
                >
                  <Info size={20} color="white" />
                </TouchableOpacity>
              </View>

              {/* Attendees */}
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center">
                  {event.attendees.profiles
                    .slice(0, 4)
                    .map((attendee, index) => (
                      <View
                        key={attendee.id}
                        style={{
                          marginLeft: index > 0 ? -12 : 0,
                          zIndex: 4 - index,
                        }}
                      >
                        <Image
                          source={{ uri: attendee.avatar_url }}
                          className="w-8 h-8 border-2 border-white rounded-full"
                        />
                      </View>
                    ))}
                  {event.attendees.count > 4 && (
                    <View className="px-2 py-1 ml-1 rounded-full bg-white/20">
                      <Text className="text-white">
                        +{event.attendees.count - 4}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Starts In */}
                <View className="px-3 py-1 bg-red-500 rounded-full">
                  <Text className="text-sm text-white">Starts: {startsIn}</Text>
                </View>
              </View>
            </View>
          </BlurView>
        </View>
      </View>

      <EventDetailsSheet
        event={event}
        nearbyEvents={nearbyEvents}
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        onEventSelect={onEventSelect}
      />
    </>
  );
};
