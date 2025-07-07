import React, { useState ,useEffect} from "react";
import {
  View,
  TouchableOpacity,
  Image,
  Linking,
  Platform,
  Dimensions,
  ActivityIndicator,
  DeviceEventEmitter,
} from "react-native";
import { Text } from "../ui/text";
import { BlurView } from "expo-blur";
import { MapLocation } from "~/hooks/useMapEvents";
import { formatTime, formatDate } from "~/src/lib/date";
import { X, Info, Users, MessageCircle, Navigation } from "lucide-react-native";
import { Icon } from "react-native-elements";
import { Button } from "../ui/button";
import { useRouter } from "expo-router";
import { supabase } from "~/src/lib/supabase";
import { useUser } from "~/hooks/useUserData";
import { EventDetailsSheet } from "./EventDetailsSheet";
import { GestureDetector, Gesture } from "react-native-gesture-handler";
import { useUpdateEvents } from "~/hooks/useUpdateEvents";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from "react-native-reanimated";

interface LocationCardProps {
  event: MapLocation;
  onClose: () => void;
  onEventSelect: (event: MapLocation) => void;
  nearbyEvents: MapLocation[];
  onShowDetails: () => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.3;

export function MapLocationCard({
  event,
  onClose,
  onEventSelect,
  nearbyEvents,
  onShowDetails,
}: LocationCardProps) {
  const { UpdateEventStatus,fetchLocationDetail } = useUpdateEvents();
  const router = useRouter();
  const { user } = useUser();
  const [showDetails, setShowDetails] = useState(false);
  const translateX = useSharedValue(0);
  const currentIndex = nearbyEvents.findIndex((e) => e.id === event.id);
const [loading, setLoading] = useState(true);
    const [locationDetail, setLocationDetail] = useState<
    any | undefined
  >(undefined);

useEffect(() => {
    DeviceEventEmitter.addListener('refreshlocationDetail', valueEvent => {
      // console.log('event----notitifactionBage', value);
      hitLocationDetail();
    });
    console.log("location card");
  }, []);
useEffect(() => {
     setLocationDetail({});
     console.log("event//",event);
    setLocationDetail(event);
    hitLocationDetail();
  }, []);

   const hitLocationDetail = async () => {
      console.log("hitLocationDetail");
    const locationDetails = await fetchLocationDetail(event);
    console.log("Returned location details:", locationDetails);
    if (locationDetails && typeof locationDetails === "object") {
    setLocationDetail(locationDetails);
    }
    setLoading(false)
  };
  const handleSwipeComplete = (direction: "left" | "right") => {
    "worklet";
    const newIndex = direction === "left" ? currentIndex + 1 : currentIndex - 1;

    if (newIndex >= 0 && newIndex < nearbyEvents.length) {
      runOnJS(onEventSelect)(nearbyEvents[newIndex]);
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
          currentIndex < nearbyEvents.length - 1
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

  const handleJoinOrbit = async () => {
    try {
      const { error } = await supabase.from("event_attendees").insert({
        event_id: locationDetail?.id,
        user_id: user?.id,
        status: "going",
        role: "attendee",
      });

      if (error) throw error;
      console.log("Successfully joined event");
    } catch (error) {
      console.error("Error joining event:", error);
    }
  };

  const hitUpdaeEventApi = async () => {
      setLoading(true)
      console.log("hitUpdaeEventApi");
    let data = await UpdateEventStatus(event);
       setTimeout(() => {
        setLoading(false);
          hitLocationDetail();
       if(data?.success){
        handleCreateOrbit();
       }
        }
        , 2000 );};


  const handleCreateEvent = () => {

     router.push({
                pathname: "/(app)/(create)",
                params: { 
                  locationId: locationDetail?.id,
                  locationType: locationDetail?.type,
                  latitude:locationDetail?.location?.latitude,
                  longitude:locationDetail?.location?.longitude,
                  category: JSON.stringify(locationDetail?.category),
                 },
              });
              setTimeout(() => {
 DeviceEventEmitter.emit('passDataToCreateEvent', 
    locationDetail?.id,
                   locationDetail?.type,
                 locationDetail?.location?.latitude,
                  locationDetail?.location?.longitude,
                  JSON.stringify(locationDetail?.category),);
              },300);
                 
  };

  const handleGetDirections = () => {
    const { latitude, longitude } = locationDetail?.location;
    const address = encodeURIComponent(locationDetail?.address);

    if (Platform.OS === "ios") {
      Linking.openURL(`maps://app?daddr=${latitude},${longitude}`);
    } else {
      Linking.openURL(`google.navigation:q=${latitude},${longitude}`);
    }
  };

  const handleShowDetails = () => {
    console.log("handleShowDetails>");
    if (onEventSelect) {
      onEventSelect(event);
    }
    // setShowDetails(true);
    onShowDetails(true);
  };

  return (
    <>
      <GestureDetector gesture={gesture}>
        <Animated.View
          style={[
            {
              position: "absolute",
              left: 0,
              right: 0,
              bottom: 10,
              marginBottom: 56,
              marginHorizontal: 16,
            },
            animatedStyle,
          ]}
        >
       
          <TouchableOpacity
            className="absolute z-10 items-center justify-center w-8 h-8 rounded-full right-2 top-2 bg-black/20"
             onPress={onClose} >
            {Platform.OS == "ios" ? (
              <X size={20} color="white" />
            ) : (
              <Icon
                name="close"
                type="material-community"
                size={20}
                color="white"
              />
            )}
          </TouchableOpacity>

          <View className="overflow-hidden rounded-2xl">
           {event?.image_urls?.[0] && <Image
              source={{ uri: event?.image_urls[0] }}
              className="absolute w-full h-full"
              blurRadius={3}
            />}
            {/* Dark overlay */}
            <View className="absolute w-full h-full bg-black/40" />

            <BlurView intensity={20} className="p-4">
              {/* Event Title and Time */}
              <View className="mb-2">
                <Text className="text-2xl font-semibold text-white">
                  {locationDetail?.name}
                </Text>
               {/* <Text className="mt-1 text-white/90">
                  {formatDate(event?.start_datetime)} •{" "}
                  {formatTime(event?.start_datetime)}
                </Text>*/}
              </View>

              {/* Location */}
              <View className="mb-4">
                <Text className="text-white/90" numberOfLines={1}>
                  {locationDetail?.venue_name}
                </Text>
                <Text className="text-white/70" numberOfLines={1}>
                  {locationDetail?.address}
                </Text>
                <TouchableOpacity
                  className="items-center justify-center w-10 h-10 bg-white rounded-full"
                  onPress={handleShowDetails}
                >
                  {Platform.OS == "ios" ? (
                    <Info size={20} className="text-primary" />
                  ) : (
                    <Icon
                      name="information-outline"
                      type="material-community"
                      size={20}
                      color="#239ED0"
                    />
                  )}
                </TouchableOpacity>
              </View>

              {/* Action Buttons */}
              <View className="flex-row gap-3">

                <Button className="flex-1 bg-white" onPress={handleCreateEvent}>
                  <View className="flex-row items-center justify-center">
                    {Platform.OS == "ios" ? (
                      <MessageCircle size={16} className="text-primary" />
                    ) : (
                      <Icon
                        name="chat-outline"
                        type="material-community"
                        size={16}
                        color="#239ED0"
                      />
                    )}
                    <Text className="ml-1.5 font-semibold text-primary">
                      Create Event
                    </Text>
                  </View>
                </Button>

                <Button
                  className="flex-1 bg-white"
                  onPress={handleGetDirections}
                >
                  <View className="flex-row items-center justify-center">
                    {Platform.OS == "ios" ? (
                      <Navigation size={16} className="text-primary" />
                    ) : (
                      <Icon
                        name="navigation"
                        type="material-community" 
                        size={16}
                        color="#239ED0"
                      />
                    )}
                    <Text className="ml-1.5 font-semibold text-primary">
                      Directions
                    </Text>
                  </View>
                </Button>
              </View>
            </BlurView>
          </View>
        </Animated.View>
      </GestureDetector>

      

      {showDetails && (
        <EventDetailsSheet
          event={event}
          isOpen={showDetails}
          onClose={() => setShowDetails(false)}
          nearbyEvents={nearbyEvents}
          onEventSelect={onEventSelect}
          onShowControler={() => {}}
        />
      )}
    </>
  );
}
