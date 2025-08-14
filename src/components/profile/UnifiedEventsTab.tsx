import React, { useEffect, useState } from "react";
import {
  View,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Pressable,
} from "react-native";
import { Text } from "~/src/components/ui/text";
import { SocialEventCard } from "~/src/components/social/SocialEventCard";
import { UnifiedDetailsSheet } from "~/src/components/map/UnifiedDetailsSheet";
import { useTheme } from "~/src/components/ThemeProvider";
import { useUpdateEvents } from "~/hooks/useUpdateEvents";
import { useAuth } from "~/src/lib/auth";
import { supabase } from "~/src/lib/supabase";

type EventTab = "Created" | "Joined";

interface Event {
  id: string;
  name: string;
  description?: string;
  start_datetime: string;
  end_datetime?: string;
  venue_name?: string;
  address?: string;
  city?: string;
  state?: string;
  image_urls?: string[];
  is_private: boolean;
  type: string;
  location_id?: string;
  category_id?: string;
  is_ticketmaster?: boolean;
  external_url?: string;
  distance?: number; // Add missing distance property
  location?: {
    latitude: number;
    longitude: number;
  };
  categories?: Array<{
    id: string;
    name: string;
    icon?: string;
  }>;
  attendees?: {
    count: number;
    profiles: Array<{
      id: string;
      name: string;
      avatar_url: string | null;
    }>;
  };
  created_by?: {
    id: string;
    name: string;
    username: string;
    avatar_url: string | null;
  };
}

interface UnifiedEventsTabProps {
  userId: string;
  isCurrentUser: boolean;
  onScroll?: any;
  refreshControl?: any;
}

