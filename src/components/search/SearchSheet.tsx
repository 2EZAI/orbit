import React, { useState } from "react";
import {
  View,
  TouchableOpacity,
  Image,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Text } from "../ui/text";
import { Sheet } from "../ui/sheet";
import { Search, X, MapPin, Users } from "lucide-react-native";
import { Input } from "../ui/input";
import { useRouter } from "expo-router";
import { supabase } from "~/src/lib/supabase";
import { formatTime, formatDate } from "~/src/lib/date";
import { UserAvatar } from "../ui/user-avatar";
import { EventDetailsSheet } from "../map/EventDetailsSheet";
import { MapEvent } from "~/hooks/useMapEvents";

interface SearchSheetProps {
  isOpen: boolean;
  onClose: () => void;
  eventsList:any;
}

type User = {
  id: string;
  username: string;
  first_name: string;
  last_name: string;
  avatar_url: string | null;
};

type SearchResults = {
  events: MapEvent[];
  users: User[];
};

const processEvent = (event: any, user?: User): MapEvent => {
  return {
    id: event.id,
    name: event.name,
    description: event.description,
    venue_name: event.venue_name,
    address: event.address || "",
    start_datetime: event.start_datetime,
    end_datetime: event.end_datetime,
    image_urls: event.image_urls,
    created_by: event.created_by,
    location: event.location,
    is_ticketmaster: event.is_ticketmaster || false,
    external_url: event.external_url || '',
    distance: 0,
    attendees: { count: 0, profiles: [] },
    categories: [],
  };
};

