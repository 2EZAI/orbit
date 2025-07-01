import { useState, useEffect } from "react";
import {
  View,
  TouchableOpacity,
  Image,
  ScrollView,
  ActivityIndicator,
  Platform,
  TextInput,
  useWindowDimensions,
  Switch,
} from "react-native";
import { debounce } from "lodash";
import { SafeAreaView } from "react-native-safe-area-context";
import { Text } from "~/src/components/ui/text";
import { Input } from "~/src/components/ui/input";
import { useUser } from "~/hooks/useUserData";
import { supabase } from "~/src/lib/supabase";
import { ArrowLeft, Pencil } from "lucide-react-native";
import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system";
import Toast from "react-native-toast-message";
import { MapPin } from "lucide-react-native";
import { Icon } from "react-native-elements";
import { Sheet } from "../../../../src/components/ui/sheet";
import { TopicList } from "~/src/components/topics/TopicList";

export default function EditProfile() {
  const [genderList, setGenderList] = useState<any>([
    { name: "Male" },
    { name: "Female" },
    { name: "Non-Binary" },
    { name: "Other" },
  ]);
  const [occupationList, setOccupationList] = useState<any>(
    allOcupationList?.length > 0 ? allOcupationList : []
  );
  const [occupationListShow, setOccupationListShow] = useState<any>(
    allOcupationList?.length > 0 ? allOcupationList : []
  );
  const [isGenderShow, setIsGenderShow] = useState(false);
  const [selectedGender, setSelectedGender] = useState<any>(
    user?.gender != null ? { name: user.gender } : null
  );
  const [isOcupationShow, setIsOcupationShow] = useState(false);
  const [selectedOcupation, setSelectedOcupation] = useState<any>(
    allOcupationList?.length > 0 && user?.occupation_id != null
      ? allOcupationList.find((item) => item.id === user.occupation_id) || null
      : null
  );

  const [isEnabled, setIsEnabled] = useState(
    user?.is_live_location_shared == 1 ? true : false
  );
  const {
    user,
    userlocation,
    userTopicsList,
    userHomeTownlocation,
    allOcupationList,
    updateUser,
    updateUserLocations,
    updateHomeTownLocations,
  } = useUser();
  const [loading, setLoading] = useState(false);
  const [isEventLocationShow, SetIsEventLocationShow] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(0);
  const [locationOptions, setLocationOptions] = useState([
    {
      id: 0,
      name: "Current Location",
    },
    {
      id: 1,
      name: "Saved Address",
    },
  ]);
  const [isSearchHomeTown, setIsSearchHomeTown] = useState(false);
  const [showHomeTownResults, setShowHomeTownResults] = useState(false);
  const [searchHomeTownResults, setSearchHomeTownResults] = useState<
    MapboxFeature[]
  >([]);

  const [uploadingImage, setUploadingImage] = useState(false);
  const { height } = useWindowDimensions();

  const [isSearchLocation, setIsSearchLocation] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [searchResults, setSearchResults] = useState<MapboxFeature[]>([]);

  // Form state
  const [profileImage, setProfileImage] = useState(
    user?.avatar_url ? user?.avatar_url : ""
  );
  const [firstName, setFirstName] = useState(user?.first_name || "");
  const [lastName, setLastName] = useState(user?.last_name || "");
  const [username, setUsername] = useState(user?.username || "");
  const [bio, setBio] = useState(user?.bio || "");
  const [education, setEducation] = useState(user?.education || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [location, setLocation] = useState(user?.location || "");

  const [address1, setAddress1] = useState("");
  const [address2, setAddress2] = useState("");
  const [locationDetails, setLocationDetails] = useState<LocationDetails>({
    address1: userlocation?.address || "",
    address2: "",
    city: userlocation?.city || "",
    state: userlocation?.state || "",
    zip: userlocation?.postal_code || "",
    coordinates: [userlocation?.longitude || 0, userlocation?.latitude|| 0],
  });

  const [addressHomeTown1, setAddressHomeTown1] = useState("");
  const [addressHomeTown2, setAddressHomeTown2] = useState("");
  const [locationHomeTownDetails, setLocationHomeTownDetails] =
    useState<LocationDetails>({
      address1: userHomeTownlocation?.address || "",
      address2: "",
      city: userHomeTownlocation?.city || "",
      state: userHomeTownlocation?.state || "",
      zip: userHomeTownlocation?.postal_code || "",
      coordinates: [
        userHomeTownlocation?.latitude || 0,
        userHomeTownlocation?.longitude || 0,
      ],
    });

  const [isTopicsShow, setIsTopicsShow] = useState(false);
  const [selectedTopics, setSelectedTopics] = useState<string[]>(
    userTopicsList?.length > 0 ? userTopicsList : []
  );
  const toggleSwitch = () => setIsEnabled((previousState) => !previousState);

  useEffect(() => {
    setProfileImage(user?.avatar_url ? user?.avatar_url : "");
    setIsEnabled(user?.is_live_location_shared == 1 ? true : false);
    setFirstName(user?.first_name || "");
    setLastName(user?.last_name || "");
    setUsername(user?.username || "");
    setBio(user?.bio || "");
    setPhone(user?.phone || "");
    setLocation(user?.location || "");
    setEducation(user?.education || "");
    setSelectedLocation(user?.event_location_preference == 1 ? 1 : 0);
    setSelectedGender(user?.gender != null ? { name: user.gender } : null);
    setSelectedOcupation(
      allOcupationList?.length > 0 && user?.occupation_id != null
        ? allOcupationList.find((item) => item.id === user.occupation_id) ||
            null
        : null
    );
  }, [user]);

  useEffect(() => {
    setSelectedOcupation(
      allOcupationList?.length > 0 && user?.occupation_id != null
        ? allOcupationList.find((item) => item.id === user.occupation_id) ||
            null
        : null
    );
  }, [allOcupationList]);

  useEffect(() => {
    setSelectedTopics(userTopicsList?.length > 0 ? userTopicsList : []);
  }, [userTopicsList]);

  useEffect(() => {
    setLocationDetails({
      address1: userlocation?.address || "",
      address2: "",
      city: userlocation?.city || "",
      state: userlocation?.state || "",
      zip: userlocation?.postal_code || "",
      coordinates: [userlocation?.longitude || 0, userlocation?.latitude || 0],
    });
  }, [userlocation]);

  useEffect(() => {
    setLocationHomeTownDetails({
      address1: userHomeTownlocation?.address || "",
      address2: "",
      city: userHomeTownlocation?.city || "",
      state: userHomeTownlocation?.state || "",
      zip: userHomeTownlocation?.postal_code || "",
      coordinates: [
        userHomeTownlocation?.latitude || 0,
        userHomeTownlocation?.longitude || 0,
      ],
    });
  }, [userHomeTownlocation]);

  useEffect(() => {
    setOccupationList(allOcupationList?.length > 0 ? allOcupationList : []);
    setOccupationListShow(allOcupationList?.length > 0 ? allOcupationList : []);
  }, [allOcupationList]);

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

  const searchAddressHomeTown = async (query: string) => {
    if (!query.trim()) {
      setSearchHomeTownResults([]);
      setShowHomeTownResults(false);
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
      setSearchHomeTownResults(data.features || []);
      setShowHomeTownResults(true);
    } catch (error) {
      console.error("Error searching address:", error);
    }
  };

  const debouncedSearch = debounce(searchAddress, 300);

  const debouncedSearchHomeTown = debounce(searchAddressHomeTown, 300);

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
    console.log("coordinates>>", feature.center);

    setLocationDetails(newLocationDetails);
    setAddress1(newLocationDetails.address1);
    setAddress2("");
    setShowResults(false);
    setIsSearchLocation(false);
  };
  const handleAddressHomeTownSelect = (feature: MapboxFeature) => {
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
    console.log("coordinates>>", feature.center);

    setLocationHomeTownDetails(newLocationDetails);
    setAddressHomeTown1(newLocationDetails.address1);
    setAddressHomeTown2("");
    setShowHomeTownResults(false);
    setIsSearchHomeTown(false);
  };

  const GenderListView = () => {
    return (
      <View className="flex-1 bg-background border rounded-2xl  border-gray-300">
        <ScrollView className="flex-1">
          {genderList.map((gender,index) => (
            <TouchableOpacity
            key={index}
              onPress={() => {
                setSelectedGender(gender);
                setIsGenderShow(false);
              }}
              className={` rounded ${
                selectedGender?.name === gender.name
                  ? "bg-primary"
                  : "bg-transparent"
              }`}
            >
              <Text
                className={`text-muted-foreground m-4 ${
                  selectedGender?.name === gender.name
                    ? "text-white"
                    : "text-muted-foreground"
                }`}
                numberOfLines={1}
              >
                {gender.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };

  const handleUpdateInterests = async () => {
    if (!user) return;

    try {
      // Step 1: Delete existing interests for this user
      const { error: deleteError } = await supabase
        .from("user_topics")
        .delete()
        .eq("user_id", user.id);

      if (deleteError) throw deleteError;

      // Step 2: Insert new selected topics
      const { error } = await supabase.from("user_topics").insert(
        selectedTopics.map((topic) => ({
          user_id: user.id,
          topic,
        }))
      );

      if (error) throw error;
    } catch (error) {
      console.error("Error saving topics:", error);
    }
  };

  const handleSave = async () => {
    if (firstName == "") {
      Toast.show({
        type: "error",
        text1: "First name cannot be empty",
      });
      return;
    }
    if (lastName == "") {
      Toast.show({
        type: "error",
        text1: "Last name cannot be empty",
      });
      return;
    }
    if (bio == "") {
      Toast.show({
        type: "error",
        text1: "Bio cannot be empty",
      });
      return;
    }
    if (phone == "") {
      Toast.show({
        type: "error",
        text1: "Phone Number cannot be empty",
      });
      return;
    }

    setLoading(true);
    try {
      {
        locationDetails?.city;
      }
      {
        locationDetails?.state;
      }
      {
        (" ");
      }
      {
        locationDetails?.zip;
      }

      if (selectedTopics.length > 0) {
        handleUpdateInterests();
      }
      console.log("locationDetails?.address1>",locationDetails?.address1)
      if (locationDetails?.address1 !== "") {
        await updateUserLocations({
          city: locationDetails.city,
          state: locationDetails.state,
          postal_code: locationDetails.zip,
          address: locationDetails.address1,
          latitude: locationDetails.coordinates[1],
          longitude: locationDetails.coordinates[0],
        });
      }
      if (locationDetails?.addressHomeTown1 !== "") {
        await updateHomeTownLocations({
          city: locationHomeTownDetails.city,
          state: locationHomeTownDetails.state,
          postal_code: locationHomeTownDetails.zip,
          address: locationHomeTownDetails.address1,
          latitude: locationHomeTownDetails.coordinates[1],
          longitude: locationHomeTownDetails.coordinates[0],
        });
      }
      if (profileImage == "") {
        await updateUser({
          first_name: firstName,
          last_name: lastName,
          username,
          bio,
          location,
          phone,
          is_live_location_shared: isEnabled ? 1 : 0,
          event_location_preference: selectedLocation,
          education,
          gender: selectedGender != null ? selectedGender?.name : null,
          occupation_id:
            selectedOcupation != null ? selectedOcupation?.id : null,
        });
      } else {
        await updateUser({
          avatar_url: profileImage,
          first_name: firstName,
          last_name: lastName,
          username,
          bio,
          location,
          phone,
          is_live_location_shared: isEnabled ? 1 : 0,
          event_location_preference: selectedLocation,
          education,
          gender: selectedGender != null ? selectedGender?.name : null,
          occupation_id:
            selectedOcupation != null ? selectedOcupation?.id : null,
        });
      }

      Toast.show({
        type: "success",
        text1: "Profile updated successfully",
      });
      // router.back();
    } catch (error) {
      Toast.show({
        type: "error",
        text1: "Failed to update profile",
        text2: error instanceof Error ? error.message : "An error occurred",
      });
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
      });

      if (!result.canceled && result.assets?.[0]) {
        setUploadingImage(true);
        try {
          const file = result.assets[0].uri;
          const response = await fetch(file);
          const blob = await response.blob();
          console.log("blob>>", blob);
          // const fileExt = file.uri.split(".").pop();
          const fileExt = file.split(".").pop();

          const fileName = `${user?.id}-${Date.now()}.${fileExt}`;
          const filePath = `${FileSystem.documentDirectory}profile.${fileExt}`;

          var base64 = "";
          // Download the image first (needed for expo-file-system)
          if (Platform.OS === "ios") {
            // Download the image first (needed for expo-file-system)
            await FileSystem.downloadAsync(file, filePath);

            // Read the file as base64
            base64 = await FileSystem.readAsStringAsync(filePath, {
              encoding: FileSystem.EncodingType.Base64,
            });
          } else {
            const urii = file; // Assuming this is a local file URI like 'file:///path/to/file'
            const fileUri = `${FileSystem.documentDirectory}profile.${fileExt}`;
            await FileSystem.copyAsync({ from: urii, to: fileUri });
            // Read the file as base64
            base64 = await FileSystem.readAsStringAsync(fileUri, {
              encoding: FileSystem.EncodingType.Base64,
            });
          }

          const { error: uploadError } = await supabase.storage
            .from("profile-pictures")
            // .from("avatars")
            .upload(fileName, decode(base64), {
              contentType: `image/${fileExt}`,
              upsert: true,
            });

          if (uploadError) throw uploadError;

          const {
            data: { publicUrl },
          } = supabase.storage.from("profile-pictures").getPublicUrl(fileName);
          // } = supabase.storage.from("avatars").getPublicUrl(fileName);

          // await updateUser({
          //   avatar_url: publicUrl,
          // });
          setProfileImage(publicUrl);

          // Toast.show({
          //   type: "success",
          //   text1: "Profile picture updated",
          // });
        } catch (error) {
          console.error("Upload error:", error);
          Toast.show({
            type: "error",
            text1: "Failed to upload image",
          });
        }
      }
    } catch (error) {
      console.error("Image picker error:", error);
      Toast.show({
        type: "error",
        text1: "Failed to select image",
      });
    } finally {
      setUploadingImage(false);
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
  if (!user) return null;

  const EventLocationOptionsListView = () => {
    return (
      <View className="flex-1 bg-background">
        <ScrollView className="flex-1">
          {locationOptions.map((option,index) => (
            <TouchableOpacity
            key={index}
              onPress={() => {
                if (
                  selectedLocation?.id == 1 &&
                  locationDetails?.address1 === ""
                ) {
                  Toast.show({
                    type: "error",
                    text1: "Please Select Address First",
                  });
                  return;
                }
                setSelectedLocation(option?.id);
                SetIsEventLocationShow(false);
              }}
              className={` rounded ${
                selectedLocation?.id === option.id
                  ? "bg-primary"
                  : "bg-transparent"
              }`}
            >
              <Text
                className={`text-muted-foreground m-4 ${
                  selectedLocation?.id === option.id
                    ? "text-white"
                    : "text-muted-foreground"
                }`}
                numberOfLines={1}
              >
                {option.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="items-center mt-4">
          <TouchableOpacity onPress={pickImage} className="relative">
            <Image
              source={
                profileImage == ""
                  ? require("~/assets/favicon.png")
                  : { uri: profileImage }
              }
              className="w-24 h-24 bg-gray-800 rounded-full"
            />
            <View className="absolute bottom-0 right-0 p-2 rounded-full bg-primary">
              {uploadingImage ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Pencil size={16} className="text-primary-foreground" />
              )}
            </View>
          </TouchableOpacity>
        </View>

        <View className="px-4 mt-6 space-y-6">
          <View>
            <Text className="text-sm text-muted-foreground mb-1.5 mt-2">
              Name
            </Text>
            <View className="flex-row gap-x-4">
              <View className="flex-1">
                <Input
                  value={firstName}
                  onChangeText={setFirstName}
                  placeholder="First name"
                  className="h-12 px-4 border-0 bg-gray-800/40"
                />
              </View>
              <View className="flex-1">
                <Input
                  value={lastName}
                  onChangeText={setLastName}
                  placeholder="Last name"
                  className="h-12 px-4 border-0 bg-gray-800/40"
                />
              </View>
            </View>
          </View>

          <View>
            <Text className="text-sm text-muted-foreground mb-1.5 mt-2">
              Username
            </Text>
            <Input
              value={username}
              editable={false}
              onChangeText={setUsername}
              placeholder="@username"
              className="h-12 px-4 border-0 bg-gray-800/40"
            />
          </View>

          <View>
            <Text className="text-sm text-muted-foreground mb-1.5 mt-2">
              Gender
            </Text>
            <TouchableOpacity
              onPress={() => {
                setIsGenderShow(!isGenderShow);
              }}
              className="h-12 flex-row  p-3  space-x-2 rounded-xl bg-gray-800/40"
            >
              <Text className="text-lg text-muted-foreground">
                {selectedGender === null
                  ? "Select Gender"
                  : selectedGender.name}
              </Text>
            </TouchableOpacity>
          </View>

          {isGenderShow && (
            <View className="absolute justify-center items-center left-0 right-0  overflow-hidden ">
              <GenderListView />
            </View>
          )}

          <View>
            <Text className="text-sm text-muted-foreground mb-1.5 mt-2">
              Occupation
            </Text>
            <TouchableOpacity
              onPress={() => {
                setIsOcupationShow(!isOcupationShow);
              }}
              className="h-12 flex-row  p-3  space-x-2 rounded-xl bg-gray-800/40"
            >
              <Text className="text-lg text-muted-foreground">
                {selectedOcupation === null
                  ? "Select Occupation"
                  : selectedOcupation.name}
              </Text>
            </TouchableOpacity>
          </View>

          <View>
            <Text className="text-sm text-muted-foreground mb-1.5 mt-2">
              Education
            </Text>
            <Input
              value={education}
              onChangeText={setEducation}
              placeholder="College"
              numberOfLines={1}
              className="h-24 px-4 py-3 align-text-top border-0 bg-gray-800/40"
              textAlignVertical="top"
            />
          </View>

          <View>
            <Text className="text-sm text-muted-foreground mb-1.5 mt-2">
              Bio
            </Text>
            <Input
              value={bio}
              onChangeText={setBio}
              placeholder="Write a little bit about yourself"
              multiline
              numberOfLines={3}
              className="h-24 px-4 py-3 align-text-top border-0 bg-gray-800/40"
              textAlignVertical="top"
            />
          </View>

          <View>
            <Text className="text-sm text-muted-foreground mb-1.5 mt-2">
              Phone Number
            </Text>
            <Input
              value={phone}
              onChangeText={setPhone}
              placeholder="+1 (555) 000-0000"
              keyboardType="phone-pad"
              className="h-12 px-4 border-0 bg-gray-800/40"
            />
          </View>

          <View>
            <Text className="text-sm text-muted-foreground mb-1.5 mt-2">
              Email
            </Text>
            <Input
              value={user.email}
              editable={false}
              className="h-12 px-4 border-0 opacity-50 bg-gray-800/40"
            />
          </View>

          {/* home town*/}
          {
            <View>
              <Text className="text-sm text-muted-foreground mb-1.5 mt-2">
                Home Town
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setIsSearchHomeTown(true);
                }}
                className="h-12 flex-row items-center p-3  space-x-2 rounded-xl bg-gray-800/40"
              >
                {Platform.OS == "ios" ? (
                  <MapPin size={16} className="text-muted-foreground" />
                ) : (
                  <Icon
                    name="map-marker-outline"
                    type="material-community"
                    size={16}
                    color="#239ED0"
                  />
                )}
                <Text className="text-lg text-muted-foreground">
                  {locationHomeTownDetails.city === ""
                    ? "Search Address"
                    : locationHomeTownDetails.city}
                  , {locationHomeTownDetails?.state}{" "}
                  {locationHomeTownDetails?.zip}
                </Text>
              </TouchableOpacity>
            </View>
          }

          {/* Location Summary */}
          {
            <View>
              <Text className="text-sm text-muted-foreground mb-1.5 mt-2">
                Address
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setIsSearchLocation(true);
                }}
                className="h-12 flex-row items-center p-3  space-x-2 rounded-xl bg-gray-800/40"
              >
                {Platform.OS == "ios" ? (
                  <MapPin size={16} className="text-muted-foreground" />
                ) : (
                  <Icon
                    name="map-marker-outline"
                    type="material-community"
                    size={16}
                    color="#239ED0"
                  />
                )}
                <Text className="text-lg text-muted-foreground">
                  {locationDetails.city === ""
                    ? "Search Address"
                    : locationDetails.city}
                  , {locationDetails?.state} {locationDetails?.zip}
                </Text>
              </TouchableOpacity>
            </View>
          }

          {/*Event Location Preference */}
          {
            <View className=" mt-4">
              <Text className="text-sm text-muted-foreground mb-1.5 mt-2">
                Event Location Preference
              </Text>

              <TouchableOpacity
                onPress={() => {
                  SetIsEventLocationShow(true);
                }}
                className="h-12 flex-row items-center p-3  space-x-2 rounded-xl bg-gray-800/40"
              >
                <Text className="text-lg text-muted-foreground">
                  {locationOptions[selectedLocation]?.name}
                </Text>
              </TouchableOpacity>
            </View>
          }
          {isEventLocationShow && (
            <View className="absolute bottom-[18%]  right-0 mr-4 z-10 bg-white  w-[100%] mx-4 mb-4 overflow-hidden border rounded-2xl  border-gray-300">
              <EventLocationOptionsListView />
            </View>
          )}

          <View className="mt-4 mb-6 rounded-lg bg-card">
            <Text className="text-sm text-muted-foreground mb-1.5 mt-2">Interests </Text>
            <TouchableOpacity
              onPress={() => {
                setIsTopicsShow(true);
              }}
              className="h-12 flex-row items-center p-3  space-x-2 rounded-xl bg-gray-800/40"
            >
              <Text className="text-lg text-muted-foreground">
                {selectedTopics.length == 0
                  ? "Select Interests"
                  : selectedTopics.map((topic) => topic).join(", ")}
              </Text>
            </TouchableOpacity>
          </View>
          {/*Share My Live Location */}
          {
            <View className="flex-row mt-4">
              <Text className="text-sm text-muted-foreground  mr-2 mt-2">
                Share My Live Location
              </Text>
              <Switch
                trackColor={{ false: "#767577", true: "#239ED0" }}
                thumbColor={isEnabled ? "#ffffff" : "#f4f3f4"}
                ios_backgroundColor="#3e3e3e"
                onValueChange={toggleSwitch}
                value={isEnabled}
              />
            </View>
          }

          {/* Update Out Button */}
          <View className="mt-8">
            <TouchableOpacity
              onPress={() => {
                handleSave();
              }}
              className="py-4 border rounded-xl border-primary"
            >
              <Text className="font-medium text-center text-primary">
                Update
              </Text>
            </TouchableOpacity>
          </View>

          {/* Sign Out Button */}
          <View className="mt-8">
            <TouchableOpacity
              onPress={async () => {
                await supabase.auth.signOut();
                router.replace("/(auth)/sign-in");
              }}
              className="py-4 border rounded-xl border-destructive"
            >
              <Text className="font-medium text-center text-destructive">
                Sign Out
              </Text>
            </TouchableOpacity>
          </View>

          {/* Bottom Spacing */}
          <View className="h-20" />

          <Sheet
            isOpen={isSearchLocation}
            onClose={() => {
              setIsSearchLocation(false);
            }}
          >
            <View className="flex-1 pt-4 mt-4 border-t border-border">
              <TextInput
                value={address1}
                //  placeholder="Search Location of post?"
                onChangeText={(text) => {
                  setAddress1(text);
                  if (text === "") {
                    setSearchResults([]);
                    setShowResults(false);
                    setLocationDetails({
                      address1: "",
                      address2: "",
                      city: "",
                      state: "",
                      zip: "",
                    });
                  } else {
                    debouncedSearch(text);
                  }
                }}
                placeholder="Search address..."
                placeholderTextColor="#666"
                className="text-base text-foreground p-4 mx-4 border border-border rounded-lg"
                style={{ maxHeight: height * 0.2 }} // Limit height to 20% of screen
              />
            </View>

            {/* Search Results Dropdown */}
            {showResults && searchResults.length > 0 && (
              <View className="border rounded-lg border-border bg-background mx-4">
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
          </Sheet>

          {/* home town search */}
          <Sheet
            isOpen={isSearchHomeTown}
            onClose={() => {
              setIsSearchHomeTown(false);
            }}
          >
            <View className="flex-1 pt-4 mt-4 border-t border-border">
              <TextInput
                value={addressHomeTown1}
                //  placeholder="Search Location of post?"
                onChangeText={(text) => {
                  setAddressHomeTown1(text);
                  if (text === "") {
                    setSearchHomeTownResults([]);
                    setShowHomeTownResults(false);
                    setLocationHomeTownDetails({
                      address1: "",
                      address2: "",
                      city: "",
                      state: "",
                      zip: "",
                    });
                  } else {
                    debouncedSearchHomeTown(text);
                  }
                }}
                placeholder="Search address..."
                placeholderTextColor="#666"
                className="text-base text-foreground p-4 mx-4 border border-border rounded-lg"
                style={{ maxHeight: height * 0.2 }} // Limit height to 20% of screen
              />
            </View>

            {/* Search Results Dropdown */}
            {showHomeTownResults && searchHomeTownResults.length > 0 && (
              <View className="border rounded-lg border-border bg-background mx-4">
                {searchHomeTownResults.slice(0, 5).map((result) => (
                  <TouchableOpacity
                    key={result.id}
                    onPress={() => handleAddressHomeTownSelect(result)}
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
          </Sheet>
        </View>
      </ScrollView>
      {isOcupationShow && (
        <View className="flex-1 px-4  ">
          <View className="flex-1 bg-white border rounded-2xl  border-gray-300">
            <View>
              <Input
                onChangeText={(text) => {
                  const filtered = occupationList.filter((item) =>
                    item.name.toLowerCase().includes(text.toLowerCase())
                  );

                  setOccupationListShow(filtered);
                }}
                placeholder="Search Occupation"
                numberOfLines={1}
                className="h-24  px-4 py-3 align-text-top border-0 bg-gray-300"
                textAlignVertical="top"
              />
            </View>
            <ScrollView className="flex-1">
              {occupationListShow.map((occupation, index) => (
                <TouchableOpacity
                key={index}
                  onPress={() => {
                    setSelectedOcupation(occupation);
                    setIsOcupationShow(false);
                  }}
                  className={` rounded ${
                    selectedOcupation?.name === occupation.name
                      ? "bg-primary"
                      : "bg-transparent"
                  }`}
                >
                  <Text
                    className={`text-muted-foreground m-4 ${
                      selectedOcupation?.name === occupation.name
                        ? "text-white w-[90%]"
                        : "text-muted-foreground w-[90%]"
                    }`}
                    numberOfLines={1}
                  >
                    {occupation.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      )}
      {isTopicsShow && (
        <View className="flex-1 bg-transparent">
          <TouchableOpacity
            onPress={() => {
              setIsTopicsShow(false);
            }}
          >
            <Icon
              name="close-circle"
              type="material-community"
              size={20}
              color="#239ED0" // red or your preferred color
              style={{ marginLeft: 8 }}
            />
          </TouchableOpacity>
          <View className="flex-1 bg-white border rounded-2xl px-2  mb-12 mx-4 border-gray-300">
            <ScrollView>
              <TopicList
                selectedTopics={selectedTopics}
                onSelectTopic={setSelectedTopics}
              />
            </ScrollView>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}