export default function UnifiedEventsTab({
  userId,
  isCurrentUser,
  onScroll,
  refreshControl,
}: UnifiedEventsTabProps) {
  const { theme, isDarkMode } = useTheme();
  const { session } = useAuth();
  const { fetchCreatedEvents } = useUpdateEvents();

  const [activeTab, setActiveTab] = useState<EventTab>("Created");
  const [createdEvents, setCreatedEvents] = useState<Event[]>([]);
  const [joinedEvents, setJoinedEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Sheet state
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  useEffect(() => {
    loadEvents();
  }, [userId, activeTab]);

  const loadEvents = async () => {
    setLoading(true);
    try {
      if (activeTab === "Created") {
        await loadCreatedEvents();
      } else {
        await loadJoinedEvents();
      }
    } catch (error) {
      console.error("Error loading events:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadCreatedEvents = async () => {
    try {
      // First try using the API
      try {
        const events = await (fetchCreatedEvents as any)(
          "created",
          1,
          50,
          userId
        );
        if (Array.isArray(events)) {
          setCreatedEvents(events as Event[]);
          return;
        }
      } catch (apiError) {
        console.log("API fallback, using direct Supabase query");
      }

      // Fallback to direct Supabase query
      const { data: eventsData, error } = await supabase
        .from("events")
        .select(
          `
          id,
          name,
          description,
          start_datetime,
          end_datetime,
          venue_name,
          address,
          city,
          state,
          image_urls,
          is_private,
          type,
          location_id,
          category_id,
          is_ticketmaster,
          external_url,
          location,
          created_by,
          users!created_by (
            id,
            username,
            first_name,
            last_name,
            avatar_url
          ),
          event_attendees (
            user_id,
            users (
              id,
              username,
              first_name,
              last_name,
              avatar_url
            )
          ),
          event_topics (
            topics (
              id,
              name,
              icon
            )
          )
        `
        )
        .eq("created_by", userId)
        .order("start_datetime", { ascending: false });

      if (error) throw error;

      const transformedEvents: Event[] = (eventsData || []).map(
        (event: any) => ({
          ...event,
          categories:
            event.event_topics?.map((t: any) => ({
              id: t.topics?.id,
              name: t.topics?.name,
              icon: t.topics?.icon,
            })) || [],
          attendees: {
            count: event.event_attendees?.length || 0,
            profiles: (event.event_attendees || [])
              .slice(0, 5)
              .map((a: any) => ({
                id: a.users?.id,
                name: a.users
                  ? `${a.users.first_name || ""} ${
                      a.users.last_name || ""
                    }`.trim() ||
                    a.users.username ||
                    "Unknown"
                  : "Unknown",
                avatar_url: a.users?.avatar_url,
              })),
          },
          created_by: event.users
            ? {
                id: event.users.id,
                name:
                  `${event.users.first_name || ""} ${
                    event.users.last_name || ""
                  }`.trim() ||
                  event.users.username ||
                  "Unknown",
                username: event.users.username || "",
                avatar_url: event.users.avatar_url,
              }
            : undefined,
        })
      );

      setCreatedEvents(transformedEvents);
    } catch (error) {
      console.error("Error loading created events:", error);
      setCreatedEvents([]);
    }
  };

  const loadJoinedEvents = async () => {
    try {
      // First try using the API
      try {
        const events = await (fetchCreatedEvents as any)(
          "joined",
          1,
          50,
          userId
        );
        if (Array.isArray(events)) {
          setJoinedEvents(events as Event[]);
          return;
        }
      } catch (apiError) {
        console.log("API fallback, using direct Supabase query");
      }

      // Fallback to direct Supabase query
      const { data: attendeeData, error } = await supabase
        .from("event_attendees")
        .select(
          `
          event_id,
          events (
            id,
            name,
            description,
            start_datetime,
            end_datetime,
            venue_name,
            address,
            city,
            state,
            image_urls,
            is_private,
            type,
            location_id,
            category_id,
            is_ticketmaster,
            external_url,
            location,
            created_by,
            users!created_by (
              id,
              username,
              first_name,
              last_name,
              avatar_url
            ),
            event_topics (
              topics (
                id,
                name,
                icon
              )
            )
          )
        `
        )
        .eq("user_id", userId);

      if (error) throw error;

      const transformedEvents: Event[] = (attendeeData || [])
        .filter((item: any) => item.events)
        .map((item: any) => {
          const event = item.events;
          return {
            ...event,
            categories:
              event.event_topics?.map((t: any) => ({
                id: t.topics?.id,
                name: t.topics?.name,
                icon: t.topics?.icon,
              })) || [],
            attendees: {
              count: 0, // Would need additional query for accurate count
              profiles: [],
            },
            created_by: event.users
              ? {
                  id: event.users.id,
                  name:
                    `${event.users.first_name || ""} ${
                      event.users.last_name || ""
                    }`.trim() ||
                    event.users.username ||
                    "Unknown",
                  username: event.users.username || "",
                  avatar_url: event.users.avatar_url,
                }
              : undefined,
          };
        });

      setJoinedEvents(transformedEvents);
    } catch (error) {
      console.error("Error loading joined events:", error);
      setJoinedEvents([]);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadEvents();
    setRefreshing(false);
  };

  const handleEventPress = (event: Event) => {
    setSelectedEvent(event);
    setIsSheetOpen(true);
  };

  const handleCloseSheet = () => {
    setSelectedEvent(null);
    setIsSheetOpen(false);
    
  };

  const getCurrentEvents = () => {
    return activeTab === "Created" ? createdEvents : joinedEvents;
  };

  const renderEvent = ({ item: event }: { item: Event }) => (
    <View style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
      <SocialEventCard
        data={event as any}
        onDataSelect={(data) => {
          handleEventPress(event);
        }}
        onShowDetails={() => {
          handleEventPress(event);
        }}
        treatAsEvent={true}
      />
    </View>
  );

  const currentEvents = getCurrentEvents();

  // If no onScroll prop provided, render as regular views to avoid VirtualizedList nesting
  if (!onScroll) {
    return (
      <View style={{ backgroundColor: theme.colors.card, paddingBottom: 20 }}>
        {/* Sub-tabs */}
        <View
          style={{
            flexDirection: "row",
            backgroundColor: theme.colors.card,
            borderBottomWidth: 1,
            borderBottomColor: theme.colors.border,
            paddingHorizontal: 16,
          }}
        >
          {(["Created", "Joined"] as EventTab[]).map((tab) => (
            <Pressable
              key={tab}
              onPress={() => setActiveTab(tab)}
              style={{
                flex: 1,
                paddingVertical: 12,
                borderBottomWidth: activeTab === tab ? 2 : 0,
                borderBottomColor: theme.colors.primary,
              }}
            >
              <Text
                style={{
                  textAlign: "center",
                  fontSize: 14,
                  fontWeight: activeTab === tab ? "600" : "400",
                  color:
                    activeTab === tab
                      ? theme.colors.primary
                      : theme.colors.text + "80",
                }}
              >
                {tab}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Events List as regular views */}
        {loading && currentEvents.length === 0 ? (
          <View
            style={{
              justifyContent: "center",
              alignItems: "center",
              paddingVertical: 40,
            }}
          >
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text
              style={{
                marginTop: 16,
                color: theme.colors.text + "80",
              }}
            >
              Loading events...
            </Text>
          </View>
        ) : currentEvents.length === 0 ? (
          <View
            style={{
              justifyContent: "center",
              alignItems: "center",
              paddingVertical: 60,
              paddingHorizontal: 32,
            }}
          >
            <Text
              style={{
                fontSize: 18,
                fontWeight: "600",
                color: theme.colors.text,
                textAlign: "center",
              }}
            >
              {activeTab === "Created"
                ? "No events created"
                : "No events joined"}
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
              {activeTab === "Created"
                ? isCurrentUser
                  ? "Create your first event to bring people together"
                  : "This user hasn't created any events yet"
                : isCurrentUser
                ? "Join events to see them here"
                : "This user hasn't joined any events yet"}
            </Text>
          </View>
        ) : (
          <View style={{ paddingTop: 16, paddingBottom: 80 }}>
            {currentEvents.slice(0, 10).map((event) => (
              <View key={event.id}>{renderEvent({ item: event })}</View>
            ))}
            {currentEvents.length > 10 && (
              <View style={{ padding: 16, alignItems: "center" }}>
                <Text style={{ color: theme.colors.text + "80", fontSize: 14 }}>
                  Showing first 10 events
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Event Details Sheet */}
        {selectedEvent && (
          <UnifiedDetailsSheet
            data={selectedEvent as any}
            isOpen={isSheetOpen}
            onClose={handleCloseSheet}
            nearbyData={[]}
            onDataSelect={(data) => {
              handleCloseSheet();
            }}
            onShowControler={() => {}}
            isEvent={true}
          />
        )}
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.card }}>
      {/* Sub-tabs */}
      <View
        style={{
          flexDirection: "row",
          backgroundColor: theme.colors.card,
          borderBottomWidth: 1,
          borderBottomColor: theme.colors.border,
          paddingHorizontal: 16,
        }}
      >
        {(["Created", "Joined"] as EventTab[]).map((tab) => (
          <Pressable
            key={tab}
            onPress={() => setActiveTab(tab)}
            style={{
              flex: 1,
              paddingVertical: 12,
              borderBottomWidth: activeTab === tab ? 2 : 0,
              borderBottomColor: theme.colors.primary,
            }}
          >
            <Text
              style={{
                textAlign: "center",
                fontSize: 14,
                fontWeight: activeTab === tab ? "600" : "400",
                color:
                  activeTab === tab
                    ? theme.colors.primary
                    : theme.colors.text + "80",
              }}
            >
              {tab}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Events List */}
      {loading && currentEvents.length === 0 ? (
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            paddingVertical: 40,
          }}
        >
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text
            style={{
              marginTop: 16,
              color: theme.colors.text + "80",
            }}
          >
            Loading events...
          </Text>
        </View>
      ) : (
        <FlatList
          data={currentEvents}
          renderItem={renderEvent}
          keyExtractor={(item) => item.id}
          refreshControl={
            refreshControl || (
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={[theme.colors.primary]}
                tintColor={theme.colors.primary}
              />
            )
          }
          onScroll={onScroll}
          scrollEventThrottle={16}
          bounces={true}
          overScrollMode="always"
          ListEmptyComponent={
            !loading ? (
              <View
                style={{
                  flex: 1,
                  justifyContent: "center",
                  alignItems: "center",
                  paddingVertical: 60,
                  paddingHorizontal: 32,
                }}
              >
                <Text
                  style={{
                    fontSize: 18,
                    fontWeight: "600",
                    color: theme.colors.text,
                    textAlign: "center",
                  }}
                >
                  {activeTab === "Created"
                    ? "No events created"
                    : "No events joined"}
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
                  {activeTab === "Created"
                    ? isCurrentUser
                      ? "Create your first event to bring people together"
                      : "This user hasn't created any events yet"
                    : isCurrentUser
                    ? "Join events to see them here"
                    : "This user hasn't joined any events yet"}
                </Text>
              </View>
            ) : null
          }
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingTop: 16,
            paddingBottom: 20,
          }}
        />
      )}

      {/* Event Details Sheet */}
      {selectedEvent && (
        <UnifiedDetailsSheet
          data={selectedEvent as any}
          isOpen={isSheetOpen}
          onClose={handleCloseSheet}
          nearbyData={[]} // Empty for now, could add similar events later
          onDataSelect={(data) => {
            // Handle if user selects a different event from within the sheet
            handleCloseSheet();
          }}
          onShowControler={() => {
            // Handle controller show
          }}
          isEvent={true}
        />
      )}
    </View>
  );
}
