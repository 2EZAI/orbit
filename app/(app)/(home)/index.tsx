import React, { useState, useEffect, useRef } from "react";
import {
  View,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  Image,
  TextInput,
  Platform,
  StyleSheet,
  StatusBar,
  Animated,
  RefreshControl,
  ScrollView,
  Dimensions,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Text } from "~/src/components/ui/text";
import { OptimizedImage } from "~/src/components/ui/optimized-image";
import { useTheme } from "~/src/components/ThemeProvider";
import { useUser } from "~/hooks/useUserData";
import { useHomeFeed } from "~/hooks/useHomeFeed";
import { useNotificationsApi } from "~/hooks/useNotificationsApi";
import {
  Filter,
  Search,
  Bell,
  User,
  MapPin,
  Calendar,
  Users,
  Heart,
  Share,
  Bookmark,
  Sparkles,
  Clock,
} from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";

// Components
import { FeaturedSection } from "~/src/components/feed/FeaturedSection";
import { FeedSection } from "~/src/components/feed/FeedSection";
import { EventCard } from "~/src/components/feed/EventCard";
import { LocationCard } from "~/src/components/feed/LocationCard";
import { MarkerFilter } from "~/src/components/map/MarkerFilter";
import { SectionViewSheet } from "~/src/components/SectionViewSheet";
import { UnifiedDetailsSheet } from "~/src/components/map/UnifiedDetailsSheet";
import { SearchSheet } from "~/src/components/search/SearchSheet";
import { ScreenHeader } from "~/src/components/ui/screen-header";
import { HomeLoadingScreen } from "~/src/components/feed/HomeLoadingScreen";

// Utils
import { handleSectionViewMore } from "~/src/lib/utils/sectionViewMore";
import {
  FilterState,
  generateDefaultFilters,
} from "~/src/components/map/MarkerFilter";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");
const STORY_CARD_WIDTH = screenWidth * 0.8;
const STORY_CARD_HEIGHT = 200;

// Story Cards Component for Featured Content
interface StoryCardProps {
  item: any;
  onPress: () => void;
}

const StoryCard = ({ item, onPress }: StoryCardProps) => {
  const { theme } = useTheme();
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);

  const isEvent = item.start_datetime || item.type === "event";
  const imageUrl = item.image_urls?.[0] || item.image;
  const attendeeCount = item.attendees || Math.floor(Math.random() * 50) + 10;

  return (
    <TouchableOpacity
      style={styles.storyCard}
      onPress={onPress}
      activeOpacity={0.95}
    >
      {/* Background Image */}
      <View style={styles.storyImageContainer}>
        <OptimizedImage
          uri={imageUrl}
          width={STORY_CARD_WIDTH}
          height={STORY_CARD_HEIGHT}
          quality={90}
          style={styles.storyBackgroundImage}
          resizeMode="cover"
        />

        {/* Gradient Overlay */}
        <LinearGradient
          colors={["transparent", "rgba(0,0,0,0.7)"]}
          style={styles.storyGradientOverlay}
        />
      </View>

      {/* Top Badge */}
      <View style={styles.storyTopActions}>
        <View style={styles.storyCategoryBadge}>
          <Sparkles size={10} color="#fff" />
          <Text style={styles.storyCategoryText}>
            {isEvent ? "Featured Event" : "Featured Place"}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.storyActionButton}
          onPress={() => setSaved(!saved)}
        >
          <Bookmark
            size={16}
            color={saved ? theme.colors.primary : "#fff"}
            fill={saved ? theme.colors.primary : "transparent"}
          />
        </TouchableOpacity>
      </View>

      {/* Bottom Content */}
      <View style={styles.storyBottomContent}>
        <Text style={styles.storyTitle} numberOfLines={1}>
          {item.name || item.title}
        </Text>

        <View style={styles.storyMetaInfo}>
          {isEvent && item.start_datetime && (
            <View style={styles.storyMetaItem}>
              <Calendar size={12} color="#fff" />
              <Text style={styles.storyMetaText}>
                {new Date(item.start_datetime).toLocaleDateString()}
              </Text>
            </View>
          )}

          <View style={styles.storyMetaItem}>
            <Users size={12} color="#fff" />
            <Text style={styles.storyMetaText}>{attendeeCount}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

