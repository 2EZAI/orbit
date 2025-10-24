import { router, useLocalSearchParams } from "expo-router";
import { ArrowLeft, Tag, UserCheck, Users, X } from "lucide-react-native";
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
  StatusBar,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useEventJoinStatus } from "~/hooks/useEventJoinStatus";
import { useJoinEvent } from "~/hooks/useJoinEvent";
import { useLocationEvents } from "~/hooks/useLocationEvents";
import { MapEvent, MapLocation } from "~/hooks/useUnifiedMapData";
import { useUpdateEvents } from "~/hooks/useUpdateEvents";
import { useTheme } from "~/src/components/ThemeProvider";
import { ConfettiAnimation } from "~/src/components/ui/ConfettiAnimation";
import { Text } from "~/src/components/ui/text";
import { haptics } from "~/src/lib/haptics";
import { UnifiedDetailsSheetContent } from "~/src/components/map/UnifiedDetailsSheetContent";
import { UnifiedSheetButtons } from "~/src/components/map/UnifiedSheetButtons";
import { useAuth } from "~/src/lib/auth";
import { supabase } from "~/src/lib/supabase";

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

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

// Type guards
const isEventData = (data: UnifiedData, isEvent?: boolean): boolean => {
  if (isEvent !== undefined) {
    return isEvent;
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

export default function UnifiedDetailsScreen() {
  const { id, type, eventType } = useLocalSearchParams<{
    id: string;
    type?: string;
    eventType?: string;
  }>();

  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<UnifiedData | null>(null);
  const [detailData, setDetailData] = useState<UnifiedData | undefined>(undefined);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number>(0);
  // Track viewer open state to avoid late momentum callbacks re-opening the modal
  const isViewerOpenRef = useRef<boolean>(false);
  useEffect(() => {
    isViewerOpenRef.current = !!selectedImage;
  }, [selectedImage]);
  const [manuallyUpdated, setManuallyUpdated] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  
  const { session } = useAuth();
  const insets = useSafeAreaInsets();
  const { theme, isDarkMode } = useTheme();

  // Memoize the event type check to prevent repeated calculations
  const isEventType = useMemo(() => {
    if (data) {
      const result = isEventData(data, type === "event" || eventType === "event");
      return result;
    }
    return false;
  }, [data?.id, type, eventType]);

  // Use our new hook for location events
  const locationIdForEvents = !isEventType ? data?.id : null;

  const {
    events: locationEvents,
    loading: loadingLocationEvents,
    error: locationEventsError,
  } = useLocationEvents(locationIdForEvents || null);

  const [selectedLocationEvent, setSelectedLocationEvent] = useState<any>(null);

  // NEW: Use the join event hooks (like web app)
  const { joinEvent, leaveEvent, isLoading: isJoining } = useJoinEvent();

  // NEW: Get actual join status and creator check from database
  // Extract created_by ID (could be string or object)
  const createdById = isEventType && data
    ? typeof (data as any).created_by === "string"
      ? (data as any).created_by
      : (data as any).created_by?.id
    : undefined;

  const {
    isJoined: isJoinedFromDB,
    isCreator,
    refetch: refetchJoinStatus,
  } = useEventJoinStatus(isEventType ? data?.id : undefined, createdById);

  // Simple confetti trigger with celebration haptics
  const triggerConfetti = () => {
    setShowConfetti(true);
    haptics.celebration();
  };

  // Trigger light haptics when screen opens (especially for deep links)
  useEffect(() => {
    if (data) {
      haptics.light();
    }
  }, [data?.id]);

  const {
    UpdateEventStatus,
    fetchEventDetail,
    fetchLocationDetail,
    fetchLocationEvents,
  } = useUpdateEvents();

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

  // Fetch data based on ID and type
  // Fetch data using the unified Details API
  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;
      
      setLoading(true);
      try {
        console.log("🚀 [Details Screen] Fetching data with Details API:", {
          id,
          type,
          eventType,
          timestamp: new Date().toISOString()
        });

        // Determine the source based on the parameters
        let source: string;
        if (type === "location") {
          source = "location";
        } else if (eventType === "ticketmaster") {
          source = "ticketmaster";
        } else {
          source = "database"; // Default to database for events
        }

        // Call the unified Details API
        const response = await fetch(`https://orbit-web-backend.onrender.com/api/details`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            id: id,
            source: source,
          }),
        });

        if (!response.ok) {
          throw new Error(`Details API error: ${response.status}`);
        }

        const result = await response.json();
        console.log("📥 [Details Screen] Details API response:", result);

        if (result.success && result.items && result.items.length > 0) {
          const item = result.items[0];
          if (item.found && item.data) {
            console.log("✅ [Details Screen] Successfully fetched data:", {
              name: item.data.name,
              source: item.data.source,
              type: item.data.type
            });
            setData(item.data as UnifiedData);
          } else {
            console.error("❌ [Details Screen] Item not found:", item.error);
            throw new Error(item.error || "Item not found");
          }
        } else {
          throw new Error("Failed to fetch item details");
        }
      } catch (error) {
        console.error("❌ [Details Screen] Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, type, eventType]);

  const handleShare = async () => {
    const currentData = detailData || data;
    if (!currentData) return;
    
    // TODO: Implement share functionality
    console.log("Share functionality to be implemented");
  };

  const handleTicketPurchase = () => {
    const currentData = detailData || data;
    if (!currentData?.external_url) return;

    router.push({
      pathname: "/(app)/(webview)",
      params: {
        external_url: currentData.external_url,
        eventSelected: JSON.stringify(currentData),
      },
    });
  };

  const handleCreateOrbit = () => {
    if (isEventType && data) {
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
    const locationData = isEventType ? (data as any)?.location : data;
    const currentData = detailData || data;

    if (!currentData || !locationData) return;

    console.log("🔧 [UnifiedDetailsScreen] handleCreateActivity:", {
      isEventType,
      data: currentData,
      locationData: locationData,
    });

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

    console.log("🔧 [UnifiedDetailsScreen] Create activity params:", params);

    router.push({
      pathname: "/(app)/(create)",
      params: {
        ...params,
        from: "details",
      },
    });
  };

  const handleEdit = () => {
    if (!data) return;

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

  const handleJoinEvent = async () => {
    if (!isEventType || !data) return;

    try {
      const source =
        (data as any).is_ticketmaster ||
        (data as any).source === "ticketmaster"
          ? "ticketmaster"
          : "supabase";

      await joinEvent(data.id, source);

      // Refetch status from database
      await refetchJoinStatus();

      // Update local detail data
      const updatedData = { ...(detailData || data), join_status: true };
      setDetailData(updatedData as UnifiedData);
      setManuallyUpdated(true);

      // Trigger confetti for join action
      triggerConfetti();

      console.log("✅ Successfully joined event!");
    } catch (error) {
      console.error("❌ Error joining event:", error);
    }
  };

  const handleLeaveEvent = async () => {
    if (!isEventType || !data) return;

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

  // Get similar events/locations from nearbyData (empty for now, can be populated later)
  const getSimilarItems = useMemo(() => {
    return []; // TODO: Implement similar items logic if needed
  }, [detailData, data, isEventType]);

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

  if (!data) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
        <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} />
        {/* Loading state */}
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <Text style={{ color: theme.colors.text }}>Loading...</Text>
        </View>
      </View>
    );
  }

  const currentData = detailData || data;
  const similarItems = getSimilarItems;

  // Debug log to see what data we have
  console.log("🔍 [UnifiedDetailsScreen] Current data:", {
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

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} />
      
      {/* Confetti Animation */}
      <ConfettiAnimation
        isActive={showConfetti}
        onComplete={() => setShowConfetti(false)}
      />

      <ScrollView
        contentContainerStyle={{ paddingBottom: 180 + insets.bottom }}
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
              onPress={() => router.back()}
              className="justify-center items-center w-10 h-10 rounded-full shadow-lg bg-white/90"
            >
              <ArrowLeft size={20} color="#000" />
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
                <Text className="ml-1 text-xs text-white/90">going</Text>
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
            nearbyData={[]} // Empty for now, can be populated later
            onDataSelect={() => {}} // Empty for now
            onShowControler={() => {}} // Empty for now
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

          {/* Categories (for events) */}
          {isEventType &&
            (currentData as any).categories &&
            (currentData as any).categories.length > 0 && (
              <View className="mb-6">
                <Text
                  className="mb-3 text-lg font-bold"
                  style={{ color: theme.colors.text }}
                >
                  Activity Categories
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
        </View>
      </ScrollView>

      {/* Fixed Bottom Actions */}
      <View
        className="absolute bottom-0 left-0 right-0 px-6"
        style={{
          backgroundColor: theme.colors.background,
          paddingBottom: Math.max(insets.bottom + 16, 32),
          paddingTop: 16,
        }}
      >
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
        />
      </View>

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

      {/* Location Event Details Sheet removed - using screen navigation */}
    </View>
  );
}
