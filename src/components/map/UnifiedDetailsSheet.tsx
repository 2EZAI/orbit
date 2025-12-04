import BottomSheet, { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { router } from "expo-router";
import { ArrowLeft, Flag, Tag, UserCheck, Users, X } from "lucide-react-native";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  DeviceEventEmitter,
  Dimensions,
  Image,
  Modal,
  PanResponder,
  ScrollView,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useEventJoinStatus } from "~/hooks/useEventJoinStatus";
import { useJoinEvent } from "~/hooks/useJoinEvent";
import { useLocationEvents } from "~/hooks/useLocationEvents";
import { MapEvent, MapLocation } from "~/hooks/useUnifiedMapData";
import { useTheme } from "~/src/components/ThemeProvider";
import { ConfettiAnimation } from "~/src/components/ui/ConfettiAnimation";
import { Text } from "~/src/components/ui/text";
import { haptics } from "~/src/lib/haptics";
import { UnifiedDetailsSheetContent } from "./UnifiedDetailsSheetContent";
import { UnifiedSheetButtons } from "./UnifiedSheetButtons";
import FlagContentModal from "../modals/FlagContentModal";
import { useFlagging } from "~/hooks/useFlagging";

// Additional types that were in the old hook
export interface Category {
  id: string;
  name: string;
  icon?: string;
}

export type UnifiedData = (MapEvent | MapLocation) & {
  created_by?: {
    id: string;
    name: string;
    username?: string;
    avatar_url: string | null;
  };
  join_status?: boolean;
  external_url?: string;
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
  source?: string;
};

