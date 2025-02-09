import React, { useState } from "react";
import { View, ScrollView, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Text } from "~/src/components/ui/text";
import { Search, Filter } from "lucide-react-native";
import { useMapEvents } from "~/hooks/useMapEvents";
import { FeedEventCard } from "~/src/components/feed/FeedEventCard";
import { EventDetailsSheet } from "~/src/components/map/EventDetailsSheet";
import { SearchSheet } from "~/src/components/search/SearchSheet";

const SearchBar = ({ onPress }: { onPress: () => void }) => (
  <View className="flex-row items-center p-4 space-x-2">
    <TouchableOpacity
      onPress={onPress}
      className="flex-row items-center flex-1 px-4 py-2 border rounded-full bg-muted/50 border-border"
    >
      <Search size={20} className="mr-2 text-muted-foreground" />
      <Text className="text-muted-foreground">Search events and people...</Text>
    </TouchableOpacity>
    <TouchableOpacity className="p-2 border rounded-full bg-background border-border">
      <Filter size={20} />
    </TouchableOpacity>
  </View>
);

export default function Home() {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);

  const { events, isLoading, error } = useMapEvents({
    center: [37.7749, -122.4194],
    radius: 10000,
    timeRange: "now",
  });

  if (isLoading) {
    return (
      <SafeAreaView className="items-center justify-center flex-1">
        <Text>Loading events...</Text>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView className="items-center justify-center flex-1">
        <Text className="text-red-500">{error}</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <SearchBar onPress={() => setIsSearchOpen(true)} />

      <ScrollView className="flex-1">
        {events.map((event) => (
          <FeedEventCard
            key={event.id}
            event={event}
            onEventSelect={setSelectedEvent}
            nearbyEvents={events}
          />
        ))}
      </ScrollView>

      <SearchSheet
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
      />

      {selectedEvent && (
        <EventDetailsSheet
          event={selectedEvent}
          isOpen={!!selectedEvent}
          onClose={() => setSelectedEvent(null)}
          nearbyEvents={events}
          onEventSelect={setSelectedEvent}
        />
      )}
    </SafeAreaView>
  );
}
