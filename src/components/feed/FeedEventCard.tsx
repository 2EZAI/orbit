import React, { useState } from "react";
import { View, TouchableOpacity, Image } from "react-native";
import { Text } from "../ui/text";
import { MapEvent } from "~/hooks/useMapEvents";
import { Clock, MapPin } from "lucide-react-native";
import { format } from "date-fns";
import { EventDetailsSheet } from "../map/EventDetailsSheet";

interface FeedEventCardProps {
  event: MapEvent;
  onEventSelect?: (event: MapEvent) => void;
  nearbyEvents?: MapEvent[];
}

export function FeedEventCard({
  event,
  onEventSelect,
  nearbyEvents,
}: FeedEventCardProps) {
  const [showDetails, setShowDetails] = useState(false);
  const startTime = new Date(event.start_datetime);
  const endTime = new Date(event.end_datetime);

  // console.log("event>",event)

  return (
    <>
      <TouchableOpacity
        className="mx-4 mb-4 overflow-hidden border rounded-3xl border-border"
        onPress={() => {
          setShowDetails(true);
          onEventSelect?.(event);
        }}
      >
        <View className="relative">
          <Image
            source={{ uri: event.image_urls[0] }}
            className="w-full h-48"
            style={{ resizeMode: "cover" }}
          />
          <View className="absolute px-3 py-1 rounded-lg left-4 top-4 bg-white/90">
            <Text className="font-medium">{format(startTime, "MMM d")}</Text>
            <Text className="text-xs text-center text-muted-foreground">
              {format(startTime, "EEE")}
            </Text>
          </View>
          <View className="absolute px-3 py-1 rounded-full right-4 top-4 bg-white/90">
            <Text className="text-sm font-medium">
              {event?.attendees?.count}
            </Text>
          </View>
        </View>

        <View className="p-4">
          {/* Host */}
          <Text className="mb-1 text-sm text-muted-foreground">
            @{event.created_by?.name || event.created_by?.username}
          </Text>

          {/* Title */}
          <Text className="mb-2 text-xl font-semibold">{event.name}</Text>

          {/* Time */}
          <View className="flex-row items-center mb-2">
            <Clock size={16} className="mr-2 text-muted-foreground" />
            <Text className="text-muted-foreground">
              {format(startTime, "h:mm a")} - {format(endTime, "h:mm a")}
            </Text>
          </View>

          {/* Location */}
          {/* <View className="flex-row items-center mb-3">
            <MapPin size={16} className="mr-2 text-muted-foreground" />
            <Text className="text-muted-foreground">{event.venue_name}</Text>
            
         </View>*/}
          {/* Location */}
           <TouchableOpacity
        onPress={() => {
          setShowDetails(true);
          onEventSelect?.(event);
        }}
      >
          <View className="flex-row items-center mb-3">
            <MapPin size={16} className="mr-2 text-muted-foreground" />
            <View className="flex-1">
              {event?.venue_name ? (
                <>
                  <Text className="text-muted-foreground">
                    {event?.venue_name}
                  </Text>
                  <Text className="text-sm text-muted-foreground">
                    {event?.address}
                  </Text>
                </>
              ) : (
                <Text className="text-sm text-muted-foreground">
                  {event?.address}
                </Text>
              )}
            </View>
          </View>
 </TouchableOpacity>
          {/* Categories */}
          <View className="flex-row flex-wrap gap-2">
            {event?.categories?.map((category) => (
              <View
                key={category.id}
                className="px-3 py-1 rounded-full bg-purple-100/50"
              >
                <Text className="text-sm font-medium text-purple-700">
                  {category.name}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </TouchableOpacity>

      {showDetails && (
        <EventDetailsSheet
          event={event}
          isOpen={showDetails}
          onClose={() => setShowDetails(false)}
          nearbyEvents={nearbyEvents || []}
          onEventSelect={onEventSelect || (() => {})}
          onShowControler={() => {}}
        />
      )}
    </>
  );
}
