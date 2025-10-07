import { LinearGradient } from "expo-linear-gradient";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import { Calendar, MapPin, Star, Users, X } from "lucide-react-native";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  DeviceEventEmitter,
  Dimensions,
  Image,
  ScrollView,
  TouchableOpacity,
  View,
  PanResponder,
} from "react-native";
import { MapEvent, MapLocation } from "~/hooks/useUnifiedMapData";
import { useUpdateEvents } from "~/hooks/useUpdateEvents";
import { useAuth } from "~/src/lib/auth";
import { formatDate, formatTime } from "~/src/lib/date";
import { Text } from "../ui/text";
import { UnifiedDetailsSheet } from "./UnifiedDetailsSheet";

type UnifiedData = MapEvent | MapLocation;

interface UnifiedCardProps {
  data: UnifiedData;
  onClose: () => void;
  onDataSelect: (data: UnifiedData) => void;
  nearbyData: UnifiedData[];
  onShowDetails: () => void;
  treatAsEvent?: boolean; // Explicit prop to override type detection
}

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// Type guards
const isEvent = (data: UnifiedData): data is MapEvent => {
  // Use explicit type field first, then fall back to field detection
  if (data.type) {
    return data.type === "user_created" || data.type === "event";
  }

  // Fallback: check for event fields but exclude Google API locations
  if (data.type === "googleApi") {
    return false; // Google API items with event fields are still locations
  }

  return (
    "start_datetime" in data || "venue_name" in data || "attendees" in data
  );
};

const isLocation = (data: UnifiedData): data is MapLocation => {
  return !isEvent(data);
};

// Helper function to calculate distance between two coordinates
const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 3959; // Earth's radius in miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in miles
};

// Helper functions for enhanced features
const getItemIcon = (data: UnifiedData) => {
  if (isEvent(data)) {
    const categories = (data as MapEvent).categories || [];
    const categoryName = categories[0]?.name?.toLowerCase() || "";
    const name = (data as MapEvent).name?.toLowerCase() || "";

    if (categoryName.includes("party") || name.includes("party")) return "🎉";
    if (categoryName.includes("music") || name.includes("concert")) return "🎵";
    if (categoryName.includes("food") || name.includes("dinner")) return "🍽️";
    if (categoryName.includes("sport") || name.includes("game")) return "⚽";
    if (categoryName.includes("art") || categoryName.includes("culture"))
      return "🎨";
    if (categoryName.includes("business") || name.includes("meeting"))
      return "💼";
    if (categoryName.includes("education") || name.includes("workshop"))
      return "📚";
    if (categoryName.includes("health") || name.includes("fitness"))
      return "💪";
    if (categoryName.includes("tech") || name.includes("coding")) return "💻";
    if (name.includes("birthday")) return "🎂";
    if (name.includes("wedding")) return "💒";
    if (name.includes("graduation")) return "🎓";
    return "✨";
  } else {
    const type = (data as MapLocation).type?.toLowerCase() || "";
    switch (type) {
      case "beach":
        return "🏖️";
      case "park":
        return "🌳";
      case "club":
        return "🎵";
      case "restaurant":
        return "🍽️";
      case "bar":
        return "🍺";
      case "gym":
        return "💪";
      case "museum":
        return "🏛️";
      case "theater":
        return "🎭";
      case "mall":
        return "🛍️";
      case "hotel":
        return "🏨";
      default:
        return "📍";
    }
  }
};

