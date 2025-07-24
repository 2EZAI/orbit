import React, { useState, useEffect } from "react";
import {
  View,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
  Platform,
  DeviceEventEmitter,
} from "react-native";
import { Category } from "~/hooks/useMapEvents";
import { Icon } from "react-native-elements";
import { SafeAreaView } from "react-native-safe-area-context";
import { Text } from "~/src/components/ui/text";
import { Input } from "~/src/components/ui/input";
import { Button } from "~/src/components/ui/button";
import {
  Calendar,
  Clock,
  MapPin,
  Image as ImageIcon,
  Plus,
  X,
  Globe,
  Lock,
} from "lucide-react-native";
import { useActionSheet } from "@expo/react-native-action-sheet";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system";
import { useUser } from "~/hooks/useUserData";
import { supabase } from "~/src/lib/supabase";
import { router } from "expo-router";
import { debounce } from "lodash";
import Toast from "react-native-toast-message";
import { useLocalSearchParams } from "expo-router";
import { TopicListSingleSelection } from "~/src/components/topics/TopicListSingleSelection";

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

// Function to convert base64 to Uint8Array for Supabase storage
function decode(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export default function CreateEvent() {
  // const { locationid,locationtype,Latitude,Longitude,category} = useLocalSearchParams();
  //   console.log("locationType>>", locationtype);
  //   console.log("latitude>>", Latitude);
  //    console.log("longitude>>", Longitude);
  //    const [locationId, setlocationId] = useState(locationid ? locationid : undefined);
  //    const [locationType, setlocationType] = useState(locationtype ? locationtype : undefined);
  //    const [latitude, setlatitude] = useState(Latitude ? Latitude : undefined);
  //    const [longitude, setlongitude] = useState(Longitude ? Longitude : undefined);

  //    const parsedCategory = category ? JSON.parse(category as string) : [];
  // console.log("parsedCategory>>", parsedCategory);
  // const [categoryList, setCategoryList] = useState<Category>(parsedCategory === undefined ? {} : parsedCategory);
  // const [selectedPrompts, setSelectedPrompts] = useState<Prompts>({});
  // const [showPrompts, setshowPrompts] = useState( categoryList?.prompts === undefined ? false : true);

  const [locationId, setlocationId] = useState(undefined);
  const [locationType, setlocationType] = useState(undefined);
  const [latitude, setlatitude] = useState(undefined);
  const [longitude, setlongitude] = useState(undefined);
  const [selectedTopics, setSelectedTopics] = useState<string>("");

  const [categoryList, setCategoryList] = useState<Category>({});
  const [selectedPrompts, setSelectedPrompts] = useState<Prompts>({});
  const [showPrompts, setshowPrompts] = useState(false);

  const { showActionSheetWithOptions } = useActionSheet();
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
  const [showResults, setShowResults] = useState();
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [externalUrl, setExternalUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isPrivate, setIsPrivate] = useState(false);

  useEffect(() => {
    console.log("createevent_useEffect");
    DeviceEventEmitter.addListener(
      "passDataToCreateEvent",
      (locationid, locationtype, Latitude, Longitude, category) => {
        console.log("event----passDataToCreateEvent");

        // console.log("locationType>>", locationtype);
        // console.log("latitude>>", Latitude);
        // console.log("longitude>>", Longitude);
        setlocationId(locationid ? locationid : undefined);
        setlocationType(locationtype ? locationtype : undefined);
        setlatitude(Latitude ? Latitude : undefined);
        setlongitude(Longitude ? Longitude : undefined);

        const parsedCategory = category ? JSON.parse(category as string) : [];
        // console.log("parsedCategory>>", parsedCategory);
        setCategoryList(parsedCategory === undefined ? {} : parsedCategory);
        // setshowPrompts( categoryList?.prompts === undefined ? false : true);
        setshowPrompts(parsedCategory === undefined ? false : true);
      }
    );
  }, []);

  const showDatePicker = (isStart: boolean) => {
    const currentDate = isStart ? startDate : endDate;
    const options = [
      "Today",
      "Tomorrow",
      "In 2 days",
      "In 3 days",
      "Pick a specific date",
      "Cancel",
    ];

    showActionSheetWithOptions(
      {
        options,
        cancelButtonIndex: 5,
        title: `Select ${isStart ? "Start" : "End"} Date`,
      },
      (selectedIndex) => {
        if (selectedIndex === undefined || selectedIndex === 5) return;

        const newDate = new Date();
        if (selectedIndex === 0) {
          // Today - keep current date
        } else if (selectedIndex === 1) {
          // Tomorrow
          newDate.setDate(newDate.getDate() + 1);
        } else if (selectedIndex === 2) {
          // In 2 days
          newDate.setDate(newDate.getDate() + 2);
        } else if (selectedIndex === 3) {
          // In 3 days
          newDate.setDate(newDate.getDate() + 3);
        } else if (selectedIndex === 4) {
          // Show date input alert
          Alert.prompt("Enter Date", "Format: MM/DD/YYYY", (text) => {
            const date = new Date(text);
            if (isNaN(date.getTime())) {
              Alert.alert(
                "Invalid Date",
                "Please enter a valid date in MM/DD/YYYY format"
              );
              return;
            }
            if (isStart) {
              setStartDate(date);
            } else {
              setEndDate(date);
            }
          });
          return;
        }

        // Keep the current time
        newDate.setHours(currentDate.getHours());
        newDate.setMinutes(currentDate.getMinutes());

        if (isStart) {
          setStartDate(newDate);
        } else {
          setEndDate(newDate);
        }
      }
    );
  };

  const showTimePicker = (isStart: boolean) => {
    const currentDate = isStart ? startDate : endDate;
    const hours = Array.from({ length: 24 }, (_, i) => {
      const hour = i % 12 || 12;
      const ampm = i < 12 ? "AM" : "PM";
      return `${hour}:00 ${ampm}`;
    });

    const options = [...hours, "Cancel"];

    showActionSheetWithOptions(
      {
        options,
        cancelButtonIndex: 24,
        title: `Select ${isStart ? "Start" : "End"} Time`,
      },
      (selectedIndex) => {
        if (selectedIndex === undefined || selectedIndex === 24) return;

        const newDate = new Date(currentDate);
        newDate.setHours(selectedIndex);
        newDate.setMinutes(0);

        if (isStart) {
          setStartDate(newDate);
        } else {
          setEndDate(newDate);
        }
      }
    );
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsMultipleSelection: true,
        quality: 0.8,
        allowsEditing: false,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        // Filter out invalid assets
        const validAssets = result.assets.filter((asset) => {
          const isValidUri = asset.uri && asset.uri.startsWith("file://");
          // For ImagePicker, we just need to check if it's an image type
          const isValidType = asset.type === "image";
          return isValidUri && isValidType;
        });

        if (validAssets.length === 0) {
          throw new Error(
            "No valid images selected. Please select JPEG or PNG images."
          );
        }

        // Map assets to include file extension and proper MIME type
        const processedAssets = validAssets.map((asset) => {
          const extension = asset.uri.split(".").pop()?.toLowerCase();

          // Determine MIME type based on file extension
          let mimeType = "image/jpeg"; // default
          if (extension === "png") {
            mimeType = "image/png";
          } else if (extension === "heic") {
            mimeType = "image/heic";
          }

          return {
            uri: asset.uri,
            type: mimeType,
            name: `image-${Date.now()}.${extension || "jpg"}`,
          };
        });

        setImages((prevImages) => [...prevImages, ...processedAssets]);
      }
    } catch (error: any) {
      console.error("Image picker error:", error);
      Alert.alert(
        "Error",
        error instanceof Error
          ? error.message
          : "Failed to select images. Please try again."
      );
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

    if (locationType === "static" || locationType === "googleApi") {
      if (
        !name ||
        !description ||
        // !selectedPrompts?.id ||
        selectedTopics === "" ||
        images.length === 0
      ) {
        Alert.alert(
          "Error",
          "Please fill in all required fields and add at least one image"
        );
        return;
      }
    } else {
      if (
        !name ||
        !description ||
        selectedTopics === "" ||
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
    }

    setIsLoading(true);

    try {
      // 1. Upload images to storage
      const imageUrls = await Promise.all(
        images.map(async (image, index) => {
          try {
            if (!image?.uri || !image?.type) {
              throw new Error(`Invalid image data for image ${index + 1}`);
            }

            // Get the file extension
            const fileExt = image.uri.split(".").pop()?.toLowerCase() || "jpg";
            const fileName = `${user.id}/${Date.now()}-${index}.${fileExt}`;
            const filePath = `${
              FileSystem.documentDirectory
            }temp_${Date.now()}-${index}.${fileExt}`;

            var base64 = "";
            // Download the image first (needed for expo-file-system)
            if (Platform.OS === "ios") {
              await FileSystem.downloadAsync(image.uri, filePath);
              base64 = await FileSystem.readAsStringAsync(filePath, {
                encoding: FileSystem.EncodingType.Base64,
              });
            } else {
              const uri = image.uri; // Assuming this is a local file URI like 'file:///path/to/file'
              const fileUri = `${
                FileSystem.documentDirectory
              }temp_${Date.now()}-${index}.${fileExt}`;
              await FileSystem.copyAsync({ from: uri, to: fileUri });
              // Read the file as base64
              base64 = await FileSystem.readAsStringAsync(fileUri, {
                encoding: FileSystem.EncodingType.Base64,
              });
            }

            // Upload to Supabase Storage
            const { error: uploadError } = await supabase.storage
              .from("event-images")
              .upload(fileName, decode(base64), {
                contentType: image.type || `image/${fileExt}`,
                upsert: true,
              });

            // Clean up the temporary file
            try {
              await FileSystem.deleteAsync(filePath);
            } catch (cleanupError) {
              console.warn("Error cleaning up temp file:", cleanupError);
            }

            if (uploadError) {
              console.error("Upload error:", uploadError);
              throw uploadError;
            }

            // Get the public URL
            const {
              data: { publicUrl },
            } = supabase.storage.from("event-images").getPublicUrl(fileName);

            if (!publicUrl) {
              throw new Error("Failed to get public URL for uploaded image");
            }

            return publicUrl;
          } catch (error: any) {
            console.error("Image processing error:", error);
            throw new Error(
              `Error processing image ${index + 1}: ${
                error?.message || "Unknown error"
              }`
            );
          }
        })
      );

      // Get auth session
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error("No valid auth session");
      }

      // 2. Create event using our API

      let eventData = {
        name,
        description,
        type: "Default",
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
        topic_id: selectedTopics,
      };
      if (locationType === "static" || locationType === "googleApi") {
        let promtIds = []; // an empty array
        if (selectedPrompts?.id != undefined) {
          promtIds.push(selectedPrompts?.id);
        }
        eventData = {
          name,
          description,
          location_id: locationId,
          prompt_ids: promtIds.length > 0 ? promtIds : null,
          category_id: categoryList?.id != undefined ? categoryList?.id : null,
          type: locationType,
          latitude: latitude,
          longitude: longitude,
          start_datetime: startDate.toISOString(),
          end_datetime: endDate.toISOString(),
          external_url: externalUrl || null,
          image_urls: imageUrls,
          is_private: isPrivate,
          topic_id: selectedTopics,
        };
      }
      // console.log("eventData>>",eventData);

      const response = await fetch(
        `${process.env.BACKEND_MAP_URL}/api/events`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify(eventData),
        }
      );

      if (!response.ok) {
        const responseData = await response.json();
        throw new Error(responseData.error || "Failed to create event");
      }

      const event = await response.json();
      // console.log("event>>", event);
      Toast.show({
        type: "success",
        text1: "Event Created!",
        text2: "Your event has been created successfully",
      });

      // Navigate to the map view centered on the event location
      router.push({
        pathname: "/(app)/(map)",
        params: {
          lat: event.location.latitude,
          lng: event.location.longitude,
          zoom: 15, // Close enough to see the event clearly
        },
      });
      DeviceEventEmitter.emit("mapReload", true);
    } catch (error: any) {
      console.error("Event creation error:", error);
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
                      {Platform.OS == "ios" ? (
                        <Globe
                          size={24}
                          className={
                            !isPrivate
                              ? "text-primary"
                              : "text-muted-foreground"
                          }
                        />
                      ) : (
                        <Icon
                          name="web"
                          type="material-community"
                          size={24}
                          color="#239ED0"
                          className={
                            isPrivate ? "text-primary" : "text-muted-foreground"
                          }
                        />
                      )}
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
                      {Platform.OS == "ios" ? (
                        <Lock
                          size={24}
                          className={
                            isPrivate ? "text-primary" : "text-muted-foreground"
                          }
                        />
                      ) : (
                        <Icon
                          name="lock-outline"
                          type="material-community"
                          size={24}
                          color="#239ED0"
                          className={
                            isPrivate ? "text-primary" : "text-muted-foreground"
                          }
                        />
                      )}
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

          {/* Prompts Section */}
          {showPrompts && categoryList?.prompts.length > 0 && (
            <View className="p-4 mb-6 rounded-lg bg-card">
              <Text className="mb-1.5 font-medium">Prompts *</Text>

              <View className="m-4 flex-row flex-wrap gap-2">
                {categoryList?.prompts?.map((prompt) => {
                  const isSelected =
                    selectedPrompts?.id === prompt?.id ? true : false;
                  return (
                    <TouchableOpacity
                      key={prompt.id}
                      onPress={() => {
                        setSelectedPrompts(prompt);
                      }}
                      className={`px-4 py-2 rounded-full border ${
                        isSelected
                          ? "bg-primary border-primary"
                          : "bg-transparent border-border"
                      }`}
                    >
                      <Text
                        className={
                          isSelected
                            ? "text-primary-foreground"
                            : "text-foreground"
                        }
                      >
                        {prompt.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          <View className="p-4 mb-6 rounded-lg bg-card">
            <Text className="mb-1.5 font-medium">Category *</Text>
            <TopicListSingleSelection
              selectedTopics={selectedTopics}
              onSelectTopic={setSelectedTopics}
            />
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
          {locationType === undefined && (
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
          )}

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
                    {Platform.OS == "ios" ? (
                      <Clock size={18} className="text-primary" />
                    ) : (
                      <Icon
                        name="clock-outline"
                        type="material-community"
                        size={24}
                        color="#239ED0"
                      />
                    )}
                  </View>
                </View>

                <View className="space-y-3">
                  <TouchableOpacity
                    onPress={() => showDatePicker(true)}
                    className="flex-row items-center justify-between p-3 border rounded-lg bg-background border-border"
                  >
                    <View className="flex-row items-center">
                      {Platform.OS == "ios" ? (
                        <Calendar
                          size={20}
                          className="mr-3 text-muted-foreground"
                        />
                      ) : (
                        <Icon
                          name="calendar-outline"
                          type="material-community"
                          size={24}
                          color="#239ED0"
                        />
                      )}
                      <Text>Date</Text>
                    </View>
                    <Text className="text-primary">
                      {startDate.toLocaleDateString()}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => showTimePicker(true)}
                    className="flex-row items-center justify-between p-3 border rounded-lg bg-background border-border"
                  >
                    <View className="flex-row items-center">
                      {Platform.OS == "ios" ? (
                        <Clock
                          size={20}
                          className="mr-3 text-muted-foreground"
                        />
                      ) : (
                        <Icon
                          name="clock-outline"
                          type="material-community"
                          size={24}
                          color="#239ED0"
                        />
                      )}
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
                    {Platform.OS == "ios" ? (
                      <Clock size={18} className="text-primary" />
                    ) : (
                      <Icon
                        name="clock-outline"
                        type="material-community"
                        size={24}
                        color="#239ED0"
                      />
                    )}
                  </View>
                </View>

                <View className="space-y-3">
                  <TouchableOpacity
                    onPress={() => showDatePicker(false)}
                    className="flex-row items-center justify-between p-3 border rounded-lg bg-background border-border"
                  >
                    <View className="flex-row items-center">
                      {Platform.OS == "ios" ? (
                        <Calendar
                          size={20}
                          className="mr-3 text-muted-foreground"
                        />
                      ) : (
                        <Icon
                          name="calendar-outline"
                          type="material-community"
                          size={24}
                          color="#239ED0"
                        />
                      )}
                      <Text>Date</Text>
                    </View>
                    <Text className="text-primary">
                      {endDate.toLocaleDateString()}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => showTimePicker(false)}
                    className="flex-row items-center justify-between p-3 border rounded-lg bg-background border-border"
                  >
                    <View className="flex-row items-center">
                      {Platform.OS == "ios" ? (
                        <Clock
                          size={20}
                          className="mr-3 text-muted-foreground"
                        />
                      ) : (
                        <Icon
                          name="clock-outline"
                          type="material-community"
                          size={24}
                          color="#239ED0"
                        />
                      )}
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
    </SafeAreaView>
  );
}
