import React, { useState } from "react";
import {
  View,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
  SafeAreaView,
  Platform,
} from "react-native";
import { Text } from "~/src/components/ui/text";
import { Input } from "~/src/components/ui/input";
import { Button } from "~/src/components/ui/button";
import {
  Calendar,
  Clock,
  MapPin,
  Link,
  Image as ImageIcon,
  Plus,
  X,
  Info,
  Globe,
  Lock,
  Search,
  ChevronDown,
} from "lucide-react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as ImagePicker from "expo-image-picker";
import { useUser } from "~/hooks/useUserData";
import { supabase } from "~/src/lib/supabase";
import { router } from "expo-router";
import { debounce } from "lodash";

interface EventImage {
  uri: string;
  type: string;
  name: string;
}

type DateTimePickerType = "date" | "time";

interface MapboxFeature {
  id: string;
  place_name: string;
  text: string;
  context: Array<{
    id: string;
    text: string;
  }>;
  properties: {
    address?: string;
  };
  address?: string;
  center: [number, number];
}

interface LocationDetails {
  address1: string;
  address2: string;
  city: string;
  state: string;
  zip: string;
  coordinates: [number, number];
}

export default function CreateEvent() {
  const { user } = useUser();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [images, setImages] = useState<EventImage[]>([]);
  const [address1, setAddress1] = useState("");
  const [address2, setAddress2] = useState("");
  const [locationDetails, setLocationDetails] = useState<LocationDetails>({
    address1: "",
    address2: "",
    city: "",
    state: "",
    zip: "",
    coordinates: [0, 0],
  });
  const [searchResults, setSearchResults] = useState<MapboxFeature[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [externalUrl, setExternalUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [pickerType, setPickerType] = useState<DateTimePickerType>("date");
  const [isPrivate, setIsPrivate] = useState(false);

  const showPicker = (type: DateTimePickerType, isStart: boolean) => {
    setPickerType(type);
    if (isStart) {
      setShowStartPicker(true);
    } else {
      setShowEndPicker(true);
    }
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === "android") {
      setShowStartPicker(false);
      setShowEndPicker(false);
    }

    if (event.type === "set" && selectedDate) {
      const currentDate = showStartPicker ? startDate : endDate;
      const newDate = new Date(currentDate);

      if (pickerType === "date") {
        newDate.setFullYear(selectedDate.getFullYear());
        newDate.setMonth(selectedDate.getMonth());
        newDate.setDate(selectedDate.getDate());
      } else {
        newDate.setHours(selectedDate.getHours());
        newDate.setMinutes(selectedDate.getMinutes());
      }

      if (showStartPicker) {
        setStartDate(newDate);
      } else {
        setEndDate(newDate);
      }
    }

    if (Platform.OS === "ios") {
      setShowStartPicker(false);
      setShowEndPicker(false);
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: 5,
      allowsEditing: false,
      aspect: [16, 9],
      quality: 0.8,
    });

    if (!result.canceled) {
      const newImages = result.assets.map((asset) => ({
        uri: asset.uri,
        type: "image/jpeg",
        name: `event-image-${Date.now()}-${Math.random()
          .toString(36)
          .substring(7)}.jpg`,
      }));

      setImages((prev) => {
        const combined = [...prev, ...newImages];
        // Limit to 5 images total
        return combined.slice(0, 5);
      });
    }
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const searchAddress = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
          query
        )}.json?access_token=${
          process.env.MAPBOX_ACCESS_TOKEN
        }&country=US&types=address`
      );
      const data = await response.json();
      setSearchResults(data.features || []);
      setShowResults(true);
    } catch (error) {
      console.error("Error searching address:", error);
    }
  };

  const debouncedSearch = debounce(searchAddress, 300);

  const handleAddressSelect = (feature: MapboxFeature) => {
    const contextMap = new Map(
      feature.context?.map((item) => [item.id.split(".")[0], item.text])
    );

    const newLocationDetails = {
      address1: feature.properties.address
        ? `${feature.properties.address} ${feature.text}`
        : feature.text,
      address2: "",
      city: contextMap.get("place") || "",
      state: contextMap.get("region") || "",
      zip: contextMap.get("postcode") || "",
      coordinates: feature.center,
    };

    setLocationDetails(newLocationDetails);
    setAddress1(newLocationDetails.address1);
    setAddress2("");
    setShowResults(false);
  };

  const handleCreateEvent = async () => {
    if (!user) {
      Alert.alert("Error", "You must be logged in to create an event");
      return;
    }

    if (
      !name ||
      !description ||
      images.length === 0 ||
      !locationDetails.address1 ||
      !locationDetails.city ||
      !locationDetails.state ||
      !locationDetails.zip
    ) {
      Alert.alert(
        "Error",
        "Please fill in all required fields and add at least one image"
      );
      return;
    }

    setIsLoading(true);

    try {
      // 1. Upload images to storage
      const imageUrls = await Promise.all(
        images.map(async (image) => {
          const fileName = `events/${user.id}/${Date.now()}-${image.name}`;
          const response = await fetch(image.uri);
          const blob = await response.blob();

          const { error: uploadError, data } = await supabase.storage
            .from("event-images")
            .upload(fileName, blob);

          if (uploadError) throw uploadError;

          const {
            data: { publicUrl },
          } = supabase.storage.from("event-images").getPublicUrl(fileName);

          return publicUrl;
        })
      );

      // 2. Create event using our API
      const response = await fetch(
        `${process.env.BACKEND_MAP_URL}/api/events`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${
              (
                await supabase.auth.getSession()
              ).data.session?.access_token
            }`,
          },
          body: JSON.stringify({
            name,
            description,
            address: locationDetails.address1,
            address_line2: locationDetails.address2,
            city: locationDetails.city,
            state: locationDetails.state,
            zip: locationDetails.zip,
            start_datetime: startDate.toISOString(),
            end_datetime: endDate.toISOString(),
            external_url: externalUrl || null,
            image_urls: imageUrls,
            is_private: isPrivate,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create event");
      }

      const event = await response.json();

      Alert.alert(
        "Success",
        "Your event has been submitted for review. We'll notify you once it's approved.",
        [{ text: "OK", onPress: () => router.back() }]
      );
    } catch (error) {
      console.error("Error creating event:", error);
      Alert.alert(
        "Error",
        error instanceof Error
          ? error.message
          : "Failed to create event. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 100 }}
        keyboardShouldPersistTaps="handled"
        scrollEnabled={!showResults}
      >
        {/* Header Section */}
        <View className="px-4 pt-2 pb-6 mb-4 border-b border-border">
          <Text className="text-3xl font-bold">Create Event</Text>
          <Text className="mt-1 text-base text-muted-foreground">
            Share your event with the community
          </Text>
        </View>

        <View className="px-4">
          {/* Basic Info Section */}
          <View className="p-4 mb-6 rounded-lg bg-card">
            <View className="mb-4">
              <Text className="mb-1 text-lg font-semibold">
                Basic Information
              </Text>
              <Text className="text-sm text-muted-foreground">
                Let's start with the essential details
              </Text>
            </View>

            <View className="space-y-4">
              <View>
                <Text className="mb-1.5 font-medium">Event Name *</Text>
                <Input
                  value={name}
                  onChangeText={setName}
                  placeholder="Give your event a catchy name"
                  className="bg-background"
                />
              </View>

              <View>
                <Text className="mb-1.5 font-medium">Event Privacy *</Text>
                <View className="flex-row gap-3">
                  <TouchableOpacity
                    onPress={() => setIsPrivate(false)}
                    className={`flex-1 p-4 border rounded-xl ${
                      !isPrivate
                        ? "bg-primary/10 border-primary"
                        : "bg-background border-border"
                    }`}
                  >
                    <View className="items-center">
                      <Globe
                        size={24}
                        className={
                          !isPrivate ? "text-primary" : "text-muted-foreground"
                        }
                      />
                      <Text className="mt-2 mb-1 font-semibold">Public</Text>
                      <Text className="text-xs text-center text-muted-foreground">
                        Everyone can see and join
                      </Text>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => setIsPrivate(true)}
                    className={`flex-1 p-4 border rounded-xl ${
                      isPrivate
                        ? "bg-primary/10 border-primary"
                        : "bg-background border-border"
                    }`}
                  >
                    <View className="items-center">
                      <Lock
                        size={24}
                        className={
                          isPrivate ? "text-primary" : "text-muted-foreground"
                        }
                      />
                      <Text className="mt-2 mb-1 font-semibold">Private</Text>
                      <Text className="text-xs text-center text-muted-foreground">
                        Followers only
                      </Text>
                    </View>
                  </TouchableOpacity>
                </View>
                <Text className="mt-2 text-xs text-muted-foreground">
                  {isPrivate
                    ? "Only your followers can see this event. Others will need an invite to join."
                    : "This event will be visible to everyone on the map."}
                </Text>
              </View>

              <View>
                <Text className="mb-1.5 font-medium">Description *</Text>
                <Input
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Tell people what your event is about..."
                  multiline
                  numberOfLines={6}
                  textAlignVertical="top"
                  className="min-h-[150px] p-3 leading-relaxed bg-background"
                  style={{
                    height: 150,
                    textAlignVertical: "top",
                  }}
                />
              </View>
            </View>
          </View>

          {/* Images Section */}
          <View className="p-4 mb-6 rounded-lg bg-card">
            <View className="mb-4">
              <Text className="mb-1 text-lg font-semibold">Event Images</Text>
              <Text className="text-sm text-muted-foreground">
                Add up to 5 images to showcase your event
              </Text>
            </View>

            <View className="flex-row flex-wrap gap-3">
              {images.map((image, index) => (
                <View key={index} className="relative">
                  <Image
                    source={{ uri: image.uri }}
                    className="w-[100px] h-[100px] rounded-xl"
                  />
                  <TouchableOpacity
                    onPress={() => removeImage(index)}
                    className="absolute items-center justify-center w-6 h-6 rounded-full -top-2 -right-2 bg-destructive"
                  >
                    <X size={16} color="white" />
                  </TouchableOpacity>
                </View>
              ))}
              {images.length < 5 && (
                <TouchableOpacity
                  onPress={pickImage}
                  className="items-center justify-center w-[100px] h-[100px] rounded-xl border-2 border-dashed border-muted-foreground/30 bg-muted/30"
                >
                  <Plus size={24} className="text-muted-foreground" />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Location Section */}
          <View className="p-4 mb-6 rounded-lg bg-card">
            <View className="mb-4">
              <Text className="mb-1 text-lg font-semibold">Location</Text>
              <Text className="text-sm text-muted-foreground">
                Where will your event take place?
              </Text>
            </View>

            <View className="space-y-4">
              {/* Address Search Input Container */}
              <View>
                <Input
                  value={address1}
                  onChangeText={(text) => {
                    setAddress1(text);
                    debouncedSearch(text);
                  }}
                  placeholder="Search address..."
                  className="pr-10 bg-background"
                />
              </View>

              {/* Search Results Dropdown */}
              {showResults && searchResults.length > 0 && (
                <View className="border rounded-lg border-border bg-background">
                  {searchResults.slice(0, 5).map((result) => (
                    <TouchableOpacity
                      key={result.id}
                      onPress={() => handleAddressSelect(result)}
                      className="p-3 border-b border-border"
                    >
                      <Text className="font-medium">{result.text}</Text>
                      <Text className="text-sm text-muted-foreground">
                        {result.place_name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* Address Line 2 Input */}
              <Input
                value={address2}
                onChangeText={setAddress2}
                placeholder="Apt, Suite, etc. (optional)"
                className="bg-background"
              />

              {/* Location Summary */}
              {locationDetails.city && (
                <View className="flex-row items-center p-3 mt-2 space-x-2 rounded-lg bg-muted">
                  <MapPin size={16} className="text-muted-foreground" />
                  <Text className="text-sm text-muted-foreground">
                    {locationDetails.city}, {locationDetails.state}{" "}
                    {locationDetails.zip}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Date & Time Section */}
          <View className="p-4 mb-6 rounded-lg bg-card">
            <View className="mb-4">
              <Text className="mb-1 text-lg font-semibold">Date & Time</Text>
              <Text className="text-sm text-muted-foreground">
                When will your event happen?
              </Text>
            </View>

            <View className="space-y-6">
              {/* Start Time */}
              <View className="p-4 rounded-lg bg-muted/30">
                <View className="flex-row items-center justify-between mb-4">
                  <View>
                    <Text className="text-base font-semibold">Start Time</Text>
                    <Text className="text-sm text-muted-foreground">
                      When does your event begin?
                    </Text>
                  </View>
                  <View className="items-center justify-center w-8 h-8 rounded-full bg-primary/10">
                    <Clock size={18} className="text-primary" />
                  </View>
                </View>

                <View className="space-y-3">
                  <TouchableOpacity
                    onPress={() => showPicker("date", true)}
                    className="flex-row items-center justify-between p-3 border rounded-lg bg-background border-border"
                  >
                    <View className="flex-row items-center">
                      <Calendar
                        size={20}
                        className="mr-3 text-muted-foreground"
                      />
                      <Text>Date</Text>
                    </View>
                    <Text className="text-primary">
                      {startDate.toLocaleDateString()}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => showPicker("time", true)}
                    className="flex-row items-center justify-between p-3 border rounded-lg bg-background border-border"
                  >
                    <View className="flex-row items-center">
                      <Clock size={20} className="mr-3 text-muted-foreground" />
                      <Text>Time</Text>
                    </View>
                    <Text className="text-primary">
                      {startDate.toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* End Time */}
              <View className="p-4 rounded-lg bg-muted/30">
                <View className="flex-row items-center justify-between mb-4">
                  <View>
                    <Text className="text-base font-semibold">End Time</Text>
                    <Text className="text-sm text-muted-foreground">
                      When does your event end?
                    </Text>
                  </View>
                  <View className="items-center justify-center w-8 h-8 rounded-full bg-primary/10">
                    <Clock size={18} className="text-primary" />
                  </View>
                </View>

                <View className="space-y-3">
                  <TouchableOpacity
                    onPress={() => showPicker("date", false)}
                    className="flex-row items-center justify-between p-3 border rounded-lg bg-background border-border"
                  >
                    <View className="flex-row items-center">
                      <Calendar
                        size={20}
                        className="mr-3 text-muted-foreground"
                      />
                      <Text>Date</Text>
                    </View>
                    <Text className="text-primary">
                      {endDate.toLocaleDateString()}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => showPicker("time", false)}
                    className="flex-row items-center justify-between p-3 border rounded-lg bg-background border-border"
                  >
                    <View className="flex-row items-center">
                      <Clock size={20} className="mr-3 text-muted-foreground" />
                      <Text>Time</Text>
                    </View>
                    <Text className="text-primary">
                      {endDate.toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>

          {/* External URL Section */}
          <View className="p-4 mb-6 rounded-lg bg-card">
            <View className="mb-4">
              <Text className="mb-1 text-lg font-semibold">
                Additional Info
              </Text>
              <Text className="text-sm text-muted-foreground">
                Optional details about your event
              </Text>
            </View>

            <View>
              <Text className="mb-1.5 font-medium">External URL</Text>
              <Input
                value={externalUrl}
                onChangeText={setExternalUrl}
                placeholder="https://"
                className="bg-background"
              />
            </View>
          </View>

          {/* Submit Button */}
          <View className="px-4 py-4 mb-4 -mx-4 border-t border-border">
            <Button
              onPress={handleCreateEvent}
              disabled={isLoading}
              className="w-full"
            >
              <Text className="font-medium text-primary-foreground">
                {isLoading ? "Creating Event..." : "Create Event"}
              </Text>
            </Button>
          </View>
        </View>
      </ScrollView>

      {/* Date Picker */}
      {(showStartPicker || showEndPicker) && (
        <DateTimePicker
          value={showStartPicker ? startDate : endDate}
          mode={pickerType}
          is24Hour={false}
          onChange={handleDateChange}
          display={Platform.OS === "ios" ? "spinner" : "default"}
        />
      )}
    </SafeAreaView>
  );
}