const getThemeColors = (data: UnifiedData) => {
  let categoryName = "";

  if (isEvent(data)) {
    categoryName =
      (data as MapEvent).categories?.[0]?.name?.toLowerCase() || "";
  } else {
    categoryName =
      (data as MapLocation).category?.name?.toLowerCase() ||
      (data as MapLocation).type?.toLowerCase() ||
      "";
  }

  switch (true) {
    case categoryName.includes("party") ||
      categoryName.includes("nightlife") ||
      categoryName.includes("entertainment"):
      return {
        primary: "#8B5CF6",
        secondary: "#EC4899",
        gradientColors: ["rgba(0, 0, 0, 0.2)", "rgba(0, 0, 0, 0.7)"] as const,
      };
    case categoryName.includes("music") || categoryName.includes("concert"):
      return {
        primary: "#EF4444",
        secondary: "#DC2626",
        gradientColors: ["rgba(0, 0, 0, 0.2)", "rgba(0, 0, 0, 0.7)"] as const,
      };
    case categoryName.includes("food") || categoryName.includes("dining"):
      return {
        primary: "#F59E0B",
        secondary: "#D97706",
        gradientColors: ["rgba(0, 0, 0, 0.2)", "rgba(0, 0, 0, 0.7)"] as const,
      };
    case categoryName.includes("sport") ||
      categoryName.includes("fitness") ||
      categoryName.includes("outdoor") ||
      categoryName.includes("recreation"):
      return {
        primary: "#10B981",
        secondary: "#059669",
        gradientColors: ["rgba(0, 0, 0, 0.2)", "rgba(0, 0, 0, 0.7)"] as const,
      };
    case categoryName.includes("business") ||
      categoryName.includes("networking"):
      return {
        primary: "#8B5CF6",
        secondary: "#A78BFA",
        gradientColors: ["rgba(0, 0, 0, 0.2)", "rgba(0, 0, 0, 0.7)"] as const,
      };
    case categoryName.includes("art") || categoryName.includes("culture"):
      return {
        primary: "#3B82F6",
        secondary: "#1D4ED8",
        gradientColors: ["rgba(0, 0, 0, 0.2)", "rgba(0, 0, 0, 0.7)"] as const,
      };
    default:
      return {
        primary: "#8B5CF6",
        secondary: "#A78BFA",
        gradientColors: ["rgba(0, 0, 0, 0.2)", "rgba(0, 0, 0, 0.7)"] as const,
      };
  }
};

const getContextActions = (
  data: UnifiedData,
  detailData?: any,
  treatAsEvent?: boolean
) => {
  if (treatAsEvent) {
    const categories =
      (detailData as MapEvent)?.categories ||
      (data as MapEvent).categories ||
      [];
    const categoryName = categories[0]?.name?.toLowerCase() || "";
    const name =
      (detailData as MapEvent)?.name || (data as MapEvent).name || "";
    const joinStatus = (detailData as any)?.join_status || false;

    const isTicketmaster =
      (data as any)?.is_ticketmaster || (detailData as any)?.is_ticketmaster;

    // Determine event source for proper button logic
    const eventSource = (detailData as any)?.source || (data as any)?.source;
    const isUserEvent = eventSource === "user";
    const isGoogleApiEvent =
      eventSource &&
      (eventSource === "googleapi" ||
        eventSource === "google" ||
        eventSource === "api" ||
        eventSource.includes("google") ||
        eventSource.includes("api"));

    // For user events: Join Activity -> Create Orbit
    if (isUserEvent) {
      return [
        { label: "View Details", action: "details", icon: "ℹ️" },
        {
          label: joinStatus ? "Create Orbit" : "Join Activity",
          action: joinStatus ? "create" : "join",
          icon: joinStatus ? "💬" : "✨",
        },
      ];
    }

    // For Ticketmaster events: Buy Tickets
    if (isTicketmaster) {
      return [
        { label: "View Details", action: "details", icon: "ℹ️" },
        {
          label: "Buy Tickets",
          action: "join", // This will be handled as ticket purchase
          icon: "🎫",
        },
      ];
    }

    // For Google API events: Create Activity Here
    if (isGoogleApiEvent) {
      return [
        { label: "View Details", action: "details", icon: "ℹ️" },
        {
          label: joinStatus ? "Create Orbit" : "Join Activity",
          action: joinStatus ? "create" : "join",
          icon: joinStatus ? "💬" : "✨",
        },
      ];
    }

    // Fallback for other event types
    return [
      { label: "View Details", action: "details", icon: "ℹ️" },
      {
        label: joinStatus ? "Create Orbit" : "Join Activity",
        action: joinStatus ? "create" : "join",
        icon: joinStatus ? "💬" : "✨",
      },
    ];
  } else {
    // For ALL locations, show simple consistent actions like LocationDetailsSheet
    return [
      { label: "Learn More", action: "details", icon: "ℹ️" },
      { label: "Create Activity", action: "create", icon: "✨" },
    ];
  }
};

