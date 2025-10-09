import { router } from "expo-router";
import { Calendar, MapPin, Search, Users, X } from "lucide-react-native";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { useUser } from "~/src/lib/UserProvider";
import { useRealtimeSearch } from "../../hooks/useSearch";
import { useAuth } from "../../lib/auth";
import { EventResult, LocationResult, searchService, UserResult } from "../../services/searchService";
import { useTheme } from "../ThemeProvider";
import { Input } from "../ui/input";
import { OptimizedImage } from "../ui/optimized-image";
import { Sheet } from "../ui/sheet";

interface SearchSheetProps {
  isOpen: boolean;
  onClose: () => void;
  eventsList?: EventResult[];
  locationsList?: LocationResult[];
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
  const [activeTab, setActiveTab] = useState<TabType>("users");
  const [isExpanded, setIsExpanded] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const searchInputRef = useRef<TextInput>(null);

  // Get user location coordinates for search
  const userLocation = useMemo(() => {
    if (!user) return undefined;
    
    let coordinates = undefined;
    
    // First try: If user prefers orbit mode and has saved coordinates
    if (user.event_location_preference === 1 && userlocation) {
      coordinates = {
        latitude: userlocation.latitude != null ? parseFloat(userlocation.latitude) : NaN,
        longitude: userlocation.longitude != null ? parseFloat(userlocation.longitude) : NaN,
      };
      
      if (Number.isFinite(coordinates.latitude) && Number.isFinite(coordinates.longitude)) {
        return coordinates;
      }
    }
    
    return undefined;
  }, [user, userlocation]);

  // Update search service auth token
  useEffect(() => {
    if (session?.access_token) {
      searchService.setAuthToken(session.access_token);
    }
  }, [session?.access_token]);

  // Use the new search hook
  const { 
    results, 
    isLoading, 
    error, 
    totalResults, 
    hasResults 
  } = useRealtimeSearch(searchQuery, userLocation, {
    radius: 100, // 100km radius (matches web app)
    limit: 10, // 10 results per category (matches web app)
    debounceMs: 300,
    enabled: isOpen,
  });

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

  // Handle search query change
  const handleSearchQueryChange = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);



  // Handle result selection
  const handleSelectResult = (
    result: UserResult | EventResult | LocationResult,
    type: "user" | "event" | "location"
  ) => {
    console.log("🔍 [SearchSheet] handleSelectResult called:", { type, result });

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
        console.log("🔍 [SearchSheet] Navigating to user profile:", result.id);
        router.push(`/(app)/profile/${result.id}`);
        break;
      case "event":
        const event = result as EventResult;
        // Check if we have valid coordinates
        const eventLat = event.location?.coordinates?.[1];
        const eventLng = event.location?.coordinates?.[0];
        
        if (!eventLat || !eventLng || isNaN(eventLat) || isNaN(eventLng)) {
          return;
        }

        router.push({
          pathname: "/(app)/(map)",
          params: {
            eventId: event.id,
            source: event.is_ticketmaster ? "ticketmaster" : "supabase",
            latitude: eventLat.toString(),
            longitude: eventLng.toString(),
            name: event.name,
            venue_name: event.venue_name || "",
            description: event.description || "",
            type: event.type || "event",
            created_by: typeof event.created_by === 'string' ? event.created_by : JSON.stringify(event.created_by || {}),
          },
        });
        break;
      case "location":
        const location = result as LocationResult;
        console.log("🔍 [SearchSheet] Navigating to location:", {
          id: location.id,
          name: location.name,
          coordinates: location.location?.coordinates,
        });

        // Check if we have valid coordinates
        const locationLat = location.location?.coordinates?.[1];
        const locationLng = location.location?.coordinates?.[0];

        if (!locationLat || !locationLng) {
          console.error(
            "🔍 [SearchSheet] Location has no coordinates, cannot navigate:",
            location.name
          );
          return;
        }

        router.push({
          pathname: "/(app)/(map)",
          params: {
            locationId: location.id,
            latitude: locationLat,
            longitude: locationLng,
            name: location.name,
            description: location.description || "",
            type: location.type || "location",
            address: location.address || "",
          },
        });
        break;
    }
  };

  // Get filtered results based on active tab
  const getFilteredResults = () => {
    if (!results) {
      return { events: [], users: [], locations: [] };
    }

    switch (activeTab) {
      case "events":
        return { events: results.events, users: [], locations: [] };
      case "users":
        return { events: [], users: results.users, locations: [] };
      case "places":
        return { events: [], users: [], locations: results.locations };
      default:
        return { events: [], users: results.users, locations: [] };
    }
  };

  const filteredResults = getFilteredResults();
  const shouldShowEmptyState =
    searchQuery.length >= 2 && !isLoading && !hasResults;

  // Result count for tabs
  const getTabCount = (tabId: TabType) => {
    if (!results) return 0;
    
    switch (tabId) {
      case "events":
        return results.events.length;
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
              onChangeText={handleSearchQueryChange}
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
                          {user.name}
                        </Text>
                        {user.username && (
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
                        )}
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
