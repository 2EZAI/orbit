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
  Dimensions,
  StatusBar,
  Animated,
} from "react-native";
import { Icon } from 'react-native-elements';
import { SafeAreaView } from "react-native-safe-area-context";
import { Text } from "~/src/components/ui/text";
import { supabase } from "~/src/lib/supabase";
import { format, addHours } from "date-fns";
import { EventDetailsSheet } from "~/src/components/map/EventDetailsSheet";
import { LocationDetailsSheet } from "~/src/components/map/LocationDetailsSheet";
import {
  MapPin,
  Clock,
  Users,
  Star,
  Filter,
  Search,
} from "lucide-react-native";

const USER_LOCATION = "Miami";
const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=600&q=80";
const { width: screenWidth } = Dimensions.get("window");

function shuffleArray(array: any[]) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function getFeaturedEvent(events: any[]) {
  if (!events || events.length === 0) return null;
  return events.reduce((best, curr) => {
    if (!best) return curr;
    if ((curr.attendees || 0) > (best.attendees || 0)) return curr;
    if ((curr.attendees || 0) === (best.attendees || 0)) {
      return new Date(curr.start_datetime) < new Date(best.start_datetime)
        ? curr
        : best;
    }
    return best;
  }, null);
}

function isValidImage(url: string | undefined | null) {
  if (!url) return false;
  if (typeof url !== "string") return false;
  if (url.trim() === "") return false;
  if (url.includes("placehold.co") || url.includes("fpoimg.com")) return false;
  return true;
}

function isValidTitle(title: string | undefined | null) {
  return !!title && typeof title === "string" && title.trim().length > 0;
}

function getRandomEvents(events: any[], count: number) {
  const shuffled = shuffleArray([...events]);
  return shuffled.slice(0, count);
}

function safeEvent(event: any) {
  return {
    id: event.id || "unknown",
    name: event.title || event.name || "Untitled Event",
    image_urls: event.image_urls || (event.image ? [event.image] : []),
    start_datetime: event.start_datetime || new Date().toISOString(),
    ...event,
  };
}

function ErrorBoundary({ children }: { children: React.ReactNode }) {
  const [hasError, setHasError] = useState(false);
  if (hasError)
    return (
      <View style={{ padding: 32 }}>
        <Text style={{ color: "red" }}>Something went wrong.</Text>
      </View>
    );
  // @ts-ignore
  return React.cloneElement(children, { onError: () => setHasError(true) });
}

