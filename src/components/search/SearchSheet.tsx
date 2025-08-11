import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  Dimensions,
  Text,
} from "react-native";
import { router } from "expo-router";
import { Sheet } from "../ui/sheet";
import { OptimizedImage } from "../ui/optimized-image";
import { supabase } from "../../lib/supabase";
import { Input } from "../ui/input";
import { Calendar, MapPin, Users, Search, X } from "lucide-react-native";
import { debounce } from "lodash";
import { useAuth } from "../../lib/auth";
import { useTheme } from "../ThemeProvider";
import { useUser } from "~/src/lib/UserProvider";
import * as Location from "expo-location";

// Types
interface User {
  id: string;
  username: string;
  first_name: string;
  last_name: string;
  avatar_url?: string;
}

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
  user?: User;
  is_ticketmaster?: boolean;
  external_url?: string;
}

interface MapLocation {
  id: string;
  name: string;
  description?: string;
  location: any;
  external_url?: string;
  image_urls?: any;
  operation_hours?: any;
  address?: string;
  type?: string;
  category?: string;
  category_id?: string;
  place_id?: string;
}

interface SearchResults {
  users: User[];
  events: MapEvent[];
  locations: MapLocation[];
}

interface SearchSheetProps {
  isOpen: boolean;
  onClose: () => void;
  eventsList?: MapEvent[];
  locationsList?: MapLocation[];
  onShowControler?: () => void;
}

type TabType = "events" | "users" | "places";

