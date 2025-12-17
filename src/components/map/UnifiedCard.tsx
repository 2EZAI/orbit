import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { Calendar, Flag, MapPin, Star, Users, X } from "lucide-react-native";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  DeviceEventEmitter,
  Image,
  PanResponder,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { Dimensions } from "react-native";
import Toast from "react-native-toast-message";
import type { Channel } from "stream-chat";
import { useEventJoinStatus } from "~/hooks/useEventJoinStatus";
import { useFlagging } from "~/hooks/useFlagging";
import { useJoinEvent } from "~/hooks/useJoinEvent";
import { IProposal } from "~/hooks/useProposals";
import { MapEvent, MapLocation } from "~/hooks/useUnifiedMapData";
import { useAuth } from "~/src/lib/auth";
import { formatDate, formatTime } from "~/src/lib/date";
import { haptics } from "~/src/lib/haptics";
import FlagContentModal from "../modals/FlagContentModal";
import { ChatSelectionModal } from "../social/ChatSelectionModal";
import { Text } from "../ui/text";
import { UnifiedDetailsSheet } from "./UnifiedDetailsSheet";
import UnifiedShareSheet from "./UnifiedShareSheet";

type UnifiedData = MapEvent | MapLocation;

interface UnifiedCardProps {
  data: UnifiedData;
  onClose: () => void;
  onDataSelect: (data: UnifiedData) => void;
  nearbyData: UnifiedData[];
  onShowDetails: () => void;
  treatAsEvent?: boolean; // Explicit prop to override type detection
  mapCenter?: [number, number] | null; // Current map center for location change detection
}

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
  treatAsEvent?: boolean,
  isJoined?: boolean,
  isCreator?: boolean
) => {
  if (treatAsEvent) {
    const categories =
      (detailData as MapEvent)?.categories ||
      (data as MapEvent).categories ||
      [];
    const categoryName = categories[0]?.name?.toLowerCase() || "";
    const name =
      (detailData as MapEvent)?.name || (data as MapEvent).name || "";
    // Use passed isJoined parameter instead of local join_status
    const joinStatus = isJoined || false;

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

    // For user events: Edit for creators, Join/Leave for others
    if (isUserEvent) {
      if (isCreator) {
        return [
          { label: "View Details", action: "details", icon: "ℹ️" },
          { label: "Edit Event", action: "edit", icon: "✏️" },
        ];
      } else {
        return [
          { label: "View Details", action: "details", icon: "ℹ️" },
          {
            label: joinStatus ? "Create Orbit" : "Join Activity",
            action: joinStatus ? "create" : "join",
            icon: joinStatus ? "💬" : "✨",
          },
        ];
      }
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

    // For Google API events: Edit for creators, Join/Leave for others
    if (isGoogleApiEvent) {
      if (isCreator) {
        return [
          { label: "View Details", action: "details", icon: "ℹ️" },
          { label: "Edit Event", action: "edit", icon: "✏️" },
        ];
      } else {
        return [
          { label: "View Details", action: "details", icon: "ℹ️" },
          {
            label: joinStatus ? "Create Orbit" : "Join Activity",
            action: joinStatus ? "create" : "join",
            icon: joinStatus ? "💬" : "✨",
          },
        ];
      }
    }

    // Fallback for other event types: Edit for creators, Join/Leave for others
    if (isCreator) {
      return [
        { label: "View Details", action: "details", icon: "ℹ️" },
        { label: "Edit Event", action: "edit", icon: "✏️" },
      ];
    } else {
      return [
        { label: "View Details", action: "details", icon: "ℹ️" },
        {
          label: joinStatus ? "Create Orbit" : "Join Activity",
          action: joinStatus ? "create" : "join",
          icon: joinStatus ? "💬" : "✨",
        },
      ];
    }
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
    mapCenter,
  }: UnifiedCardProps) => {

    const router = useRouter();

    const { session } = useAuth();
    const [showDetails, setShowDetails] = useState(false);
    const [flagOpen, setFlagOpen] = useState({
      open: false,
      eventId: "",
      locationId: "",
    });

    const [detailData, setDetailData] = useState<any>(data); // Initialize with data immediately

    const [shareData, setShareData] = useState<{
      data: UnifiedData;
      isEventType: boolean;
    } | null>(null);
    const [chatShareSelection, setChatShareSelection] = useState<{
      proposal: IProposal | null;
      show: boolean;
      event: UnifiedData | null;
      isEventType: boolean;
    }>({
      proposal: null,
      show: false,
      event: null,
      isEventType: false,
    });

    // Track recently visited items to prevent cycling back
    const visitedItemsRef = useRef<string[]>([]);
    const swipeCountRef = useRef(0);
    const lastSelectedIdRef = useRef<string | null>(null);
    
    // Animation values for glass shimmer effect
    const shimmerPosition = useRef(new Animated.Value(-1)).current;
    const shimmerOpacity = useRef(new Animated.Value(0)).current;
    const handleChatSelect = async (channel: Channel) => {
      if (!channel) return;
      try {
        // Ensure channel is watched before sending
        await channel.watch();
        if (chatShareSelection.proposal) {
           await channel.sendMessage({
            text: "Check out this proposal!",
            type: "regular",
            data: {
              proposal: chatShareSelection.proposal,
              type: "proposal/share",
            },
          });
          // router.push(`/(app)/(chat)/channel/${channel.id}`);
        }
        if (chatShareSelection.event) {
          const attachmentType =
            chatShareSelection.event?.source === "ticketmaster"
              ? "ticketmaster"
              : chatShareSelection.isEventType
              ? "event"
              : "location";
          const createPostShareAttachment = (
            type: "event" | "location" | "ticketmaster"
          ) => {
            switch (type) {
              case "event":
                const eventData = chatShareSelection.event;
                return {
                  type: "event_share",
                  event_id: eventData?.id || "",
                  event_data: eventData,
                };
              case "location":
                const locationData = chatShareSelection.event;
                return {
                  type: "location_share",
                  location_id: locationData?.id || "",
                  location_data: locationData,
                };
              case "ticketmaster":
                const ticketmasterData = chatShareSelection.event;
                return {
                  type: "ticketmaster_share",
                  event_id: ticketmasterData?.id || "",
                  event_data: {
                    id: ticketmasterData?.id,
                    name: ticketmasterData?.name,
                    description: ticketmasterData?.description,
                    image_urls: ticketmasterData?.image_urls,
                    start_datetime: ticketmasterData?.start_datetime,
                    venue_name: ticketmasterData?.venue_name,
                    address: ticketmasterData?.address,
                    city: ticketmasterData?.city,
                    state: ticketmasterData?.state,
                    source: "ticketmaster",
                  },
                };
              default:
                return null;
            }
          };
          const attachment = createPostShareAttachment(attachmentType);
          await channel.sendMessage({
            text: `Check out ${chatShareSelection.event?.name} on Orbit!`,
            type: "regular",
            // Send attachment (like web app) for cross-platform compatibility
            attachments: attachment ? [attachment] : [],
          });
        }
        // Send the post as a custom message with attachment

        // Navigate to the chat
      } catch (error) {
        console.error("Error sharing post:", error);
        // You could show a toast or alert here
      }
    };
    const { createFlag } = useFlagging();
    // NEW: Use the join event hooks (like web app)
    const { joinEvent, leaveEvent, isLoading: isJoining } = useJoinEvent();

    // NEW: Get actual join status and creator check from database
    // Extract created_by ID (could be string or object)
    const createdById = treatAsEvent
      ? typeof (data as any).created_by === "string"
        ? (data as any).created_by
        : (data as any).created_by?.id
      : undefined;

    const {
      isJoined: isJoinedFromDB,
      isCreator,
      refetch: refetchJoinStatus,
    } = useEventJoinStatus(treatAsEvent ? data.id : undefined, createdById);

    const findNearestItem = (swipeDirection: "left" | "right") => {
      const current = detailData || data;
      if (!current?.location?.coordinates) return null;
      
      const allAvailableItems = nearbyData.filter(
        (item) =>
          item.id !== current.id && item?.location?.coordinates
      );
      
      if (allAvailableItems.length === 0) return null;
      
      // Filter out recently visited items (last 10 items to prevent cycling)
      const availableItems = allAvailableItems.filter(
        (item) => !visitedItemsRef.current.includes(item.id)
      );
      
      // If we've visited most/all items, reset history but keep last selected excluded
      if (availableItems.length === 0) {
        // Reset history but exclude the last selected item
        visitedItemsRef.current = [];
        const itemsToChooseFrom = allAvailableItems.filter(
          (item) => item.id !== lastSelectedIdRef.current
        );
        const items = itemsToChooseFrom.length > 0 ? itemsToChooseFrom : allAvailableItems;
        const randomIndex = Math.floor(Math.random() * items.length);
        const selected = items[randomIndex];
        visitedItemsRef.current.push(selected.id);
        lastSelectedIdRef.current = selected.id;
        return selected;
      }
      
      // Always pick randomly from available items (not recently visited)
      // This ensures variety and prevents cycling
      const randomIndex = Math.floor(Math.random() * availableItems.length);
      const selected = availableItems[randomIndex];
      
      if (selected) {
        visitedItemsRef.current.push(selected.id);
        // Keep history of last 10 items to prevent cycling
        if (visitedItemsRef.current.length > 10) {
          visitedItemsRef.current.shift();
        }
        lastSelectedIdRef.current = selected.id;
      }
      
      return selected;
    };

    // Trigger glass shimmer animation
    const triggerShimmer = (direction: "left" | "right") => {
      // Reset shimmer position based on direction
      shimmerPosition.setValue(direction === "right" ? -1 : 1);
      shimmerOpacity.setValue(0);
      
      // Animate shimmer across the card
      Animated.parallel([
        Animated.timing(shimmerPosition, {
          toValue: direction === "right" ? 1 : -1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.timing(shimmerOpacity, {
            toValue: 0.8,
            duration: 150,
            useNativeDriver: true,
          }),
          Animated.timing(shimmerOpacity, {
            toValue: 0.8,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(shimmerOpacity, {
            toValue: 0,
            duration: 150,
            useNativeDriver: true,
          }),
        ]),
      ]).start();
    };

    // PanResponder for swipe gesture with glass shimmer animation
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
            const swipeThreshold = 40;
            const swipeDistance = Math.abs(gestureState.dx);
            
            if (swipeDistance > swipeThreshold) {
              const swipeDirection = gestureState.dx > 0 ? "right" : "left";
              
              // Trigger glass shimmer effect
              triggerShimmer(swipeDirection);
              
              // Small delay to let shimmer start, then select next item
              setTimeout(() => {
                const nearest = findNearestItem(swipeDirection);
                if (nearest) {
                  onDataSelect(nearest);
                }
              }, 100);
            }
          },
        }),
      [nearbyData, detailData, data]
    );
    
    // Reset visited items when data changes
    useEffect(() => {
      visitedItemsRef.current = [];
      swipeCountRef.current = 0;
      lastSelectedIdRef.current = null;
      shimmerPosition.setValue(-1);
      shimmerOpacity.setValue(0);
    }, [data.id]);
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
      () =>
        getContextActions(
          data,
          detailData,
          treatAsEvent,
          isJoinedFromDB,
          isCreator
        ),
      [data.id, treatAsEvent, detailData, isJoinedFromDB, isCreator] // Include isCreator
    );

    useEffect(() => {
      const eventName = isEvent(data)
        ? "refreshEventDetail"
        : "refreshlocationDetail";
      DeviceEventEmitter.addListener(eventName, (valueEvent) => {
        // No longer needed - data is already complete
      });
    }, []);

    // REMOVED: Gesture handling and animations for better performance
    const onUnAuth = () => {
      Toast.show({
        type: "info",
        text1: "Please Log In",
        text2: "You need to be logged in to perform this action.",
      });
      router.dismissAll();
    };
    const handleContextAction = (action: string) => {
      switch (action) {
        case "join":
          // Check if this is a Ticketmaster event for ticket purchase
          const isTicketmaster =
            (detailData as any)?.is_ticketmaster ||
            (data as any)?.is_ticketmaster;
          if (isTicketmaster) {
            // For Ticketmaster events: "Buy Tickets" -> opens ticket purchase
            if (!session) {
              onUnAuth();
              return;
            }
            handleTicketPurchase();
          } else {
            // For user events: Join button -> turns into "Create Orbit"
            if (!session) {
              onUnAuth();
              return;
            }
            if (treatAsEvent && !isJoinedFromDB) {
              hitUpdateEventApi();
            }
          }
          break;
        case "details":
          handleShowDetails();
          break;
        case "create":
          if (detailData?.source === "user" && isJoinedFromDB) {
            // For EVENTS: "Create Orbit" -> creates group chat
            if (!session) {
              onUnAuth();
              return;
            }
            handleCreateOrbit();
          } else {
            // For LOCATIONS: "Create Activity" -> goes to create activity page
            if (!session) {
              onUnAuth();
              return;
            }
            handleCreateEvent();
          }
          break;
        case "edit":
          // For EVENTS: "Edit Event" -> goes to edit event page
          if (!session) {
            onUnAuth();
            return;
          }
          if (treatAsEvent) {
            router.push({
              pathname: "/(app)/(create)",
              params: {
                eventId: detailData?.id || data.id,
                editMode: "true",
                from: "map",
              },
            });
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

      try {
        const source =
          (detailData || data).is_ticketmaster ||
          (detailData || data).source === "ticketmaster"
            ? "ticketmaster"
            : "supabase";

        if (isJoinedFromDB) {
          // Leave event
          await leaveEvent(data.id, source);
        } else {
          // Join event
          await joinEvent(data.id, source);
          // Add haptics for premium feel
          haptics.impact();
        }

        // Refetch status from database
        await refetchJoinStatus();

        // Update local detail data
        const updatedData = {
          ...(detailData || data),
          join_status: !isJoinedFromDB,
        };
        setDetailData(updatedData as UnifiedData);

        console.log(
          `✅ Successfully ${isJoinedFromDB ? "left" : "joined"} event!`
        );
      } catch (error) {
        console.error("Error updating event status:", error);
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
          from: "map",
          address: (locationData as any).address || "",
          categoryId: simplifiedCategory.id,
          categoryName: simplifiedCategory.name,
          // Pass current map center for location change detection
          currentLat: mapCenter ? mapCenter[1]?.toString() : "",
          currentLng: mapCenter ? mapCenter[0]?.toString() : "",
          locationName: locationData?.name || "",
          locationDescription: locationData.description || "",
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
    
    // Get screen width for shimmer animation
    const screenWidth = Dimensions.get('window').width;
    const cardWidth = screenWidth - 32; // Account for left/right padding (16 each)
    
    // Interpolate shimmer position for gradient (from -cardWidth to +cardWidth)
    const shimmerTranslateX = shimmerPosition.interpolate({
      inputRange: [-1, 1],
      outputRange: [-cardWidth, cardWidth],
    });

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
                blurRadius={isEvent(data) ? 3 : 4}
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

            {/* Glass Shimmer Effect */}
            <Animated.View
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                top: 0,
                bottom: 0,
                overflow: "hidden",
                opacity: shimmerOpacity,
              }}
              pointerEvents="none"
            >
              <Animated.View
                style={{
                  position: "absolute",
                  top: 0,
                  bottom: 0,
                  width: "40%",
                  transform: [{ translateX: shimmerTranslateX }],
                }}
              >
                <LinearGradient
                  colors={[
                    "transparent",
                    "rgba(255, 255, 255, 0.3)",
                    "rgba(255, 255, 255, 0.5)",
                    "rgba(255, 255, 255, 0.3)",
                    "transparent",
                  ]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{
                    flex: 1,
                    width: "100%",
                  }}
                />
              </Animated.View>
            </Animated.View>

            {/* Close Button */}
            <View
              className="absolute top-2 right-2 z-10"
              style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
            >
              <TouchableOpacity
                className=" justify-center items-center w-8 h-8 rounded-full bg-black/30"
                onPress={() => {
                  setFlagOpen({
                    open: true,
                    eventId: treatAsEvent ? data.id : "",
                    locationId: treatAsEvent ? "" : data.id,
                  });
                }}
              >
                <Flag size={20} color="#000" />
              </TouchableOpacity>
              <TouchableOpacity
                className=" justify-center items-center w-8 h-8 rounded-full bg-black/30"
                onPress={onClose}
              >
                <X size={20} color="white" />
              </TouchableOpacity>
            </View>
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
                {contextActions.map(
                  (action, index) =>
                    (action.action === "join" ||
                      action.action === "create" ||
                      action.action === "details") && (
                      <TouchableOpacity
                        key={index}
                        className="flex-1 py-2 rounded-full"
                        style={[
                          {
                            backgroundColor:
                              index === 0 ? "rgba(255,255,255,0.9)" : "#3B82F6", // Solid blue for action buttons
                          },
                          !session && action.action !== "details"
                            ? styles.disabledButton
                            : {},
                        ]}
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
          <FlagContentModal
            visible={flagOpen.open}
            contentTitle={data.name}
            variant="sheet"
            onClose={() =>
              setFlagOpen({ open: false, eventId: "", locationId: "" })
            }
            onSubmit={async ({ reason, explanation }) => {
              const isEventFlag = isEvent(data);
              const idToFlag = data.id;
              const response = await createFlag({
                reason,
                explanation,
                event_id: isEventFlag ? idToFlag : "",
                static_location_id: isEventFlag ? "" : idToFlag,
              });
              if (response) {
                setFlagOpen({ open: false, eventId: "", locationId: "" });
                Toast.show({
                  type: "success",
                  text1: "Report submitted",
                  text2: "Thank you for helping keep our community safe.",
                  position: "top",
                  visibilityTime: 3000,
                  autoHide: true,
                  topOffset: 50,
                });
              } 
            }}
          />
        </View>

        {showDetails && (
          <UnifiedDetailsSheet
            data={data as any}
            isOpen={showDetails}
            onClose={() => setShowDetails(false)}
            nearbyData={nearbyData as any}
            onDataSelect={onDataSelect as any}
            onShowControler={() => {}}
            isEvent={treatAsEvent}
            onShare={(data, isEvent) => {
              setShowDetails(false);
              setShareData({ data, isEventType: isEvent });
            }}
          />
        )}

        {shareData && (
          <UnifiedShareSheet
            isOpen={!!shareData}
            onClose={() => {
              setShowDetails(true);
              setShareData(null);
            }}
            data={shareData?.data}
            isEventType={shareData?.isEventType}
            onProposalShare={(proposal: IProposal) => {
              setShareData(null);
              setChatShareSelection({
                show: true,
                proposal: proposal || null,
                event: null,
                isEventType: false,
              });
            }}
            onEventShare={(event) => {
              setShareData(null);
              setChatShareSelection({
                show: true,
                proposal: null,
                event: event || null,
                isEventType: shareData?.isEventType,
              });
            }}
          />
        )}
        <ChatSelectionModal
          isOpen={chatShareSelection.show}
          onClose={() => {
            setChatShareSelection({
              show: false,
              proposal: null,
              event: null,
              isEventType: false,
            });
          }}
          onSelectChat={handleChatSelect}
        />
      </>
    );
  },
  (prevProps, nextProps) => {
    // Custom comparison to ensure re-render when data changes
    return (
      prevProps.data?.id === nextProps.data?.id &&
      (prevProps.data as any)?.join_status ===
        (nextProps.data as any)?.join_status &&
      prevProps.treatAsEvent === nextProps.treatAsEvent &&
      prevProps.nearbyData?.length === nextProps.nearbyData?.length
    );
  }
);
const styles = StyleSheet.create({
  disabledButton: {
    // backgroundColor: "#A9A9A9",
    opacity: 0.6,
  },
});