// Fun fallback events for empty sections
const fallbackEvents = [
  {
    id: "f1",
    name: "Glow-in-the-Dark Yoga",
    title: "Glow-in-the-Dark Yoga",
    image:
      "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=600&q=80",
    image_urls: [
      "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=600&q=80",
    ],
    date: "Friday 7pm",
    location: "Neon Studio",
    attendees: Math.floor(Math.random() * 50) + 10,
  },
  {
    id: "f2",
    name: "Silent Disco Beach Party",
    title: "Silent Disco Beach Party",
    image:
      "https://images.unsplash.com/photo-1464983953574-0892a716854b?auto=format&fit=crop&w=600&q=80",
    image_urls: [
      "https://images.unsplash.com/photo-1464983953574-0892a716854b?auto=format&fit=crop&w=600&q=80",
    ],
    date: "Saturday 9pm",
    location: "Sunny Beach",
    attendees: Math.floor(Math.random() * 100) + 20,
  },
  {
    id: "f3",
    name: "Board Game Bonanza",
    title: "Board Game Bonanza",
    image:
      "https://images.unsplash.com/photo-1519125323398-675f0ddb6308?auto=format&fit=crop&w=600&q=80",
    image_urls: [
      "https://images.unsplash.com/photo-1519125323398-675f0ddb6308?auto=format&fit=crop&w=600&q=80",
    ],
    date: "Sunday 2pm",
    location: "The Game Room",
    attendees: Math.floor(Math.random() * 30) + 5,
  },
  {
    id: "f4",
    name: "Pet Costume Parade",
    title: "Pet Costume Parade",
    image:
      "https://images.unsplash.com/photo-1518717758536-85ae29035b6d?auto=format&fit=crop&w=600&q=80",
    image_urls: [
      "https://images.unsplash.com/photo-1518717758536-85ae29035b6d?auto=format&fit=crop&w=600&q=80",
    ],
    date: "Saturday 11am",
    location: "Central Park",
    attendees: Math.floor(Math.random() * 40) + 10,
  },
  {
    id: "f5",
    name: "Coffee & Code",
    title: "Coffee & Code",
    image:
      "https://images.unsplash.com/photo-1465101046530-73398c7f28ca?auto=format&fit=crop&w=600&q=80",
    image_urls: [
      "https://images.unsplash.com/photo-1465101046530-73398c7f28ca?auto=format&fit=crop&w=600&q=80",
    ],
    date: "Wednesday 6pm",
    location: "Java House",
    attendees: Math.floor(Math.random() * 25) + 5,
  },
  {
    id: "f6",
    name: "DIY Pizza Night",
    title: "DIY Pizza Night",
    image:
      "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=600&q=80",
    image_urls: [
      "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=600&q=80",
    ],
    date: "Thursday 8pm",
    location: "Mama Mia Kitchen",
    attendees: Math.floor(Math.random() * 20) + 5,
  },
  {
    id: "f7",
    name: "Open Mic Comedy",
    title: "Open Mic Comedy",
    image:
      "https://images.unsplash.com/photo-1465101178521-c1a9136a3c8b?auto=format&fit=crop&w=600&q=80",
    image_urls: [
      "https://images.unsplash.com/photo-1465101178521-c1a9136a3c8b?auto=format&fit=crop&w=600&q=80",
    ],
    date: "Friday 9pm",
    location: "Laugh Lounge",
    attendees: Math.floor(Math.random() * 60) + 10,
  },
  {
    id: "f8",
    name: "Sunrise Meditation",
    title: "Sunrise Meditation",
    image:
      "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=600&q=80",
    image_urls: [
      "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=600&q=80",
    ],
    date: "Sunday 6am",
    location: "Ocean Pier",
    attendees: Math.floor(Math.random() * 15) + 2,
  },
];

