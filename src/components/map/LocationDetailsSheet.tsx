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
} from "react-native";
import { Text } from "~/src/components/ui/text";
import { Button } from "~/src/components/ui/button";
import { MapEvent } from "~/hooks/useMapEvents";
import { router } from "expo-router";
import { Icon } from "react-native-elements";
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
import BottomSheet, { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { useMapEvents  } from "~/hooks/useMapEvents";
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
    const [loading, setLoading] = useState(true);
    const [eventDetail, setEventDetail] = useState<{}>();
  const width = Dimensions.get("window").width;
  const imageSize = (width - 32) / 3; // 3 images per row with padding
  const bannerHeight = width * 0.5; // 50% of screen width
  const { UpdateEventStatus,fetchEventDetail } = useUpdateEvents();

  const formatDate = (date: string) => {
    try{
    return format(new Date(date), "EEE, MMM d");
    }
    catch(error)
    {
      return "";
    } 
  };

  const formatTime = (date: string) => {
    try{
    return format(new Date(date), "h:mm a");
    }
    catch(error)
    {
      return "";
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Check out ${eventDetail?.name} on Orbit!\n${eventDetail?.description}`,
      });
    } catch (error) {
      console.error("Error sharing event:", error);
    }
  };
   useEffect(() => {
    DeviceEventEmitter.addListener('refreshEventDetail', valueEvent => {
      // console.log('event----notitifactionBage', value);
      hitEventDetail();
      handleCreateOrbit();
    });
  }, []);

const handleCreateOrbit = () => {
    router.push({
      pathname: "/new",
      params: {
        eventId: eventDetail?.id,
        eventName: eventDetail?.name,
      },
    });
  };

    const hitUpdaeEventApi = async () => {
      setLoading(true)
      console.log("hitUpdaeEventApi");
      let data = await UpdateEventStatus(event);
       setTimeout(() => {
        setLoading(false);
        hitEventDetail();
        if(data?.success){
        handleCreateOrbit();
       }
        }
        , 2000 );};
   const hitEventDetail = async () => {
      console.log("hitEventDetail");
    const eventDetails = await fetchEventDetail(event);
    console.log("Returned event details:", eventDetails);
     setEventDetail({});
    setEventDetail(eventDetails);
    setLoading(false)
  };

  if (!isOpen) return null;

  useEffect(() => {
     setEventDetail({});
    setEventDetail(event);
    hitEventDetail();
    return () => {
      console.log("Hello");
      onShowControler(true);
    };
  }, []);

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
        {eventDetail?.image_urls && (
          <View style={{ width, height: bannerHeight }}>
            <Image
              source={{ uri: eventDetail?.image_urls }}
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
            <View className="flex-row gap-4">
              <TouchableOpacity onPress={handleShare}>
                {Platform.OS == "ios" ? (
                  <Share2 size={20} className="text-foreground" />
                ) : (
                  <Icon
                    name="share"
                    type="material-community"
                    size={20}
                    color="#239ED0"
                  />
                )}
              </TouchableOpacity>
              <TouchableOpacity>
                {Platform.OS == "ios" ? (
                  <Bookmark size={20} className="text-foreground" />
                ) : (
                  <Icon
                    name="bookmark"
                    type="material-community"
                    size={20}
                    color="#239ED0"
                  />
                )}
              </TouchableOpacity>
            </View>
          </View>
          <Text className="mb-2 text-2xl font-bold">{eventDetail?.name}</Text>

          <View className="flex-row items-center justify-between">
           {/* <View className="px-3 py-1 rounded-full bg-primary/10">
              <Text className="text-sm font-medium text-primary">
                Starts: {formatTime(eventDetail?.start_datetime)}
              </Text>
            </View>*/}

          {/*  <View className="flex-row items-center justify-between">
              {!eventDetail?.join_status && eventDetail?.external_url && (
                <TouchableOpacity
                  className="px-5 py-3 rounded-full bg-purple-700"
                  onPress={() => {
                    console.log(" book click:");
                    router.push({
                      pathname: "/(app)/(webview)",
                      params: { external_url: eventDetail?.external_url 
                      ,eventSelected:JSON.stringify(eventDetail)},
                    });
                  }}
                >
                  <Text className="ml-1.5 font-semibold text-white text-base">
                    Buy Tickets
                  </Text>
                </TouchableOpacity>
              )}

              
              {
                <TouchableOpacity
                  className={`mx-2 px-5 py-3 rounded-full ${eventDetail?.join_status ? 'bg-gray-300' : 'bg-purple-700'}`}
                  onPress={() => {
                    console.log(" book click:");
                    {!eventDetail?.join_status ? hitUpdaeEventApi()
                  : ""}
                    
                   
                  }}
                >
                  <Text className={`ml-1.5 font-semibold ${eventDetail?.join_status ? 'text-purple-700' : 'text-white'} text-base`}>
                    {eventDetail?.join_status ? "Joined" : "Join Event"}
                  </Text>
                </TouchableOpacity>
              }
            </View> */}
          </View>
        </View>

        {/* Main Content */}
        <View className="px-4">
          {/* Date and Location */}
         {/*  <View className="py-4 space-y-3">
            <View className="flex-row items-center space-x-3">
              <View className="items-center justify-center w-10 h-10 rounded-full bg-primary/10">
                {Platform.OS == "ios" ? (
                  <Calendar size={20} className="text-primary" />
                ) : (
                  <Icon
                    name="calendar"
                    type="material-community"
                    size={20}
                    color="#239ED0"
                  />
                )}
              </View>
              <View>
                <Text className="text-base font-medium">
                  {formatDate(eventDetail?.start_datetime)}
                </Text>
                <Text className="text-sm text-muted-foreground">
                  {formatTime(eventDetail?.start_datetime)} -{" "}
                  {formatTime(eventDetail?.end_datetime)}
                </Text>
              </View>
            </View>

            <View className="flex-row items-center space-x-3">
              <View className="items-center justify-center w-10 h-10 rounded-full bg-primary/10">
                {Platform.OS == "ios" ? (
                  <MapPin size={20} className="text-primary" />
                ) : (
                  <Icon
                    name="map-marker"
                    type="material-community"
                    size={20}
                    color="#239ED0"
                  />
                )}
              </View>
              <View className="flex-1">
                <Text className="text-base font-medium">
                  {eventDetail?.venue_name}
                </Text>
                <Text className="text-sm text-muted-foreground">
                  {eventDetail?.address}
                </Text>
              </View>
            </View>
          </View>*/}

          {/* Host Info */}
        {/* {eventDetail?.created_by && (
            <View className="flex-row items-center p-4 mb-6 bg-muted rounded-xl">
              <UserAvatar
                size={40}
                user={{
                  id: eventDetail?.created_by.id,
                  name: eventDetail?.created_by.name || "Unknown",
                  image: eventDetail?.created_by.avatar_url,
                }}
              />
              <View className="flex-1 ml-3">
                <Text className="text-sm text-muted-foreground">Hosted by</Text>
                <Text className="text-base font-medium">
                  {eventDetail?.created_by.name ||
                    "@" + eventDetail?.created_by.username ||
                    "Unknown"}
                </Text>
              </View>
            </View>
          )} */}

          {/* Description */}
          <View className="mb-6">
            <Text className="mb-2 text-lg font-semibold">About this event</Text>
            <Text className="text-base leading-relaxed text-muted-foreground">
              {eventDetail?.description}
            </Text>
          </View>

          {/* Image Gallery */}
         {/*  {eventDetail?.image_urls?.length > 1 && (
            <View className="mb-6">
              <Text className="mb-3 text-lg font-semibold">Event Photos</Text>
              <View className="flex-row flex-wrap gap-2">
                {eventDetail?.image_urls.slice(1).map((imageUrl, index) => (
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
          )} */}

          {/* Attendees */}
          <View className="mb-6">
            <Text className="mb-3 text-lg font-semibold">Who's coming</Text>
            <View className="flex-row items-center">
              <View className="flex-row -space-x-2">
                {eventDetail?.attendees?.profiles.slice(0, 5).map((attendee) => (
                  <UserAvatar
                    key={attendee.id}
                    size={32}
                    user={{
                      id: attendee.id,
                      name: attendee.name,
                      image: attendee.avatar_url,
                    }}
                  />
                ))}
              </View>
              <Text className="ml-3 text-muted-foreground">
                {eventDetail?.attendees?.count} people going
              </Text>
            </View>
          </View>

          {/* Categories */}
          {eventDetail?.categories?.length > 0 && (
            <View className="mb-6">
              <Text className="mb-3 text-lg font-semibold">Categories</Text>
              <View className="flex-row flex-wrap gap-2">
                {eventDetail?.categories.map((category) => (
                  <View
                    key={category.id}
                    className="px-3 py-1 rounded-full bg-muted"
                  >
                    <Text className="text-sm">{category.name}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
           {loading &&
      (<View className="absolute bottom-0 top-0 left-0 right-0">
        <ActivityIndicator size="large" color="#6200ee" />
      </View>)
   
  }
        </View>
      </BottomSheetScrollView>

      {/* Join Button */}
      {/* <View className="px-4 py-4 border-t border-border bg-background">
        <Button className="w-full">
          <Text className="font-medium text-primary-foreground">
            Join Event
          </Text>
        </Button>
      </View>
      */}
    </BottomSheet>
  );
}