export function SearchSheet({ isOpen, onClose ,eventsList}: SearchSheetProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState<SearchResults>({
    events: [],
    users: [],
  });
  const [isLoading, setIsLoading] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<MapEvent | null>(null);

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.length < 2) {
      setResults({ events: [], users: [] });
      return;
    }

    setIsLoading(true);
    try {
      // Fetch events
      // const { data: events, error: eventsError } = await supabase
      //   .from("events")
      //   .select(
      //     `
      //     id,
      //     name,
      //     description,
      //     venue_name,
      //     address,
      //     start_datetime,
      //     end_datetime,
      //     image_urls,
      //     created_by,
      //     location,
      //     event_topics (
      //       topics (
      //         id,
      //         name
      //       )
      //     )
      //   `
      //   )
      //   .or(`name.ilike.%${query}%,description.ilike.%${query}%`)
      //   .order("start_datetime", { ascending: true })
      //   .limit(5);

      // if (eventsError) throw eventsError;

const searchQ = query.toLowerCase();

      const events = eventsList.filter(event =>  
      event.name.toLowerCase().includes(searchQ) )
      .sort((a, b) => {
    const aName = a.name.toLowerCase();
    const bName = b.name.toLowerCase();
    const aStarts = aName.startsWith(searchQ);
    const bStarts = bName.startsWith(searchQ);
    
    // Prioritize startsWith
    if (aStarts && !bStarts) return -1;
    if (!aStarts && bStarts) return 1;
    
    // If both or neither start with the term, sort alphabetically
    return aName.localeCompare(bName);
  });

      console.log(events);

      let processedEvents: MapEvent[] = [];
      if (events?.length > 0) {
        const userIds = events.map((e) => e.created_by).filter(Boolean);
        const { data: users } = await supabase
          .from("users")
          .select("id, username, first_name, last_name, avatar_url")
          .in("id", userIds);

        const usersMap: Record<string, User> =
          users?.reduce((acc, user) => {
            acc[user.id] = user;
            return acc;
          }, {} as Record<string, User>) || {};

        processedEvents = events.map((event) =>
          processEvent(event, usersMap?.[event.created_by])
        );
      }

      // Fetch users
      console.log("Searching for users with query:", query);

      // Debug query - get all users first
      const { data: allUsers } = await supabase.from("users").select("*");
      console.log("All users in database:", allUsers);

      // Try the actual search
      const { data: users, error: usersError } = await supabase
        .from("users")
        .select("*")
        .filter("first_name", "ilike", `%${query}%`);

      console.log("Search query results:", users);

      if (usersError) {
        console.error("Users search error:", usersError);
        throw usersError;
      }

      setResults({
        events: processedEvents,
        users: users || [],
      });
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectResult = (type: "event" | "user", data: any) => {
    if (type === "user" && data?.username) {
      router.push({
        pathname: "/(app)/profile/[username]",
        params: { username: data.username },
      });
      onClose();
    } else if (type === "event" && data?.id) {
      setSelectedEvent(data);
      onClose();
      setSearchQuery('');
    }
  };

  return (
    <>
      <Sheet isOpen={isOpen} onClose={onClose}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          className="flex-1"
          keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 24}
        >
          <View className="flex-1 bg-background">
            {/* Search Header */}
            <View className="p-4 border-b border-border">
              <View className="flex-row items-center">
                <View className="flex-row items-center flex-1 px-4 py-2 rounded-full bg-muted">
                  <Search size={20} className="mr-2 text-muted-foreground" />
                  <Input
                    placeholder="Search events and people..."
                    value={searchQuery}
                    onChangeText={handleSearch}
                    className="flex-1 p-0 text-base bg-transparent border-0"
                  />
                </View>
                <TouchableOpacity className="p-2 ml-2" onPress={() => {
                  setSearchQuery('');
                  onClose();
                }}>
                  <X size={24} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Results */}
            <ScrollView className="flex-1">
              {isLoading ? (
                <View className="p-4">
                  <Text className="text-center text-muted-foreground">
                    Searching...
                  </Text>
                </View>
              ) : searchQuery.length > 1 ? (
                <>
                  {/* Events Section */}
                  {results.events.length > 0 && (
                    <View>
                      <Text className="px-4 py-2 text-sm font-medium text-muted-foreground bg-muted/50">
                        Events
                      </Text>
                      {results.events.map((event) => (
                        <TouchableOpacity
                          key={event.id}
                          className="flex-row items-center p-4 border-b border-border"
                          onPress={() => handleSelectResult("event", event)}
                        >
                          <Image
                            source={{ uri: event.image_urls?.[0] }}
                            className="w-12 h-12 mr-3 rounded-lg"
                          />
                          <View className="flex-1">
                            <Text className="mb-1 font-medium">
                              {event.name}
                            </Text>
                            <View className="flex-row items-center">
                              <MapPin
                                size={14}
                                className="mr-1 text-muted-foreground"
                              />
                              <Text className="text-sm text-muted-foreground">
                                {event.venue_name}
                              </Text>
                            </View>
                          </View>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}

                  {/* Users Section */}
                  {results.users.length > 0 && (
                    <View>
                      <Text className="px-4 py-2 text-sm font-medium text-muted-foreground bg-muted/50">
                        People
                      </Text>
                      {results.users.map((user) => (
                        <TouchableOpacity
                          key={user.id}
                          className="flex-row items-center p-4 border-b border-border"
                          onPress={() => handleSelectResult("user", user)}
                        >
                          <UserAvatar
                            user={{
                              id: user.id,
                              name: `${user.first_name} ${user.last_name}`,
                              image: user.avatar_url,
                            }}
                            size={48}
                          />
                          <View className="flex-1 ml-3">
                            <Text className="font-medium">
                              {user.first_name} {user.last_name}
                            </Text>
                            <Text className="text-sm text-muted-foreground">
                              @{user.username}
                            </Text>
                          </View>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}

                  {results.events.length === 0 &&
                    results.users.length === 0 && (
                      <View className="p-4">
                        <Text className="text-center text-muted-foreground">
                          No results found
                        </Text>
                      </View>
                    )}
                </>
              ) : null}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Sheet>

      {selectedEvent && (
        <EventDetailsSheet
          event={selectedEvent}
          isOpen={!!selectedEvent}
          onClose={() => {
            setSelectedEvent(null);
            onClose();
          }}
          nearbyEvents={results.events}
          onEventSelect={(event) => setSelectedEvent(event)}
        />
      )}
    </>
  );
}