export const UnifiedCard = React.memo(
  ({
    data,
    onClose,
    onDataSelect,
    nearbyData,
    onShowDetails,
    treatAsEvent = true, // Default to true to maintain existing behavior
  }: UnifiedCardProps) => {
    // Debug logging for UnifiedCard data
    console.log("🎴 [UnifiedCard] Component rendered with data:", {
      dataId: data?.id,
      dataName: data?.name,
      dataType: data?.type,
      treatAsEvent,
      timestamp: Date.now(),
    });
    const { UpdateEventStatus, fetchEventDetail, fetchLocationDetail } =
      useUpdateEvents();
    const router = useRouter();

    const { session } = useAuth();
    const [showDetails, setShowDetails] = useState(false);
    const currentIndex = nearbyData.findIndex((item) => item.id === data.id);
    const [loading, setLoading] = useState(false); // Start with false since we have data
    const [detailData, setDetailData] = useState<any>(data); // Initialize with data immediately
    const [userLocation, setUserLocation] = useState<{
      latitude: number;
      longitude: number;
    } | null>(null);

    // Helper: Find nearest item in nearbyData (excluding current)
    const findNearestItem = () => {
      const current = detailData || data;
      if (!current?.location?.coordinates) return null;
      const [currLng, currLat] = current.location.coordinates;
      let minDist = Infinity;
      let nearest = null;
      for (const item of nearbyData) {
        if (item.id === current.id || !item?.location?.coordinates) continue;
        const [lng, lat] = item.location.coordinates;
        // Use Haversine formula for geographic distance
        const dist = calculateDistance(currLat, currLng, lat, lng);
        if (dist < minDist) {
          minDist = dist;
          nearest = item;
        }
      }
      return nearest;
    };

    // PanResponder for swipe gesture
    const panResponder = React.useMemo(
      () =>
        PanResponder.create({
          onMoveShouldSetPanResponder: (_evt, gestureState) => {
            // Only respond to horizontal swipes
            return (
              Math.abs(gestureState.dx) > 30 && Math.abs(gestureState.dy) < 20
            );
          },
          onPanResponderRelease: (_evt, gestureState) => {
            if (Math.abs(gestureState.dx) > 40) {
              // On swipe left or right, open nearest pin
              const nearest = findNearestItem();
              if (nearest) {
                onDataSelect(nearest);
              }
            }
          },
        }),
      [nearbyData, detailData, data]
    );
    // Get theme colors and context based on data - ULTRA OPTIMIZED
    const theme = useMemo(
      () => getThemeColors(detailData || data),
      [detailData?.id, data.id] // Only depend on IDs, not full objects
    );
    const itemIcon = useMemo(
      () => getItemIcon(detailData || data),
      [detailData?.id, data.id] // Only depend on IDs, not full objects
    );
    const contextActions = useMemo(
      () => getContextActions(data, detailData, treatAsEvent),
      [data.id, treatAsEvent, detailData] // Only depend on IDs, not full objects
    );

    useEffect(() => {
      const eventName = isEvent(data)
        ? "refreshEventDetail"
        : "refreshlocationDetail";
      DeviceEventEmitter.addListener(eventName, (valueEvent) => {
        // No longer needed - data is already complete
      });
    }, []);

    // REMOVED: Location fetching to make card render instantly
    // Location will be fetched in background if needed

    const getCurrentLocation = async () => {
      try {
        // Use cached location first for faster response
        const lastKnownLocation = await Location.getLastKnownPositionAsync({
          maxAge: 60000, // 1 minute cache
        });

        if (lastKnownLocation) {
          setUserLocation({
            latitude: lastKnownLocation.coords.latitude,
            longitude: lastKnownLocation.coords.longitude,
          });
          return;
        }

        // Only request permission if we don't have cached location
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          console.log("Location permission denied");
          return;
        }

        // Use faster location options
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced, // Faster than high accuracy
        });
        setUserLocation({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
      } catch (error) {
        console.error("Error getting location:", error);
      }
    };

    // REMOVED: Gesture handling and animations for better performance

    const handleContextAction = (action: string) => {
      switch (action) {
        case "join":
          // Check if this is a Ticketmaster event for ticket purchase
          const isTicketmaster =
            (detailData as any)?.is_ticketmaster ||
            (data as any)?.is_ticketmaster;
          if (isTicketmaster) {
            // For Ticketmaster events: "Buy Tickets" -> opens ticket purchase
            handleTicketPurchase();
          } else {
            // For user events: Join button -> turns into "Create Orbit"
            if (treatAsEvent && !(detailData as any)?.join_status) {
              hitUpdateEventApi();
            }
          }
          break;
        case "details":
          handleShowDetails();
          break;
        case "create":
          if (detailData?.source === "user" && detailData?.join_status) {
            // For EVENTS: "Create Orbit" -> creates group chat
            handleCreateOrbit();
          } else {
            // For LOCATIONS: "Create Activity" -> goes to create activity page
            handleCreateEvent();
          }
          break;
        case "weather":
        case "menu":
        case "events":
          handleShowDetails();
          break;
        default:
          handleShowDetails();
      }
    };

    const hitUpdateEventApi = async () => {
      console.log(treatAsEvent);
      if (!treatAsEvent) return;

      setLoading(true);
      try {
        console.log("detailData", detailData);
        console.log("data", data);
        // COMMENTED OUT: UpdateEventStatus - needs update for unified API
        await UpdateEventStatus(data as any);
        const updatedData = { ...(detailData || data), join_status: true };
        setDetailData(updatedData as UnifiedData);
        setTimeout(() => {
          setLoading(false);
          // No longer needed - data is already complete
        }, 2000);
      } catch (error) {
        console.error("Error updating event status:", error);
        setLoading(false);
      }
    };

    const handleCreateOrbit = () => {
      if (!treatAsEvent) return;
      router.push({
        pathname: "/new",
        params: {
          eventId: detailData?.id || data.id,
          eventName: detailData?.name || data.name,
        },
      });
    };

    const handleTicketPurchase = () => {
      const currentData = detailData || data;
      if (!currentData.external_url) return;
      onClose();

      router.push({
        pathname: "/(app)/(webview)",
        params: {
          external_url: currentData.external_url,
          eventSelected: JSON.stringify(currentData),
        },
      });
    };

    const handleCreateEvent = () => {
      const locationData = detailData || data;
      console.log(locationData);
      const simplifiedCategory = {
        id: (locationData as any).category?.id || "",
        name: (locationData as any).category?.name || "",
      };

      console.log(
        "🔍 [UnifiedCard] Simplified category for router:",
        simplifiedCategory
      );

      router.push({
        pathname: "/(app)/(create)",
        params: {
          locationId: locationData.id,
          locationType: (locationData as any).type || "",
          latitude:
            (locationData as any).location?.coordinates?.[1]?.toString() || "",
          longitude:
            (locationData as any).location?.coordinates?.[0]?.toString() || "",
          address: (locationData as any).address || "",
          categoryId: simplifiedCategory.id,
          categoryName: simplifiedCategory.name,
        },
      });
    };

    const handleShowDetails = () => {
      if (onDataSelect) {
        onDataSelect(data);
      }
      onShowDetails();
    };

    // Get display values based on data type - INSTANT RENDERING
    const displayValues = useMemo(() => {
      const detail = detailData || data;
      console.log(detail);
      if (treatAsEvent) {
        return {
          title: detail.name,
          subtitle: detail.venue_name,
          description: detail.description
            ? `${detail.description.slice(0, 80)}...`
            : null,
          imageUrl: detail.image_urls?.[0],
          categoryName: detail.categories?.[0]?.name || "Activity",
          categoryTags: detail.categories?.slice(1, 4) || [],
          dateTime: {
            date: formatDate(detail.start_datetime),
            time: formatTime(detail.start_datetime),
          },
          stats: [
            {
              icon: <Users size={12} color="white" />,
              label: `${detail.attendees?.count || 0} going`,
            },

            // Only show venue if it exists and is different from title
            ...(detail.venue_name && detail.venue_name !== detail.name
              ? [
                  {
                    icon: <MapPin size={12} color="white" />,
                    label:
                      detail.venue_name.length > 20
                        ? `${detail.venue_name.slice(0, 20)}...`
                        : detail.venue_name,
                  },
                ]
              : []),
          ],
        };
      } else {
        const locationDetail = detail as MapLocation;
        // Show default distance label for instant rendering
        return {
          title: locationDetail.name,
          subtitle: locationDetail.type || "Location",
          description: locationDetail.description
            ? `${locationDetail.description.slice(0, 80)}...`
            : null,
          imageUrl: locationDetail.image_urls?.[0],
          categoryName:
            locationDetail.category?.name || locationDetail.type || "Location",
          categoryTags: locationDetail.category?.prompts?.slice(0, 3) || [],
          dateTime: null,
          stats: [
            // Only show distance if it's meaningful (> 0.1 km or 100 meters)
            ...((locationDetail as any).distance_meters &&
            (locationDetail as any).distance_meters > 100
              ? [
                  {
                    icon: <MapPin size={12} color="white" />,
                    label: `${(
                      (locationDetail as any).distance_meters / 1000
                    ).toFixed(1)} km`,
                  },
                ]
              : (locationDetail as any).distance_km &&
                (locationDetail as any).distance_km > 0.1
              ? [
                  {
                    icon: <MapPin size={12} color="white" />,
                    label: `${(locationDetail as any).distance_km.toFixed(
                      1
                    )} km`,
                  },
                ]
              : []),
          ],
        };
      }
    }, [detailData, data, treatAsEvent]); // Removed userLocation dependencies
    return (
      <>
        <View
          {...panResponder.panHandlers}
          style={{
            position: "absolute",
            left: 16,
            right: 16,
            bottom: 50,
            marginBottom: 56,
            zIndex: 1000,
          }}
        >
          <View className="overflow-hidden rounded-2xl">
            {/* Background Image */}
            {displayValues.imageUrl && (
              <Image
                source={{ uri: displayValues.imageUrl }}
                className="absolute w-full h-full"
                resizeMode="cover"
                blurRadius={isEvent(data) ? 8 : 10}
              />
            )}

            {/* Dynamic Gradient Overlay */}
            <LinearGradient
              colors={theme.gradientColors}
              locations={[0.3, 1]}
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                top: 0,
                bottom: 0,
              }}
            />

            {/* Close Button */}
            <TouchableOpacity
              className="absolute top-2 right-2 z-10 justify-center items-center w-8 h-8 rounded-full bg-black/30"
              onPress={onClose}
            >
              <X size={20} color="white" />
            </TouchableOpacity>

            {/* Content */}
            <View className="p-4">
              {/* Header with Icon and Category */}
              <View className="flex-row items-center mb-3">
                <Text className="mr-2 text-2xl">{itemIcon}</Text>
                <View
                  style={{ backgroundColor: theme.primary }}
                  className="px-3 py-1 rounded-full"
                >
                  <Text className="text-xs font-semibold text-white">
                    {displayValues.categoryName}
                  </Text>
                </View>

                {/* Rating Badge - Only for locations with rating */}
                {!treatAsEvent &&
                  (detailData || data) &&
                  (detailData || (data as any)).rating && (
                    <View className="flex-row items-center px-2 py-1 ml-2 bg-amber-500 rounded-full">
                      <Star size={10} color="white" />
                      <Text className="ml-1 text-xs font-semibold text-white">
                        {((detailData || data) as any).rating.toFixed(1)}
                      </Text>
                    </View>
                  )}
              </View>

              {/* Title */}
              <Text className="mb-2 text-xl font-bold text-white">
                {displayValues.title}
              </Text>

              {/* Date/Time for Activities */}
              {displayValues.dateTime && (
                <View className="flex-row items-center mb-2">
                  <Calendar size={12} color="white" />
                  <Text className="ml-1 text-sm text-white/90">
                    {displayValues.dateTime.date} •{" "}
                    {displayValues.dateTime.time}
                  </Text>
                </View>
              )}

              {/* Description */}
              {displayValues.description && (
                <Text className="mb-2 text-sm text-white/80" numberOfLines={2}>
                  {displayValues.description}
                </Text>
              )}

              {/* Stats Row */}
              <View className="flex-row items-center mb-3">
                {displayValues.stats.map((stat, index) => (
                  <View key={index} className="flex-row items-center mr-4">
                    {stat.icon}
                    <Text className="ml-1 text-xs text-white/90">
                      {stat.label}
                    </Text>
                  </View>
                ))}
              </View>

              {/* Category Tags */}
              {displayValues.categoryTags.length > 0 && (
                <View className="mb-3">
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View className="flex-row">
                      {displayValues.categoryTags.map(
                        (tag: any, index: number) => (
                          <View
                            key={tag.id || tag.name || index}
                            className="px-2 py-1 mr-2 rounded-full bg-white/15"
                          >
                            <Text className="text-xs text-white">
                              {tag.name}
                            </Text>
                          </View>
                        )
                      )}
                    </View>
                  </ScrollView>
                </View>
              )}

              {/* Context-Aware Action Buttons */}
              <View className="flex-row gap-2">
                {contextActions.map((action, index) =>
                  (action.action === "join" || action.action === "create") &&
                  !session ? null : (
                    <TouchableOpacity
                      key={index}
                      className="flex-1 py-2 rounded-full"
                      style={{
                        backgroundColor:
                          index === 0 ? "rgba(255,255,255,0.9)" : "#3B82F6", // Solid blue for action buttons
                      }}
                      onPress={() => handleContextAction(action.action)}
                    >
                      <View className="flex-row justify-center items-center">
                        <Text
                          className={`font-bold text-base ${
                            index === 0 ? "text-black" : "text-white"
                          }`}
                        >
                          {action.label}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  )
                )}
              </View>
            </View>
          </View>
        </View>

        {loading && (
          <View className="absolute top-0 right-0 bottom-0 left-0 justify-center items-center bg-black/20">
            <ActivityIndicator size="large" color="#ffffff" />
          </View>
        )}

        {showDetails && (
          <UnifiedDetailsSheet
            data={data as any}
            isOpen={showDetails}
            onClose={() => setShowDetails(false)}
            nearbyData={nearbyData as any}
            onDataSelect={onDataSelect as any}
            onShowControler={() => {}}
            isEvent={treatAsEvent}
          />
        )}
      </>
    );
  },
  (prevProps, nextProps) => {
    // Custom comparison to ensure re-render when data changes
    return (
      prevProps.data?.id === nextProps.data?.id &&
      prevProps.data?.join_status === nextProps.data?.join_status &&
      prevProps.treatAsEvent === nextProps.treatAsEvent &&
      prevProps.nearbyData?.length === nextProps.nearbyData?.length
    );
  }
);