// Story Section Component
const StorySection = ({
  events,
  onEventSelect,
}: {
  events: any[];
  onEventSelect: (event: any) => void;
}) => {
  const { theme } = useTheme();

  if (!events || events.length === 0) return null;

  return (
    <View style={styles.storySectionContainer}>
      <View style={styles.storySectionHeader}>
        <Text style={[styles.storySectionTitle, { color: theme.colors.text }]}>
          ✨ Featured
        </Text>
        <Text
          style={[
            styles.storySectionSubtitle,
            { color: theme.colors.text + "80" },
          ]}
        >
          Don't miss these amazing events
        </Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.storyScrollContent}
        snapToInterval={STORY_CARD_WIDTH + 15}
        decelerationRate="fast"
      >
        {events.slice(0, 5).map((event, index) => (
          <StoryCard
            key={`story-${event.id}-${index}`}
            item={event}
            onPress={() => onEventSelect(event)}
          />
        ))}
      </ScrollView>
    </View>
  );
};

// TikTok-Style Location Cards Component
interface TikTokLocationCardProps {
  item: any;
  onPress: () => void;
}

const TikTokLocationCard = ({ item, onPress }: TikTokLocationCardProps) => {
  const { theme } = useTheme();
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);

  const imageUrl = item.image_urls?.[0] || item.image;
  const visitCount = Math.floor(Math.random() * 200) + 50;

  return (
    <TouchableOpacity
      style={styles.tiktokCard}
      onPress={onPress}
      activeOpacity={0.95}
    >
      {/* Background Image */}
      <View style={styles.tiktokImageContainer}>
        <OptimizedImage
          uri={imageUrl}
          width={screenWidth}
          height={400}
          quality={90}
          style={styles.tiktokBackgroundImage}
          resizeMode="cover"
        />

        {/* Gradient Overlay */}
        <LinearGradient
          colors={[
            "transparent",
            "transparent",
            "rgba(0,0,0,0.4)",
            "rgba(0,0,0,0.8)",
          ]}
          style={styles.tiktokGradientOverlay}
        />
      </View>

      {/* Top Badge */}
      <View style={styles.tiktokTopActions}>
        <View style={styles.tiktokCategoryBadge}>
          <MapPin size={14} color="#fff" />
          <Text style={styles.tiktokCategoryText}>Popular Location</Text>
        </View>

        <TouchableOpacity
          style={styles.tiktokActionButton}
          onPress={() => setSaved(!saved)}
        >
          <Bookmark
            size={20}
            color={saved ? theme.colors.primary : "#fff"}
            fill={saved ? theme.colors.primary : "transparent"}
          />
        </TouchableOpacity>
      </View>

      {/* Side Actions */}
      <View style={styles.tiktokSideActions}>
        <TouchableOpacity style={styles.tiktokSideButton}>
          <Users size={26} color="#fff" />
          <Text style={styles.tiktokSideText}>{visitCount}</Text>
        </TouchableOpacity>
      </View>

      {/* Bottom Content */}
      <View style={styles.tiktokBottomContent}>
        <Text style={styles.tiktokTitle} numberOfLines={2}>
          {item.name || item.title}
        </Text>

        {item.description && (
          <Text style={styles.tiktokDescription} numberOfLines={3}>
            {item.description}
          </Text>
        )}

        <View style={styles.tiktokMetaInfo}>
          {item.address && (
            <View style={styles.tiktokMetaItem}>
              <MapPin size={16} color="#fff" />
              <Text style={styles.tiktokMetaText} numberOfLines={1}>
                {item.address}
              </Text>
            </View>
          )}

          {item.operation_hours && (
            <View style={styles.tiktokMetaItem}>
              <Clock size={16} color="#fff" />
              <Text style={styles.tiktokMetaText}>Open Now</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

// TikTok Section Component for Locations
const TikTokLocationSection = ({
  locations,
  onLocationSelect,
  title = "Popular Places",
}: {
  locations: any[];
  onLocationSelect: (location: any) => void;
  title?: string;
}) => {
  const { theme } = useTheme();

  if (!locations || locations.length === 0) return null;

  return (
    <View style={styles.tiktokSectionContainer}>
      <View style={styles.tiktokSectionHeader}>
        <Text style={[styles.tiktokSectionTitle, { color: theme.colors.text }]}>
          🔥 {title}
        </Text>
        <Text
          style={[styles.tiktokSectionSubtitle, { color: theme.colors.text }]}
        >
          Swipe to explore amazing places
        </Text>
      </View>

      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        snapToInterval={screenWidth}
        decelerationRate="fast"
        contentContainerStyle={styles.tiktokScrollContent}
      >
        {locations.slice(0, 8).map((location, index) => (
          <TikTokLocationCard
            key={`tiktok-${location.id}-${index}`}
            item={location}
            onPress={() => onLocationSelect(location)}
          />
        ))}
      </ScrollView>

      {/* Scroll indicator */}
      <View style={styles.tiktokScrollIndicator}>
        <Text
          style={[
            styles.tiktokScrollIndicatorText,
            { color: theme.colors.text },
          ]}
        >
          Swipe for more places • {locations.length} total
        </Text>
      </View>
    </View>
  );
};

export default function Home() {
  const { theme, isDarkMode } = useTheme();
  const { user } = useUser();
  const router = useRouter();
  const { fetchAllNoifications, unReadCount } = useNotificationsApi();

  // Home feed data
  const { data, loading, error, refetch } = useHomeFeed();

  // UI State
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null);
  const [isSelectedItemLocation, setIsSelectedItemLocation] = useState(false);
  const [currentFeaturedIndex, setCurrentFeaturedIndex] = useState(0);
  const [isSearchVisible, setIsSearchVisible] = useState(false);

  // Filter state - using the same sophisticated filtering as the map
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [filters, setFilters] = useState<FilterState>({});
  const [filteredData, setFilteredData] = useState<any[]>([]);

  // Section view sheet state
  const [sectionViewSheet, setSectionViewSheet] = useState<{
    isOpen: boolean;
    section: any | null;
    allSectionData: any[];
  }>({
    isOpen: false,
    section: null,
    allSectionData: [],
  });

  // Animation
  const scrollY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    fetchAllNoifications(1, 20);
  }, []);

  // Initialize filters when data changes
  useEffect(() => {
    if (data.allContent.length > 0 && Object.keys(filters).length === 0) {
      const defaultFilters = generateDefaultFilters(
        data.allContent.filter((item: any) => !item.isLocation),
        data.allContent.filter((item: any) => item.isLocation)
      );
      setFilters(defaultFilters);
    }
  }, [data.allContent]);

  const handleViewMore = async (section: any) => {
    const allSectionData = await handleSectionViewMore(section);
    setSectionViewSheet({
      isOpen: true,
      section: section,
      allSectionData: allSectionData,
    });
  };

  // Dynamic filter functions - same logic as the map
  const shouldShowItem = (item: any): boolean => {
    // If no filters are set yet, show everything
    if (Object.keys(filters).length === 0) return true;

    // If all filters are false, hide everything
    const hasAnyFilterEnabled = Object.values(filters).some(
      (value) => value === true
    );
    if (!hasAnyFilterEnabled) return false;

    let shouldShow = false;

    // Check event source type filters for events
    if (!item.isLocation && "source" in item && item.source) {
      const sourceKey =
        item.source === "user"
          ? "community-events"
          : (typeof item.source === "string" &&
              item.source.includes("ticket")) ||
            item.source === "ticketmaster"
          ? "ticketed-events"
          : "featured-events";

      if (filters.hasOwnProperty(sourceKey) && filters[sourceKey]) {
        shouldShow = true;
      }
    }

    // Check event category filters
    if (
      !item.isLocation &&
      "categories" in item &&
      item.categories &&
      Array.isArray(item.categories)
    ) {
      for (const cat of item.categories) {
        if (cat && cat.name && typeof cat.name === "string") {
          const catKey = `event-${cat.name.toLowerCase().replace(/\s+/g, "-")}`;
          if (filters.hasOwnProperty(catKey) && filters[catKey]) {
            shouldShow = true;
            break;
          }
        }
      }
    }

    // Check location category filters
    if (
      item.isLocation &&
      "category" in item &&
      item.category &&
      typeof item.category === "string"
    ) {
      const catKey = `location-${item.category
        .toLowerCase()
        .replace(/\s+/g, "-")}`;
      if (filters.hasOwnProperty(catKey) && filters[catKey]) {
        shouldShow = true;
      }
    }

    // Check location type filters
    if (
      item.isLocation &&
      "type" in item &&
      item.type &&
      typeof item.type === "string"
    ) {
      const typeKey = `type-${item.type.toLowerCase().replace(/\s+/g, "-")}`;
      if (filters.hasOwnProperty(typeKey) && filters[typeKey]) {
        shouldShow = true;
      }
    }

    return shouldShow;
  };

  const applyFilters = (newFilters: FilterState) => {
    setFilters(newFilters);

    // Create a filtering function with the new filters
    const shouldShowItemWithNewFilters = (item: any): boolean => {
      // If no filters are set yet, show everything
      if (Object.keys(newFilters).length === 0) return true;

      // If all filters are false, hide everything
      const hasAnyFilterEnabled = Object.values(newFilters).some(
        (value) => value === true
      );
      if (!hasAnyFilterEnabled) return false;

      let shouldShow = false;

      // Check event source type filters for events
      if (!item.isLocation && "source" in item && item.source) {
        const sourceKey =
          item.source === "user"
            ? "community-events"
            : (typeof item.source === "string" &&
                item.source.includes("ticket")) ||
              item.source === "ticketmaster"
            ? "ticketed-events"
            : "featured-events";

        if (newFilters.hasOwnProperty(sourceKey) && newFilters[sourceKey]) {
          shouldShow = true;
        }
      }

      // Check event category filters
      if (
        !item.isLocation &&
        "categories" in item &&
        item.categories &&
        Array.isArray(item.categories)
      ) {
        for (const cat of item.categories) {
          if (cat && cat.name && typeof cat.name === "string") {
            const catKey = `event-${cat.name
              .toLowerCase()
              .replace(/\s+/g, "-")}`;
            if (newFilters.hasOwnProperty(catKey) && newFilters[catKey]) {
              shouldShow = true;
              break;
            }
          }
        }
      }

      // Check location category filters
      if (
        item.isLocation &&
        "category" in item &&
        item.category &&
        typeof item.category === "string"
      ) {
        const catKey = `location-${item.category
          .toLowerCase()
          .replace(/\s+/g, "-")}`;
        if (newFilters.hasOwnProperty(catKey) && newFilters[catKey]) {
          shouldShow = true;
        }
      }

      // Check location type filters
      if (
        item.isLocation &&
        "type" in item &&
        item.type &&
        typeof item.type === "string"
      ) {
        const typeKey = `type-${item.type.toLowerCase().replace(/\s+/g, "-")}`;
        if (newFilters.hasOwnProperty(typeKey) && newFilters[typeKey]) {
          shouldShow = true;
        }
      }

      return shouldShow;
    };

    // Apply filters to all content
    const filteredSections = data.flatListData
      .map((section) => {
        if (section.type === "section") {
          const filteredData = section.data.data.filter(
            shouldShowItemWithNewFilters
          );
          return {
            ...section,
            data: {
              ...section.data,
              data: filteredData,
            },
          };
        }
        return section;
      })
      .filter((section) => {
        // Remove sections with no data after filtering
        if (section.type === "section") {
          return section.data.data.length > 0;
        }
        return true;
      });

    setFilteredData(filteredSections);
  };

  const renderItem = ({ item }: { item: any }) => {
    if (item.type === "stories") {
      return (
        <FeaturedSection
          events={item.data}
          currentIndex={currentFeaturedIndex}
          onEventSelect={(event: any) => {
            setSelectedEvent(event);
            setIsSelectedItemLocation(false);
          }}
          onIndexChange={setCurrentFeaturedIndex}
        />
      );
    } else if (item.type === "section") {
      // Check if this is a location section (grid layout)
      if (item.data.layout === "grid") {
        return (
          <TikTokLocationSection
            locations={item.data.data}
            title={item.data.title}
            onLocationSelect={(location: any) => {
              setSelectedEvent(location);
              setIsSelectedItemLocation(true);
            }}
          />
        );
      } else {
        // Regular event sections
        return (
          <FeedSection
            title={item.data.title}
            data={item.data.data}
            layout={item.data.layout}
            onSeeAll={() => handleViewMore(item.data)}
            renderItem={({ item: eventItem }: { item: any }) => (
              <EventCard
                item={eventItem}
                onPress={() => {
                  setSelectedEvent(eventItem);
                  setIsSelectedItemLocation(false);
                }}
              />
            )}
            loading={false}
          />
        );
      }
    }
    return null;
  };

  // Create enhanced flat list data with story section
  const enhancedFlatListData = React.useMemo(() => {
    const flatList = [];

    // Add story section at the top if we have featured events
    if (data.featuredEvents?.length > 0) {
      flatList.push({ type: "stories", data: data.featuredEvents });
    }

    // Add the rest of the original data
    if (filteredData.length > 0) {
      flatList.push(...filteredData);
    } else {
      flatList.push(...data.flatListData);
    }

    return flatList;
  }, [data, filteredData]);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
        <StatusBar
          barStyle={isDarkMode ? "light-content" : "dark-content"}
          backgroundColor={theme.colors.background}
        />
        <HomeLoadingScreen
          isVisible={loading}
          loadingText="Discovering Amazing Events"
          subtitle="Finding the best events and experiences in your area..."
        />
      </View>
    );
  }

  if (error) {
    return (
      <View
        style={[styles.errorContainer, { backgroundColor: theme.colors.card }]}
      >
        <Text style={[styles.errorText, { color: theme.colors.primary }]}>
          {error}
        </Text>
        <TouchableOpacity
          style={[
            styles.retryButton,
            { backgroundColor: theme.colors.primary },
          ]}
          onPress={refetch}
        >
          <Text style={[styles.retryButtonText, { color: "white" }]}>
            Try Again
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!loading && data.flatListData.length === 0) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.colors.card }]}
      >
        <StatusBar
          barStyle={isDarkMode ? "light-content" : "dark-content"}
          backgroundColor={theme.colors.card}
        />

        <ScreenHeader
          title="Discover"
          actions={[
            {
              icon: <Bell size={18} color="white" strokeWidth={2.5} />,
              onPress: () => router.push("/(app)/(notification)"),
              backgroundColor: theme.colors.primary,
              badge: !!(unReadCount && unReadCount > 0) ? (
                <View
                  style={{
                    position: "absolute",
                    top: -4,
                    right: -4,
                    backgroundColor: "#ff3b30",
                    borderRadius: 10,
                    minWidth: 20,
                    height: 20,
                    justifyContent: "center",
                    alignItems: "center",
                    borderWidth: 2,
                    borderColor: "white",
                  }}
                >
                  <Text
                    style={{ color: "white", fontSize: 12, fontWeight: "bold" }}
                  >
                    {unReadCount > 99 ? "99+" : String(unReadCount)}
                  </Text>
                </View>
              ) : undefined,
            },
            {
              icon: (
                <Image
                  source={
                    user?.avatar_url
                      ? { uri: user.avatar_url }
                      : require("~/assets/favicon.png")
                  }
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    borderWidth: 2,
                    borderColor: theme.colors.primary,
                  }}
                />
              ),
              onPress: () => router.push("/(app)/(profile)"),
            },
          ]}
        />

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <TouchableOpacity
            style={[
              styles.searchBar,
              {
                backgroundColor: theme.colors.card,
                borderColor: theme.colors.border,
              },
            ]}
            onPress={() => setIsSearchVisible(true)}
          >
            <Search size={20} color={theme.colors.text + "80"} />
            <Text
              style={[
                styles.searchPlaceholder,
                { color: theme.colors.text + "80" },
              ]}
            >
              Search events, places, and people...
            </Text>
            <TouchableOpacity
              style={[
                styles.filterButton,
                { backgroundColor: theme.colors.primary },
              ]}
              onPress={() => setShowFilterModal(true)}
            >
              <Filter size={16} color="white" />
            </TouchableOpacity>
          </TouchableOpacity>
        </View>

        {/* Empty State */}
        <View style={styles.emptyStateContainer}>
          <Text style={styles.emptyStateEmoji}>🎉</Text>
          <Text
            style={[styles.emptyStateTitle, { color: theme.colors.primary }]}
          >
            No Events Yet
          </Text>
          <Text
            style={[
              styles.emptyStateSubtitle,
              { color: theme.colors.text + "CC" },
            ]}
          >
            Be the first to create an event in your area!
          </Text>
          <TouchableOpacity
            style={[
              styles.createEventButton,
              { backgroundColor: theme.colors.primary },
            ]}
            onPress={() => router.push("/(app)/(create)")}
          >
            <Text style={[styles.createEventButtonText, { color: "white" }]}>
              Create Event
            </Text>
          </TouchableOpacity>
        </View>

        {/* Filter Modal */}
        {showFilterModal && (
          <MarkerFilter
            isOpen={showFilterModal}
            onClose={() => setShowFilterModal(false)}
            filters={filters}
            onFilterChange={(newFilters) => {
              applyFilters(newFilters);
            }}
            eventsList={data.allContent.filter((item: any) => !item.isLocation)}
            locationsList={data.allContent.filter(
              (item: any) => item.isLocation
            )}
          />
        )}

        {/* Search Sheet */}
        <SearchSheet
          isOpen={isSearchVisible}
          onClose={() => setIsSearchVisible(false)}
          eventsList={[]}
          locationsList={[]}
          onShowControler={() => {}}
        />
      </SafeAreaView>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.card }]}>
      <StatusBar
        barStyle={isDarkMode ? "light-content" : "dark-content"}
        backgroundColor={theme.colors.card}
      />

      <SafeAreaView style={{ backgroundColor: theme.colors.card }}>
        <ScreenHeader
          title="Discover"
          actions={[
            {
              icon: <Bell size={18} color="white" strokeWidth={2.5} />,
              onPress: () => router.push("/(app)/(notification)"),
              backgroundColor: theme.colors.primary,
              badge: !!(unReadCount && unReadCount > 0) ? (
                <View
                  style={{
                    position: "absolute",
                    top: -4,
                    right: -4,
                    backgroundColor: "#ff3b30",
                    borderRadius: 10,
                    minWidth: 20,
                    height: 20,
                    justifyContent: "center",
                    alignItems: "center",
                    borderWidth: 2,
                    borderColor: "white",
                  }}
                >
                  <Text
                    style={{ color: "white", fontSize: 12, fontWeight: "bold" }}
                  >
                    {unReadCount > 99 ? "99+" : String(unReadCount)}
                  </Text>
                </View>
              ) : undefined,
            },
            {
              icon: (
                <Image
                  source={
                    user?.avatar_url
                      ? { uri: user.avatar_url }
                      : require("~/assets/favicon.png")
                  }
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    borderWidth: 2,
                    borderColor: theme.colors.primary,
                  }}
                />
              ),
              onPress: () => router.push("/(app)/(profile)"),
            },
          ]}
        />

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <TouchableOpacity
            style={[
              styles.searchBar,
              {
                backgroundColor: theme.colors.card,
                borderColor: theme.colors.border,
              },
            ]}
            onPress={() => setIsSearchVisible(true)}
          >
            <Search size={20} color={theme.colors.text + "80"} />
            <Text
              style={[
                styles.searchPlaceholder,
                { color: theme.colors.text + "80" },
              ]}
            >
              Search events, places, and people...
            </Text>
            <TouchableOpacity
              style={[
                styles.filterButton,
                { backgroundColor: theme.colors.primary },
              ]}
              onPress={() => setShowFilterModal(true)}
            >
              <Filter size={16} color="white" />
            </TouchableOpacity>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* Main Feed with Enhanced Data */}
      <FlatList
        data={enhancedFlatListData}
        renderItem={renderItem}
        keyExtractor={(item, index) => `${item.type}-${index}`}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.modernListContent}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={refetch}
            colors={[theme.colors.primary]}
            tintColor={theme.colors.primary}
          />
        }
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
      />

      {/* Modals */}
      {showFilterModal && (
        <MarkerFilter
          isOpen={showFilterModal}
          onClose={() => setShowFilterModal(false)}
          filters={filters}
          onFilterChange={(newFilters) => {
            applyFilters(newFilters);
          }}
          eventsList={data.allContent.filter((item: any) => !item.isLocation)}
          locationsList={data.allContent.filter((item: any) => item.isLocation)}
        />
      )}

      {sectionViewSheet.isOpen && (
        <SectionViewSheet
          isOpen={sectionViewSheet.isOpen}
          section={sectionViewSheet.section}
          data={sectionViewSheet.allSectionData}
          onClose={() =>
            setSectionViewSheet({
              isOpen: false,
              section: null,
              allSectionData: [],
            })
          }
          onItemSelect={(item: any) => {
            setSelectedEvent(item);
            setIsSelectedItemLocation(!!item.isLocation);
            setSectionViewSheet({
              isOpen: false,
              section: null,
              allSectionData: [],
            });
          }}
          theme={theme}
        />
      )}

      {selectedEvent && (
        <UnifiedDetailsSheet
          data={selectedEvent}
          isOpen={!!selectedEvent}
          onClose={() => {
            setSelectedEvent(null);
            setIsSelectedItemLocation(false);
          }}
          nearbyData={[]}
          onDataSelect={(data) => {
            setSelectedEvent(data);
            setIsSelectedItemLocation(false);
          }}
          onShowControler={() => {}}
          isEvent={!isSelectedItemLocation}
        />
      )}

      {/* Search Sheet */}
      <SearchSheet
        isOpen={isSearchVisible}
        onClose={() => setIsSearchVisible(false)}
        eventsList={data.featuredEvents || []}
        locationsList={[]}
        onShowControler={() => {}}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorText: {
    textAlign: "center",
    margin: 20,
    fontSize: 16,
  },
  retryButton: {
    marginTop: 20,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: "bold",
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: "#8B5CF6",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchPlaceholder: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    fontWeight: "500",
  },
  filterButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#8B5CF6",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  modernListContent: {
    paddingBottom: 40,
  },
  storyCard: {
    width: STORY_CARD_WIDTH,
    height: STORY_CARD_HEIGHT,
    marginHorizontal: 10,
    borderRadius: 20,
    overflow: "hidden",
    position: "relative",
    shadowColor: "#8B5CF6",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  storySectionContainer: {
    marginBottom: 20,
  },
  storySectionHeader: {
    paddingHorizontal: 20,
    marginBottom: 15,
  },
  storySectionTitle: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 5,
  },
  storySectionSubtitle: {
    fontSize: 14,
  },
  storyScrollContent: {
    paddingHorizontal: 10,
  },
  storyImageContainer: {
    width: "100%",
    height: "100%",
  },
  storyBackgroundImage: {
    width: "100%",
    height: "100%",
  },
  storyGradientOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "transparent",
  },
  storyTopActions: {
    position: "absolute",
    top: 10,
    left: 10,
    right: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    zIndex: 1,
  },
  storyCategoryBadge: {
    backgroundColor: "rgba(139, 92, 246, 0.8)",
    borderRadius: 15,
    paddingHorizontal: 10,
    paddingVertical: 5,
    flexDirection: "row",
    alignItems: "center",
  },
  storyCategoryText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
    marginLeft: 5,
  },
  storyActionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(139, 92, 246, 0.8)",
  },
  storyBottomContent: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 15,
    zIndex: 1,
  },
  storyTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 8,
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  storyMetaInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  storyMetaItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  storyMetaText: {
    color: "#fff",
    fontSize: 12,
    marginLeft: 5,
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  emptyStateEmoji: {
    fontSize: 60,
    marginBottom: 10,
  },
  emptyStateTitle: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 5,
  },
  emptyStateSubtitle: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 20,
  },
  createEventButton: {
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 12,
    shadowColor: "#8B5CF6",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  createEventButtonText: {
    fontSize: 16,
    fontWeight: "bold",
  },
  tiktokCard: {
    width: screenWidth,
    height: 400, // Fixed height that works well on most devices
    position: "relative",
    borderRadius: 20,
    overflow: "hidden",
    marginBottom: 10,
    shadowColor: "#8B5CF6",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  tiktokImageContainer: {
    width: "100%",
    height: "100%",
  },
  tiktokBackgroundImage: {
    width: "100%",
    height: "100%",
  },
  tiktokGradientOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "transparent",
  },
  tiktokTopActions: {
    position: "absolute",
    top: 10,
    left: 10,
    right: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    zIndex: 1,
  },
  tiktokCategoryBadge: {
    backgroundColor: "rgba(139, 92, 246, 0.8)",
    borderRadius: 15,
    paddingHorizontal: 10,
    paddingVertical: 5,
    flexDirection: "row",
    alignItems: "center",
  },
  tiktokCategoryText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
    marginLeft: 5,
  },
  tiktokActionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(139, 92, 246, 0.8)",
  },
  tiktokSideActions: {
    position: "absolute",
    right: 15,
    bottom: 80, // Adjusted for smaller card
    flexDirection: "column",
    alignItems: "center",
    zIndex: 1,
  },
  tiktokSideButton: {
    alignItems: "center",
    marginBottom: 20,
    backgroundColor: "rgba(139, 92, 246, 0.6)",
    borderRadius: 25,
    padding: 8,
  },
  tiktokSideText: {
    color: "#fff",
    fontSize: 10,
    marginTop: 2,
    fontWeight: "600",
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  tiktokBottomContent: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 80,
    padding: 15,
    zIndex: 1,
  },
  tiktokTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 8,
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  tiktokDescription: {
    color: "#fff",
    fontSize: 14,
    marginBottom: 10,
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  tiktokMetaInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  tiktokMetaItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  tiktokMetaText: {
    color: "#fff",
    fontSize: 12,
    marginLeft: 5,
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  tiktokSectionContainer: {
    marginBottom: 20,
  },
  tiktokSectionHeader: {
    paddingHorizontal: 20,
    marginBottom: 15,
  },
  tiktokSectionTitle: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 5,
  },
  tiktokSectionSubtitle: {
    fontSize: 14,
  },
  tiktokScrollContent: {
    paddingHorizontal: 0,
  },
  tiktokScrollIndicator: {
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  tiktokScrollIndicatorText: {
    fontSize: 12,
  },
});
