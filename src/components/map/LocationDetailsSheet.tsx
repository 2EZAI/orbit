import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  ScrollView,
  Image,
  TouchableOpacity,
  Dimensions,
  Share,
  StyleSheet,
  Platform,
  ActivityIndicator,
  DeviceEventEmitter,
  FlatList,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Text } from "~/src/components/ui/text";
import { Button } from "~/src/components/ui/button";
import { MapEvent } from "~/hooks/useMapEvents";
import { router } from "expo-router";
import { Icon } from "react-native-elements";
import { FeedEventCard } from "~/src/components/feed/FeedEventCard";
import { EventDetailsSheet } from "~/src/components/map/EventDetailsSheet";

import {
  Share2,
  MapPin,
  Calendar,
  Clock,
  ArrowLeft,
  Bookmark,
  ChevronDown,
} from "lucide-react-native";
import { format } from "date-fns";
import { UserAvatar } from "~/src/components/ui/user-avatar";
import BottomSheet, {
  BottomSheetScrollView,
  BottomSheetFlatList,
} from "@gorhom/bottom-sheet";
import { useMapEvents } from "~/hooks/useMapEvents";
import { useUpdateEvents } from "~/hooks/useUpdateEvents";

interface LocationDetailsSheetProps {
  event: MapEvent & {
    created_by?: {
      id: string;
      name: string;
      avatar_url: string | null;
    };
  };
  isOpen: boolean;
  onClose: () => void;
  nearbyEvents: MapEvent[];
  onEventSelect: (event: MapEvent) => void;
  onShowControler: () => void;
}