function getRandomFallbackEvents(count = 3) {
  const shuffled = [...fallbackEvents].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

export default function Home() {
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sections, setSections] = useState<any[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null);
  const [isSelectedItemLocation, setIsSelectedItemLocation] = useState(false);
  const [featuredEvent, setFeaturedEvent] = useState<any | null>(null);
  const [allData, setAllData] = useState<any[]>([]);

  // Animated header
  const scrollY = useRef(new Animated.Value(0)).current;
  const HEADER_MAX_HEIGHT = 110;
  const HEADER_MIN_HEIGHT = 60;
  const HEADER_SCROLL_DISTANCE = HEADER_MAX_HEIGHT - HEADER_MIN_HEIGHT;
  const headerHeight = scrollY.interpolate({
    inputRange: [0, HEADER_SCROLL_DISTANCE],
    outputRange: [HEADER_MAX_HEIGHT, HEADER_MIN_HEIGHT],
    extrapolate: "clamp",
  });
  const headerFontSize = scrollY.interpolate({
    inputRange: [0, HEADER_SCROLL_DISTANCE],
    outputRange: [28, 20],
    extrapolate: "clamp",
  });

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const now = new Date();
        const in24h = addHours(now, 168);
        const { data: nowEvents } = await supabase
          .from("events")
          .select("*")
          .gte("start_datetime", now.toISOString())
          .lte("start_datetime", in24h.toISOString())
          .order("start_datetime", { ascending: true })
          .limit(20);
        const thingsNow = (nowEvents || [])
          .map((event) => ({
            ...event,
            image: event.image_urls?.[0],
            title: event.name,
            date: format(new Date(event.start_datetime), "EEEE MMM d • h a"),
            location: event.address,
            attendees:
              event.event_joins?.filter((j: any) => j.status === "joined")
                .length || 0,
          }))
          .filter((e) => isValidImage(e.image) && isValidTitle(e.title));

        const { data: hotEvents } = await supabase
          .from("events")
          .select("*")
          .gte("start_datetime", now.toISOString())
          .order("attendees_count", { ascending: false })
          .limit(20);
        const hotTopics = (hotEvents || [])
          .map((event) => ({
            ...event,
            image: event.image_urls?.[0],
            title: event.name,
            date: format(new Date(event.start_datetime), "EEEE MMM d • h a"),
            location: event.address,
            attendees:
              event.event_joins?.filter((j: any) => j.status === "joined")
                .length || 0,
          }))
          .sort((a, b) => (b.attendees || 0) - (a.attendees || 0))
          .filter((e) => isValidImage(e.image) && isValidTitle(e.title));

        const { data: topics } = await supabase
          .from("topics")
          .select("id, name, icon")
          .order("name");
        let topicSections: any[] = [];
        if (topics && topics.length > 0) {
          const shuffledTopics = shuffleArray([...topics]);
          const chosenTopics = shuffledTopics.slice(0, 2);
          topicSections = await Promise.all(
            chosenTopics.map(async (topic, index) => {
              const { data: events } = await supabase
                .from("events")
                .select("*")
                .eq("category_id", topic.id)
                .gte("start_datetime", now.toISOString())
                .order("start_datetime", { ascending: true })
                .limit(20);
              return {
                key: `cat-${topic.id}`,
                title: topic.icon ? `${topic.icon} ${topic.name}` : topic.name,
                data: (events || [])
                  .map((event) => ({
                    ...event,
                    image: event.image_urls?.[0],
                    title: event.name,
                    date: format(
                      new Date(event.start_datetime),
                      "EEEE MMM d • h a"
                    ),
                    location: event.address,
                    attendees:
                      event.event_joins?.filter(
                        (j: any) => j.status === "joined"
                      ).length || 0,
                  }))
                  .filter(
                    (e) => isValidImage(e.image) && isValidTitle(e.title)
                  ),
                layout: "horizontal",
              };
            })
          );
        }

        const { data: staticLocations } = await supabase
          .from("static_locations")
          .select("*")
          .limit(20);
        const staticLocSection = {
          key: "static-locations",
          title: "Popular Places",
          data: (staticLocations || [])
            .map((loc) => ({
              ...loc,
              image: loc.image_urls?.[0],
              title: loc.name,
              location: loc.type,
            }))
            .filter((e) => isValidImage(e.image) && isValidTitle(e.title)),
          layout: "grid",
        };

        const { data: moreEvents } = await supabase
          .from("events")
          .select("*")
          .gte("start_datetime", now.toISOString())
          .order("start_datetime", { ascending: true })
          .limit(20);
        const moreSection = {
          key: "more",
          title: "More Events For You",
          data: (moreEvents || [])
            .map((event) => ({
              ...event,
              image: event.image_urls?.[0],
              title: event.name,
              date: format(new Date(event.start_datetime), "EEEE MMM d • h a"),
              location: event.address,
              attendees:
                event.event_joins?.filter((j: any) => j.status === "joined")
                  .length || 0,
            }))
            .filter((e) => isValidImage(e.image) && isValidTitle(e.title)),
          layout: "horizontal",
        };

        // For each section, if data is empty, fill with fallback events
        const thingsNowFinal =
          thingsNow.length > 0 ? thingsNow : getRandomFallbackEvents(3);
        const hotTopicsFinal =
          hotTopics.length > 0 ? hotTopics : getRandomFallbackEvents(3);
        const topicSectionsFinal = topicSections.map((section) => ({
          ...section,
          data:
            section.data.length > 0 ? section.data : getRandomFallbackEvents(3),
        }));
        const moreSectionFinal =
          moreSection.data.length > 0
            ? moreSection
            : { ...moreSection, data: getRandomFallbackEvents(3) };

        let feedPlan = [
          {
            key: "now",
            title: "Happening Now",
            data: thingsNowFinal,
            layout: "horizontal",
          },
          {
            key: "hot",
            title: `Trending in ${USER_LOCATION}`,
            data: hotTopicsFinal,
            layout: "horizontal",
          },
          ...topicSectionsFinal,
          staticLocSection,
          moreSectionFinal,
        ];

        setSections(feedPlan);
        setError(null);
        const featured = getFeaturedEvent(thingsNowFinal);
        setFeaturedEvent(featured);

        // Prepare data for FlatList
        const flatListData = [];
        if (featured) {
          flatListData.push({ type: "featured", data: featured });
        }
        feedPlan.forEach((section) => {
          flatListData.push({ type: "section", data: section });
        });
        setAllData(flatListData);
      } catch (err: any) {
        setError(err?.message || "Error loading data");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const renderItem = ({ item }: { item: any }) => {
    if (item.type === "featured") {
      return (
        <FeaturedEventCard
          event={safeEvent(item.data)}
          onPress={() => {
            setSelectedEvent(safeEvent(item.data));
            setIsSelectedItemLocation(false);
          }}
        />
      );
    } else if (item.type === "section") {
      return (
        <Section
          title={item.data.title}
          data={item.data.data}
          layout={item.data.layout}
          onSeeAll={() => {}}
          renderItem={({ item: eventItem }: { item: any }) =>
            item.data.layout === "grid" ? (
              <PopularPlaceCard
                item={eventItem}
                onPress={() => {
                  setSelectedEvent(safeEvent(eventItem));
                  setIsSelectedItemLocation(true);
                }}
              />
            ) : (
              <ModernEventCard
                item={eventItem}
                onPress={() => {
                  setSelectedEvent(safeEvent(eventItem));
                  setIsSelectedItemLocation(false);
                }}
                layout={item.data.layout}
              />
            )
          }
          loading={false}
        />
      );
    }
    return null;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6c47ff" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <SafeAreaView style={styles.safeArea}>
        <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
  <Icon
    name="bell"
    type="material-community"
    size={36}
    color="#239ED0"
    className="mt-4 mr-4" 
  />
  <View className="absolute top-1 right-1 bg-red-600 rounded-full w-8 h-8 items-center justify-center">
    <Text className="text-white text-xs font-bold">34+</Text>
  </View>
</View>
        <View style={styles.searchBarRow}>
          <Search size={20} color="#bbb" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search events, places, people..."
            placeholderTextColor="#bbb"
            value={search}
            onChangeText={setSearch}
          />
          <TouchableOpacity style={styles.filterButton}>
            <Filter size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
      <FlatList
        data={allData}
        renderItem={renderItem}
        keyExtractor={(item, index) => `${item.type}-${index}`}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
      />
      {selectedEvent && (
        <ErrorBoundary>
          {isSelectedItemLocation ? (
            <LocationDetailsSheet
              event={selectedEvent}
              isOpen={!!selectedEvent}
              onClose={() => {
                setSelectedEvent(null);
                setIsSelectedItemLocation(false);
              }}
              nearbyEvents={[]}
              onEventSelect={(e) => {
                setSelectedEvent(safeEvent(e));
                setIsSelectedItemLocation(false);
              }}
              onShowControler={() => {}}
            />
          ) : (
            <EventDetailsSheet
              event={selectedEvent}
              isOpen={!!selectedEvent}
              onClose={() => {
                setSelectedEvent(null);
                setIsSelectedItemLocation(false);
              }}
              nearbyEvents={[]}
              onEventSelect={(e) => {
                setSelectedEvent(safeEvent(e));
                setIsSelectedItemLocation(false);
              }}
              onShowControler={() => {}}
            />
          )}
        </ErrorBoundary>
      )}
    </View>
  );
}

