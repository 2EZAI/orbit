import React, { useCallback, useEffect, useState, useMemo } from "react";
import {
  View,
  ScrollView,
  Image,
  TouchableOpacity,
  Dimensions,
  Share,
  ActivityIndicator,
  DeviceEventEmitter,
  Modal,
  Linking,
  PanResponder,
} from "react-native";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "~/src/components/ui/avatar";
import { SafeAreaView } from "react-native-safe-area-context";
import { Text } from "~/src/components/ui/text";
import { OptimizedImage } from "~/src/components/ui/optimized-image";
import { MapEvent, MapLocation } from "~/hooks/useUnifiedMapData";
import { useAuth } from "~/src/lib/auth";
import { TicketDialog } from "~/src/components/map/TicketDialog";

// Additional types that were in the old hook
export interface Category {
  id: string;
  name: string;
  icon?: string;
}

export interface Prompt {
  id: string;
  name: string;
  created_at: string;
}
import { router } from "expo-router";
import {
  Pencil,
  Share2,
  MapPin,
  Calendar,
  ArrowLeft,
  Heart,
  Users,
  Navigation,
  X,
  ChevronRight,
  Tag,
  Sparkles,
  TrendingUp,
  UserCheck,
  Shuffle,
  Clock,
  Star,
  DollarSign,
  Phone,
} from "lucide-react-native";
import { format } from "date-fns";
import { UserAvatar } from "~/src/components/ui/user-avatar";
import BottomSheet, { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { useUpdateEvents } from "~/hooks/useUpdateEvents";
import { useLocationEvents } from "~/hooks/useLocationEvents";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "~/src/components/ThemeProvider";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { User as AuthUser } from "@supabase/supabase-js";

interface User extends AuthUser {
  first_name: string | null;
  last_name: string | null;
  username: string | null;
  avatar_url: string | null;
}

type UnifiedData = (MapEvent | MapLocation) & {
  created_by?: {
    id: string;
    name: string;
    username?: string;
    avatar_url: string | null;
  };
  join_status?: boolean;
  external_url?: string;
  external_title?: string;
  category?: Category;
  categories?: Category[];
  attendees?: {
    count: number;
    profiles: Array<{
      id: string;
      name: string;
      avatar_url: string | null;
    }>;
  };
  rating?: number;
  rating_count?: number;
  price_level?: number;
  phone?: string;
  type?: string;
  is_ticketmaster?: boolean;
  ticket_enabled?: boolean;
  ticket_total?: number | null;
  ticket_limit_per_user?: number | null;
  co_creators?: {
    user: User[];
  };
};

interface UnifiedDetailsSheetProps {
  data: UnifiedData;
  isOpen: boolean;
  onClose: () => void;
  nearbyData: UnifiedData[];
  onDataSelect: (data: UnifiedData) => void;
  onShowControler: () => void;
  isEvent?: boolean;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

// Type guards
const isEventData = (data: UnifiedData, isEvent?: boolean): boolean => {
  if (isEvent !== undefined) {
    return isEvent;
  }

  const hasEventFields =
    "start_datetime" in data || "venue_name" in data || "attendees" in data;

  return hasEventFields;
};

export const UnifiedDetailsSheet = React.memo(
  ({
    data,
    isOpen,
    onClose,
    nearbyData,
    onDataSelect,
    onShowControler,
    isEvent,
  }: UnifiedDetailsSheetProps) => {
    const [loading, setLoading] = useState(false);
    const [detailData, setDetailData] = useState<UnifiedData | undefined>(
      undefined
    );
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [selectedImageIndex, setSelectedImageIndex] = useState<number>(0);
    const [bookmarked, setBookmarked] = useState(false);
    const [isEditable, setIsEditable] = useState(false);
    const [manuallyUpdated, setManuallyUpdated] = useState(false);
    const { session } = useAuth();
    const [showDialog, setShowDialog] = useState(false);
    const [ticketCount, setTicketCount] = useState(null);

    // Memoize the event type check to prevent repeated calculations
    const isEventType = useMemo(
      () => isEventData(data, isEvent),
      [data?.id, isEvent]
    );
    console.log("data>", data);
    console.log("isEventType>", isEventType);
    console.log("isEvent>", isEvent);
    console.log("ddsd>");

    // Use our new hook for location events
    const locationIdForEvents = !isEventType ? data.id : null;

    const {
      events: locationEvents,
      loading: loadingLocationEvents,
      error: locationEventsError,
    } = useLocationEvents(locationIdForEvents);

    const [displayedPrompts, setDisplayedPrompts] = useState<Prompt[]>([]);
    const [showAllPromptsModal, setShowAllPromptsModal] = useState(false);
    const [selectedLocationEvent, setSelectedLocationEvent] =
      useState<any>(null);
    const insets = useSafeAreaInsets();
    const { theme, isDarkMode } = useTheme();

    const {
      UpdateEventStatus,
      fetchEventDetail,
      fetchLocationDetail,
      fetchLocationEvents,
    } = useUpdateEvents();

    // Location events are now handled by the useLocationEvents hook above

    // Shuffle and select 2-3 random prompts
    const shufflePrompts = () => {
      const currentData = detailData || data;
      const allPrompts = (currentData as any).category?.prompts || [];

      if (allPrompts.length === 0) return;

      // Shuffle array and take 2-3 items
      const shuffled = [...allPrompts].sort(() => Math.random() - 0.5);
      const count = Math.min(3, Math.max(2, allPrompts.length));
      setDisplayedPrompts(shuffled.slice(0, count));
    };

    // Initialize displayed prompts
    const initializePrompts = () => {
      const currentData = detailData || data;
      const allPrompts = (currentData as any).category?.prompts || [];

      if (allPrompts.length === 0) return;

      // Show first 2-3 prompts initially
      const count = Math.min(3, Math.max(2, allPrompts.length));
      setDisplayedPrompts(allPrompts.slice(0, count));
    };

    // Handle show all prompts modal
    const handleShowAllPrompts = () => {
      setShowAllPromptsModal(true);
    };

    // PanResponder for swipe to close modal
    const panResponder = PanResponder.create({
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        // Only respond to vertical gestures
        return (
          Math.abs(gestureState.dy) > Math.abs(gestureState.dx) &&
          Math.abs(gestureState.dy) > 10
        );
      },
      onPanResponderMove: (evt, gestureState) => {
        // Optional: Add visual feedback during swipe (like scaling or opacity)
      },
      onPanResponderRelease: (evt, gestureState) => {
        // Close modal if swipe distance is significant or velocity is high
        const { dy, vy } = gestureState;
        const shouldClose = Math.abs(dy) > 150 || Math.abs(vy) > 0.5;

        if (shouldClose) {
          setSelectedImage(null);
        }
      },
    });

    const formatDate = (date: string) => {
      try {
        return format(new Date(date), "MMM d, yyyy");
      } catch (error) {
        return "";
      }
    };

    const formatTime = (date: string) => {
      try {
        return format(new Date(date), "h:mm a");
      } catch (error) {
        return "";
      }
    };

    const handleConfirm = (count) => {
      setTicketCount(count);
      setShowDialog(false);
    };

    const formatDateRange = (start: string, end?: string) => {
      try {
        const startDate = new Date(start);
        const endDate = end ? new Date(end) : null;

        if (endDate && startDate.toDateString() === endDate.toDateString()) {
          return `${format(startDate, "EEEE, MMM d")} • ${format(
            startDate,
            "h:mm a"
          )} - ${format(endDate, "h:mm a")}`;
        } else if (endDate) {
          return `${format(startDate, "MMM d")} - ${format(
            endDate,
            "MMM d"
          )} • ${format(startDate, "h:mm a")}`;
        } else {
          return `${format(startDate, "EEEE, MMM d")} • ${format(
            startDate,
            "h:mm a"
          )}`;
        }
      } catch (error) {
        return "";
      }
    };

    const handleShare = async () => {
      const currentData = detailData || data;

      try {
        await Share.share({
          message: `Check out ${currentData?.name} on Orbit!\n${currentData?.description}`,
          title: isEventType ? "Event on Orbit" : "Location on Orbit",
        });
      } catch (error) {
        console.error("Error sharing:", error);
      }
    };

    const editHandle = () => {
      onClose();
      const currentData = detailData || data;

      // Navigate to summary screen with event data
      router.push({
        pathname: "/(app)/(create)",
        params: {
          data: JSON.stringify(data),
        },
      });
      DeviceEventEmitter.emit("editEventAdmin", {
        data: JSON.stringify(data),
      });
    };

    const handleCreatorClick = () => {
      const currentData = detailData || data;
      const creator = (currentData as any).created_by;

      if (creator?.username) {
        router.push(`/(app)/profile/${creator.id}`);
      } else if (creator?.id) {
        // Fallback to ID-based route if username not available
        router.push(`/(app)/profile/${creator.id}`);
      }
    };

    const handleAttendeeClick = (attendee: any) => {
      if (attendee.username) {
        router.push(`/(app)/profile/${attendee.id}`);
      } else if (attendee.id) {
        router.push(`/(app)/profile/${attendee.id}`);
      }
    };

    const getUserDisplayName = (user: User) => {
      console.log("user>", user);
      // const fullName = `${user.first_name || ""} ${user.last_name || ""}`.trim();
      // return fullName || user.username || "Unknown User";
      return "Unknown User";
    };

    const getUserInitials = (user: User) => {
      // if (user.first_name && user.last_name) {
      //   return `${user.first_name[0]}${user.last_name[0]}`.toUpperCase();
      // }
      // if (user.first_name) {
      //   return user.first_name[0].toUpperCase();
      // }
      // if (user.last_name) {
      //   return user.last_name[0].toUpperCase();
      // }
      // if (user.username) {
      //   return user.username[0].toUpperCase();
      // }
      return "?";
    };

    const handleTicketPurchase = () => {
      const currentData = detailData || data;
      if (!currentData.external_url) return;

      // Close the sheet first so webview appears properly
      onClose();

      router.push({
        pathname: "/(app)/(webview)",
        params: {
          external_url: currentData.external_url,
          eventSelected: JSON.stringify(currentData),
        },
      });
    };

    const handleCreateOrbit = () => {
      if (isEventType) {
        // Close the sheet first
        onClose();

        router.push({
          pathname: "/new",
          params: {
            eventId: detailData?.id || data.id,
            eventName: detailData?.name || data.name,
          },
        });
      }
    };

    const handleCreateEvent = () => {
      if (isEventType) return;

      const locationData = data;

      // Close the sheet first
      onClose();

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
          latitude:
            (locationData as any).location?.coordinates?.[1]?.toString() || "",
          longitude:
            (locationData as any).location?.coordinates?.[0]?.toString() || "",
          address: (locationData as any).address || "",
          categoryId: simplifiedCategory.id,
          categoryName: simplifiedCategory.name,
          prompts: JSON.stringify(locationData?.category?.prompts ?? []),
        },
      });
    };

    const handleDirections = () => {
      const currentData = detailData || data;
      const lat = currentData.location?.coordinates[1];
      const lng = currentData.location?.coordinates[0];
      console.log("lat>lng>", lng);
      if (lat && lng) {
        const url = `https://maps.apple.com/?daddr=${lat},${lng}`;
        Linking.openURL(url);
      }
    };

    // COMMENTED OUT: Old detail API calls - now using unified API data directly
    /*
  const hitDetailApi = async () => {
    // Skip API call if we just manually updated the state
    if (manuallyUpdated) {
      setLoading(false);
      return;
    }

    try {
      if (isEventData(data, isEvent)) {
        try {
          const freshData = await fetchEventDetail(data as any);
          setDetailData(freshData as unknown as UnifiedData);
        } catch (fetchError) {
          console.error("Error fetching event detail:", fetchError);
        }
      } else {
        try {
          const freshData = await fetchLocationDetail(data as MapLocation);
          setDetailData(freshData as unknown as UnifiedData);
        } catch (fetchError) {
          console.error("Error fetching location detail:", fetchError);
        }
      }
    } catch (error) {
      console.error("Error fetching details:", error);
    } finally {
      setLoading(false);
    }
  };
  */

    // NEW: Simplified detail handling - data comes from unified API
    const hitDetailApi = async () => {
      try {
        // Skip API call if we just manually updated the state
        if (manuallyUpdated) {
          setLoading(false);
          return;
        }

        // The unified API already provides complete data, so we just use it directly
        setDetailData(data as UnifiedData);
        setLoading(false);
      } catch (error) {
        console.error("Error in detail handling:", error);
        setLoading(false);
      }
    };

    const handleJoinEvent = async () => {
      const currentData = detailData || data;
      console.log(
        "currentData?.ticket_limit_per_user >",
        currentData?.ticket_limit_per_user
      );
      if (
        currentData?.ticket_limit_per_user != null &&
        currentData?.ticket_limit_per_user > 1
      ) {
        setShowDialog(true);
      } else {
        // if (!isEventType) return;
        // setLoading(true);
        // try {
        //   await UpdateEventStatus(data as any);
        //   console.log("✅ Successfully joined event!");
        //   // Directly update the detailData with joined status
        //   const updatedData = { ...(detailData || data), join_status: true };
        //   setDetailData(updatedData as UnifiedData);
        //   setManuallyUpdated(true);
        //   setLoading(false);
        //   // Emit event to reload map and show event card
        //   DeviceEventEmitter.emit("refreshMapData", true);
        // } catch (error) {
        //   console.error("❌ Error joining event:", error);
        //   setLoading(false);
        // }
      }
    };

    const handleLeaveEvent = async () => {
      if (!isEventType) return;

      setLoading(true);
      try {
        await UpdateEventStatus(data as any);
        console.log("✅ Successfully left event!");

        // Directly update the detailData with left status
        const updatedData = { ...(detailData || data), join_status: false };
        setDetailData(updatedData as UnifiedData);
        setManuallyUpdated(true);

        setLoading(false);
        // Emit event to reload map and show event card
        DeviceEventEmitter.emit("refreshMapData", true);
      } catch (error) {
        console.error("❌ Error leaving event:", error);
        setLoading(false);
      }
    };

    // Get similar events/locations from nearbyData
    const getSimilarItems = useMemo(() => {
      const currentData = detailData || data;

      if (isEventType) {
        // For events, try to find similar events by category first
        const currentCategories = (currentData as any).categories || [];
        const categoryNames = currentCategories.map((cat: any) =>
          cat.name?.toLowerCase()
        );

        // First try to find events with matching categories
        const categoryMatches = nearbyData.filter((item) => {
          if (item.id === currentData.id) return false;
          const itemIsEvent = isEventData(item);
          if (!itemIsEvent) return false;

          const itemCategories = (item as any).categories || [];
          return itemCategories.some((cat: any) =>
            categoryNames.includes(cat.name?.toLowerCase())
          );
        });

        // If we have category matches, return those
        if (categoryMatches.length > 0) {
          return categoryMatches.slice(0, 5);
        }

        // Otherwise, return any other events
        return nearbyData
          .filter((item) => {
            if (item.id === currentData.id) return false;
            return isEventData(item);
          })
          .slice(0, 5);
      } else {
        // For locations, filter by same type/category
        const currentCategory = (
          currentData as any
        ).category?.name?.toLowerCase();
        const currentType = (currentData as any).type?.toLowerCase();

        return nearbyData
          .filter((item) => {
            if (item.id === currentData.id) return false;
            const itemIsEvent = isEventData(item);
            if (itemIsEvent) return false;

            const itemCategory = (item as any).category?.name?.toLowerCase();
            const itemType = (item as any).type?.toLowerCase();

            return itemCategory === currentCategory || itemType === currentType;
          })
          .slice(0, 5);
      }
    }, [detailData, data, isEventType, nearbyData]);

    // Get category name, filtering out googleAPI references
    const getCategoryName = (categoryName?: string) => {
      if (!categoryName) return null;
      if (
        categoryName.toLowerCase().includes("googleapi") ||
        categoryName.toLowerCase().includes("google_api") ||
        categoryName.toLowerCase() === "api"
      ) {
        return null;
      }
      return categoryName;
    };

    useEffect(() => {
      if (!isOpen) return;

      // Reset manual update flag when opening with new data
      setManuallyUpdated(false);
      setDetailData(data); // Use data directly, no API call needed

      // Events for this location are automatically loaded by the useLocationEvents hook

      // Initialize prompts display
      initializePrompts();

      return () => {
        onShowControler();
      };
    }, [data?.id, isOpen]); // Only depend on data ID

    useEffect(() => {
      const eventName = isEventType
        ? "refreshEventDetail"
        : "refreshlocationDetail";
      DeviceEventEmitter.addListener(eventName, () => {
        // No longer needed - data is already complete
        // Don't automatically navigate to create orbit
        // Let the user explicitly click "Create Orbit" button
      });
    }, [isEventType]);

    if (!isOpen) return null;

    useEffect(() => {
      // Compare userIdToCheck with created_by.id and all co_creator.user_id
      const isMatch =
        data?.created_by.id === session?.user?.id ||
        data?.co_creators.some(
          (co_creator) => co_creator.user_id === userIdToCheck
        );

      console.log(isMatch); // 👉 false (based on current data)
      setIsEditable(isMatch);
    }, []);

    const currentData = detailData || data;
    const similarItems = getSimilarItems;

    // Get primary category with googleAPI filtering
    const getPrimaryCategory = () => {
      if (isEventType) {
        const categoryName = currentData.categories?.[0]?.name;
        return getCategoryName(categoryName);
      } else {
        const categoryName =
          (currentData as any).category?.name || (currentData as any).type;
        return getCategoryName(categoryName);
      }
    };

    const categoryName = getPrimaryCategory();
    const hasTickets = currentData.external_url;
    const hasTitle = currentData?.external_title;
    const isJoined = (currentData as any).join_status;
    const attendeeCount = (currentData as any).attendees?.count || 0;
    const attendeeProfiles = (currentData as any).attendees?.profiles || [];
    const [currentIndex, setCurrentIndex] = useState(0);

    const handleScroll = (event) => {
      const offsetX = event.nativeEvent.contentOffset.x;
      const index = Math.round(offsetX / SCREEN_WIDTH);
      setCurrentIndex(index);
    };

    return (
      <Modal
        visible={isOpen}
        transparent={true}
        animationType="none"
        onRequestClose={onClose}
        statusBarTranslucent={true}
        presentationStyle="overFullScreen"
      >
        <GestureHandlerRootView style={{ flex: 1 }}>
          <View style={{ flex: 1 }}>
            {/* Full Screen Backdrop */}
            <View
              className="absolute top-0 right-0 bottom-0 left-0"
              style={{
                backgroundColor: isDarkMode
                  ? "rgba(0,0,0,0.7)"
                  : "rgba(0,0,0,0.5)",
                zIndex: 99998,
                elevation: 99998, // For Android
                position: "absolute",
                width: "100%",
                height: "100%",
              }}
            />

            <BottomSheet
              snapPoints={["75%", "95%"]}
              handleIndicatorStyle={{
                backgroundColor: theme.colors.border,
                width: 40,
              }}
              backgroundStyle={{
                backgroundColor: theme.colors.card,
                borderRadius: 20,
              }}
              enablePanDownToClose
              onClose={onClose}
              style={{ zIndex: 99999, elevation: 99999 }}
              containerStyle={{ zIndex: 99999, elevation: 99999 }}
            >
              <SafeAreaView style={{ flex: 1, marginTop: 20 }}>
                <BottomSheetScrollView
                  contentContainerStyle={{ paddingBottom: 120 + insets.bottom }}
                  showsVerticalScrollIndicator={false}
                >
                  {/* Hero Image Section */}
                  <View className="relative">
                    <ScrollView
                      horizontal
                      pagingEnabled
                      onScroll={handleScroll}
                      showsHorizontalScrollIndicator={false}
                      style={{ height: SCREEN_HEIGHT * 0.35 }}
                    >
                      {(currentData?.image_urls || []).map(
                        (imageUrl, index) => (
                          <TouchableOpacity
                            key={index}
                            onPress={() => setSelectedImage(imageUrl)}
                            style={{
                              width: SCREEN_WIDTH,
                              height: SCREEN_HEIGHT * 0.35,
                            }}
                          >
                            <Image
                              source={{ uri: imageUrl }}
                              style={{
                                width: SCREEN_WIDTH,
                                height: SCREEN_HEIGHT * 0.35,
                              }}
                              resizeMode="cover"
                            />
                          </TouchableOpacity>
                        )
                      )}
                    </ScrollView>

                    {/* Top Bar Overlay */}
                    <View className="absolute top-0 right-0 left-0 flex-row justify-between items-center p-4 pt-12">
                      <TouchableOpacity
                        onPress={onClose}
                        className="justify-center items-center w-10 h-10 rounded-full shadow-lg bg-white/90"
                      >
                        <ArrowLeft size={20} color="#000" />
                      </TouchableOpacity>

                      <View className="flex-row gap-2">
                        <TouchableOpacity
                          onPress={handleShare}
                          className="justify-center items-center w-10 h-10 rounded-full shadow-lg bg-white/90"
                        >
                          <Share2 size={18} color="#000" />
                        </TouchableOpacity>

                        {isEditable && (
                          <TouchableOpacity
                            onPress={editHandle}
                            className="justify-center items-center w-10 h-10 rounded-full shadow-lg bg-white/90"
                          >
                            <Pencil size={18} color="#000" />
                          </TouchableOpacity>
                        )}

                        <TouchableOpacity
                          onPress={() => setBookmarked(!bookmarked)}
                          className="justify-center items-center w-10 h-10 rounded-full shadow-lg bg-white/90"
                        >
                          <Heart
                            size={18}
                            color={bookmarked ? "#EF4444" : "#000"}
                            fill={bookmarked ? "#EF4444" : "none"}
                          />
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* Floating Stats - Show attendee count prominently for events */}
                    {isEventType && attendeeCount > 0 && (
                      <View className="absolute right-4 bottom-4">
                        <View className="flex-row items-center px-3 py-2 bg-purple-600 rounded-full">
                          <Users size={16} color="white" />
                          <Text className="ml-1 font-bold text-white">
                            {attendeeCount}
                          </Text>
                          <Text className="ml-1 text-xs text-white/90">
                            going
                          </Text>
                        </View>
                      </View>
                    )}

                    {/* Joined Status Indicator */}
                    {isEventType && isJoined && (
                      <View className="absolute bottom-4 left-4">
                        <View className="flex-row items-center px-3 py-2 bg-green-600 rounded-full">
                          <UserCheck size={16} color="white" />
                          <Text className="ml-1 text-xs font-bold text-white">
                            You're Going
                          </Text>
                        </View>
                      </View>
                    )}

                    {/* Image Indicators */}
                    {(currentData?.image_urls || []).length > 1 && (
                      <View className="absolute right-0 left-0 bottom-4 flex-row justify-center">
                        <View className="flex-row bg-black/30 px-3 py-1.5 rounded-full">
                          {(currentData?.image_urls || []).map((_, index) => (
                            <View
                              key={index}
                              className={`w-2 h-2 rounded-full mx-0.5 ${
                                index === currentIndex
                                  ? "bg-yellow-400"
                                  : "bg-white/70"
                              }`}
                            />
                          ))}
                        </View>
                      </View>
                    )}
                    <View className="absolute flex-row  bottom-4 left-4">
                      {/* Category Badge - Only show for valid categories */}
                      {categoryName && categoryName !== "Place" && (
                        <View>
                          <View
                            className="flex-row items-center px-4 py-2 rounded-full"
                            style={{
                              backgroundColor: isDarkMode
                                ? "rgba(255,255,255,0.95)"
                                : "rgba(255,255,255,0.95)",
                            }}
                          >
                            <Tag size={14} color="#8B5CF6" />
                            <Text
                              className="ml-1 text-sm font-semibold"
                              style={{
                                color: isDarkMode ? "#1F2937" : "#1F2937",
                              }}
                            >
                              {categoryName}
                            </Text>
                          </View>
                        </View>
                      )}

                      {/* Ticket Badge - Only show for tickets*/}
                      {data?.ticket_enabled && (
                        <View className="left-4">
                          <View
                            className="flex-row items-center px-4 py-2 rounded-full"
                            style={{
                              backgroundColor: isDarkMode
                                ? "rgba(255,255,255,0.95)"
                                : "rgba(255,255,255,0.95)",
                            }}
                          >
                            <Tag size={14} color="#8B5CF6" />
                            <Text
                              className="ml-1 text-sm font-semibold"
                              style={{
                                color: isDarkMode ? "#1F2937" : "#1F2937",
                              }}
                            >
                              Ticket
                            </Text>
                          </View>
                        </View>
                      )}
                    </View>
                  </View>

                  {/* Content Section */}
                  <View className="px-6 pt-6">
                    {/* Title */}
                    <Text
                      className="mb-6 text-3xl font-bold"
                      style={{ color: theme.colors.text }}
                    >
                      {currentData?.name}
                    </Text>

                    {/* Event/Location Specific Info */}
                    {isEventType ? (
                      <>
                        {/* Event Date & Time - Compact - ONLY FOR EVENTS */}
                        {(currentData as any).start_datetime && (
                          <View
                            className="flex-row items-center p-3 mb-3 rounded-xl"
                            style={{
                              backgroundColor: isDarkMode
                                ? "rgba(139, 92, 246, 0.1)"
                                : "rgb(245, 243, 255)",
                            }}
                          >
                            <View className="justify-center items-center mr-3 w-10 h-10 bg-purple-500 rounded-full">
                              <Calendar size={20} color="white" />
                            </View>
                            <View className="flex-1">
                              <Text className="mb-1 text-xs font-medium tracking-wide text-purple-600 uppercase">
                                When
                              </Text>
                              <Text
                                className="text-base font-bold leading-tight"
                                style={{ color: theme.colors.text }}
                              >
                                {formatDateRange(
                                  (currentData as any).start_datetime,
                                  (currentData as any).end_datetime
                                )}
                              </Text>
                            </View>
                          </View>
                        )}

                        {/* Venue & Address - Compact */}
                        <View
                          className="flex-row items-start p-3 mb-4 rounded-xl"
                          style={{
                            backgroundColor: isDarkMode
                              ? "rgba(59, 130, 246, 0.1)"
                              : "rgb(239, 246, 255)",
                          }}
                        >
                          <View className="justify-center items-center mt-0.5 mr-3 w-10 h-10 bg-blue-500 rounded-full">
                            <MapPin size={20} color="white" />
                          </View>
                          <View className="flex-1">
                            <Text className="mb-1 text-xs font-medium tracking-wide text-blue-600 uppercase">
                              Where
                            </Text>
                            <Text
                              className="mb-2 text-sm leading-relaxed"
                              style={{
                                color: isDarkMode
                                  ? theme.colors.text
                                  : "#6B7280",
                              }}
                            >
                              {currentData.address}
                            </Text>
                            <TouchableOpacity
                              onPress={handleDirections}
                              className="flex-row items-center self-start px-3 py-1.5 bg-blue-500 rounded-full"
                            >
                              <Navigation size={14} color="white" />
                              <Text className="ml-1.5 text-sm font-semibold text-white">
                                Directions
                              </Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      </>
                    ) : (
                      <>
                        {/* Location Address - Compact */}
                        <View
                          className="flex-row items-start p-3 mb-4 rounded-xl"
                          style={{
                            backgroundColor: isDarkMode
                              ? "rgba(59, 130, 246, 0.1)"
                              : "rgb(239, 246, 255)",
                          }}
                        >
                          <View className="justify-center items-center mt-0.5 mr-3 w-10 h-10 bg-blue-500 rounded-full">
                            <MapPin size={20} color="white" />
                          </View>
                          <View className="flex-1">
                            <Text className="mb-1 text-xs font-medium tracking-wide text-blue-600 uppercase">
                              Location
                            </Text>
                            <Text
                              className="mb-2 text-sm leading-relaxed"
                              style={{
                                color: isDarkMode
                                  ? theme.colors.text
                                  : "#6B7280",
                              }}
                            >
                              {currentData.address}
                            </Text>
                            <TouchableOpacity
                              onPress={handleDirections}
                              className="flex-row items-center self-start px-3 py-1.5 bg-blue-500 rounded-full"
                            >
                              <Navigation size={14} color="white" />
                              <Text className="ml-1.5 text-sm font-semibold text-white">
                                Directions
                              </Text>
                            </TouchableOpacity>
                          </View>
                        </View>

                        {/* Operation Hours - For static locations */}
                        {(currentData as any).operation_hours && (
                          <View
                            className="p-3 mb-3 rounded-xl"
                            style={{
                              backgroundColor: isDarkMode
                                ? "rgba(34, 197, 94, 0.1)"
                                : "rgb(240, 253, 244)",
                            }}
                          >
                            <View className="flex-row items-center mb-3">
                              <View className="justify-center items-center mr-3 w-10 h-10 bg-green-500 rounded-full">
                                <Clock size={20} color="white" />
                              </View>
                              <Text className="text-xs font-medium tracking-wide text-green-600 uppercase">
                                Hours of Operation
                              </Text>
                            </View>

                            {(() => {
                              const hours = (currentData as any)
                                .operation_hours;

                              // If it's a string, show as is
                              if (typeof hours === "string") {
                                return (
                                  <Text
                                    className="text-base font-bold leading-tight ml-13"
                                    style={{ color: theme.colors.text }}
                                  >
                                    {hours}
                                  </Text>
                                );
                              }

                              // If it's an object (JSON), parse and display structured hours
                              if (typeof hours === "object" && hours !== null) {
                                const dayOrder = [
                                  "monday",
                                  "tuesday",
                                  "wednesday",
                                  "thursday",
                                  "friday",
                                  "saturday",
                                  "sunday",
                                ];
                                const dayAbbrevs = {
                                  monday: "Mon",
                                  tuesday: "Tue",
                                  wednesday: "Wed",
                                  thursday: "Thu",
                                  friday: "Fri",
                                  saturday: "Sat",
                                  sunday: "Sun",
                                };

                                const formatTime = (time: string) => {
                                  if (!time) return "";
                                  const [hour, minute] = time.split(":");
                                  const hourNum = parseInt(hour);
                                  const ampm = hourNum >= 12 ? "PM" : "AM";
                                  const displayHour =
                                    hourNum === 0
                                      ? 12
                                      : hourNum > 12
                                      ? hourNum - 12
                                      : hourNum;
                                  return `${displayHour}:${minute} ${ampm}`;
                                };

                                // Group consecutive days with same hours
                                const groupedHours = dayOrder
                                  .map((day) => {
                                    const dayHours = hours[day];
                                    if (!dayHours) return null;

                                    return {
                                      day,
                                      abbrev:
                                        dayAbbrevs[
                                          day as keyof typeof dayAbbrevs
                                        ],
                                      closed: dayHours.closed,
                                      open: dayHours.open,
                                      close: dayHours.close,
                                      display: dayHours.closed
                                        ? "Closed"
                                        : `${formatTime(
                                            dayHours.open
                                          )} - ${formatTime(dayHours.close)}`,
                                    };
                                  })
                                  .filter(Boolean);

                                // Check if all days have the same hours
                                const allSameHours = groupedHours.every(
                                  (day) =>
                                    day?.display === groupedHours[0]?.display
                                );

                                if (allSameHours && groupedHours.length > 0) {
                                  return (
                                    <View className="ml-13">
                                      <Text
                                        className="text-base font-bold leading-tight"
                                        style={{ color: theme.colors.text }}
                                      >
                                        Every day: {groupedHours[0]?.display}
                                      </Text>
                                    </View>
                                  );
                                }

                                return (
                                  <View className="space-y-1 ml-13">
                                    {groupedHours.map((dayInfo) => (
                                      <View
                                        key={dayInfo?.day}
                                        className="flex-row justify-between items-center py-0.5"
                                      >
                                        <Text
                                          className="w-12 text-sm font-medium"
                                          style={{
                                            color: isDarkMode
                                              ? theme.colors.text
                                              : "#6B7280",
                                          }}
                                        >
                                          {dayInfo?.abbrev}
                                        </Text>
                                        <Text
                                          className={`text-sm flex-1 ml-3 ${
                                            dayInfo?.closed
                                              ? "italic"
                                              : "font-medium"
                                          }`}
                                          style={{
                                            color: dayInfo?.closed
                                              ? isDarkMode
                                                ? "#F87171"
                                                : "#DC2626"
                                              : theme.colors.text,
                                          }}
                                        >
                                          {dayInfo?.display}
                                        </Text>
                                      </View>
                                    ))}
                                  </View>
                                );
                              }

                              // Fallback
                              return (
                                <Text
                                  className="text-base font-bold leading-tight ml-13"
                                  style={{ color: theme.colors.text }}
                                >
                                  Open daily
                                </Text>
                              );
                            })()}
                          </View>
                        )}

                        {/* Rating & Reviews - For static locations */}
                        {(currentData as any).rating && (
                          <View
                            className="flex-row items-center p-3 mb-3 rounded-xl"
                            style={{
                              backgroundColor: isDarkMode
                                ? "rgba(245, 158, 11, 0.1)"
                                : "rgb(255, 251, 235)",
                            }}
                          >
                            <View className="justify-center items-center mr-3 w-10 h-10 bg-amber-500 rounded-full">
                              <Star size={20} color="white" />
                            </View>
                            <View className="flex-1">
                              <Text className="mb-1 text-xs font-medium tracking-wide text-amber-600 uppercase">
                                Rating
                              </Text>
                              <View className="flex-row items-center">
                                <Text
                                  className="mr-2 text-base font-bold leading-tight"
                                  style={{ color: theme.colors.text }}
                                >
                                  {(currentData as any).rating.toFixed(1)} ★
                                </Text>
                                {(currentData as any).rating_count && (
                                  <Text
                                    className="text-sm"
                                    style={{
                                      color: isDarkMode
                                        ? theme.colors.text
                                        : "#6B7280",
                                    }}
                                  >
                                    (
                                    {(
                                      currentData as any
                                    ).rating_count.toLocaleString()}{" "}
                                    reviews)
                                  </Text>
                                )}
                              </View>
                            </View>
                          </View>
                        )}

                        {/* Price Level - For static locations */}
                        {(currentData as any).price_level &&
                          (currentData as any).price_level > 0 && (
                            <View
                              className="flex-row items-center p-3 mb-3 rounded-xl"
                              style={{
                                backgroundColor: isDarkMode
                                  ? "rgba(34, 197, 94, 0.1)"
                                  : "rgb(240, 253, 244)",
                              }}
                            >
                              <View className="justify-center items-center mr-3 w-10 h-10 bg-green-500 rounded-full">
                                <DollarSign size={20} color="white" />
                              </View>
                              <View className="flex-1">
                                <Text className="mb-1 text-xs font-medium tracking-wide text-green-600 uppercase">
                                  Price Range
                                </Text>
                                <Text
                                  className="text-base font-bold leading-tight"
                                  style={{ color: theme.colors.text }}
                                >
                                  {"$".repeat((currentData as any).price_level)}
                                  <Text
                                    className="ml-1 text-sm font-normal"
                                    style={{
                                      color: isDarkMode
                                        ? theme.colors.text
                                        : "#6B7280",
                                    }}
                                  >
                                    (
                                    {(currentData as any).price_level === 1
                                      ? "Inexpensive"
                                      : (currentData as any).price_level === 2
                                      ? "Moderate"
                                      : (currentData as any).price_level === 3
                                      ? "Expensive"
                                      : "Very Expensive"}
                                    )
                                  </Text>
                                </Text>
                              </View>
                            </View>
                          )}

                        {/* Phone Number - For static locations */}
                        {(currentData as any).phone && (
                          <TouchableOpacity
                            onPress={() =>
                              Linking.openURL(
                                `tel:${(currentData as any).phone}`
                              )
                            }
                            className="flex-row items-center p-3 mb-3 rounded-xl"
                            style={{
                              backgroundColor: isDarkMode
                                ? "rgba(59, 130, 246, 0.1)"
                                : "rgb(239, 246, 255)",
                            }}
                            activeOpacity={0.7}
                          >
                            <View className="justify-center items-center mr-3 w-10 h-10 bg-blue-500 rounded-full">
                              <Phone size={20} color="white" />
                            </View>
                            <View className="flex-1">
                              <Text className="mb-1 text-xs font-medium tracking-wide text-blue-600 uppercase">
                                Phone
                              </Text>
                              <Text
                                className="text-base font-bold leading-tight"
                                style={{ color: theme.colors.text }}
                              >
                                {(currentData as any).phone}
                              </Text>
                              <Text
                                className="text-xs mt-0.5"
                                style={{
                                  color: isDarkMode
                                    ? "rgba(59, 130, 246, 0.8)"
                                    : "#3B82F6",
                                }}
                              >
                                Tap to call
                              </Text>
                            </View>
                          </TouchableOpacity>
                        )}

                        {/* Location Prompts */}
                        {(currentData as any).category?.prompts &&
                          (currentData as any).category.prompts.length > 0 && (
                            <View
                              className="p-4 mb-6 rounded-2xl"
                              style={{
                                backgroundColor: isDarkMode
                                  ? "rgba(245, 158, 11, 0.1)"
                                  : "rgb(255, 251, 235)",
                              }}
                            >
                              <View className="flex-row justify-between items-center mb-3">
                                <View className="flex-row flex-1 items-center">
                                  <View className="justify-center items-center mr-3 w-8 h-8 bg-amber-500 rounded-full">
                                    <Sparkles size={16} color="white" />
                                  </View>
                                  <Text
                                    className="text-lg font-bold"
                                    style={{ color: theme.colors.text }}
                                  >
                                    What you can do here
                                  </Text>
                                </View>

                                {/* Action buttons - only show if more than 3 prompts */}
                                {(currentData as any).category.prompts.length >
                                  3 && (
                                  <View className="flex-row gap-2">
                                    {/* Shuffle Button */}
                                    <TouchableOpacity
                                      onPress={shufflePrompts}
                                      className="justify-center items-center w-8 h-8 rounded-full"
                                      style={{
                                        backgroundColor: isDarkMode
                                          ? "rgba(245, 158, 11, 0.3)"
                                          : "rgb(252, 211, 153)",
                                      }}
                                    >
                                      <Shuffle
                                        size={14}
                                        color={
                                          isDarkMode ? "#FCD34D" : "#92400E"
                                        }
                                      />
                                    </TouchableOpacity>

                                    {/* Show All Button */}
                                    <TouchableOpacity
                                      onPress={handleShowAllPrompts}
                                      className="px-2 py-1 rounded-full"
                                      style={{
                                        backgroundColor: isDarkMode
                                          ? "rgba(245, 158, 11, 0.3)"
                                          : "rgb(252, 211, 153)",
                                      }}
                                    >
                                      <Text
                                        className="text-xs font-medium"
                                        style={{
                                          color: isDarkMode
                                            ? "#FCD34D"
                                            : "#92400E",
                                        }}
                                      >
                                        All
                                      </Text>
                                    </TouchableOpacity>
                                  </View>
                                )}
                              </View>

                              <View className="flex-row flex-wrap gap-2">
                                {displayedPrompts.map(
                                  (prompt: Prompt, index: number) => (
                                    <View
                                      key={`${prompt.id}-${index}`}
                                      className="px-3 py-2 rounded-full"
                                      style={{
                                        backgroundColor: isDarkMode
                                          ? "rgba(245, 158, 11, 0.2)"
                                          : "rgb(252, 211, 153)",
                                      }}
                                    >
                                      <Text
                                        className="text-sm font-medium"
                                        style={{
                                          color: isDarkMode
                                            ? "#FCD34D"
                                            : "#92400E",
                                        }}
                                      >
                                        {prompt.name}
                                      </Text>
                                    </View>
                                  )
                                )}
                              </View>
                            </View>
                          )}
                      </>
                    )}

                    {/* Description */}
                    {currentData?.description && (
                      <View className="mb-6">
                        <Text
                          className="mb-3 text-lg font-bold"
                          style={{ color: theme.colors.text }}
                        >
                          {isEventType
                            ? "About this event"
                            : "About this place"}
                        </Text>
                        <Text
                          className="text-base leading-relaxed"
                          style={{
                            color: isDarkMode ? theme.colors.text : "#374151",
                          }}
                        >
                          {currentData.description}
                        </Text>
                      </View>
                    )}

                    {/* Creator Badge for User-Created Events */}
                    {isEventType && (currentData as any).created_by && (
                      <TouchableOpacity
                        onPress={handleCreatorClick}
                        className="flex-row items-center px-4 py-3 mb-6 rounded-2xl"
                        style={{
                          backgroundColor: isDarkMode
                            ? "rgba(59, 130, 246, 0.1)"
                            : "rgb(239, 246, 255)",
                        }}
                        activeOpacity={0.7}
                      >
                        <UserAvatar
                          size={36}
                          user={{
                            id: (currentData as any).created_by.id,
                            name:
                              (currentData as any).created_by.name || "Host",
                            image: (currentData as any).created_by.avatar_url,
                          }}
                        />
                        <View className="flex-1 ml-3">
                          <Text className="text-sm font-medium text-blue-600">
                            Created by
                          </Text>
                          <Text
                            className="text-base font-semibold"
                            style={{ color: theme.colors.text }}
                          >
                            {(currentData as any).created_by.name ||
                              `@${(currentData as any).created_by.username}` ||
                              "Community Member"}
                          </Text>
                        </View>
                        <View className="flex-row items-center">
                          <Sparkles size={20} color="#3B82F6" />
                          <ChevronRight size={16} color="#3B82F6" />
                        </View>
                      </TouchableOpacity>
                    )}

                    {/* Who's Going - Simple Avatar Display */}
                    {isEventType && attendeeProfiles.length > 0 && (
                      <View className="mb-6">
                        <Text
                          className="mb-3 text-lg font-bold"
                          style={{ color: theme.colors.text }}
                        >
                          Who's Going
                        </Text>
                        <View className="flex-row items-center">
                          <View className="flex-row mr-4">
                            {attendeeProfiles
                              .slice(0, 5)
                              .map((attendee: any, index: number) => (
                                <View
                                  key={`${attendee.id}-${index}`}
                                  className="bg-white rounded-full border-white border-3"
                                  style={{
                                    marginLeft: index > 0 ? -12 : 0,
                                    backgroundColor: theme.colors.card,
                                    borderColor: theme.colors.card,
                                  }}
                                >
                                  <UserAvatar
                                    size={44}
                                    user={{
                                      id: attendee.id,
                                      name: attendee.name,
                                      image: attendee.avatar_url,
                                    }}
                                  />
                                </View>
                              ))}
                          </View>
                          <View className="flex-1">
                            <Text
                              className="text-lg font-bold"
                              style={{ color: theme.colors.text }}
                            >
                              {attendeeCount}{" "}
                              {attendeeCount === 1 ? "person" : "people"}
                            </Text>
                            <Text
                              className="text-sm"
                              style={{
                                color: isDarkMode
                                  ? theme.colors.text
                                  : "#6B7280",
                              }}
                            >
                              {attendeeCount === 1 ? "is going" : "are going"}
                            </Text>
                          </View>
                        </View>
                      </View>
                    )}

                    {/* Recent Events at This Location */}
                    {!isEventType && locationEvents.length > 0 && (
                      <View className="mb-6">
                        <View className="flex-row items-center mb-4">
                          <Calendar size={20} color="#8B5CF6" />
                          <Text
                            className="ml-2 text-lg font-bold"
                            style={{ color: theme.colors.text }}
                          >
                            Recent Events at This Location
                          </Text>
                        </View>
                        <ScrollView
                          horizontal
                          showsHorizontalScrollIndicator={false}
                        >
                          <View className="flex-row gap-3">
                            {locationEvents.map((event: any, index: number) => (
                              <TouchableOpacity
                                key={`location-event-${event.id}-${index}`}
                                onPress={() => {
                                  console.log(
                                    "🎯 [UnifiedDetailsSheet] Opening location event as event sheet:",
                                    event.name
                                  );
                                  // Set the selected location event to show event details
                                  setSelectedLocationEvent(event);
                                }}
                                className="overflow-hidden rounded-xl border"
                                style={{
                                  width: 200,
                                  backgroundColor: theme.colors.card,
                                  borderColor: theme.colors.border,
                                }}
                              >
                                <OptimizedImage
                                  uri={event.image_urls?.[0]}
                                  width={300}
                                  height={96}
                                  quality={80}
                                  className="w-full h-24"
                                  resizeMode="cover"
                                />
                                <View className="p-3">
                                  <Text
                                    className="text-sm font-bold"
                                    style={{ color: theme.colors.text }}
                                    numberOfLines={2}
                                  >
                                    {event.name}
                                  </Text>
                                  <Text
                                    className="mt-1 text-xs"
                                    style={{
                                      color: isDarkMode
                                        ? theme.colors.text
                                        : "#6B7280",
                                    }}
                                    numberOfLines={1}
                                  >
                                    {formatDate(event.start_datetime)}
                                  </Text>
                                  {event.attendees?.count > 0 && (
                                    <View className="flex-row items-center mt-2">
                                      <Users size={12} color="#6B7280" />
                                      <Text
                                        className="ml-1 text-xs"
                                        style={{
                                          color: isDarkMode
                                            ? theme.colors.text
                                            : "#6B7280",
                                        }}
                                      >
                                        {event.attendees.count} going
                                      </Text>
                                    </View>
                                  )}
                                </View>
                              </TouchableOpacity>
                            ))}
                          </View>
                        </ScrollView>
                      </View>
                    )}

                    {/* No Events Message */}
                    {!isEventType &&
                      !loadingLocationEvents &&
                      locationEvents.length === 0 && (
                        <View className="mb-6">
                          <View className="flex-row items-center mb-3">
                            <Calendar size={20} color="#8B5CF6" />
                            <Text
                              className="ml-2 text-lg font-bold"
                              style={{ color: theme.colors.text }}
                            >
                              Events at This Location
                            </Text>
                          </View>
                          <View
                            className="p-4 rounded-xl"
                            style={{
                              backgroundColor: isDarkMode
                                ? theme.colors.border
                                : "#F9FAFB",
                            }}
                          >
                            <Text
                              className="text-center"
                              style={{
                                color: isDarkMode
                                  ? theme.colors.text
                                  : "#6B7280",
                              }}
                            >
                              No events have been created at this location yet.
                            </Text>
                            <Text
                              className="mt-1 text-sm text-center"
                              style={{
                                color: isDarkMode
                                  ? "rgba(255,255,255,0.6)"
                                  : "#9CA3AF",
                              }}
                            >
                              Be the first to create an event here!
                            </Text>
                          </View>
                        </View>
                      )}

                    {/* Loading State for Location Events */}
                    {!isEventType && loadingLocationEvents && (
                      <View className="flex-row justify-center items-center py-4 mb-6">
                        <ActivityIndicator size="small" color="#8B5CF6" />
                        <Text
                          className="ml-2"
                          style={{
                            color: isDarkMode ? theme.colors.text : "#6B7280",
                          }}
                        >
                          Loading events...
                        </Text>
                      </View>
                    )}

                    {/* Photo Gallery */}
                    {currentData?.image_urls &&
                      currentData.image_urls.length > 1 && (
                        <View className="mb-6">
                          <Text
                            className="mb-3 text-lg font-bold"
                            style={{ color: theme.colors.text }}
                          >
                            {isEventType ? "Event Photos" : "Location Photos"}
                          </Text>
                          <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                          >
                            <View className="flex-row gap-3">
                              {currentData.image_urls
                                .slice(1)
                                .map((url: string, index: number) => (
                                  <TouchableOpacity
                                    key={index}
                                    onPress={() => {
                                      setSelectedImage(url);
                                      setSelectedImageIndex(index + 1); // +1 because we're slicing from index 1
                                    }}
                                    className="overflow-hidden w-32 h-32 rounded-xl"
                                  >
                                    <Image
                                      source={{ uri: url }}
                                      className="w-full h-full"
                                      resizeMode="cover"
                                    />
                                  </TouchableOpacity>
                                ))}
                            </View>
                          </ScrollView>
                        </View>
                      )}

                    {/* Divider */}
                    {similarItems.length > 0 && (
                      <View
                        className="mb-6 h-px"
                        style={{ backgroundColor: theme.colors.border }}
                      />
                    )}

                    {/* Similar Events/Locations */}
                    {similarItems.length > 0 && (
                      <View className="mb-6">
                        <View className="flex-row items-center mb-4">
                          <TrendingUp size={20} color="#8B5CF6" />
                          <Text
                            className="ml-2 text-lg font-bold"
                            style={{ color: theme.colors.text }}
                          >
                            {isEventType
                              ? "Similar Events Nearby"
                              : "Similar Places Nearby"}
                          </Text>
                        </View>
                        <ScrollView
                          horizontal
                          showsHorizontalScrollIndicator={false}
                        >
                          <View className="flex-row gap-4">
                            {similarItems.map((item: any, index: number) => (
                              <TouchableOpacity
                                key={`${item.id}-${index}`}
                                onPress={() => onDataSelect(item)}
                                className="overflow-hidden w-48 rounded-2xl border shadow-sm"
                                style={{
                                  backgroundColor: theme.colors.card,
                                  borderColor: theme.colors.border,
                                }}
                              >
                                <OptimizedImage
                                  uri={item.image_urls?.[0]}
                                  width={192}
                                  height={112}
                                  quality={80}
                                  className="w-full h-28"
                                  resizeMode="cover"
                                />
                                <View className="p-3">
                                  <Text
                                    className="mb-1 text-sm font-bold"
                                    style={{ color: theme.colors.text }}
                                    numberOfLines={2}
                                  >
                                    {item.name}
                                  </Text>
                                  {isEventData(item) && item.start_datetime && (
                                    <Text
                                      className="text-xs"
                                      style={{
                                        color: isDarkMode
                                          ? "rgba(255,255,255,0.7)"
                                          : "#6B7280",
                                      }}
                                    >
                                      {formatDate(item.start_datetime)}
                                    </Text>
                                  )}
                                  {isEventData(item) &&
                                    item.attendees?.count > 0 && (
                                      <View className="flex-row items-center mt-1">
                                        <Users size={12} color="#8B5CF6" />
                                        <Text className="ml-1 text-xs font-medium text-purple-600">
                                          {item.attendees.count} going
                                        </Text>
                                      </View>
                                    )}
                                  {/* Show category and rating for locations */}
                                  {!isEventData(item) && (
                                    <View className="mt-1">
                                      <Text
                                        className="text-xs"
                                        style={{
                                          color: isDarkMode
                                            ? "rgba(255,255,255,0.7)"
                                            : "#6B7280",
                                        }}
                                      >
                                        {getCategoryName(
                                          item.category?.name || item.type
                                        ) || "Place"}
                                      </Text>
                                      {(item as any).rating && (
                                        <View className="flex-row items-center mt-1">
                                          <Star size={12} color="#F59E0B" />
                                          <Text
                                            className="ml-1 text-xs font-medium"
                                            style={{ color: "#F59E0B" }}
                                          >
                                            {(item as any).rating.toFixed(1)}
                                          </Text>
                                          {(item as any).rating_count && (
                                            <Text
                                              className="ml-1 text-xs"
                                              style={{
                                                color: isDarkMode
                                                  ? "rgba(255,255,255,0.5)"
                                                  : "#9CA3AF",
                                              }}
                                            >
                                              ({(item as any).rating_count})
                                            </Text>
                                          )}
                                        </View>
                                      )}
                                    </View>
                                  )}
                                </View>
                              </TouchableOpacity>
                            ))}
                          </View>
                        </ScrollView>
                      </View>
                    )}

                    {/* Categories (for events) */}
                    {isEventType &&
                      (currentData as any).categories &&
                      (currentData as any).categories.length > 0 && (
                        <View className="mb-6">
                          <Text
                            className="mb-3 text-lg font-bold"
                            style={{ color: theme.colors.text }}
                          >
                            Event Categories
                          </Text>
                          <View className="flex-row flex-wrap gap-2">
                            {(currentData as any).categories
                              .filter((category: any) =>
                                getCategoryName(category.name)
                              )
                              .map((category: any, index: number) => (
                                <View
                                  key={`${category.id}-${index}`}
                                  className="px-4 py-2 rounded-full"
                                  style={{
                                    backgroundColor: isDarkMode
                                      ? "rgba(139, 92, 246, 0.2)"
                                      : "rgb(237, 233, 254)",
                                  }}
                                >
                                  <Text
                                    className="text-sm font-semibold"
                                    style={{
                                      color: isDarkMode ? "#A78BFA" : "#6B46C1",
                                    }}
                                  >
                                    {getCategoryName(category.name)}
                                  </Text>
                                </View>
                              ))}
                          </View>
                        </View>
                      )}

                    {/* ticket */}
                    {data?.ticket_enabled && (
                      <View style={{ marginBottom: 24 }}>
                        <Text
                          style={{
                            fontSize: 16,
                            fontWeight: "600",
                            color: theme.colors.text,
                            marginBottom: 12,
                          }}
                        >
                          Ticket
                        </Text>
                        <View
                          style={{
                            padding: 12,
                            borderRadius: 12,
                            backgroundColor: theme.dark
                              ? "rgba(255, 255, 255, 0.05)"
                              : "rgba(255, 255, 255, 0.3)",
                          }}
                        >
                          <Text style={{ color: theme.colors.text, flex: 1 }}>
                            Ticket Total: {data?.ticket_total}
                          </Text>
                          <Text style={{ color: theme.colors.text, flex: 1 }}>
                            Ticket Limit Per Person:{" "}
                            {data?.ticket_limit_per_user}
                          </Text>
                        </View>
                      </View>
                    )}

                    {/* Selected Users List */}
                    {data?.co_creators && (
                      <View>
                        <Text
                          style={{
                            fontSize: 16,
                            fontWeight: "600",
                            color: theme.colors.text,
                            marginBottom: 12,
                          }}
                        >
                          Co Creators
                        </Text>
                        <View className="flex-row flex-wrap gap-2">
                          {data?.co_creators?.map((user) => (
                            <TouchableOpacity
                              key={user.user[0]?.id}
                              onPress={() => toggleUserSelection(user.user[0])}
                              style={{
                                flexDirection: "row",
                                alignItems: "center",
                                backgroundColor: `${theme.colors.primary}`,
                                paddingHorizontal: 12,
                                paddingVertical: 8,
                                borderRadius: 20,
                                borderWidth: 1,
                                borderColor: `${theme.colors.primary}30`,
                              }}
                            >
                              <Avatar
                                className="mr-2 w-6 h-6"
                                alt={getUserDisplayName(user?.user[0])}
                              >
                                {user.avatar_url ? (
                                  <AvatarImage
                                    source={{ uri: user?.user[0].avatar_url }}
                                  />
                                ) : (
                                  <AvatarFallback>
                                    <Text
                                      style={{
                                        fontSize: 12,
                                        fontWeight: "600",
                                        color: theme.colors.text,
                                      }}
                                    >
                                      {getUserInitials(user?.user[0])}
                                    </Text>
                                  </AvatarFallback>
                                )}
                              </Avatar>
                              <Text
                                style={{
                                  color: theme.colors.text,
                                  fontWeight: "600",
                                  fontSize: 14,
                                  marginRight: 8,
                                }}
                              >
                                {getUserDisplayName(user.user[0])}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>
                    )}
                  </View>
                </BottomSheetScrollView>

                {/* Fixed Bottom Actions */}
                <View
                  className="absolute right-0 bottom-0 left-0 px-6 py-4 border-t"
                  style={{
                    paddingBottom: insets.bottom + 16,
                    backgroundColor: theme.colors.card,
                    borderTopColor: theme.colors.border,
                  }}
                >
                  {isEventType ? (
                    <View className="flex-row gap-3">
                      {/* Tickets Button - Only show for Ticketmaster events */}
                      {hasTickets && !isJoined && (
                        <TouchableOpacity
                          onPress={handleTicketPurchase}
                          className="flex-1 items-center py-4 bg-white rounded-2xl border-2 border-purple-600"
                        >
                          <Text className="text-lg font-semibold text-purple-600">
                            {hasTitle ? hasTitle : "Buy Tickets"}
                          </Text>
                        </TouchableOpacity>
                      )}

                      {/* Join/Create Orbit/Leave Button */}
                      {loading ? (
                        <View className="flex-1 items-center py-4 bg-purple-600 rounded-2xl">
                          <ActivityIndicator size="small" color="white" />
                        </View>
                      ) : isJoined ? (
                        <>
                          {/* Create Orbit Button */}
                          <TouchableOpacity
                            onPress={handleCreateOrbit}
                            className="flex-1 items-center py-4 bg-purple-600 rounded-2xl"
                          >
                            <Text className="text-lg font-semibold text-white">
                              Create Orbit
                            </Text>
                          </TouchableOpacity>

                          {/* Leave Event Button */}
                          <TouchableOpacity
                            onPress={handleLeaveEvent}
                            className="flex-1 items-center py-4 bg-red-600 rounded-2xl"
                          >
                            <Text className="text-lg font-semibold text-white">
                              Leave Event
                            </Text>
                          </TouchableOpacity>
                        </>
                      ) : (
                        <TouchableOpacity
                          onPress={handleJoinEvent}
                          className="flex-1 items-center py-4 bg-purple-600 rounded-2xl"
                        >
                          <Text className="text-lg font-semibold text-white">
                            Join Event
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  ) : (
                    <View className="flex-row gap-3">
                      {/* Tickets Button for Location - Only show for Ticketmaster events */}
                      {hasTickets && (
                        <TouchableOpacity
                          onPress={handleTicketPurchase}
                          className="flex-1 items-center py-4 bg-white rounded-2xl border-2 border-purple-600"
                        >
                          <Text className="text-lg font-semibold text-purple-600">
                            {hasTitle ? hasTitle : "Buy Tickets"}
                          </Text>
                        </TouchableOpacity>
                      )}

                      {/* Create Event Button */}
                      <TouchableOpacity
                        onPress={handleCreateEvent}
                        className="flex-1 items-center py-4 bg-purple-600 rounded-2xl"
                      >
                        <Text className="text-lg font-semibold text-white">
                          Create Event Here
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </SafeAreaView>
            </BottomSheet>

            {/* Enhanced Image Viewer Modal with Swiping */}
            <Modal
              visible={!!selectedImage}
              transparent={true}
              animationType="fade"
              onRequestClose={() => setSelectedImage(null)}
              statusBarTranslucent={true}
              presentationStyle="overFullScreen"
            >
              <View
                className="flex-1"
                {...panResponder.panHandlers}
                style={{
                  backgroundColor: isDarkMode
                    ? "rgba(0,0,0,0.95)"
                    : "rgba(0,0,0,0.95)",
                  zIndex: 10000,
                  elevation: 1000, // For Android
                }}
              >
                {/* Top Controls */}
                <View className="absolute top-0 right-0 left-0 z-10 flex-row justify-between items-center p-4 pt-12">
                  <TouchableOpacity
                    className="justify-center items-center w-10 h-10 rounded-full bg-white/20"
                    onPress={() => setSelectedImage(null)}
                  >
                    <X size={24} color="white" />
                  </TouchableOpacity>

                  <View className="px-3 py-1 rounded-full bg-black/50">
                    <Text className="text-sm text-white">
                      {selectedImageIndex + 1} of{" "}
                      {currentData?.image_urls?.length || 0}
                    </Text>
                  </View>
                </View>

                {/* Swipeable Image Gallery */}
                <ScrollView
                  horizontal
                  pagingEnabled
                  showsHorizontalScrollIndicator={false}
                  onMomentumScrollEnd={(event) => {
                    const newIndex = Math.round(
                      event.nativeEvent.contentOffset.x / SCREEN_WIDTH
                    );
                    setSelectedImageIndex(newIndex);
                    if (currentData?.image_urls?.[newIndex]) {
                      setSelectedImage(currentData.image_urls[newIndex]);
                    }
                  }}
                  contentOffset={{ x: selectedImageIndex * SCREEN_WIDTH, y: 0 }}
                  style={{ flex: 1 }}
                >
                  {(currentData?.image_urls || []).map(
                    (url: string, index: number) => (
                      <View
                        key={index}
                        style={{ width: SCREEN_WIDTH, height: SCREEN_HEIGHT }}
                        className="justify-center items-center"
                      >
                        <Image
                          source={{ uri: url }}
                          style={{
                            width: SCREEN_WIDTH - 40,
                            height: SCREEN_HEIGHT - 200,
                          }}
                          resizeMode="contain"
                        />
                      </View>
                    )
                  )}
                </ScrollView>

                {/* Bottom Navigation Dots */}
                {(currentData?.image_urls || []).length > 1 && (
                  <View className="absolute right-0 left-0 bottom-20 flex-row justify-center">
                    <View className="flex-row px-4 py-2 rounded-full bg-black/50">
                      {(currentData?.image_urls || []).map((_, index) => (
                        <TouchableOpacity
                          key={index}
                          onPress={() => {
                            setSelectedImageIndex(index);
                            if (currentData?.image_urls?.[index]) {
                              setSelectedImage(currentData.image_urls[index]);
                            }
                          }}
                          className={`w-2 h-2 rounded-full mx-1 ${
                            index === selectedImageIndex
                              ? "bg-white"
                              : "bg-white/50"
                          }`}
                        />
                      ))}
                    </View>
                  </View>
                )}

                {/* Swipe indicator hint */}
                <View className="absolute right-0 left-0 bottom-4 items-center">
                  <Text className="text-xs text-white/60">
                    Swipe up or down to close
                  </Text>
                </View>
              </View>
            </Modal>

            {/* All Prompts Modal */}
            <Modal
              visible={showAllPromptsModal}
              transparent={true}
              animationType="slide"
              onRequestClose={() => setShowAllPromptsModal(false)}
              statusBarTranslucent={true}
              presentationStyle="overFullScreen"
            >
              <View
                className="flex-1"
                style={{
                  backgroundColor: isDarkMode
                    ? "rgba(0,0,0,0.8)"
                    : "rgba(0,0,0,0.6)",
                }}
              >
                {/* Modal Content */}
                <View
                  className="flex-1 mx-4 mt-20 mb-8 rounded-t-3xl"
                  style={{ backgroundColor: theme.colors.card }}
                >
                  {/* Header */}
                  <View
                    className="flex-row justify-between items-center p-6 border-b"
                    style={{ borderBottomColor: theme.colors.border }}
                  >
                    <View className="flex-row items-center">
                      <View className="justify-center items-center mr-3 w-10 h-10 bg-amber-500 rounded-full">
                        <Sparkles size={20} color="white" />
                      </View>
                      <Text
                        className="text-xl font-bold"
                        style={{ color: theme.colors.text }}
                      >
                        What you can do here
                      </Text>
                    </View>

                    <TouchableOpacity
                      onPress={() => setShowAllPromptsModal(false)}
                      className="justify-center items-center w-10 h-10 rounded-full"
                      style={{
                        backgroundColor: isDarkMode
                          ? "rgba(255,255,255,0.1)"
                          : "rgba(0,0,0,0.1)",
                      }}
                    >
                      <X size={20} color={theme.colors.text} />
                    </TouchableOpacity>
                  </View>

                  {/* Scrollable Prompts */}
                  <ScrollView
                    className="flex-1 p-6"
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingBottom: 20 }}
                  >
                    <View className="flex-row flex-wrap gap-3">
                      {((detailData || data) as any).category?.prompts?.map(
                        (prompt: Prompt, index: number) => (
                          <View
                            key={`all-prompt-${prompt.id}-${index}`}
                            className="px-4 py-3 rounded-xl"
                            style={{
                              backgroundColor: isDarkMode
                                ? "rgba(245, 158, 11, 0.15)"
                                : "rgb(255, 251, 235)",
                            }}
                          >
                            <Text
                              className="text-base font-medium"
                              style={{
                                color: isDarkMode ? "#FCD34D" : "#92400E",
                              }}
                            >
                              {prompt.name}
                            </Text>
                          </View>
                        )
                      )}
                    </View>

                    {/* Random suggestion hint */}
                    <View
                      className="p-4 mt-6 rounded-xl"
                      style={{
                        backgroundColor: isDarkMode
                          ? "rgba(139, 92, 246, 0.1)"
                          : "rgb(245, 243, 255)",
                      }}
                    >
                      <View className="flex-row items-center mb-2">
                        <Shuffle size={16} color="#8B5CF6" />
                        <Text className="ml-2 text-sm font-semibold text-purple-600">
                          Pro tip
                        </Text>
                      </View>
                      <Text
                        className="text-sm leading-relaxed"
                        style={{
                          color: isDarkMode ? theme.colors.text : "#6B7280",
                        }}
                      >
                        Use the shuffle button to discover new activities each
                        time you visit this location!
                      </Text>
                    </View>
                  </ScrollView>
                </View>
              </View>
            </Modal>

            {/* Location Event Details Sheet */}
            {selectedLocationEvent && (
              <UnifiedDetailsSheet
                data={selectedLocationEvent}
                isOpen={!!selectedLocationEvent}
                onClose={() => setSelectedLocationEvent(null)}
                nearbyData={nearbyData}
                onDataSelect={onDataSelect}
                onShowControler={onShowControler}
                isEvent={true} // Always treat location events as events
              />
            )}

            <TicketDialog
              visible={showDialog}
              onClose={() => setShowDialog(false)}
              onConfirm={handleConfirm}
            />
          </View>
        </GestureHandlerRootView>
      </Modal>
    );
  }
);
