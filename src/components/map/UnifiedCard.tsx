import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  TouchableOpacity,
  Image,
  Dimensions,
  ActivityIndicator,
  DeviceEventEmitter,
  ScrollView,
} from "react-native";
import { Text } from "../ui/text";
import { LinearGradient } from "expo-linear-gradient";
import { MapEvent, MapLocation } from "~/hooks/useUnifiedMapData";
import { formatTime, formatDate } from "~/src/lib/date";
import {
  X,
  Info,
  Users,
  MessageCircle,
  Navigation,
  MapPin,
  Clock,
  Calendar,
  Star,
} from "lucide-react-native";
import { Icon } from "react-native-elements";
import { Button } from "../ui/button";
import { useRouter } from "expo-router";
import { supabase } from "~/src/lib/supabase";
import { useUser } from "~/src/lib/UserProvider";
import * as Location from "expo-location";
import { UnifiedDetailsSheet } from "./UnifiedDetailsSheet";
import { GestureDetector, Gesture } from "react-native-gesture-handler";
import { useUpdateEvents } from "~/hooks/useUpdateEvents";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from "react-native-reanimated";

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
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.3;

// Type guards
const isEvent = (data: UnifiedData): data is MapEvent => {
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
      (detailData as any)?.is_ticketmaster || (data as any)?.is_ticketmaster;

    if (categoryName.includes("food") || name.includes("dinner")) {
      return [
        { label: "View Details", action: "details", icon: "ℹ️" },
        {
          label: joinStatus ? "Create Orbit" : "Join Event",
          action: joinStatus ? "create" : "join",
          icon: joinStatus ? "💬" : "🍽️",
        },
      ];
    }
    if (categoryName.includes("music") || name.includes("concert")) {
      return [
        { label: "View Details", action: "details", icon: "🎵" },
        {
          label: joinStatus
            ? "Create Orbit"
            : isTicketmaster
            ? "Buy Tickets"
            : "Join Event",
          action: joinStatus ? "create" : "join",
          icon: joinStatus ? "💬" : isTicketmaster ? "🎫" : "✨",
        },
      ];
    }
    if (categoryName.includes("business") || name.includes("meeting")) {
      return [
        { label: "View Details", action: "details", icon: "💼" },
        {
          label: joinStatus ? "Create Orbit" : "Join Event",
          action: joinStatus ? "create" : "join",
          icon: joinStatus ? "💬" : "📝",
        },
      ];
    }
    return [
      { label: "View Details", action: "details", icon: "ℹ️" },
      {
        label: joinStatus
          ? "Create Orbit"
          : isTicketmaster
          ? "Buy Tickets"
          : "Join Event",
        action: joinStatus ? "create" : "join",
        icon: joinStatus ? "💬" : isTicketmaster ? "🎫" : "✨",
      },
    ];
  } else {
    // For ALL locations, show simple consistent actions like LocationDetailsSheet
    return [
      { label: "Learn More", action: "details", icon: "ℹ️" },
      { label: "Create Event", action: "create", icon: "✨" },
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
    const { UpdateEventStatus, fetchEventDetail, fetchLocationDetail } =
      useUpdateEvents();
    const router = useRouter();
    const { user } = useUser();
    const [showDetails, setShowDetails] = useState(false);
    const translateX = useSharedValue(0);
    const currentIndex = nearbyData.findIndex((item) => item.id === data.id);
    const [loading, setLoading] = useState(false); // Start with false since we have data
    const [detailData, setDetailData] = useState<any>();
    const [userLocation, setUserLocation] = useState<{
      latitude: number;
      longitude: number;
    } | null>(null);

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
      [data.id, detailData?.id, treatAsEvent] // Only depend on IDs, not full objects
    );

    useEffect(() => {
      const eventName = isEvent(data)
        ? "refreshEventDetail"
        : "refreshlocationDetail";
      DeviceEventEmitter.addListener(eventName, (valueEvent) => {
        // No longer needed - data is already complete
      });
    }, []);

    useEffect(() => {
      // Only update if data actually changed to prevent unnecessary re-renders
      if (detailData?.id !== data.id) {
        setDetailData(data); // Use data directly, no API call needed
        getCurrentLocation();
      }
    }, [data.id, detailData?.id]);

    const getCurrentLocation = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          console.log("Location permission denied");
          return;
        }

        const location = await Location.getCurrentPositionAsync({});
        setUserLocation({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
      } catch (error) {
        console.error("Error getting location:", error);
      }
    };

    const handleSwipeComplete = (direction: "left" | "right") => {
      "worklet";
      const newIndex =
        direction === "left" ? currentIndex + 1 : currentIndex - 1;

      if (newIndex >= 0 && newIndex < nearbyData.length) {
        runOnJS(onDataSelect)(nearbyData[newIndex]);
      }
      translateX.value = withSpring(0);
    };

    const gesture = Gesture.Pan()
      .onUpdate((e) => {
        translateX.value = e.translationX;
      })
      .onEnd((e) => {
        if (Math.abs(e.translationX) > SWIPE_THRESHOLD) {
          if (e.translationX > 0 && currentIndex > 0) {
            handleSwipeComplete("right");
          } else if (
            e.translationX < 0 &&
            currentIndex < nearbyData.length - 1
          ) {
            handleSwipeComplete("left");
          } else {
            translateX.value = withSpring(0);
          }
        } else {
          translateX.value = withSpring(0);
        }
      });

    const animatedStyle = useAnimatedStyle(() => ({
      transform: [{ translateX: translateX.value }],
    }));

    const handleContextAction = (action: string) => {
      switch (action) {
        case "join":
          // For EVENTS: Join button -> turns into "Create Orbit"
          if (treatAsEvent && !(detailData as any)?.join_status) {
            hitUpdateEventApi();
          }
          break;
        case "details":
          handleShowDetails();
          break;
        case "create":
          if (treatAsEvent) {
            // For EVENTS: "Create Orbit" -> creates group chat
            handleCreateOrbit();
          } else {
            // For LOCATIONS: "Create Event" -> goes to create event page
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
      if (!treatAsEvent) return;

      setLoading(true);
      try {
        // COMMENTED OUT: UpdateEventStatus - needs update for unified API
        // await UpdateEventStatus(data);
        setTimeout(() => {
          setLoading(false);
          // No longer needed - data is already complete
        }, 2000);
      } catch (error) {
        console.error("Error updating event status:", error);
        setLoading(false);
      }
    };

    // COMMENTED OUT: Old detail API calls - now using unified API data directly
    /*
  const hitDetailApi = async () => {
    try {
      if (treatAsEvent) {
        await fetchEventDetail(data);

        // Manually fetch the event details to get the updated data with join_status
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (session?.access_token) {
          const response = await fetch(
            `${process.env.BACKEND_MAP_URL}/api/events/${data.id}`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${session.access_token}`,
              },
              body: JSON.stringify({
                source: (() => {
                  // Better source detection logic
                  let source = "supabase"; // default to supabase
                  
                  // Check multiple possible indicators for Ticketmaster events
                  if ((data as any).is_ticketmaster === true || 
                      (data as any).is_ticketmaster === "true" ||
                      (typeof (data as any).source === "string" && (data as any).source.includes("ticket")) ||
                      (data as any).source === "ticketmaster" ||
                      (data.id && typeof data.id === "string" && data.id.length > 20) || // Ticketmaster IDs are typically longer
                      (data as any).external_url?.includes("ticketmaster")) {
                    source = "ticketmaster";
                  }
                  
                  console.log(`[UnifiedCard] Event ID: ${data.id}, is_ticketmaster: ${(data as any).is_ticketmaster}, source: ${(data as any).source}, detected source: ${source}`);
                  return source;
                })(),
              }),
            }
          );

          if (response.ok) {
            const eventDetails = await response.json();
            setDetailData(eventDetails);
          }
        }
      } else {
        await fetchLocationDetail(data as MapLocation);
        // Location detail is updated internally by the hook
      }
    } catch (error) {
      console.error("Error fetching details:", error);
    } finally {
      setLoading(false);
    }
  };
  */

    // REMOVED: hitDetailApi - no longer needed since we have complete data

    const handleCreateOrbit = () => {
      if (!treatAsEvent) return;

      // For EVENTS: Navigate to chat creation with event details
      router.push({
        pathname: "/new",
        params: {
          eventId: detailData?.id || data.id,
          eventName: detailData?.name || data.name,
        },
      });
    };

    const handleCreateEvent = () => {
      if (treatAsEvent) return;

      // For LOCATIONS: Navigate to create event page with location details prefilled
      const locationData = detailData || data;

      // Simplify category to just essential info for URL params
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
          latitude: (locationData as any).location?.latitude?.toString() || "",
          longitude:
            (locationData as any).location?.longitude?.toString() || "",
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

    // Get display values based on data type - ULTRA OPTIMIZED
    const displayValues = useMemo(() => {
      const detail = detailData || data;

      if (treatAsEvent) {
        return {
          title: detail.name,
          subtitle: detail.venue_name,
          description: detail.description
            ? `${detail.description.slice(0, 80)}...`
            : null,
          imageUrl: detail.image_urls?.[0],
          categoryName: detail.categories?.[0]?.name || "Event",
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
            {
              icon: <MapPin size={12} color="white" />,
              label:
                userLocation && locationDetail.location
                  ? `${Math.round(
                      calculateDistance(
                        userLocation.latitude,
                        userLocation.longitude,
                        locationDetail.location.latitude,
                        locationDetail.location.longitude
                      )
                    )} mi away`
                  : "Calculating...",
            },
            // Rating is now shown as a badge in the header, so removed from stats
          ],
        };
      }
    }, [
      detailData?.id,
      data.id,
      treatAsEvent,
      userLocation?.latitude,
      userLocation?.longitude,
    ]); // Only depend on IDs and location coords

    return (
      <>
        <GestureDetector gesture={gesture}>
          <Animated.View
            style={[
              {
                position: "absolute",
                left: 16,
                right: 16,
                bottom: 50,
                marginBottom: 56,
                zIndex: 1000,
              },
              animatedStyle,
            ]}
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

                {/* Date/Time for Events */}
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
                  <Text
                    className="mb-2 text-sm text-white/80"
                    numberOfLines={2}
                  >
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
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                    >
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
                  {contextActions.map((action, index) => (
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
                  ))}
                </View>
              </View>
            </View>
          </Animated.View>
        </GestureDetector>

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
  }
);