function FeaturedEventCard({ event, onPress }: any) {
  return (
    <TouchableOpacity
      style={{
        height: 160,
        borderRadius: 18,
        marginHorizontal: 20,
        marginBottom: 24,
        backgroundColor: "#fff",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
        overflow: "hidden",
        flexDirection: "row",
        alignItems: "center",
      }}
      activeOpacity={0.92}
      onPress={onPress}
    >
      {/* Image section */}
      <View style={{ flex: 1.1, height: "100%" }}>
        <Image
          source={{
            uri: isValidImage(event.image) ? event.image : FALLBACK_IMAGE,
          }}
          style={{
            width: "100%",
            height: "100%",
            borderTopLeftRadius: 18,
            borderBottomLeftRadius: 18,
          }}
          resizeMode="cover"
        />
        {/* Gradient overlay */}
        <View
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            top: 0,
            borderTopLeftRadius: 18,
            borderBottomLeftRadius: 18,
            backgroundColor: "rgba(0,0,0,0.18)",
          }}
        />
        {/* Featured badge */}
        <View
          style={{
            position: "absolute",
            top: 10,
            left: 10,
            backgroundColor: "#FFD700",
            borderRadius: 10,
            paddingHorizontal: 8,
            paddingVertical: 2,
            flexDirection: "row",
            alignItems: "center",
            zIndex: 10,
          }}
        >
          <Star size={10} color="#222" fill="#FFD700" />
          <Text
            style={{
              color: "#222",
              fontWeight: "700",
              marginLeft: 4,
              fontSize: 10,
            }}
          >
            FEATURED
          </Text>
        </View>
      </View>
      {/* Info section */}
      <View
        style={{
          flex: 1.7,
          padding: 16,
          justifyContent: "center",
          height: "100%",
        }}
      >
        <Text
          style={{
            color: "#222",
            fontSize: 16,
            fontWeight: "bold",
            marginBottom: 6,
            lineHeight: 20,
          }}
          numberOfLines={2}
        >
          {event.title}
        </Text>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            marginBottom: 4,
          }}
        >
          <Clock size={12} color="#6c47ff" />
          <Text
            style={{
              color: "#6c47ff",
              fontSize: 12,
              marginLeft: 6,
              marginRight: 14,
            }}
            numberOfLines={1}
          >
            {event.date}
          </Text>
          <MapPin size={12} color="#6c47ff" />
          <Text
            style={{ color: "#6c47ff", fontSize: 12, marginLeft: 6 }}
            numberOfLines={1}
          >
            {event.location}
          </Text>
        </View>
        <TouchableOpacity
          style={{
            flexDirection: "row",
            alignItems: "center",
            alignSelf: "flex-start",
            marginTop: 6,
            paddingVertical: 4,
            paddingHorizontal: 10,
            borderRadius: 12,
            backgroundColor: "#f5f5f5",
          }}
          onPress={onPress}
        >
          <Text
            style={{
              color: "#6c47ff",
              fontWeight: "600",
              fontSize: 13,
              marginRight: 4,
            }}
          >
            View Details
          </Text>
          <View style={{ marginTop: 1 }}>
            <Text style={{ color: "#6c47ff", fontSize: 15 }}>›</Text>
          </View>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

