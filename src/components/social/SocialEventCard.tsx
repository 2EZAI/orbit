import React, { useState, useEffect } from "react";
import {
  View,
  TouchableOpacity,
  Image,
  Dimensions,
  ActivityIndicator,
  DeviceEventEmitter,
} from "react-native";
import { Text } from "../ui/text";
import { LinearGradient } from "expo-linear-gradient";
import { MapEvent, MapLocation } from "~/hooks/useUnifiedMapData";
import { formatTime, formatDate } from "~/src/lib/date";
import { Users, MapPin, Calendar, Star } from "lucide-react-native";

import { useRouter } from "expo-router";
import { supabase } from "~/src/lib/supabase";
import { useUser } from "~/src/lib/UserProvider";
import { useUpdateEvents } from "~/hooks/useUpdateEvents";
import { useTheme } from "~/src/components/ThemeProvider";

type UnifiedData = MapEvent | MapLocation;

interface SocialEventCardProps {
  data: UnifiedData;
  onDataSelect?: (data: UnifiedData) => void;
  onShowDetails?: () => void;
  treatAsEvent?: boolean;
  isLocation?: boolean;
}

// Type guards
const isEvent = (data: UnifiedData): data is MapEvent => {
  return (
    "start_datetime" in data || "venue_name" in data || "attendees" in data
  );
};