interface UnifiedDetailsSheetProps {
  data: UnifiedData;
  isOpen: boolean;
  onClose: () => void;
  nearbyData: UnifiedData[];
  onDataSelect: (data: UnifiedData) => void;
  onShowControler: () => void;
  isEvent?: boolean;
  onShare: (data: UnifiedData, isEventType: boolean) => void;
  from?: string; // Track where user came from (e.g., "home", "profile", "social", "map")
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

// Type guards
const isEventData = (data: UnifiedData, isEvent?: boolean): boolean => {
  if (isEvent !== undefined) {
    return isEvent;
  }

  // Check source field first - if it's explicitly "location", it's a location
  if (data.source === "location") {
    return false;
  }

  // Use explicit type field first, then fall back to field detection
  if (data.type) {
    return data.type === "user_created" || data.type === "event";
  }

  // Fallback: check for event fields but exclude Google API locations
  if (data.type === "googleApi") {
    return false; // Google API items with event fields are still locations
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
    onShare,
    from,
  }: UnifiedDetailsSheetProps) => {
    const [loading, setLoading] = useState(false);
    const [detailData, setDetailData] = useState<UnifiedData | undefined>(
      undefined
    );
    const [flagOpen, setFlagOpen] = useState({
      open: false,
      eventId: "",
      locationId: "",
    });
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [selectedImageIndex, setSelectedImageIndex] = useState<number>(0);
    // Track viewer open state to avoid late momentum callbacks re-opening the modal
    const isViewerOpenRef = useRef<boolean>(false);
    useEffect(() => {
      isViewerOpenRef.current = !!selectedImage;
    }, [selectedImage]);
    const [manuallyUpdated, setManuallyUpdated] = useState(false);
    const [showConfetti, setShowConfetti] = useState(false);
    const { createFlag } = useFlagging();
    // Memoize the event type check to prevent repeated calculations
    const isEventType = useMemo(() => {
      const result = isEventData(data, isEvent);

      return result;
    }, [data?.id, isEvent]);

    // Use our new hook for location events
    const locationIdForEvents = !isEventType ? data.id : null;

    const {
      events: locationEvents,
      loading: loadingLocationEvents,
      error: locationEventsError,
    } = useLocationEvents(locationIdForEvents);

    const [selectedLocationEvent, setSelectedLocationEvent] =
      useState<any>(null);
    const insets = useSafeAreaInsets();
    const { theme, isDarkMode } = useTheme();

    // NEW: Use the join event hooks (like web app)
    const { joinEvent, leaveEvent, isLoading: isJoining } = useJoinEvent();

    // NEW: Get actual join status and creator check from database
    // Extract created_by ID (could be string or object)
    const createdById = isEventType
      ? typeof (data as any).created_by === "string"
        ? (data as any).created_by
        : (data as any).created_by?.id
      : undefined;

    const {
      isJoined: isJoinedFromDB,
      isCreator,
      refetch: refetchJoinStatus,
    } = useEventJoinStatus(isEventType ? data.id : undefined, createdById);

    // Simple confetti trigger with celebration haptics
    const triggerConfetti = () => {
      setShowConfetti(true);
      haptics.celebration();
    };

    // Trigger light haptics when sheet opens (especially for deep links)
    useEffect(() => {
      if (isOpen && data) {
        haptics.light();
      }
    }, [isOpen, data?.id]);

    // Location events are now handled by the useLocationEvents hook above

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

    const handleShare = async () => {
      const currentData = detailData || data;
      onShare(currentData, isEventType);
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
      // For events, we want to create a new activity at the same location
      // For locations, we want to create an activity at that location
      const locationData = isEventType ? (data as any).location : data;

      console.log("🔧 [UnifiedDetailsSheet] handleCreateActivity:", {
        isEventType,
        data: data,
        locationData: locationData,
      });

      // Close the sheet first
      onClose();

      // Simplify category to just essential info for URL params
      const simplifiedCategory = {
        id: (locationData as any).category?.id || "",
        name: (locationData as any).category?.name || "",
      };

      // Handle coordinates - could be in different formats
      let latitude = "";
      let longitude = "";

      // Check for coordinates in location.coordinates (GeoJSON format) or direct coordinates property
      const coords =
        locationData.location?.coordinates || locationData.coordinates;

      if (coords) {
        if (Array.isArray(coords)) {
          // GeoJSON format: [longitude, latitude]
          longitude = coords[0]?.toString() || "";
          latitude = coords[1]?.toString() || "";
        } else {
          // Object format: {latitude, longitude}
          latitude = coords.latitude?.toString() || "";
          longitude = coords.longitude?.toString() || "";
        }
      }

      const params = {
        locationId: locationData.id || "",
        locationType: (locationData as any).type || "",
        latitude,
        longitude,
        address: (locationData as any).address || "",
        categoryId: simplifiedCategory.id,
        categoryName: simplifiedCategory.name,
      };

      console.log("🔧 [UnifiedDetailsSheet] Create activity params:", params);

      router.push({
        pathname: "/(app)/(create)",
        params: {
          ...params,
          from: "details",
        },
      });
    };

    const handleEdit = () => {
      // Close the sheet first
      onClose();

      // Navigate to edit activity screen
      router.push({
        pathname: "/(app)/(create)",
        params: {
          eventId: data.id,
          editMode: "true",
          from: "details",
        },
      });
    };

    const handleDelete = () => {
      // Close the sheet - UnifiedSheetButtons will handle deletion and navigation
      onClose();
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

    // Use data directly like web app (backend should return complete data)
    const hitDetailApi = async () => {
      setDetailData(data as UnifiedData);
      setLoading(false);
    };

    const handleJoinEvent = async () => {
      if (!isEventType) return;

      try {
        const source =
          (data as any).is_ticketmaster ||
          (data as any).source === "ticketmaster"
            ? "ticketmaster"
            : "supabase";

        if (isJoinedFromDB) {
          // Leave event
          await leaveEvent(data.id, source);
        } else {
          // Join event
          await joinEvent(data.id, source);

          // Trigger confetti animation when joining
          triggerConfetti();
        }

        // Refetch status from database
        await refetchJoinStatus();

        // Update local detail data
        const updatedData = {
          ...(detailData || data),
          join_status: !isJoinedFromDB,
        };
        setDetailData(updatedData as UnifiedData);
        setManuallyUpdated(true);

        console.log(
          `✅ Successfully ${isJoinedFromDB ? "left" : "joined"} event!`
        );
      } catch (error) {
        console.error("❌ Error updating event status:", error);
      }
    };

    const handleLeaveEvent = async () => {
      if (!isEventType) return;

      try {
        const source =
          (data as any).is_ticketmaster ||
          (data as any).source === "ticketmaster"
            ? "ticketmaster"
            : "supabase";

        await leaveEvent(data.id, source);

        // Refetch status from database
        await refetchJoinStatus();

        // Update local detail data
        const updatedData = { ...(detailData || data), join_status: false };
        setDetailData(updatedData as UnifiedData);
        setManuallyUpdated(true);

        console.log("✅ Successfully left event!");
      } catch (error) {
        console.error("❌ Error leaving event:", error);
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

      // Fetch full details if needed
      hitDetailApi();

      // Events for this location are automatically loaded by the useLocationEvents hook

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

    const currentData = detailData || data;
    const similarItems = getSimilarItems;

    // Debug log to see what data we have
    console.log("🔍 [UnifiedDetailsSheet] Current data:", {
      id: currentData.id,
      name: currentData.name,
      description: currentData.description,
      created_by: currentData.created_by,
      type: currentData.type,
    });

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
    const hasTickets = !!currentData.external_url;
    // Use database join status (isJoinedFromDB) instead of local join_status
    const isJoined = isJoinedFromDB;
    const attendeeCount = (currentData as any).attendees?.count || 0;
    const attendeeProfiles = (currentData as any).attendees?.profiles || [];

    // Determine event source and type for proper button logic
    const eventSource = (currentData as any).source;
    const isTicketmasterEvent =
      (currentData as any).is_ticketmaster === true ||
      eventSource === "ticketmaster" ||
      Boolean((currentData as any).ticketmaster_details);
    const isUserEvent = eventSource === "user";
    const isGoogleApiEvent =
      eventSource &&
      (eventSource === "googleapi" ||
        eventSource === "google" ||
        eventSource === "api" ||
        eventSource.includes("google") ||
        eventSource.includes("api"));

    // Use database creator check (isCreator from hook) - already defined above

    return (
      <>
        <Modal
          visible={isOpen}
          transparent={true}
          animationType="none"
          onRequestClose={onClose}
          statusBarTranslucent={true}
          presentationStyle="overFullScreen"
        >
          <View style={{ flex: 1 }}>
            {/* Confetti Animation */}
            <ConfettiAnimation
              isActive={showConfetti}
              onComplete={() => setShowConfetti(false)}
            />
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
              <BottomSheetScrollView
                contentContainerStyle={{ paddingBottom: 160 + insets.bottom }}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                {/* Hero Image Section */}
                <View className="relative">
                  <ScrollView
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    nestedScrollEnabled={true}
                    style={{ height: SCREEN_HEIGHT * 0.35 }}
                  >
                    {(currentData?.image_urls || []).map((imageUrl, index) => (
                      <TouchableOpacity
                        key={index}
                        onPress={() => {
                          // Open viewer at tapped image index
                          isViewerOpenRef.current = true;
                          setSelectedImage(imageUrl);
                          setSelectedImageIndex(index);
                        }}
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
                    ))}
                  </ScrollView>

                  {/* Top Bar Overlay */}
                  <View className="absolute top-0 right-0 left-0 flex-row justify-between items-center p-4 pt-12">
                    <TouchableOpacity
                      onPress={onClose}
                      className="justify-center items-center w-10 h-10 rounded-full shadow-lg bg-white/90"
                    >
                      <ArrowLeft size={20} color="#000" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => {
                        setFlagOpen({
                          open: true,
                          eventId: isEventType ? currentData.id : "",
                          locationId: isEventType ? "" : currentData.id,
                        });
                      }}
                      className="justify-center items-center w-10 h-10 rounded-full shadow-lg bg-white/90"
                    >
                      <Flag size={20} color="#000" />
                    </TouchableOpacity>
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
                            className="w-2 h-2 rounded-full bg-white/70 mx-0.5"
                          />
                        ))}
                      </View>
                    </View>
                  )}

                  {/* Category Badge - Only show for valid categories */}
                  {categoryName && categoryName !== "Place" && (
                    <View className="absolute bottom-4 left-4">
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
                          style={{ color: isDarkMode ? "#1F2937" : "#1F2937" }}
                        >
                          {categoryName}
                        </Text>
                      </View>
                    </View>
                  )}
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

                  {/* Conditional Content Based on Type */}
                  <UnifiedDetailsSheetContent
                    data={currentData}
                    isEventType={isEventType}
                    isTicketmasterEvent={isTicketmasterEvent}
                    isUserEvent={isUserEvent}
                    isGoogleApiEvent={isGoogleApiEvent}
                    isCreator={isCreator}
                    isJoined={isJoined}
                    hasTickets={hasTickets}
                    attendeeCount={attendeeCount}
                    attendeeProfiles={attendeeProfiles}
                    locationEvents={locationEvents}
                    loadingLocationEvents={loadingLocationEvents}
                    nearbyData={nearbyData}
                    onDataSelect={onDataSelect}
                    onShowControler={onShowControler}
                  />

                  {/* Photo Gallery */}
                  {currentData?.image_urls &&
                    currentData.image_urls.length > 1 && (
                      <View className="mb-6">
                        <Text
                          className="mb-3 text-lg font-bold"
                          style={{ color: theme.colors.text }}
                        >
                          {isEventType ? "Activity Photos" : "Location Photos"}
                        </Text>
                        <ScrollView
                          horizontal
                          showsHorizontalScrollIndicator={false}
                          nestedScrollEnabled={true}
                        >
                          <View className="flex-row gap-3">
                            {currentData.image_urls
                              .slice(1)
                              .map((url: string, index: number) => (
                                <TouchableOpacity
                                  key={index}
                                  onPress={() => {
                                    setSelectedImage(url);
                                    setSelectedImageIndex(index + 1);
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
                </View>
              </BottomSheetScrollView>

              {/* Fixed Bottom Actions */}
              <UnifiedSheetButtons
                data={currentData}
                isEventType={isEventType}
                loading={loading}
                isJoined={isJoined}
                hasTickets={hasTickets}
                isCreator={isCreator}
                onTicketPurchase={handleTicketPurchase}
                onJoinEvent={handleJoinEvent}
                onLeaveEvent={handleLeaveEvent}
                onCreateOrbit={handleCreateOrbit}
                onCreateEvent={handleCreateEvent}
                onEdit={handleEdit}
                onShare={handleShare}
                onDelete={handleDelete}
                from={from}
              />
            </BottomSheet>

            {/* Enhanced Image Viewer Modal with Swiping */}

            <Modal
              visible={!!selectedImage}
              transparent={true}
              animationType="fade"
              onRequestClose={() => {
                // Close viewer and guard against late momentum events
                isViewerOpenRef.current = false;
                setSelectedImage(null);
              }}
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
                    onPress={() => {
                      console.log("Closing image viewer");
                      isViewerOpenRef.current = false;
                      setSelectedImage(null);
                    }}
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
                    // If viewer was just closed, ignore late momentum events
                    if (!isViewerOpenRef.current) return;
                    const newIndex = Math.round(
                      event.nativeEvent.contentOffset.x / SCREEN_WIDTH
                    );
                    setSelectedImageIndex(newIndex);
                  }}
                  contentOffset={{
                    x: Math.max(0, selectedImageIndex) * SCREEN_WIDTH,
                    y: 0,
                  }}
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
                            // Jump to tapped dot and ensure viewer remains open
                            isViewerOpenRef.current = true;
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

            {/* Location Event Details Sheet */}
            {selectedLocationEvent && (
              <UnifiedDetailsSheet
                data={selectedLocationEvent}
                isOpen={!!selectedLocationEvent}
                onClose={() => setSelectedLocationEvent(null)}
                nearbyData={nearbyData}
                onDataSelect={onDataSelect}
                onShowControler={onShowControler}
                isEvent={true}
                onShare={onShare} // Always treat location events as events
              />
            )}
          </View>
          <FlagContentModal
            visible={flagOpen.open}
            contentTitle={data.name}
            variant="sheet"
            onClose={() =>
              setFlagOpen({ open: false, eventId: "", locationId: "" })
            }
            onSubmit={async ({ reason, explanation }) => {
              const idToFlag = data.id;
              await createFlag({
                reason,
                explanation,
                event_id: isEventType ? idToFlag : "",
                static_location_id: isEventType ? "" : idToFlag,
              });
            }}
          />
        </Modal>
      </>
    );
  }
);
