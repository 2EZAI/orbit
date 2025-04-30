import React, { useCallback } from "react";
import {
  View,
  ScrollView,
  Image,
  TouchableOpacity,
  Dimensions,
  Share,
  StyleSheet,
} from "react-native";
import { Text } from "~/src/components/ui/text";
import { Button } from "~/src/components/ui/button";
import { MapEvent } from "~/hooks/useMapEvents";
import { router } from "expo-router";
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

interface EventDetailsSheetProps {
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
}

export function EventDetailsSheet({
  event,
  isOpen,
  onClose,
  nearbyEvents,
  onEventSelect,
}: EventDetailsSheetProps) {
  const width = Dimensions.get("window").width;
  const imageSize = (width - 32) / 3; // 3 images per row with padding
  const bannerHeight = width * 0.5; // 50% of screen width

  const formatDate = (date: string) => {
    return format(new Date(date), "EEE, MMM d");
  };

  const formatTime = (date: string) => {
    return format(new Date(date), "h:mm a");
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Check out ${event.name} on Orbit!\n${event.description}`,
      });
    } catch (error) {
      console.error("Error sharing event:", error);
    }
  };

  if (!isOpen) return null;

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
        {event.image_urls?.[0] && (
          <View style={{ width, height: bannerHeight }}>
            <Image
              source={{ uri: event.image_urls[0] }}
              style={{ width, height: bannerHeight }}
              resizeMode="cover"
            />
          </View>
        )}

        {/* Header Section */}
        <View className="px-4 pt-4 pb-4 border-b border-border">
          <View className="flex-row items-center justify-between mb-4">
            <TouchableOpacity onPress={onClose}>
              <ArrowLeft size={24} className="text-foreground" />
            </TouchableOpacity>
            <View className="flex-row gap-4">
              <TouchableOpacity onPress={handleShare}>
                <Share2 size={20} className="text-foreground" />
              </TouchableOpacity>
              <TouchableOpacity>
                <Bookmark size={20} className="text-foreground" />
              </TouchableOpacity>
            </View>
          </View>
          <Text className="mb-2 text-2xl font-bold">{event.name}</Text>
          
          <View className="flex-row items-center justify-between">
            <View className="px-3 py-1 rounded-full bg-primary/10">
              <Text className="text-sm font-medium text-primary">
                Starts: {formatTime(event.start_datetime)}
              </Text>
            </View>
            {event.is_ticketmaster &&
            <TouchableOpacity 
            className="px-3 py-1 rounded-full bg-primary/10"
            onPress={() => {
              console.log(" book click:")
              router.push({
                pathname: "/(app)/(webview)",
                params: { external_url: event.external_url },
              });
            }}>
            <Text className="ml-1.5 font-semibold text-primary">
                  Book Event
                </Text>
                </TouchableOpacity>
            }
          </View>
        </View>

        {/* Main Content */}
        <View className="px-4">
          {/* Date and Location */}
          <View className="py-4 space-y-3">
            <View className="flex-row items-center space-x-3">
              <View className="items-center justify-center w-10 h-10 rounded-full bg-primary/10">
                <Calendar size={20} className="text-primary" />
              </View>
              <View>
                <Text className="text-base font-medium">
                  {formatDate(event.start_datetime)}
                </Text>
                <Text className="text-sm text-muted-foreground">
                  {formatTime(event.start_datetime)} -{" "}
                  {formatTime(event.end_datetime)}
                </Text>
              </View>
            </View>

            <View className="flex-row items-center space-x-3">
              <View className="items-center justify-center w-10 h-10 rounded-full bg-primary/10">
                <MapPin size={20} className="text-primary" />
              </View>
              <View className="flex-1">
                <Text className="text-base font-medium">
                  {event.venue_name}
                </Text>
                <Text className="text-sm text-muted-foreground">
                  {event.address}
                </Text>
                
              </View>
            </View>
          </View>

          {/* Host Info */}
          {event.created_by && (
            <View className="flex-row items-center p-4 mb-6 bg-muted rounded-xl">
              <UserAvatar
                size={40}
                user={{
                  id: event.created_by.id,
                  name: event.created_by.name || "Unknown",
                  image: event.created_by.avatar_url,
                }}
              />
              <View className="flex-1 ml-3">
                <Text className="text-sm text-muted-foreground">Hosted by</Text>
                <Text className="text-base font-medium">
                  {event.created_by.name ||
                    "@" + event.created_by.username ||
                    "Unknown"}
                </Text>
              </View>
            </View>
          )}

          {/* Description */}
          <View className="mb-6">
            <Text className="mb-2 text-lg font-semibold">About this event</Text>
            <Text className="text-base leading-relaxed text-muted-foreground">
              {event.description}
            </Text>
          </View>

          {/* Image Gallery */}
          {event.image_urls.length > 1 && (
            <View className="mb-6">
              <Text className="mb-3 text-lg font-semibold">Event Photos</Text>
              <View className="flex-row flex-wrap gap-2">
                {event.image_urls.slice(1).map((imageUrl, index) => (
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

          {/* Attendees */}
          <View className="mb-6">
            <Text className="mb-3 text-lg font-semibold">Who's coming</Text>
            <View className="flex-row items-center">
              <View className="flex-row -space-x-2">
                {event.attendees.profiles.slice(0, 5).map((attendee) => (
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
                {event.attendees.count} people going
              </Text>
            </View>
          </View>

          {/* Categories */}
          {event.categories.length > 0 && (
            <View className="mb-6">
              <Text className="mb-3 text-lg font-semibold">Categories</Text>
              <View className="flex-row flex-wrap gap-2">
                {event.categories.map((category) => (
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
        </View>
      </BottomSheetScrollView>

      {/* Join Button */}
      <View className="px-4 py-4 border-t border-border bg-background">
        <Button className="w-full">
          <Text className="font-medium text-primary-foreground">
            Join Event
          </Text>
        </Button>
      </View>
    </BottomSheet>
  );
}
