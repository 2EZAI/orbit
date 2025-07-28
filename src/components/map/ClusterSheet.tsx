import React from "react";
import { View, ScrollView, TouchableOpacity, Image } from "react-native";
import { Text } from "../ui/text";
import { Sheet } from "../ui/sheet";
import { MapEvent } from "~/hooks/useMapEvents";
import { formatTime, formatDate } from "~/src/lib/date";
import { MapPin, Calendar, X } from "lucide-react-native";

interface ClusterSheetProps {
  events: MapEvent[];
  onEventSelect: (event: MapEvent) => void;
  onClose: () => void;
}

export function ClusterSheet({
  events,
  onEventSelect,
  onClose,
}: ClusterSheetProps) {
  return (
    <Sheet isOpen onClose={onClose}>
      <View className="flex-1 bg-background">
        <View className="px-4 pt-4 pb-2 border-b border-border">
          <View className="flex-row justify-between items-center mb-2">
            <Text className="text-xl font-semibold">
              {events?.[0]?.type === "googleApi" ||
              events?.[0]?.type === "static"
                ? `${events.length} Locations `
                : `${events.length} Events at this location`}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <X size={24} className="text-foreground" />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView className="flex-1">
          {events.map((event) => (
            <TouchableOpacity
              key={event.id}
              onPress={() => {
                onEventSelect(event);
                onClose();
              }}
              className="flex-row p-4 border-b border-border"
            >
              {/* Event Image */}
              <View className="overflow-hidden mr-3 w-20 h-20 rounded-lg">
                <Image
                  source={{ uri: event?.image_urls?.[0] }}
                  className="w-full h-full"
                  resizeMode="cover"
                />
              </View>

              {/* Event Details */}
              <View className="flex-1">
                <Text className="mb-1 text-base font-medium" numberOfLines={1}>
                  {event.name}
                </Text>

                {/* Date and Time */}
                <View className="flex-row items-center mb-1">
                  <Calendar size={14} className="mr-1 text-muted-foreground" />
                  {event?.start_datetime !== null ||
                    (event?.start_datetime !== undefined && (
                      <Text className="text-sm text-muted-foreground">
                        {formatDate(event?.start_datetime)} •{" "}
                        {formatTime(event?.start_datetime)}
                      </Text>
                    ))}
                </View>

                {/* Venue */}
                {event.venue_name && (
                  <View className="flex-row items-center">
                    <MapPin size={14} className="mr-1 text-muted-foreground" />
                    <Text
                      className="text-sm text-muted-foreground"
                      numberOfLines={1}
                    >
                      {event.venue_name}
                    </Text>
                  </View>
                )}

                {/* Attendee count */}
                {event?.attendees != null && event?.attendees != undefined && (
                  <Text className="mt-1 text-sm text-primary">
                    {String(event.attendees.count)}{" "}
                    {event.attendees.count === 1 ? "attendee" : "attendees"}
                  </Text>
                )}
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </Sheet>
  );
}