export function SearchSheet({
  isOpen,
  onClose,
  eventsList = [],
  locationsList = [],
  onShowControler,
}: SearchSheetProps) {
  const { theme } = useTheme();
  const { session } = useAuth();
  const { user, userlocation } = useUser();
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState<SearchResults>({
    events: [],
    users: [],
    locations: [],
  });
  const [ticketmasterEvents, setTicketmasterEvents] = useState<MapEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>("users");
  const [isExpanded, setIsExpanded] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const searchInputRef = useRef<TextInput>(null);

  // Tab configuration
  const tabs = [
    { id: "users" as TabType, label: "People", icon: Users },
    { id: "events" as TabType, label: "Events", icon: Calendar },
    { id: "places" as TabType, label: "Places", icon: MapPin },
  ];

  // Reset on open/close
  useEffect(() => {
    if (isOpen) {
      setSearchQuery("");
      setResults({ events: [], users: [], locations: [] });
      setTicketmasterEvents([]);
      setActiveTab("users");
      setIsExpanded(false);
      setIsFocused(false);
      // Focus search input after a brief delay
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Auto-expand when user starts searching
  useEffect(() => {
    if (searchQuery.length >= 1) {
      // Delay the expansion slightly to avoid layout conflicts
      const timer = setTimeout(() => {
        setIsExpanded(true);
      }, 150);
      return () => clearTimeout(timer);
    } else {
      setIsExpanded(false);
    }
  }, [searchQuery.length]);

  // Search function with both RPC and Ticketmaster
  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.length < 2) {
      setResults({ events: [], users: [], locations: [] });
      setTicketmasterEvents([]);
      return;
    }

    setIsLoading(true);
    try {
      // Get user's location coordinates based on their preference
      const userCoordinates = await getUserLocationCoordinates();

      if (!userCoordinates) {
        console.log("No user coordinates available, search limited");
        setResults({ events: [], users: [], locations: [] });
        setTicketmasterEvents([]);
        setIsLoading(false);
        // Note: We could show a message to the user here about needing location access
        return;
      }

      console.log("Searching with user coordinates:", userCoordinates);

      // Call RPC for Supabase data + Ticketmaster search API in parallel
      const [rpcResults, ticketmasterResults] = await Promise.all([
        // Try location-aware search first, fall back to regular search
        searchSupabaseData(query, userCoordinates),
        // Ticketmaster API search with user location
        searchTicketmaster(query, userCoordinates),
      ]);

      // Handle RPC results
      if (rpcResults.error) {
        console.error("Search RPC error:", rpcResults.error);
      }

      const searchResults = rpcResults.data || {
        users: [],
        events: [],
        locations: [],
      };

      // Process events to match MapEvent interface
      const processedEvents: MapEvent[] = (searchResults.events || []).map(
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
          user: event.creator_username
            ? {
                id: event.created_by,
                username: event.creator_username,
                first_name: event.creator_first_name,
                last_name: event.creator_last_name,
                avatar_url: event.creator_avatar,
              }
            : undefined,
        })
      );

      // Process locations to match MapLocation interface
      const processedLocations: MapLocation[] = (
        searchResults.locations || []
      ).map((location: any) => ({
        id: location.id,
        name: location.name,
        description: location.description,
        location: location.location,
        external_url: location.external_url,
        image_urls: location.image_urls,
        operation_hours: location.operation_hours,
        address: location.address,
        type: location.type,
        category: location.category,
        category_id: location.category_id,
        place_id: location.place_id,
      }));

      setResults({
        events: processedEvents,
        users: searchResults.users || [],
        locations: processedLocations,
      });

      setTicketmasterEvents(ticketmasterResults);

      console.log("Search complete:", {
        supabase_events: processedEvents.length,
        ticketmaster_events: ticketmasterResults.length,
        users: searchResults.users?.length || 0,
        locations: processedLocations.length,
      });
    } catch (error) {
      console.error("Search error:", error);
      setResults({ events: [], users: [], locations: [] });
      setTicketmasterEvents([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Search Supabase data with location filtering
  const searchSupabaseData = async (
    query: string,
    coordinates: { latitude: number; longitude: number }
  ) => {
    try {
      // Try location-aware search first if it exists
      let rpcResult = await supabase.rpc("search_comprehensive_with_location", {
        search_query: query,
        user_latitude: coordinates.latitude,
        user_longitude: coordinates.longitude,
        radius_km: 50, // 50km radius like the map
        result_limit: 15,
      });

      // If location-aware RPC doesn't exist or errors for any reason, fall back
      if (rpcResult.error) {
        console.log(
          "Location-aware search failed; falling back:",
          rpcResult.error
        );
        rpcResult = await supabase.rpc("search_comprehensive", {
          search_query: query,
          result_limit: 15,
        });
      }

      return rpcResult;
    } catch (error) {
      console.error("Supabase search error:", error);
      // Fall back to regular search
      return await supabase.rpc("search_comprehensive", {
        search_query: query,
        result_limit: 15,
      });
    }
  };

  // Search Ticketmaster events via backend - fetch events in user's location area
  const searchTicketmaster = async (
    query: string,
    coordinates: { latitude: number; longitude: number }
  ): Promise<MapEvent[]> => {
    try {
      if (!session?.access_token) return [];

      // Fetch nearby events via backend and filter by query on client
      const response = await fetch(
        `${process.env.BACKEND_MAP_URL}/api/events/nearby?lat=${
          coordinates.latitude
        }&lng=${coordinates.longitude}&radius=${50_000}&limit_count=500`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      if (!response.ok) {
        console.error("Events fetch failed:", response.status);
        return [];
      }

      const data = await response.json();
      const allEvents = Array.isArray(data) ? data : data?.events || [];

      // Filter for Ticketmaster events that match search query
      const ticketmasterEvents = allEvents
        .filter((event: any) => {
          // Must be a Ticketmaster event
          const isTicketmaster = event.is_ticketmaster === true;
          if (!isTicketmaster) return false;

          // Make search more flexible - check multiple fields
          const searchLower = query.toLowerCase();
          const matchesSearch =
            event.name?.toLowerCase().includes(searchLower) ||
            event.description?.toLowerCase().includes(searchLower) ||
            event.venue_name?.toLowerCase().includes(searchLower) ||
            event.address?.toLowerCase().includes(searchLower) ||
            event.city?.toLowerCase().includes(searchLower) ||
            event.type?.toLowerCase().includes(searchLower);

          return matchesSearch;
        })
        .map((event: any) => ({
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
          is_private: event.is_private || false,
          type: event.type || "event",
          location_id: event.location_id,
          category_id: event.category_id,
          is_ticketmaster: true, // Ensure it's marked as Ticketmaster
          external_url: event.external_url,
          user: event.user,
        }));

      console.log(`Total events fetched: ${allEvents.length}`);
      console.log(
        `Ticketmaster events found: ${
          allEvents.filter((e: any) => e.is_ticketmaster).length
        }`
      );
      console.log(
        `Matching Ticketmaster events for "${query}": ${ticketmasterEvents.length}`
      );
      console.log("Searched Ticketmaster events near:", coordinates);

      return ticketmasterEvents;
    } catch (error) {
      console.error("Ticketmaster search error:", error);
      return [];
    }
  };

  // Get user's location coordinates based on their preference
  const getUserLocationCoordinates = async () => {
    try {
      // First check if user has location preferences
      if (!user) return null;

      let coordinates = null;

      // If user prefers orbit mode and has saved coordinates
      if (user.event_location_preference === 1 && userlocation) {
        coordinates = {
          // Prefer orbit coordinates; do not fall back to 0 which causes NaNs
          latitude:
            userlocation.latitude != null
              ? parseFloat(userlocation.latitude)
              : NaN,
          longitude:
            userlocation.longitude != null
              ? parseFloat(userlocation.longitude)
              : NaN,
        };
        console.log("Using orbit mode coordinates:", coordinates);
        if (
          Number.isFinite(coordinates.latitude) &&
          Number.isFinite(coordinates.longitude)
        ) {
          return coordinates;
        }
      }

      // If user prefers current location or orbit coordinates not available
      if (user.event_location_preference === 0 || !coordinates) {
        try {
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status === "granted") {
            const location = await Location.getCurrentPositionAsync({});
            coordinates = {
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
            };
            console.log("Using current device location:", coordinates);
            return coordinates;
          }
        } catch (locationError) {
          console.log("Could not get current location:", locationError);
        }
      }

      return coordinates;
    } catch (error) {
      console.error("Error getting user location:", error);
      return null;
    }
  };

  const debouncedSearch = useCallback(debounce(handleSearch, 300), [
    session,
    user,
    userlocation,
  ]);

  // Handle result selection
  const handleSelectResult = (
    result: any,
    type: "user" | "event" | "location"
  ) => {
    // Call controller first if it exists
    if (onShowControler && typeof onShowControler === "function") {
      try {
        onShowControler();
      } catch (error) {
        console.log("onShowControler error:", error);
      }
    }

    onClose();

    switch (type) {
      case "user":
        router.push(`/(app)/profile/${result.id}`); // Use ID instead of username
        break;
      case "event":
        if (result.is_ticketmaster) {
          // Navigate to map with Ticketmaster event
          router.push({
            pathname: "/(app)/(map)",
            params: {
              eventId: result.id,
              source: "ticketmaster",
              latitude:
                result.location?.coordinates?.[1] || result.location?.latitude,
              longitude:
                result.location?.coordinates?.[0] || result.location?.longitude,
              name: result.name,
              venue_name: result.venue_name || "",
              description: result.description || "",
              type: result.type || "event",
            },
          });
        } else {
          // Navigate to map with Supabase event
          router.push({
            pathname: "/(app)/(map)",
            params: {
              eventId: result.id,
              latitude:
                result.location?.coordinates?.[1] || result.location?.latitude,
              longitude:
                result.location?.coordinates?.[0] || result.location?.longitude,
              name: result.name,
              venue_name: result.venue_name || "",
              description: result.description || "",
              type: result.type || "event",
            },
          });
        }
        break;
      case "location":
        router.push({
          pathname: "/(app)/(map)",
          params: {
            locationId: result.id,
            latitude:
              result.location?.coordinates?.[1] || result.location?.latitude,
            longitude:
              result.location?.coordinates?.[0] || result.location?.longitude,
            name: result.name,
            description: result.description || "",
            type: result.type || "location",
            address: result.address || "",
          },
        });
        break;
    }
  };

  // Get filtered results based on active tab
  const getFilteredResults = () => {
    const allEvents = [...results.events, ...ticketmasterEvents];

    switch (activeTab) {
      case "events":
        return { events: allEvents, users: [], locations: [] };
      case "users":
        return { events: [], users: results.users, locations: [] };
      case "places":
        return { events: [], users: [], locations: results.locations };
      default:
        return { events: [], users: results.users, locations: [] };
    }
  };

  const filteredResults = getFilteredResults();
  const totalResults =
    filteredResults.events.length +
    filteredResults.users.length +
    filteredResults.locations.length;
  const hasResults = totalResults > 0;
  const shouldShowEmptyState =
    searchQuery.length >= 2 && !isLoading && !hasResults;

  // Result count for tabs
  const getTabCount = (tabId: TabType) => {
    const allEvents = [...results.events, ...ticketmasterEvents];
    switch (tabId) {
      case "events":
        return allEvents.length;
      case "users":
        return results.users.length;
      case "places":
        return results.locations.length;
      default:
        return 0;
    }
  };

  return (
    <Sheet isOpen={isOpen} onClose={onClose} fullScreen={isExpanded}>
      <View
        style={{
          backgroundColor: theme.colors.background,
          flex: 1,
          paddingTop: isExpanded ? 50 : 20,
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
            backgroundColor: theme.colors.background,
          }}
        >
          <View style={{ flex: 1 }}>
            <Input
              ref={searchInputRef}
              placeholder={
                user?.event_location_preference === 1 && userlocation
                  ? `Search in ${userlocation.city || "your orbit location"}...`
                  : "Search events, places, and people..."
              }
              value={searchQuery}
              onChangeText={(text: string) => {
                setSearchQuery(text);
                debouncedSearch(text);
              }}
              onFocus={() => setIsFocused(true)}
              onBlur={() => {
                // Only set focus to false if there's no search query
                // This prevents premature collapse while user is still searching
                if (searchQuery.length === 0) {
                  setIsFocused(false);
                }
              }}
              placeholderTextColor={theme.colors.text + "80"}
              style={{
                backgroundColor: theme.colors.card,
                borderColor: theme.colors.border,
                color: theme.colors.text,
              }}
            />
          </View>
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => {
                setSearchQuery("");
                setResults({ events: [], users: [], locations: [] });
                setTicketmasterEvents([]);
                setIsFocused(false);
                searchInputRef.current?.blur();
              }}
              style={{
                marginLeft: 12,
                padding: 8,
                borderRadius: 20,
                backgroundColor: theme.colors.card,
              }}
            >
              <X size={20} color={theme.colors.text} />
            </TouchableOpacity>
          )}
          {/* Expand/Collapse Button */}
          {searchQuery.length > 1 && (
            <TouchableOpacity
              onPress={() => {
                setIsExpanded(!isExpanded);
              }}
              style={{
                marginLeft: 8,
                padding: 8,
                borderRadius: 20,
                backgroundColor: theme.colors.primary,
              }}
            >
              <Search size={20} color="white" />
            </TouchableOpacity>
          )}
        </View>

        {/* Tabs */}
        {searchQuery.length > 1 && (
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
                    paddingVertical: 6,
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
                    size={14}
                    color={isActive ? "white" : theme.colors.text}
                  />
                  <Text
                    style={{
                      marginLeft: 4,
                      color: isActive ? "white" : theme.colors.text,
                      fontWeight: isActive ? "600" : "400",
                      fontSize: 12,
                    }}
                  >
                    {tab.label}
                  </Text>
                  {count > 0 && (
                    <View
                      style={{
                        marginLeft: 4,
                        paddingHorizontal: 4,
                        paddingVertical: 1,
                        borderRadius: 8,
                        backgroundColor: isActive
                          ? "rgba(255,255,255,0.2)"
                          : theme.colors.primary,
                        minWidth: 18,
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
        )}

        {/* Content */}
        <View style={{ flex: 1 }}>
          {/* Empty State - No Search */}
          {searchQuery.length < 2 && (
            <View
              style={{
                flex: 1,
                justifyContent: "center",
                alignItems: "center",
                paddingHorizontal: 32,
              }}
            >
              <Search size={48} color={theme.colors.text + "40"} />
              <Text
                style={{
                  marginTop: 16,
                  fontSize: 18,
                  fontWeight: "600",
                  color: theme.colors.text,
                  textAlign: "center",
                }}
              >
                Discover Events & Places
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
                {user?.event_location_preference === 1 && userlocation
                  ? `Search for events, places, and people in ${userlocation.city}, ${userlocation.state}. Find concerts, restaurants, parks, and connect with friends.`
                  : "Search for events, places, and people in your area. Find concerts, restaurants, parks, and connect with friends."}
              </Text>
            </View>
          )}

          {/* Loading State */}
          {isLoading && searchQuery.length >= 2 && (
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
                Searching...
              </Text>
            </View>
          )}

          {/* No Results State */}
          {shouldShowEmptyState && (
            <View
              style={{
                flex: 1,
                justifyContent: "center",
                alignItems: "center",
                paddingHorizontal: 32,
              }}
            >
              <Search size={48} color={theme.colors.text + "40"} />
              <Text
                style={{
                  marginTop: 16,
                  fontSize: 18,
                  fontWeight: "600",
                  color: theme.colors.text,
                  textAlign: "center",
                }}
              >
                No Results Found
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
                Try searching with different keywords or check your spelling.
              </Text>
            </View>
          )}

          {/* Results */}
          {hasResults && searchQuery.length >= 2 && !isLoading && (
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={{ paddingBottom: 20 }}
              showsVerticalScrollIndicator={false}
            >
              {/* Events Section */}
              {filteredResults.events.length > 0 && (
                <View style={{ paddingHorizontal: 20, marginTop: 16 }}>
                  {filteredResults.events.map((event, index) => (
                    <TouchableOpacity
                      key={`${event.id}-${index}`}
                      onPress={() => handleSelectResult(event, "event")}
                      style={{
                        flexDirection: "row",
                        padding: 12,
                        marginBottom: 8,
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
                        <OptimizedImage
                          uri={event.image_urls?.[0] || ""}
                          width={56}
                          height={56}
                          quality={80}
                          style={{
                            width: 56,
                            height: 56,
                            borderRadius: 8,
                          }}
                          resizeMode="cover"
                          fallbackUri="https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=56&q=80"
                        />
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
                            {new Date(
                              event.start_datetime
                            ).toLocaleDateString()}
                          </Text>
                        )}
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* Locations Section */}
              {filteredResults.locations.length > 0 && (
                <View style={{ paddingHorizontal: 20, marginTop: 16 }}>
                  {filteredResults.locations.map((location, index) => (
                    <TouchableOpacity
                      key={`${location.id}-${index}`}
                      onPress={() => handleSelectResult(location, "location")}
                      style={{
                        flexDirection: "row",
                        padding: 12,
                        marginBottom: 8,
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
                        {location.image_urls &&
                        location.image_urls.length > 0 ? (
                          <Image
                            source={{ uri: location.image_urls[0] }}
                            style={{
                              width: 56,
                              height: 56,
                              borderRadius: 8,
                            }}
                            resizeMode="cover"
                          />
                        ) : (
                          <MapPin size={24} color={theme.colors.primary} />
                        )}
                      </View>
                      <View style={{ flex: 1, justifyContent: "center" }}>
                        <Text
                          style={{
                            fontSize: 16,
                            fontWeight: "600",
                            color: theme.colors.text,
                          }}
                          numberOfLines={1}
                        >
                          {location.name}
                        </Text>
                        <Text
                          style={{
                            fontSize: 14,
                            color: theme.colors.text + "80",
                            marginTop: 2,
                          }}
                          numberOfLines={1}
                        >
                          {location.address}
                        </Text>
                        {location.type && (
                          <Text
                            style={{
                              fontSize: 12,
                              color: theme.colors.text + "60",
                              marginTop: 2,
                            }}
                          >
                            {location.type}
                          </Text>
                        )}
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* Users Section */}
              {filteredResults.users.length > 0 && (
                <View style={{ paddingHorizontal: 20, marginTop: 16 }}>
                  {filteredResults.users.map((user, index) => (
                    <TouchableOpacity
                      key={`${user.id}-${index}`}
                      onPress={() => handleSelectResult(user, "user")}
                      style={{
                        flexDirection: "row",
                        padding: 12,
                        marginBottom: 8,
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
                          borderRadius: 28,
                          backgroundColor: theme.colors.primary + "20",
                          justifyContent: "center",
                          alignItems: "center",
                          marginRight: 12,
                        }}
                      >
                        {user.avatar_url ? (
                          <Image
                            source={{ uri: user.avatar_url }}
                            style={{
                              width: 56,
                              height: 56,
                              borderRadius: 28,
                            }}
                            resizeMode="cover"
                          />
                        ) : (
                          <Users size={24} color={theme.colors.primary} />
                        )}
                      </View>
                      <View style={{ flex: 1, justifyContent: "center" }}>
                        <Text
                          style={{
                            fontSize: 16,
                            fontWeight: "600",
                            color: theme.colors.text,
                          }}
                          numberOfLines={1}
                        >
                          {user.first_name} {user.last_name}
                        </Text>
                        <Text
                          style={{
                            fontSize: 14,
                            color: theme.colors.text + "80",
                            marginTop: 2,
                          }}
                          numberOfLines={1}
                        >
                          @{user.username}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </ScrollView>
          )}
        </View>
      </View>
    </Sheet>
  );
}
