import React, { useState } from "react";
import { View, ScrollView, TouchableOpacity, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Text } from "~/src/components/ui/text";
import { Search, Filter, MapPin } from "lucide-react-native";
import { Sheet } from "~/src/components/ui/sheet";
import { useMapEvents } from "~/hooks/useMapEvents";
import { formatDistanceToNow, format } from "date-fns";
import { BlurView } from "expo-blur";

const SearchBar = ({ onSearch }: { onSearch: (text: string) => void }) => (
  <View className="flex-row items-center p-4 space-x-2">
    <View className="flex-row items-center flex-1 px-4 py-2 border rounded-full bg-muted/50 border-border">
      <Search size={20} className="mr-2 text-muted-foreground" />
      <Text className="text-muted-foreground">Search events...</Text>
    </View>
    <TouchableOpacity className="p-2 border rounded-full bg-background border-border">
      <Filter size={20} />
    </TouchableOpacity>
  </View>
);

const EventCard = ({ event }: { event: any }) => {
  const startTime = new Date(event.start_datetime);
  const endTime = new Date(event.end_datetime);
  const startsIn = formatDistanceToNow(startTime);

  return (
    <View className="mx-4 mb-4 overflow-hidden border rounded-2xl border-border">
      <Image
        source={{ uri: event.image_urls[0] }}
        className="w-full h-48"
        style={{ resizeMode: "cover" }}
      />

      <View className="p-4">
        <Text className="mb-2 text-xl font-semibold">{event.name}</Text>

        <View className="flex-row items-center mb-2">
          <MapPin size={16} className="mr-2 text-muted-foreground" />
          <Text className="text-muted-foreground">{event.venue_name}</Text>
        </View>

        <Text className="mb-4 text-sm text-muted-foreground" numberOfLines={2}>
          {event.description}
        </Text>

        <View className="flex-row flex-wrap gap-2 mb-4">
          {event.categories.map((category: any) => (
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

        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center">
            {event.attendees.profiles
              .slice(0, 3)
              .map((attendee: any, index: number) => (
                <View
                  key={attendee.id}
                  style={{
                    marginLeft: index > 0 ? -12 : 0,
                    zIndex: 3 - index,
                  }}
                >
                  <Image
                    source={{ uri: attendee.avatar_url }}
                    className="w-8 h-8 border-2 rounded-full border-background"
                  />
                </View>
              ))}
            {event.attendees.count > 3 && (
              <View className="px-2 py-1 ml-1 rounded-full bg-muted">
                <Text className="text-sm">+{event.attendees.count - 3}</Text>
              </View>
            )}
          </View>

          <View className="px-3 py-1 rounded-full bg-primary">
            <Text className="text-sm text-white">Starts: {startsIn}</Text>
          </View>
        </View>
      </View>
    </View>
  );
};

const FilterSheet = ({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) => (
  <Sheet isOpen={isOpen} onClose={onClose}>
    <View className="p-4">
      <Text className="mb-4 text-xl font-bold">Filters</Text>
      {/* Add filter options here */}
    </View>
  </Sheet>
);

export default function Home() {
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const { events, isLoading, error } = useMapEvents({
    center: [37.7749, -122.4194],
    radius: 10000,
    timeRange: "now",
  });

  const handleSearch = (text: string) => {
    setSearchQuery(text);
    // Implement search logic here
  };

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
      <SearchBar onSearch={handleSearch} />

      <ScrollView className="flex-1">
        {events.map((event) => (
          <EventCard key={event.id} event={event} />
        ))}
      </ScrollView>

      <FilterSheet
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
      />
    </SafeAreaView>
  );
}
