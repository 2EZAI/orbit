import React, { useState } from "react";
import {
  View,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
  // SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  useWindowDimensions,
} from "react-native";
import { debounce } from "lodash";
import { Text } from "~/src/components/ui/text";
import { Button } from "~/src/components/ui/button";
import { router } from "expo-router";
import { Image as ImageIcon, X, MapPin, ArrowLeft } from "lucide-react-native";
import * as ImagePicker from "expo-image-picker";
import { supabase } from "~/src/lib/supabase";
import { useAuth } from "~/src/lib/auth";
import { Stack } from "expo-router";
import { useUser } from "~/hooks/useUserData";
import { useSafeAreaInsets ,SafeAreaView} from "react-native-safe-area-context";
import * as FileSystem from "expo-file-system";
import { Icon } from 'react-native-elements';
import Toast from "react-native-toast-message";

export default function CreatePost() {
  const { session } = useAuth();
  const { user } = useUser();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const [content, setContent] = useState("");
  const [mediaFiles, setMediaFiles] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
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
  const [showResults, setShowResults] = useState(false);
  const [searchResults, setSearchResults] = useState<MapboxFeature[]>([]);
  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsMultipleSelection: true,
      quality: 0.8,
      selectionLimit: 4,
    });

    if (!result.canceled) {
      setMediaFiles([
        ...mediaFiles,
        ...result.assets.map((asset) => asset.uri),
      ]);
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
      // console.log('response>',response);
      var blob = await response.blob();
      // console.log('blob>',blob);
      const fileExt = uri.split(".").pop();
      const tempFileName= uri.split("/").pop().split(".")[0];
      const  fileName = `${user.id}/${Date.now()}_${Math.random().toString(36).substring(2)}_${tempFileName}.${fileExt}`;
      const filePath = `${FileSystem.documentDirectory}${Date.now()}_${Math.random().toString(36).substring(2)}_post.${fileExt}`;

      let base64='';
      if (Platform.OS === 'ios') {
      await FileSystem.downloadAsync(uri, filePath);
       base64 = await FileSystem.readAsStringAsync(filePath, {
        encoding: FileSystem.EncodingType.Base64,
      });
      }
      else{
         const urii = uri; // Assuming this is a local file URI like 'file:///path/to/file'
         const fileUri = `${FileSystem.documentDirectory}${Date.now()}_${Math.random().toString(36).substring(2)}_post.${fileExt}`;
         await FileSystem.copyAsync({ from: urii, to: fileUri });
         base64 = await FileSystem.readAsStringAsync(fileUri, {
              encoding: FileSystem.EncodingType.Base64,
            });
          }
      // console.log("fileName>", fileName);
      // console.log("filePath>", filePath);
      // console.log("Base64 String>", base64.substring(0, 50)); // Log first 50 characters to ensure it's correct

      // Upload to Supabase Storage
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

      // console.log('getPublicUrl>',publicUrl);
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


  const createPost = async () => {
    if (!content.trim() && mediaFiles.length === 0) {
      Alert.alert("Error", "Please add some content or media to your post");
      return;
    }

    setLoading(true);
    try {
      const mediaUrls = await Promise.all(mediaFiles.map(uploadMedia)); 
      // console.error("mediaUrls>", mediaUrls);
      // const { error } = await supabase.from("posts").insert([
      //   {
      //     user_id: session?.user.id,
      //     content: content.trim(),
      //     media_urls: mediaUrls,
      //     address: locationDetails.address1,
      //   city: locationDetails.city,
      //   state: locationDetails.state,
      //   zip: locationDetails.zip,
      //   },
      // ]);

       // 2. Create event using our API
      const postData = {
       user_id: session?.user.id,
          content: content.trim(),
          media_urls: mediaUrls,
          address: locationDetails.address1,
        city: locationDetails.city,
        state: locationDetails.state,
        postal_code: locationDetails.zip,
      };
      console.log("postData>>",postData);

      const response = await fetch(
        `${process.env.BACKEND_MAP_URL}/api/posts/create`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify(postData),
        }
      );

      if (!response.ok) {
        const responseData = await response.json();
        throw new Error(responseData?.error || "Failed to create post");
      }

      const event = await response.json();

      Toast.show({
        type: "success",
        text1: "Post Created!",
        text2: "Your post has been created successfully",
      });


      // if (error) throw error;
      router.back();
    } catch (error) {
      console.error("Error creating post:", error);
      Alert.alert("Error", "Failed to create post. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
     <SafeAreaView className="flex-1 bg-background">
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      className="flex-1 bg-background"
    >
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />

      {/* Custom Header */}
        <View className="flex-row items-center justify-between p-4 border-b border-border">
          <TouchableOpacity onPress={() => router.back()}>
          { Platform.OS === 'ios' ?
            <ArrowLeft size={24} className="text-foreground" />
           :
            <Icon name="arrow-left" type="material-community"
                      size={24}
                      color="#239ED0"/>
          }
          </TouchableOpacity>
          <Button
            variant="default"
            className="px-6 rounded-full bg-primary"
            disabled={loading || (!content.trim() && mediaFiles.length === 0) || locationDetails?.address1==""}
            onPress={createPost}
          >
            <Text className="font-medium text-primary-foreground">
              {loading ? "Posting..." : "Post"}
            </Text>
          </Button>
        </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingBottom: insets.bottom + 80, // Add extra padding for tab bar
        }}
      >
        <View className="flex-row p-4">
          <Image
            source={
              user?.avatar_url
                ? { uri: user.avatar_url }
                : require("~/assets/favicon.png")
            }
            className="w-10 h-10 rounded-full bg-muted"
          />
          <View className="flex-1 ml-3 ">
            <TextInput
              className="text-base text-foreground"
              placeholder="What's happening?"
              placeholderTextColor="#666"
              multiline
              value={content}
              onChangeText={setContent}
              autoFocus
              style={{ maxHeight: height * 0.2 }} // Limit height to 20% of screen
            />

 {/* Location Section */}
           <View className="flex-1 pt-4 mt-4 border-t border-border">
                <TextInput
                  value={address1}
                  //  placeholder="Search Location of post?"
                  onChangeText={(text) => {
                    setAddress1(text);
                    if(text === ''){
                       setSearchResults([]);
                      setShowResults(false);
                      setLocationDetails({ 
                        address1: "",
                        address2: "",city: "",
                        state: "",zip: "",
                         });
                    }else{
                    debouncedSearch(text);
                    }
                  }}
                  placeholder="Search address..."
                  placeholderTextColor="#666"
                  className="text-base text-foreground"
                  style={{ maxHeight: height * 0.2 }} // Limit height to 20% of screen
         
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




            {/* Media Preview */}
            {mediaFiles.length > 0 && (
              <View className="flex-row flex-wrap mt-4">
                {mediaFiles.map((uri, index) => (
                  <View key={uri} className="relative w-1/2 p-1 aspect-square">
                    <Image
                      source={{ uri }}
                      className="w-full h-full rounded-xl"
                      resizeMode="cover"
                    />
                    <TouchableOpacity
                      className="absolute p-1.5 rounded-full top-3 right-3 bg-black/50"
                      onPress={() => removeMedia(index)}
                    >
                    { Platform.OS == 'ios' ?
                      <X size={16} color="white" />
                      :
                      <Icon name="close" type="material-community"
                      size={16}
                      color="#000000"/>
                    }
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}


            {/* Action Buttons - Moved inside scroll view */}
            <View className="flex-row items-center pt-4 mt-4 border-t border-border">
              <TouchableOpacity
                className="flex-row items-center mr-6"
                onPress={pickImage}
                disabled={mediaFiles.length >= 4}
              >
              {
                Platform.OS === 'ios' ?
                <ImageIcon
                  size={24}
                  className={
                    mediaFiles.length >= 4
                      ? "text-muted-foreground"
                      : "text-primary"
                  }
                />
                :
                 <Icon name="image-outline" type="material-community"
                      size={24}
                      color="#239ED0"/>
              }
              </TouchableOpacity>

 {/*  
              <TouchableOpacity
                className="flex-row items-center"
                onPress={() => {
                  // Handle location selection
                }}
              >
              { Platform.OS === 'ios' ?
                <MapPin size={24} className="text-primary" />
                :
                 <Icon 
              name="map-marker-outline"
               type="material-community" 
              size={24} 
              color="#239ED0"
              />
              }
              </TouchableOpacity> */}

              {loading && (
                <View className="flex-row items-center ml-auto">
                  <ActivityIndicator size="small" className="text-primary" />
                  <Text className="ml-2 text-muted-foreground">Posting...</Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
