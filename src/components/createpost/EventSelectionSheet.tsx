import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  Text,
} from "react-native";
import { Sheet } from "../ui/sheet";
import { supabase } from "../../lib/supabase";
import { Input } from "../ui/input";
import { Calendar, MapPin, Users, Search, X, Plus } from "lucide-react-native";
import { debounce } from "lodash";
import { useAuth } from "../../lib/auth";
import { useTheme } from "../ThemeProvider";
import { useUpdateEvents } from "~/hooks/useUpdateEvents";

interface MapEvent {
  id: string;
  name: string;
  description?: string;
  start_datetime: string;
  end_datetime?: string;
  location: any;
  venue_name?: string;
  address?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  created_by?: string;
  image_urls?: string[];
  created_at?: string;
  is_private: boolean;
  type: string;
  location_id?: string;
  category_id?: string;
  is_ticketmaster?: boolean;
  external_url?: string;
}

interface EventSelectionSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectEvent: (event: MapEvent) => void;
}

type TabType = "created" | "attending" | "search";

export function EventSelectionSheet({
  isOpen,
  onClose,
  onSelectEvent,
}: EventSelectionSheetProps) {
  const { theme } = useTheme();
  const { session } = useAuth();
  const { fetchCreatedEvents } = useUpdateEvents();
  const [searchQuery, setSearchQuery] = useState("");
  const [createdEvents, setCreatedEvents] = useState<MapEvent[]>([]);
  const [attendingEvents, setAttendingEvents] = useState<MapEvent[]>([]);
  const [searchResults, setSearchResults] = useState<MapEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>("created");
  const searchInputRef = useRef<TextInput>(null);

  // Tab configuration
  const tabs = [
    { id: "created" as TabType, label: "Created", icon: Plus },
    { id: "attending" as TabType, label: "Going", icon: Users },
    { id: "search" as TabType, label: "Search", icon: Search },
  ];

  // Reset on open/close
  useEffect(() => {
    if (isOpen) {
      setSearchQuery("");
      setSearchResults([]);
      setActiveTab("created");
      loadCreatedEvents();
      loadAttendingEvents();
    }
  }, [isOpen]);

  // Load events created by user
  const loadCreatedEvents = async () => {
    if (!session?.user.id) return;

    setIsLoading(true);
    try {
      const events = await (fetchCreatedEvents as any)(
        "created",
        1,
        50,
        session.user.id
      );
      console.log("Created events loaded:", events);
      // fetchCreatedEvents returns the events array directly
      setCreatedEvents(Array.isArray(events) ? (events as MapEvent[]) : []);
    } catch (error) {
      console.error("Error loading created events:", error);
      setCreatedEvents([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Load events user is attending
  const loadAttendingEvents = async () => {
    if (!session?.user.id) return;

    try {
      const events = await (fetchCreatedEvents as any)(
        "joined",
        1,
        50,
        session.user.id
      );
      console.log("Attending events loaded:", events);
      // Handle the return value properly since interface says void but actually returns data
      setAttendingEvents(Array.isArray(events) ? (events as MapEvent[]) : []);
    } catch (error) {
      console.error("Error loading attending events:", error);
      setAttendingEvents([]);
    }
  };

  // Search for events
  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.rpc("search_comprehensive", {
        search_query: query,
        result_limit: 15,
      });

      if (!error && data) {
        const processedEvents: MapEvent[] = (data.events || []).map(
          (event: any) => ({
            id: event.id,
            name: event.name,
            description: event.description,
            start_datetime: event.start_datetime,
            end_datetime: event.end_datetime,
            location: event.location,
            venue_name: event.venue_name,
            address: event.address,
            city: event.city,
            state: event.state,
            postal_code: event.postal_code,
            created_by: event.created_by,
            image_urls: event.image_urls,
            created_at: event.created_at,
            is_private: event.is_private,
            type: event.type || "event",
            location_id: event.location_id,
            category_id: event.category_id,
            is_ticketmaster: event.is_ticketmaster || false,
            external_url: event.external_url,
          })
        );

        setSearchResults(processedEvents);
      }
    } catch (error) {
      console.error("Search error:", error);
      setSearchResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  const debouncedSearch = useCallback(debounce(handleSearch, 300), [session]);

  // Handle event selection
  const handleSelectEvent = (event: MapEvent) => {
    onSelectEvent(event);
    onClose();
  };

  // Get current events based on active tab
  const getCurrentEvents = () => {
    switch (activeTab) {
      case "created":
        return createdEvents;
      case "attending":
        return attendingEvents;
      case "search":
        return searchResults;
      default:
        return [];
    }
  };

  const currentEvents = getCurrentEvents();
  const hasResults = currentEvents.length > 0;
  const shouldShowEmptyState = !isLoading && !hasResults;

  // Get tab count
  const getTabCount = (tabId: TabType) => {
    switch (tabId) {
      case "created":
        return createdEvents.length;
      case "attending":
        return attendingEvents.length;
      case "search":
        return searchResults.length;
      default:
        return 0;
    }
  };

  return (
    <Sheet isOpen={isOpen} onClose={onClose}>
      <View
        style={{
          backgroundColor: theme.colors.background,
          flex: 1,
          paddingTop: 20,
        }}
      >
        {/* Header */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 20,
            paddingBottom: 16,
            borderBottomWidth: 1,
            borderBottomColor: theme.colors.border,
          }}
        >
          <Text
            style={{
              fontSize: 18,
              fontWeight: "600",
              color: theme.colors.text,
              flex: 1,
            }}
          >
            Select Event
          </Text>
          <TouchableOpacity
            onPress={onClose}
            style={{
              padding: 8,
              borderRadius: 20,
              backgroundColor: theme.colors.card,
            }}
          >
            <X size={20} color={theme.colors.text} />
          </TouchableOpacity>
        </View>

        {/* Search Input for Search Tab */}
        {activeTab === "search" && (
          <View style={{ paddingHorizontal: 20, paddingTop: 16 }}>
            <Input
              ref={searchInputRef}
              placeholder="Search for events..."
              value={searchQuery}
              onChangeText={(text: string) => {
                setSearchQuery(text);
                debouncedSearch(text);
              }}
              placeholderTextColor={theme.colors.text + "80"}
              style={{
                backgroundColor: theme.colors.card,
                borderColor: theme.colors.border,
                color: theme.colors.text,
              }}
            />
          </View>
        )}

        {/* Tabs */}
        <View
          style={{
            flexDirection: "row",
            paddingHorizontal: 20,
            paddingTop: 16,
            paddingBottom: 12,
            justifyContent: "space-between",
          }}
        >
          {tabs.map((tab) => {
            const count = getTabCount(tab.id);
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;

            return (
              <TouchableOpacity
                key={tab.id}
                onPress={() => setActiveTab(tab.id)}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 16,
                  backgroundColor: isActive
                    ? theme.colors.primary
                    : theme.colors.card,
                  borderWidth: 1,
                  borderColor: isActive
                    ? theme.colors.primary
                    : theme.colors.border,
                  flex: 1,
                  marginHorizontal: 4,
                  justifyContent: "center",
                }}
              >
                <Icon
                  size={16}
                  color={isActive ? "white" : theme.colors.text}
                />
                <Text
                  style={{
                    marginLeft: 6,
                    color: isActive ? "white" : theme.colors.text,
                    fontWeight: isActive ? "600" : "400",
                    fontSize: 14,
                  }}
                >
                  {tab.label}
                </Text>
                {count > 0 && (
                  <View
                    style={{
                      marginLeft: 6,
                      paddingHorizontal: 6,
                      paddingVertical: 2,
                      borderRadius: 10,
                      backgroundColor: isActive
                        ? "rgba(255,255,255,0.2)"
                        : theme.colors.primary,
                      minWidth: 20,
                      alignItems: "center",
                    }}
                  >
                    <Text
                      style={{
                        color: "white",
                        fontSize: 10,
                        fontWeight: "600",
                      }}
                    >
                      {count}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Content */}
        <View style={{ flex: 1 }}>
          {/* Loading State */}
          {isLoading && (
            <View
              style={{
                flex: 1,
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <ActivityIndicator size="large" color={theme.colors.primary} />
              <Text
                style={{
                  marginTop: 16,
                  color: theme.colors.text,
                  fontSize: 16,
                }}
              >
                Loading events...
              </Text>
            </View>
          )}

          {/* Empty State */}
          {shouldShowEmptyState && (
            <View
              style={{
                flex: 1,
                justifyContent: "center",
                alignItems: "center",
                paddingHorizontal: 32,
              }}
            >
              <Calendar size={48} color={theme.colors.text + "40"} />
              <Text
                style={{
                  marginTop: 16,
                  fontSize: 18,
                  fontWeight: "600",
                  color: theme.colors.text,
                  textAlign: "center",
                }}
              >
                {activeTab === "created" && "No Events Created"}
                {activeTab === "attending" && "No Events Attending"}
                {activeTab === "search" && "No Events Found"}
              </Text>
              <Text
                style={{
                  marginTop: 8,
                  fontSize: 14,
                  color: theme.colors.text + "80",
                  textAlign: "center",
                  lineHeight: 20,
                }}
              >
                {activeTab === "created" &&
                  "You haven't created any events yet."}
                {activeTab === "attending" &&
                  "You're not attending any events yet."}
                {activeTab === "search" &&
                  "Try searching with different keywords."}
              </Text>
            </View>
          )}

          {/* Events List */}
          {hasResults && !isLoading && (
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={{ paddingBottom: 20 }}
              showsVerticalScrollIndicator={false}
            >
              <View style={{ paddingHorizontal: 20, marginTop: 16 }}>
                {currentEvents.map((event, index) => (
                  <TouchableOpacity
                    key={`${event.id}-${index}`}
                    onPress={() => handleSelectEvent(event)}
                    style={{
                      flexDirection: "row",
                      padding: 12,
                      marginBottom: 12,
                      backgroundColor: theme.colors.card,
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: theme.colors.border,
                      shadowColor: "#000",
                      shadowOffset: { width: 0, height: 1 },
                      shadowOpacity: 0.1,
                      shadowRadius: 3,
                      elevation: 2,
                    }}
                  >
                    <View
                      style={{
                        width: 56,
                        height: 56,
                        borderRadius: 8,
                        backgroundColor: theme.colors.primary + "20",
                        justifyContent: "center",
                        alignItems: "center",
                        marginRight: 12,
                      }}
                    >
                      {event.image_urls && event.image_urls.length > 0 ? (
                        <Image
                          source={{ uri: event.image_urls[0] }}
                          style={{
                            width: 56,
                            height: 56,
                            borderRadius: 8,
                          }}
                          resizeMode="cover"
                        />
                      ) : (
                        <Calendar size={24} color={theme.colors.primary} />
                      )}
                    </View>
                    <View style={{ flex: 1, justifyContent: "center" }}>
                      <View
                        style={{ flexDirection: "row", alignItems: "center" }}
                      >
                        <Text
                          style={{
                            fontSize: 16,
                            fontWeight: "600",
                            color: theme.colors.text,
                            flex: 1,
                          }}
                          numberOfLines={1}
                        >
                          {event.name}
                        </Text>
                        {event.is_ticketmaster && (
                          <View
                            style={{
                              paddingHorizontal: 6,
                              paddingVertical: 2,
                              backgroundColor: "#8B5CF6",
                              borderRadius: 4,
                              marginLeft: 8,
                            }}
                          >
                            <Text
                              style={{
                                color: "white",
                                fontSize: 10,
                                fontWeight: "600",
                              }}
                            >
                              TM
                            </Text>
                          </View>
                        )}
                      </View>
                      <Text
                        style={{
                          fontSize: 14,
                          color: theme.colors.text + "80",
                          marginTop: 2,
                        }}
                        numberOfLines={1}
                      >
                        {event.venue_name || event.address}
                      </Text>
                      {event.start_datetime && (
                        <Text
                          style={{
                            fontSize: 12,
                            color: theme.colors.text + "60",
                            marginTop: 2,
                          }}
                        >
                          {new Date(event.start_datetime).toLocaleDateString()}
                        </Text>
                      )}
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          )}
        </View>
      </View>
    </Sheet>
  );
}