// Helper function to convert internal category names to user-friendly ones
const getUserFriendlyCategory = (categoryName?: string): string => {
  if (!categoryName) return "Event";

  const name = categoryName.toLowerCase();

  // Handle internal API categories
  if (name.includes("googleapi") || name.includes("api")) return "Popular";
  if (name.includes("restaurant") || name.includes("food"))
    return "Food & Dining";
  if (name.includes("entertainment") || name.includes("amusement"))
    return "Entertainment";
  if (name.includes("night_club") || name.includes("bar")) return "Nightlife";
  if (name.includes("tourist_attraction") || name.includes("museum"))
    return "Attraction";
  if (name.includes("park") || name.includes("recreation")) return "Outdoor";
  if (name.includes("lodging") || name.includes("hotel")) return "Lodging";
  if (name.includes("shopping") || name.includes("store")) return "Shopping";
  if (name.includes("health") || name.includes("gym"))
    return "Health & Fitness";
  if (name.includes("education") || name.includes("school")) return "Education";
  if (name.includes("religious") || name.includes("church")) return "Religious";
  if (name.includes("transportation") || name.includes("transit"))
    return "Transport";
  if (name.includes("automotive") || name.includes("gas_station"))
    return "Automotive";
  if (name.includes("finance") || name.includes("bank")) return "Finance";
  if (name.includes("government") || name.includes("city_hall"))
    return "Government";

  // If it's already user-friendly, capitalize it properly
  return (
    categoryName.charAt(0).toUpperCase() + categoryName.slice(1).toLowerCase()
  );
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
        { label: "Event Info", action: "details", icon: "🎵" },
        {
          label: joinStatus ? "Create Orbit" : "Get Tickets",
          action: joinStatus ? "create" : "join",
          icon: joinStatus ? "💬" : "🎫",
        },
      ];
    }
    if (categoryName.includes("business") || name.includes("meeting")) {
      return [
        { label: "Details", action: "details", icon: "💼" },
        {
          label: joinStatus ? "Create Orbit" : "Register",
          action: joinStatus ? "create" : "join",
          icon: joinStatus ? "💬" : "📝",
        },
      ];
    }
    return [
      { label: "Learn More", action: "details", icon: "ℹ️" },
      {
        label: joinStatus ? "Create Orbit" : "Join Event",
        action: joinStatus ? "create" : "join",
        icon: joinStatus ? "💬" : "✨",
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

export function SocialEventCard({
  data,
  onDataSelect,
  onShowDetails,
  treatAsEvent = true,
}: SocialEventCardProps) {
  console.log("SocialEventCard data:", data);
  const { UpdateEventStatus, fetchEventDetail, fetchLocationDetail } =
    useUpdateEvents();
  const router = useRouter();
  const { user } = useUser();
  const { theme, isDarkMode } = useTheme();
  const [loading, setLoading] = useState(false);
  const [detailData, setDetailData] = useState<any>();

  // Get theme colors and context based on data
  const themeColors = getThemeColors(detailData || data);
  const itemIcon = getItemIcon(detailData || data);
  const contextActions = getContextActions(data, detailData, treatAsEvent);

  useEffect(() => {
    const eventName = isEvent(data)
      ? "refreshEventDetail"
      : "refreshlocationDetail";
    DeviceEventEmitter.addListener(eventName, (valueEvent) => {
      hitDetailApi();
    });
  }, []);

  useEffect(() => {
    setDetailData(data);
    hitDetailApi();
  }, [data]);

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
        hitDetailApi(); // This will update the join_status and change button to "Create Orbit"
      }, 2000);
    } catch (error) {
      console.error("Error updating event status:", error);
      setLoading(false);
    }
  };

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
                source: (data as any).is_ticketmaster
                  ? "ticketmaster"
                  : "supabase",
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
      }
    } catch (error) {
      console.error("Error fetching details:", error);
    } finally {
      setLoading(false);
    }
  };

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

    router.push({
      pathname: "/(app)/(create)",
      params: {
        locationId: locationData.id,
        locationType: (locationData as any).type || "",
        latitude: (locationData as any).location?.latitude?.toString() || "",
        longitude: (locationData as any).location?.longitude?.toString() || "",
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
    if (onShowDetails) {
      onShowDetails();
    }
  };

  // Get display values based on data type
  const getDisplayValues = () => {
    const detail = detailData || data;

    if (treatAsEvent) {
      return {
        title: detail.name,
        subtitle: detail.venue_name,
        description: detail.description
          ? `${detail.description.slice(0, 80)}...`
          : null,
        imageUrl: detail.image_urls?.[0],
        categoryName:
          getUserFriendlyCategory(detail.categories?.[0]?.name) || "Event",
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
          getUserFriendlyCategory(
            locationDetail.category?.name || locationDetail.type
          ) || "Location",
        categoryTags: locationDetail.category?.prompts?.slice(0, 3) || [],
        dateTime: null,
        stats: [
          {
            icon: <MapPin size={12} color="white" />,
            label: locationDetail.address || "No address",
          },
          // Only show rating if it actually exists
          ...((locationDetail as any).rating
            ? [
                {
                  icon: <Star size={12} color="white" />,
                  label: `${(locationDetail as any).rating}★`,
                },
              ]
            : []),
        ],
      };
    }
  };

  const displayValues = getDisplayValues();

  return (
    <View
      className="overflow-hidden rounded-xl border"
      style={{
        backgroundColor: theme.colors.card,
        borderColor: theme.colors.border,
        height: 160, // Make it more compact
      }}
    >
      {/* Background Image with Blur */}
      {displayValues.imageUrl && (
        <Image
          source={{ uri: displayValues.imageUrl }}
          className="absolute w-full h-full"
          resizeMode="cover"
          blurRadius={8} // Add blur effect
          style={{ opacity: 0.6 }}
        />
      )}

      {/* Dark Gradient Overlay for better text readability */}
      <LinearGradient
        colors={["rgba(0, 0, 0, 0.3)", "rgba(0, 0, 0, 0.8)"]}
        locations={[0, 1]}
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 0,
          bottom: 0,
        }}
      />

      {/* Content - More compact */}
      <View className="flex-1 justify-between p-3">
        {/* Header with Icon and Category */}
        <View className="flex-row justify-between items-center">
          {!treatAsEvent && (
            <View className="flex-row items-center">
              <Text className="mr-2 text-lg">{itemIcon}</Text>

              <View
                style={{ backgroundColor: themeColors.primary }}
                className="px-2 py-1 rounded-full"
              >
                <Text className="text-xs font-semibold text-white">
                  {displayValues.categoryName}
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Main Content */}
        <View className="flex-1 justify-center">
          {/* Title */}
          <Text className="mb-1 text-lg font-bold text-white" numberOfLines={1}>
            {displayValues.title}
          </Text>

          {/* Date/Time for Events */}
          {displayValues.dateTime && (
            <View className="flex-row items-center mb-1">
              <Calendar size={12} color="white" />
              <Text className="ml-1 text-sm text-white/90">
                {displayValues.dateTime.date} • {displayValues.dateTime.time}
              </Text>
            </View>
          )}

          {/* Stats Row - Compact */}
          <View className="flex-row items-center">
            {displayValues.stats.slice(0, 1).map((stat, index) => (
              <View key={index} className="flex-row items-center mr-3">
                {stat.icon}
                <Text className="ml-1 text-xs text-white/90">{stat.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Single Action Button */}
        <TouchableOpacity
          className="py-2 mt-2 rounded-full"
          style={{ backgroundColor: theme.colors.primary }}
          onPress={() => handleContextAction("details")}
        >
          <Text className="text-sm font-semibold text-center text-white">
            {treatAsEvent ? "View Location" : "View Event"}
          </Text>
        </TouchableOpacity>
      </View>

      {loading && (
        <View className="absolute top-0 right-0 bottom-0 left-0 justify-center items-center bg-black/20">
          <ActivityIndicator size="large" color="#ffffff" />
        </View>
      )}
    </View>
  );
}
