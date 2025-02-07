import { useState, useCallback } from "react";
import { View, TouchableOpacity, Image, Dimensions } from "react-native";
import { Text } from "~/src/components/ui/text";
import { X, Info, ChevronLeft, ChevronRight } from "lucide-react-native";
import { BlurView } from "expo-blur";
import { format, formatDistanceToNow } from "date-fns";
import { EventDetailsSheet } from "~/src/components/map/EventDetailsSheet";
import { MapEvent } from "~/hooks/useMapEvents";
import { GestureDetector, Gesture } from "react-native-gesture-handler";
import Animated, {
  useAnimatedStyle,
  withSpring,
  useSharedValue,
  runOnJS,
} from "react-native-reanimated";

interface EventCardProps {
  event: MapEvent;
  nearbyEvents: MapEvent[];
  onClose: () => void;
  onEventSelect: (event: MapEvent) => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.3;

export const EventCard = ({
  event,
  nearbyEvents,
  onClose,
  onEventSelect,
}: EventCardProps) => {
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [currentEventIndex, setCurrentEventIndex] = useState(0);
  const startTime = new Date(event.start_datetime);
  const endTime = new Date(event.end_datetime);
  const startsIn = formatDistanceToNow(startTime);

  const translateX = useSharedValue(0);
  const context = useSharedValue({ x: 0 });

  const allEvents = [event, ...nearbyEvents];

  const navigateToEvent = useCallback(
    (direction: "next" | "prev") => {
      let newIndex = currentEventIndex;
      if (direction === "next" && currentEventIndex < allEvents.length - 1) {
        newIndex = currentEventIndex + 1;
      } else if (direction === "prev" && currentEventIndex > 0) {
        newIndex = currentEventIndex - 1;
      }

      if (newIndex !== currentEventIndex) {
        setCurrentEventIndex(newIndex);
        onEventSelect(allEvents[newIndex]);
      }
    },
    [currentEventIndex, allEvents, onEventSelect]
  );

  const gesture = Gesture.Pan()
    .onStart(() => {
      context.value = { x: translateX.value };
    })
    .onUpdate((event) => {
      translateX.value = event.translationX + context.value.x;
    })
    .onEnd((event) => {
      if (Math.abs(event.velocityX) > 500) {
        if (event.velocityX > 0) {
          runOnJS(navigateToEvent)("prev");
        } else {
          runOnJS(navigateToEvent)("next");
        }
      } else if (Math.abs(translateX.value) > SWIPE_THRESHOLD) {
        if (translateX.value > 0) {
          runOnJS(navigateToEvent)("prev");
        } else {
          runOnJS(navigateToEvent)("next");
        }
      }
      translateX.value = withSpring(0);
    });

  const rStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const currentEvent = allEvents[currentEventIndex];

  return (
    <>
      <View className="absolute left-0 right-0 mx-4 bottom-10 mb-14">
        <TouchableOpacity
          className="absolute z-10 items-center justify-center w-8 h-8 rounded-full right-2 top-2 bg-black/20"
          onPress={onClose}
        >
          <X size={20} color="white" />
        </TouchableOpacity>

        <GestureDetector gesture={gesture}>
          <Animated.View style={rStyle}>
            <View className="overflow-hidden rounded-2xl">
              <Image
                source={{ uri: currentEvent.image_urls[0] }}
                className="absolute w-full h-full"
                blurRadius={3}
              />
              {/* Dark overlay */}
              <View className="absolute w-full h-full bg-black/40" />
              <BlurView intensity={20} className="p-4">
                <View>
                  {/* Navigation Indicators */}
                  <View className="flex-row justify-between mb-2">
                    <TouchableOpacity
                      onPress={() => navigateToEvent("prev")}
                      disabled={currentEventIndex === 0}
                      className={`p-2 ${
                        currentEventIndex === 0 ? "opacity-30" : ""
                      }`}
                    >
                      <ChevronLeft size={24} color="white" />
                    </TouchableOpacity>
                    <Text className="text-white/70">
                      {currentEventIndex + 1} / {allEvents.length}
                    </Text>
                    <TouchableOpacity
                      onPress={() => navigateToEvent("next")}
                      disabled={currentEventIndex === allEvents.length - 1}
                      className={`p-2 ${
                        currentEventIndex === allEvents.length - 1
                          ? "opacity-30"
                          : ""
                      }`}
                    >
                      <ChevronRight size={24} color="white" />
                    </TouchableOpacity>
                  </View>

                  {/* Event Title */}
                  <Text className="mb-2 text-2xl font-semibold text-white">
                    {currentEvent.name}
                  </Text>

                  {/* Location and Time */}
                  <View className="flex-row items-center mb-4">
                    <Text className="text-white/90">
                      {currentEvent.venue_name} •{" "}
                      {format(new Date(currentEvent.start_datetime), "h:mm a")}{" "}
                      - {format(new Date(currentEvent.end_datetime), "h:mm a")}
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
                      {currentEvent.attendees.profiles
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
                      {currentEvent.attendees.count > 4 && (
                        <View className="px-2 py-1 ml-1 rounded-full bg-white/20">
                          <Text className="text-white">
                            +{currentEvent.attendees.count - 4}
                          </Text>
                        </View>
                      )}
                    </View>

                    {/* Distance */}
                    <View className="px-3 py-1 bg-red-500 rounded-full">
                      <Text className="text-sm text-white">
                        {(currentEvent.distance / 1609.344).toFixed(1)}mi away
                      </Text>
                    </View>
                  </View>
                </View>
              </BlurView>
            </View>
          </Animated.View>
        </GestureDetector>
      </View>

      <EventDetailsSheet
        event={currentEvent}
        nearbyEvents={nearbyEvents}
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        onEventSelect={onEventSelect}
      />
    </>
  );
};
