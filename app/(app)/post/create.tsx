import React, { useState, useEffect } from "react";
import {
  View,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  useWindowDimensions,
} from "react-native";
import { debounce } from "lodash";
import { Text } from "~/src/components/ui/text";
import { Button } from "~/src/components/ui/button";
import { router } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import {
  Image as ImageIcon,
  X,
  MapPin,
  ArrowLeft,
  Calendar,
  Plus,
} from "lucide-react-native";
import { ImagePickerService } from "~/src/lib/imagePicker";
import * as ImagePicker from "expo-image-picker";
import { supabase } from "~/src/lib/supabase";
import { useAuth } from "~/src/lib/auth";
import { Stack } from "expo-router";
import { useUser } from "~/src/lib/UserProvider";
import {
  useSafeAreaInsets,
  SafeAreaView,
} from "react-native-safe-area-context";
import * as FileSystem from "expo-file-system";
import { Icon } from "react-native-elements";
import Toast from "react-native-toast-message";
import { useTheme } from "~/src/components/ThemeProvider";
import { EventSelectionSheet } from "~/src/components/createpost/EventSelectionSheet";
import { socialPostService } from "~/src/services/socialPostService";

// Define missing types
interface LocationDetails {
  address1: string;
  address2: string;
  city: string;
  state: string;
  zip: string;
  coordinates: [number, number];
}

interface MapboxFeature {
  id: string;
  text: string;
  place_name: string;
  center: [number, number];
  properties: {
    address?: string;
  };
  context?: Array<{ id: string; text: string }>;
}

interface SelectedEvent {
  id: string;
  name: string;
  description?: string;
  start_datetime: string;
  end_datetime?: string;
  venue_name?: string;
  address?: string;
  image_urls?: string[];
  is_ticketmaster?: boolean;
}