export function LocationDetailsSheet({
  event,
  isOpen,
  onClose,
  nearbyEvents,
  onEventSelect,
  onShowControler,
}: LocationDetailsSheetProps) {
  const PAGE_SIZE = 40;
  const [selectedEvent, setSelectedEvent] = useState<any>(null);

  const [page, setPage] = useState(1);
  const [eventsList, setEventsList] = useState([]);
  const [hasMore, setHasMore] = useState(true);
  const [showAllEvents, setShowAllEvents] = useState(false);
  const [loading, setLoading] = useState(false);
  const [onEndReached, setonEndReached] = useState(true);
  const [locationDetail, setLocationDetail] = useState<{}>();
  const width = Dimensions.get("window").width;
  const imageSize = (width - 32) / 3; // 3 images per row with padding
  const bannerHeight = width * 0.5; // 50% of screen width
  const {  fetchLocationDetail, fetchLocationEvents } =
    useUpdateEvents();

  const formatDate = (date: string) => {
    try {
      return format(new Date(date), "EEE, MMM d");
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

 const hitLocationDetail = async () => {
      console.log("hitLocationDetail");
    const locationDetails = await fetchLocationDetail(event);
    console.log("Returned location details:", locationDetails);
     setLocationDetail({});
    setLocationDetail(locationDetails);
    setLoading(false)
  };
  const handleShare = async () => {
    try {
      await Share.share({
        message: `Check out ${locationDetail?.name} on Orbit!\n${locationDetail?.description}`,
      });
    } catch (error) {
      console.error("Error sharing event:", error);
    }
  };

  const handleCreateOrbit = () => {
    router.push({
      pathname: "/new",
      params: {
        eventId: locationDetail?.id,
        eventName: locationDetail?.name,
      },
    });
  };



  if (!isOpen) return null;

  useEffect(() => {
    setLocationDetail({});
    console.log("event??", event);
    console.log("event.prompts??", event?.category?.prompts);
    setLocationDetail(event);
    hitLocationDetail();
    setPage(1);
    loadEvents();

    return () => {
      console.log("Hello");
      onShowControler(true);
    };
  }, []);

  const loadEvents = async () => {
    console.log("loadEvents:>");
    if (loading || !hasMore) return; // 👈 prevent infinite
    setLoading(true);

    console.log("loadEvents:", event);
    const data = await fetchLocationEvents(event, page, PAGE_SIZE);
    console.log("data>:", data);
    if (data.length === 0) {
      setLoading(false);
      setHasMore(false);
      console.error("Fetch error:", error);
    } else {
      setEventsList((prev) => [...prev, ...data]);
      setPage((prev) => prev + 1);
      // if (data.length < PAGE_SIZE) setHasMore(false); // stop if no more
    }

    setLoading(false);
    updateEndReached();
  };
  const updateEndReached = () => {
    setonEndReached(false);
    setTimeout(() => {
      setonEndReached(true);
    }, 300);
  };

  return (
    <BottomSheet
      snapPoints={["60%", "95%"]}
      handleIndicatorStyle={{ backgroundColor: "#A1A1AA" }}
      backgroundStyle={{ backgroundColor: "#fff" }}
      enablePanDownToClose
      onClose={onClose}
    >
      <BottomSheetScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Banner Image */}
           {loading && hasMore && (
        <SafeAreaView className="absolute top-0 left-0 right-0 mb-[20%] bottom-0 items-center justify-center ">
          <ActivityIndicator size="large" color="#000080" />
        </SafeAreaView>
      )}
        {locationDetail?.image_urls?.[0] && (
          <View style={{ width, height: bannerHeight }}>
            <Image
              source={{ uri: locationDetail?.image_urls[0] }}
              style={{ width, height: bannerHeight }}
              resizeMode="cover"
            />
          </View>
        )}

        {/* Header Section */}
        <View className="px-4 pt-4 pb-4 border-b border-border">
          <View className="flex-row items-center justify-between mb-4">
            <TouchableOpacity onPress={onClose}>
              {Platform.OS == "ios" ? (
                <ArrowLeft size={24} className="text-foreground" />
              ) : (
                <Icon
                  name="arrow-left"
                  type="material-community"
                  size={20}
                  color="#239ED0"
                />
              )}
            </TouchableOpacity>
          </View>
          <View className="mb-2 flex-row items-center justify-between">
            <Text className=" text-2xl font-bold w-[60%]">
              {locationDetail?.name}
            </Text>
            <Button
              className=" bg-primary"
              onPress={() => {
                router.push({
                  pathname: "/(app)/(create)",
                  params: {
                    locationId: locationDetail?.id,
                    locationType: locationDetail?.type,
                    latitude: locationDetail?.location?.latitude,
                    longitude: locationDetail?.location?.longitude,
                    category: JSON.stringify(locationDetail?.category),
                  },
                });

                setTimeout(() => {
                  DeviceEventEmitter.emit(
                    "passDataToCreateEvent",
                    locationDetail?.id,
                    locationDetail?.type,
                    locationDetail?.location?.latitude,
                    locationDetail?.location?.longitude,
                    JSON.stringify(locationDetail?.category)
                  );
                }, 300);
              }}
            >
              <View className="flex-row items-center justify-center">
                <Text className="ml-1.5 font-semibold text-white">
                  Create Event
                </Text>
              </View>
            </Button>
          </View>

          <View className="flex-row items-center justify-between">
  
          </View>
        </View>

        {/* Main Content */}
        <View className="px-4">
          {/* Description */}
          <View className="mb-6">
            <Text className="mb-2 text-lg font-semibold">
              About this Location
            </Text>
            <Text className="text-base leading-relaxed text-muted-foreground">
              {locationDetail?.description}
            </Text>
          </View>

          {/* Category prompts */}
          {locationDetail?.category && (
            <View className="mb-6">
              <Text className="mb-3 text-lg font-semibold">Category</Text>
              <View className="flex-row flex-wrap gap-2">
                <View className="px-3 py-1 rounded-full bg-muted">
                  <Text className="text-sm">{locationDetail?.category?.name}</Text>
                </View>
              </View>
              <Text className="mb-3 mt-4 text-lg font-semibold">Prompt</Text>

              <View className="flex-row flex-wrap gap-2">
                {locationDetail?.category?.prompts?.map((prompt) => (
                  <View
                    key={prompt.id}
                    className="px-3 py-1 rounded-full bg-muted"
                  >
                    <Text className="text-sm">{prompt.name}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Image Gallery */}
          {locationDetail?.image_urls?.length > 1 && (
            <View className="mb-6">
              <Text className="mb-3 text-lg font-semibold">
                Location Photos
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {locationDetail?.image_urls.slice(1).map((imageUrl, index) => (
                  <TouchableOpacity key={index} activeOpacity={0.8}>
                    <Image
                      source={{ uri: imageUrl }}
                      style={{
                        width: imageSize,
                        height: imageSize,
                        borderRadius: 12,
                      }}
                    />
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          <View className="mb-6">
            <View className="mb-6 flex-row items-center justify-between">
              <View>
                <Text className="text-lg font-semibold">Events</Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  setShowAllEvents(true);
                  console.log("See All Pressed");
                }}
              >
                <Text className="text-blue-500 font-medium">See All</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={eventsList}
              keyExtractor={(item, index) => item.id ?? index.toString()}
              renderItem={({ item }) => (
                <FeedEventCard
                  key={item.id}
                  event={item}
                  onEventSelect={(event, locationDetail) => {
                    setSelectedEvent(event);
                  }}
                  // nearbyEvents={events}
                  // nearbyEvents={eventsHome}
                />
              )}
              onEndReached={(d) => {
                console.log("onEndReached", d.distanceFromEnd);
                if (onEndReached) {
                  loadEvents();
                }
              }}
              onEndReachedThreshold={0.5}
              ListFooterComponent={loading && hasMore && <ActivityIndicator />}
            />
          </View>

          <Button
            className=" m-10 bottom-0 left-0 right-0 bg-primary"
            onPress={() => {
              router.push({
                pathname: "/(app)/(create)",
                params: {
                  locationId: locationDetail?.id,
                  locationType: locationDetail?.type,
                  latitude: locationDetail?.location?.latitude,
                  longitude: locationDetail?.location?.longitude,
                  category: JSON.stringify(event?.category),
                },
              });

              setTimeout(() => {
                DeviceEventEmitter.emit(
                  "passDataToCreateEvent",
                  locationDetail?.id,
                  locationDetail?.type,
                  locationDetail?.location?.latitude,
                  locationDetail?.location?.longitude,
                  JSON.stringify(event?.category)
                );
              }, 300);
            }}
          >
            <View className="flex-row items-center justify-center">
              <Text className="ml-1.5 font-semibold text-white">
                Create Event
              </Text>
            </View>
          </Button>
        </View>
      </BottomSheetScrollView>

      {selectedEvent && (
        <EventDetailsSheet
          event={selectedEvent}
          isOpen={!!selectedEvent}
          onClose={() => setSelectedEvent(null)}
          nearbyEvents={eventsList}
          onEventSelect={setSelectedEvent}
          onShowControler={() => {}}
        />
      )}

      {showAllEvents && (
        <View className="absolute top-0 bottom-0 right-0 left-0 justify-center bg-white">
          <View className="w-[100%] h-[80%] justify-center  rounded-lg p-4">
            <TouchableOpacity
              onPress={() => {
                setShowAllEvents(false);
                updateEndReached();
              }}
            >
              <Icon
                name="close-circle-outline"
                type="material-community"
                size={30}
                color="#239ED0"
              />
            </TouchableOpacity>
            <FlatList
              className="w-full h-full bg-white"
              data={eventsList}
             
              keyExtractor={(item, index) => item.id ?? index.toString()}
              renderItem={({ item }) => (
                <FeedEventCard
                  key={item.id}
                  event={item}
                  onEventSelect={() => {
                    setShowAllEvents(false);
                    updateEndReached();
                    setSelectedEvent(item);
                  }}
                  // nearbyEvents={events}
                  // nearbyEvents={eventsHome}
                />
              )}
              onEndReached={(d) => {
                console.log("onEndReached", d.distanceFromEnd);
                if (onEndReached) {
                  loadEvents();
                }
              }}
              onEndReachedThreshold={0.5}
              ListFooterComponent={loading && hasMore && <ActivityIndicator />}
            />
          
          </View>
        </View>
      )}
    </BottomSheet>
  );
}