function Section({ title, data, layout, onSeeAll, renderItem, loading }: any) {
  // Use a special card for Popular Places
  const isPopularPlaces = title === "Popular Places";
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <TouchableOpacity onPress={onSeeAll}>
          <Text style={styles.seeAllText}>See all</Text>
        </TouchableOpacity>
      </View>
      {loading ? (
        <ActivityIndicator style={styles.sectionLoading} color="#6c47ff" />
      ) : data && data.length > 0 ? (
        layout === "grid" ? (
          <FlatList
            data={data}
            numColumns={2}
            key={"grid"}
            showsVerticalScrollIndicator={false}
            keyExtractor={(_, idx) => idx.toString()}
            renderItem={renderItem}
            contentContainerStyle={
              isPopularPlaces
                ? styles.popularPlacesGridContainer
                : styles.gridContainer
            }
          />
        ) : (
          <FlatList
            data={data}
            horizontal
            key={"horizontal"}
            showsHorizontalScrollIndicator={false}
            keyExtractor={(_, idx) => idx.toString()}
            renderItem={renderItem}
            contentContainerStyle={styles.horizontalContainer}
          />
        )
      ) : (
        <View style={styles.emptySection}>
          <Text style={styles.emptySectionText}>No events found.</Text>
        </View>
      )}
    </View>
  );
}