export default function CreatePost() {
  const { theme } = useTheme();
  const { session } = useAuth();
  const { user } = useUser();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const [content, setContent] = useState("");
  const [mediaFiles, setMediaFiles] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [address1, setAddress1] = useState("");
  const [locationDetails, setLocationDetails] = useState<LocationDetails>({
    address1: "",
    address2: "",
    city: "",
    state: "",
    zip: "",
    coordinates: [0, 0],
  });
  const [selectedEvent, setSelectedEvent] = useState<SelectedEvent | null>(
    null
  );
  const [isEventSheetOpen, setIsEventSheetOpen] = useState(false);
  const [isLocationSearch, setIsLocationSearch] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [searchResults, setSearchResults] = useState<MapboxFeature[]>([]);

  // Reset form when component is focused (when user navigates back to it)
  useFocusEffect(
    React.useCallback(() => {
      resetForm();
    }, [])
  );

  const resetForm = () => {
    setContent("");
    setMediaFiles([]);
    setAddress1("");
    setLocationDetails({
      address1: "",
      address2: "",
      city: "",
      state: "",
      zip: "",
      coordinates: [0, 0],
    });
    setSelectedEvent(null);
    setIsEventSheetOpen(false);
    setIsLocationSearch(false);
    setShowResults(false);
    setSearchResults([]);
  };

  const pickImage = async () => {
    try {
      const results = await ImagePickerService.pickImage({
        allowsMultipleSelection: true,
        quality: 0.8,
        selectionLimit: 4,
        mediaTypes: ImagePicker.MediaTypeOptions.All,
      });

      if (results.length > 0) {
        setMediaFiles([
          ...mediaFiles,
          ...results.map((result) => result.uri),
        ]);
      }
    } catch (error) {
      console.error("Error picking image:", error);
      Alert.alert("Error", "Failed to pick image. Please try again.");
    }
  };

  // Function to convert base64 to Uint8Array for Supabase storage
  function decode(base64: string): Uint8Array {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  }

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

  const removeMedia = (index: number) => {
    setMediaFiles(mediaFiles.filter((_, i) => i !== index));
  };

  const uploadMedia = async (uri: string): Promise<string> => {
    try {
      var response = await fetch(uri);
      var blob = await response.blob();
      const fileExt = uri.split(".").pop();
      const tempFileName = uri.split("/").pop()?.split(".")[0];
      const fileName = `${user?.id}/${Date.now()}_${Math.random()
        .toString(36)
        .substring(2)}_${tempFileName}.${fileExt}`;
      const filePath = `${
        FileSystem.documentDirectory
      }${Date.now()}_${Math.random()
        .toString(36)
        .substring(2)}_post.${fileExt}`;

      let base64 = "";
      if (Platform.OS === "ios") {
        await FileSystem.downloadAsync(uri, filePath);
        base64 = await FileSystem.readAsStringAsync(filePath, {
          encoding: FileSystem.EncodingType.Base64,
        });
      } else {
        const urii = uri;
        const fileUri = `${
          FileSystem.documentDirectory
        }${Date.now()}_${Math.random()
          .toString(36)
          .substring(2)}_post.${fileExt}`;
        await FileSystem.copyAsync({ from: urii, to: fileUri });
        base64 = await FileSystem.readAsStringAsync(fileUri, {
          encoding: FileSystem.EncodingType.Base64,
        });
      }

      const { error: uploadError } = await supabase.storage
        .from("post_media")
        .upload(fileName, decode(base64), {
          contentType: `image/${fileExt}`,
          upsert: true,
        });

      if (uploadError) throw uploadError;
      const {
        data: { publicUrl },
      } = supabase.storage.from("post_media").getPublicUrl(fileName);

      return publicUrl;
    } catch (error) {
      console.error("Error uploading media:", error);
      throw error;
    }
  };

  const handleAddressSelect = (feature: MapboxFeature) => {
    const contextMap = new Map(
      feature.context?.map((item) => [item.id.split(".")[0], item.text])
    );

    const newLocationDetails: LocationDetails = {
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
    setShowResults(false);
    setIsLocationSearch(false);
  };

  const handleEventSelect = (event: any) => {
    setSelectedEvent({
      id: event.id,
      name: event.name,
      description: event.description,
      start_datetime: event.start_datetime,
      end_datetime: event.end_datetime,
      venue_name: event.venue_name,
      address: event.address,
      image_urls: event.image_urls,
      is_ticketmaster: event.is_ticketmaster,
    });
    setIsEventSheetOpen(false);
  };

  const removeEvent = () => {
    setSelectedEvent(null);
  };

  const removeLocation = () => {
    setLocationDetails({
      address1: "",
      address2: "",
      city: "",
      state: "",
      zip: "",
      coordinates: [0, 0],
    });
    setAddress1("");
  };

  const createPost = async () => {
    // Only require at least ONE of: content, media, or event
    if (!content.trim() && mediaFiles.length === 0 && !selectedEvent) {
      Alert.alert(
        "Error",
        "Please add some content, media, or select an event for your post"
      );
      return;
    }

    if (!session?.access_token) {
      Alert.alert("Error", "You must be logged in to create a post");
      return;
    }

    setLoading(true);
    try {
      const mediaUrls = await Promise.all(mediaFiles.map(uploadMedia));

      // Prepare post data in format compatible with web API
      const postData = {
        content: content.trim(),
        media_urls: mediaUrls,
        address: locationDetails.address1 || undefined,
        city: locationDetails.city || undefined,
        state: locationDetails.state || undefined,
        postal_code: locationDetails.zip || undefined,
        event_id: selectedEvent?.id || undefined,
        location: locationDetails.coordinates
          ? { coordinates: locationDetails.coordinates }
          : undefined,
      };

      // Use web API via service
      const response = await socialPostService.createPost(
        postData,
        session.access_token
      );

      Toast.show({
        type: "success",
        text1: "Post Created!",
        text2: "Your post has been created successfully",
      });

      router.replace("/(app)/(social)");
    } catch (error) {
      console.error("Error creating post:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Failed to create post. Please try again.";
      Alert.alert("Error", errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Updated validation: at least one of content, media, or event
  const canPost = content.trim() || mediaFiles.length > 0 || selectedEvent;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.card }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
        style={{ flex: 1, backgroundColor: theme.colors.card }}
      >
        <Stack.Screen
          options={{
            headerShown: false,
          }}
        />

        {/* Custom Header */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            padding: 16,
            borderBottomWidth: 1,
            borderBottomColor: theme.colors.border,
            backgroundColor: theme.colors.card,
          }}
        >
          <TouchableOpacity onPress={() => router.push("/(app)/(social)")}>
            {Platform.OS === "ios" ? (
              <ArrowLeft size={24} color={theme.colors.text} />
            ) : (
              <Icon
                name="arrow-left"
                type="material-community"
                size={24}
                color={theme.colors.primary || "#239ED0"}
              />
            )}
          </TouchableOpacity>
          <Button
            className="px-6 rounded-full bg-primary"
            disabled={loading || !canPost}
            onPress={createPost}
          >
            <Text className="font-medium text-primary-foreground">
              {loading ? "Posting..." : "Post"}
            </Text>
          </Button>
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingBottom: insets.bottom + 80,
            paddingTop: 24,
          }}
        >
          <View style={{ padding: 24 }}>
            {/* User Info */}
            <View style={{ flexDirection: "row", marginBottom: 24 }}>
              <Image
                source={
                  user?.avatar_url
                    ? { uri: user.avatar_url }
                    : require("~/assets/favicon.png")
                }
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  backgroundColor: theme.colors.border,
                }}
              />
              <View style={{ marginLeft: 16, flex: 1 }}>
                <Text
                  style={{
                    fontWeight: "600",
                    color: theme.colors.text,
                    fontSize: 18,
                  }}
                >
                  {user?.first_name} {user?.last_name}
                </Text>
                <Text
                  style={{
                    color: theme.colors.text + "80",
                    fontSize: 16,
                  }}
                >
                  @{user?.username}
                </Text>
              </View>
            </View>

            {/* Big Text Input */}
            <TextInput
              style={{
                fontSize: 20,
                color: theme.colors.text,
                backgroundColor: theme.colors.background,
                borderRadius: 16,
                padding: 20,
                minHeight: 160,
                maxHeight: height * 0.4,
                textAlignVertical: "top",
                borderWidth: 1,
                borderColor: theme.colors.border,
                marginBottom: 32,
              }}
              placeholder="What's happening?"
              placeholderTextColor={theme.colors.text + "60"}
              multiline
              value={content}
              onChangeText={setContent}
              autoFocus
            />

            {/* Selected Event Card */}
            {selectedEvent && (
              <View
                style={{
                  backgroundColor: theme.colors.card,
                  borderRadius: 12,
                  padding: 12,
                  marginBottom: 16,
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    marginBottom: 8,
                  }}
                >
                  <Calendar size={16} color={theme.colors.primary} />
                  <Text
                    style={{
                      marginLeft: 8,
                      fontWeight: "600",
                      color: theme.colors.text,
                      fontSize: 14,
                    }}
                  >
                    Event
                  </Text>
                  <TouchableOpacity
                    onPress={removeEvent}
                    style={{ marginLeft: "auto" }}
                  >
                    <X size={20} color={theme.colors.text + "80"} />
                  </TouchableOpacity>
                </View>
                <View style={{ flexDirection: "row" }}>
                  {selectedEvent.image_urls &&
                  selectedEvent.image_urls.length > 0 ? (
                    <Image
                      source={{ uri: selectedEvent.image_urls[0] }}
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: 8,
                        marginRight: 12,
                      }}
                      resizeMode="cover"
                    />
                  ) : (
                    <View
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: 8,
                        backgroundColor: theme.colors.primary + "20",
                        justifyContent: "center",
                        alignItems: "center",
                        marginRight: 12,
                      }}
                    >
                      <Calendar size={20} color={theme.colors.primary} />
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontWeight: "600",
                        color: theme.colors.text,
                        fontSize: 14,
                      }}
                      numberOfLines={1}
                    >
                      {selectedEvent.name}
                    </Text>
                    <Text
                      style={{
                        color: theme.colors.text + "80",
                        fontSize: 12,
                        marginTop: 2,
                      }}
                      numberOfLines={1}
                    >
                      {selectedEvent.venue_name || selectedEvent.address}
                    </Text>
                    {selectedEvent.start_datetime && (
                      <Text
                        style={{
                          color: theme.colors.text + "60",
                          fontSize: 11,
                          marginTop: 2,
                        }}
                      >
                        {new Date(
                          selectedEvent.start_datetime
                        ).toLocaleDateString()}
                      </Text>
                    )}
                  </View>
                </View>
              </View>
            )}

            {/* Selected Location Display */}
            {locationDetails.address1 && (
              <View
                style={{
                  backgroundColor: theme.colors.card,
                  borderRadius: 12,
                  padding: 12,
                  marginBottom: 16,
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    marginBottom: 8,
                  }}
                >
                  <MapPin size={16} color={theme.colors.primary} />
                  <Text
                    style={{
                      marginLeft: 8,
                      fontWeight: "600",
                      color: theme.colors.text,
                      fontSize: 14,
                    }}
                  >
                    Location
                  </Text>
                  <TouchableOpacity
                    onPress={removeLocation}
                    style={{ marginLeft: "auto" }}
                  >
                    <X size={20} color={theme.colors.text + "80"} />
                  </TouchableOpacity>
                </View>
                <Text
                  style={{
                    color: theme.colors.text,
                    fontSize: 14,
                    lineHeight: 20,
                  }}
                >
                  {locationDetails.address1}
                  {locationDetails.city && (
                    <Text style={{ color: theme.colors.text + "80" }}>
                      {"\n"}
                      {locationDetails.city}, {locationDetails.state}{" "}
                      {locationDetails.zip}
                    </Text>
                  )}
                </Text>
              </View>
            )}

            {/* Add Options Row */}
            <View style={{ 
              flexDirection: "row", 
              alignItems: "center", 
              marginBottom: 32,
              gap: 32
            }}>
              {/* Add Photos Button */}
              <TouchableOpacity
                onPress={pickImage}
                disabled={mediaFiles.length >= 4}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  opacity: mediaFiles.length >= 4 ? 0.5 : 1,
                }}
              >
                <ImageIcon
                  size={24}
                  color={
                    mediaFiles.length >= 4
                      ? "#8B5CF6" + "60"
                      : "#8B5CF6"
                  }
                />
                <Text
                  style={{
                    marginLeft: 12,
                    color: "#8B5CF6",
                    fontSize: 18,
                    fontWeight: "500",
                  }}
                >
                  Photos
                </Text>
              </TouchableOpacity>

              {/* Add Location Button */}
              {!locationDetails.address1 && !isLocationSearch && (
                <TouchableOpacity
                  onPress={() => setIsLocationSearch(true)}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                  }}
                >
                  <MapPin size={24} color="#8B5CF6" />
                  <Text
                    style={{
                      marginLeft: 12,
                      color: "#8B5CF6",
                      fontSize: 18,
                      fontWeight: "500",
                    }}
                  >
                    Location
                  </Text>
                </TouchableOpacity>
              )}

              {/* Add Event Button */}
              {!selectedEvent && (
                <TouchableOpacity
                  onPress={() => setIsEventSheetOpen(true)}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                  }}
                >
                  <Calendar size={24} color="#8B5CF6" />
                  <Text
                    style={{
                      marginLeft: 12,
                      color: "#8B5CF6",
                      fontSize: 18,
                      fontWeight: "500",
                    }}
                  >
                    Event
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Location Search */}
            {isLocationSearch && (
              <View style={{ marginBottom: 16 }}>
                <View>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        marginBottom: 8,
                      }}
                    >
                      <TextInput
                        value={address1}
                        onChangeText={(text) => {
                          setAddress1(text);
                          if (text === "") {
                            setSearchResults([]);
                            setShowResults(false);
                          } else {
                            debouncedSearch(text);
                          }
                        }}
                        placeholder="Search for an address..."
                        placeholderTextColor={theme.colors.text + "60"}
                        style={{
                          flex: 1,
                          fontSize: 16,
                          color: theme.colors.text,
                          backgroundColor: theme.colors.card,
                          borderRadius: 12,
                          padding: 16,
                          borderWidth: 1,
                          borderColor: theme.colors.border,
                        }}
                      />
                      <TouchableOpacity
                        onPress={() => {
                          setIsLocationSearch(false);
                          setAddress1("");
                          setSearchResults([]);
                          setShowResults(false);
                        }}
                        style={{ marginLeft: 8, padding: 8 }}
                      >
                        <X size={20} color={theme.colors.text + "80"} />
                      </TouchableOpacity>
                    </View>

                    {/* Search Results */}
                    {showResults && searchResults.length > 0 && (
                      <View
                        style={{
                          backgroundColor: theme.colors.card,
                          borderRadius: 12,
                          borderWidth: 1,
                          borderColor: theme.colors.border,
                          overflow: "hidden",
                        }}
                      >
                        {searchResults.slice(0, 5).map((result) => (
                          <TouchableOpacity
                            key={result.id}
                            onPress={() => handleAddressSelect(result)}
                            style={{
                              padding: 12,
                              borderBottomWidth: 1,
                              borderBottomColor: theme.colors.border,
                            }}
                          >
                            <Text
                              style={{
                                fontWeight: "500",
                                color: theme.colors.text,
                              }}
                            >
                              {result.text}
                            </Text>
                            <Text
                              style={{
                                fontSize: 12,
                                color: theme.colors.text + "80",
                                marginTop: 2,
                              }}
                            >
                              {result.place_name}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </View>
                )}
              </View>
            )}

            {/* Media Preview */}
            {mediaFiles.length > 0 && (
              <View
                style={{
                  flexDirection: "row",
                  flexWrap: "wrap",
                  marginBottom: 16,
                  gap: 8,
                }}
              >
                {mediaFiles.map((uri, index) => (
                  <View
                    key={uri}
                    style={{ position: "relative", width: "48%" }}
                  >
                    <Image
                      source={{ uri }}
                      style={{
                        width: "100%",
                        aspectRatio: 1,
                        borderRadius: 12,
                      }}
                      resizeMode="cover"
                    />
                    <TouchableOpacity
                      onPress={() => removeMedia(index)}
                      style={{
                        position: "absolute",
                        top: 8,
                        right: 8,
                        backgroundColor: "rgba(0,0,0,0.7)",
                        borderRadius: 12,
                        padding: 4,
                      }}
                    >
                      <X size={16} color="white" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}


            {loading && (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  marginTop: 16,
                }}
              >
                <ActivityIndicator size="small" color={theme.colors.primary} />
                <Text
                  style={{
                    marginLeft: 8,
                    color: theme.colors.text + "80",
                  }}
                >
                  Creating post...
                </Text>
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Event Selection Sheet */}
      <EventSelectionSheet
        isOpen={isEventSheetOpen}
        onClose={() => setIsEventSheetOpen(false)}
        onSelectEvent={handleEventSelect}
      />
    </SafeAreaView>
  );
}