function PopularPlaceCard({ item, onPress }: any) {
  return (
    <TouchableOpacity
      style={styles.popularPlaceCard}
      activeOpacity={0.9}
      onPress={onPress}
    >
      <Image
        source={{ uri: isValidImage(item.image) ? item.image : FALLBACK_IMAGE }}
        style={styles.popularPlaceImage}
        resizeMode="cover"
      />
      <View style={styles.popularPlaceContent}>
        <Text
          style={styles.popularPlaceTitle}
          numberOfLines={2}
          ellipsizeMode="tail"
        >
          {item.title}
        </Text>
        {item.location && (
          <Text
            style={styles.popularPlaceSubtitle}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {item.location}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

function ModernEventCard({ item, onPress, layout }: any) {
  return (
    <TouchableOpacity
      style={layout === "grid" ? styles.modernCardGrid : styles.modernCard}
      activeOpacity={0.9}
      onPress={onPress}
    >
      <Image
        source={{ uri: isValidImage(item.image) ? item.image : FALLBACK_IMAGE }}
        style={
          layout === "grid"
            ? styles.modernCardImageGrid
            : styles.modernCardImage
        }
      />
      <View style={styles.modernCardContent}>
        <Text
          style={styles.modernCardTitle}
          numberOfLines={2}
          ellipsizeMode="tail"
        >
          {item.title}
        </Text>
        <View style={styles.modernCardMetaRow}>
          <View style={styles.modernCardMetaItem}>
            <Clock size={12} color="#222" />
            <Text
              style={styles.modernCardMetaText}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {item.date}
            </Text>
          </View>
          {item.location && (
            <View style={styles.modernCardMetaItem}>
              <MapPin size={12} color="#222" />
              <Text
                style={styles.modernCardMetaText}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {item.location}
              </Text>
            </View>
          )}
        </View>
        {item.attendees > 0 && (
          <View style={styles.modernAttendees}>
            <Users size={12} color="#6c47ff" />
            <Text style={styles.modernAttendeesText}>{item.attendees}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  safeArea: {
    backgroundColor: "#fff",
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "android" ? 16 : 0,
    paddingBottom: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  errorText: {
    color: "#ff6b6b",
    textAlign: "center",
    margin: 20,
    fontSize: 16,
  },
  searchBarRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#222",
    fontWeight: "500",
  },
  filterButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#6c47ff",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
  },
  listContent: {
    paddingBottom: 40,
  },
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#222",
  },
  seeAllText: {
    fontSize: 14,
    color: "#6c47ff",
    fontWeight: "600",
  },
  sectionLoading: {
    marginTop: 20,
  },
  gridContainer: {
    paddingHorizontal: 20,
  },
  horizontalContainer: {
    paddingLeft: 20,
    paddingRight: 8,
  },
  emptySection: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  emptySectionText: {
    color: "#666",
    fontSize: 14,
  },
  modernCard: {
    width: 200,
    borderRadius: 18,
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
    marginRight: 16,
    marginBottom: 12,
    overflow: "hidden",
    paddingBottom: 8,
  },
  modernCardGrid: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: 18,
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 12,
    overflow: "hidden",
    paddingBottom: 8,
  },
  modernCardImage: {
    width: "100%",
    height: 110,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
  },
  modernCardImageGrid: {
    width: "100%",
    height: 120,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
  },
  modernCardContent: {
    padding: 12,
  },
  modernCardTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#222",
    marginBottom: 2,
  },
  modernCardMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 2,
  },
  modernCardMetaItem: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 12,
    flex: 1,
  },
  modernCardMetaText: {
    fontSize: 12,
    color: "#222",
    fontWeight: "500",
    marginLeft: 4,
    flexShrink: 1,
    flexWrap: "wrap",
  },
  modernAttendees: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    backgroundColor: "#f0f0ff",
    alignSelf: "flex-start",
    marginTop: 4,
  },
  modernAttendeesText: {
    fontSize: 12,
    color: "#6c47ff",
    fontWeight: "700",
    marginLeft: 4,
  },
  popularPlacesGridContainer: {
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  popularPlaceCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 18,
    margin: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
    overflow: "hidden",
    minHeight: 210,
    maxWidth: "48%",
  },
  popularPlaceImage: {
    width: "100%",
    aspectRatio: 4 / 3,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
  },
  popularPlaceContent: {
    padding: 12,
  },
  popularPlaceTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#222",
    marginBottom: 2,
  },
  popularPlaceSubtitle: {
    fontSize: 13,
    color: "#888",
    fontWeight: "500",
  },
});
