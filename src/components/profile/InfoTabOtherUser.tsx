import React, { useEffect, useState } from "react";
import {
  View,
  RefreshControl,
  ScrollView,
  Pressable,
  TouchableOpacity,
} from "react-native";
import { Text } from "~/src/components/ui/text";
import { supabase } from "~/src/lib/supabase";
import { useUser } from "~/hooks/useUserData";
import { Icon } from "react-native-elements";
import { SafeAreaView } from "react-native-safe-area-context";

interface InfoTabOtherUserProps {
  userId_: string;
  selectedItem_: any;
}

export default function InfoTabOtherUser({
  userId_,
  selectedItem_,
}: InfoTabOtherUserProps) {
  const {
    otherUser,
    fetchOtherUser,
    fetchOherUserTopics,
    fetchOtherUserHomeTownLocation,
    otherUserTopicsList,
    otherUserHomeTownlocation,
    allOcupationList,
  } = useUser();

  const [education, setEducation] = useState(otherUser?.education || "");

  const [selectedGender, setSelectedGender] = useState<any>(
    otherUser?.gender != null ? { name: otherUser.gender } : null
  );

  const [selectedOcupation, setSelectedOcupation] = useState<any>(
    allOcupationList?.length > 0 && otherUser?.occupation_id != null
      ? allOcupationList.find((item) => item.id === otherUser.occupation_id) ||
          null
      : null
  );
  const [selectedTopics, setSelectedTopics] = useState<string[]>(
    otherUserTopicsList?.length > 0 ? otherUserTopicsList : []
  );
  const [locationHomeTownDetails, setLocationHomeTownDetails] =
    useState<LocationDetails>({
      address1: otherUserHomeTownlocation?.address || "",
      address2: "",
      city: otherUserHomeTownlocation?.city || "",
      state: otherUserHomeTownlocation?.state || "",
      zip: otherUserHomeTownlocation?.postal_code || "",
      coordinates: [
        otherUserHomeTownlocation?.latitude || 0,
        otherUserHomeTownlocation?.longitude || 0,
      ],
    });

  const [isSeeAll, setIsSeeAll] = useState(false);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("Created Events");

  const callApi = async () => {
    const data = await fetchOherUserTopics(userId_);
    await fetchOtherUserHomeTownLocation(userId_);
    await fetchOtherUser(userId_);
  };
  useEffect(() => {
    if (userId_) {
      callApi();
    }
  }, []);

  useEffect(() => {
    setLocationHomeTownDetails({
      address1: otherUserHomeTownlocation?.address || "",
      address2: "",
      city: otherUserHomeTownlocation?.city || "",
      state: otherUserHomeTownlocation?.state || "",
      zip: otherUserHomeTownlocation?.postal_code || "",
      coordinates: [
        otherUserHomeTownlocation?.latitude || 0,
        otherUserHomeTownlocation?.longitude || 0,
      ],
    });
  }, [otherUserHomeTownlocation]);

  useEffect(() => {
    setSelectedTopics(
      otherUserTopicsList?.length > 0 ? otherUserTopicsList : []
    );
  }, [otherUserTopicsList]);

  useEffect(() => {
    setSelectedOcupation(
      allOcupationList?.length > 0 && otherUser?.occupation_id != null
        ? allOcupationList.find(
            (item) => item.id === otherUser.occupation_id
          ) || null
        : null
    );
  }, [allOcupationList]);

  useEffect(() => {
    setEducation(otherUser?.education || "");
    setSelectedGender(
      otherUser?.gender != null ? { name: otherUser.gender } : null
    );
    setSelectedOcupation(
      allOcupationList?.length > 0 && otherUser?.occupation_id != null
        ? allOcupationList.find(
            (item) => item.id === otherUser.occupation_id
          ) || null
        : null
    );
  }, [otherUser]);

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center">
        <Text className="text-muted-foreground">Loading Data...</Text>
      </View>
    );
  }
  const SeeAllSelectedTopics = () => {
    return (
      <View className="bg-transparent">
        <TouchableOpacity
          onPress={() => {
            setIsSeeAll(false);
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
        <ScrollView>
          <View className=" flex-row flex-wrap gap-2  bg-white border rounded-2xl p-2  mb-12 mx-4 border-gray-300">
            {selectedTopics.map((topic) => {
              const isSelected = selectedTopics.includes(topic);
              return (
                <View
                  key={topic}
                  className={`px-4 py-2  rounded-full border ${
                    isSelected
                      ? "bg-gray-300 border-gray-800"
                      : "bg-transparent border-border"
                  }`}
                >
                  <Text
                    className={
                      isSelected
                        ? "text-gray-300-foreground"
                        : "text-foreground"
                    }
                  >
                    {topic}
                  </Text>
                </View>
              );
            })}
          </View>
        </ScrollView>
      </View>
    );
  };

  return (
    <View className="flex-1 p-4">
      <ScrollView>
        <View>
          <View className=" mb-1.5 mt-2">
            <View className="flex-1 flex-row gap-x-14 items-center">
              <Text className="text-lg px-4 text-black ">Gender:</Text>
              <Text className="text-sm  text-muted-foreground ">
                {selectedGender === null ? "" : selectedGender.name}
              </Text>
            </View>

            <View className="flex-1 mt-2 flex-row gap-x-5 items-center">
              <Text className="text-lg px-4 text-black ">Occupation:</Text>
              <Text className="text-sm  text-muted-foreground ">
                {selectedOcupation === null ? "" : selectedOcupation.name}
              </Text>
            </View>
          </View>

          <View className=" mb-1.5 mt-2">
            <View className="flex-1 flex-row gap-x-8  items-center">
              <Text className="text-lg px-4 text-black ">Education:</Text>
              <Text
                numberOfLines={1}
                className="text-sm  text-muted-foreground "
              >
                {education}
              </Text>
            </View>

            <View className="flex-1 mt-2 flex-row gap-x-4  items-center">
              <Text className="text-lg px-4 text-black ">Home Town:</Text>
              <Text
                numberOfLines={1}
                className="text-sm  text-muted-foreground "
              >
                {locationHomeTownDetails.city === ""
                  ? "Search Address"
                  : locationHomeTownDetails.city}
                , {locationHomeTownDetails?.state}{" "}
                {locationHomeTownDetails?.zip}
              </Text>
            </View>

            <View className="flex-1 mt-4 flex-row gap-x-4  items-center justify-between">
              <Text className="text-lg  px-4 text-black ">Interests</Text>
              <TouchableOpacity
                onPress={() => {
                  setIsSeeAll(true);
                }}
              >
                <Text numberOfLines={1} className="text-sm  text-primary">
                  See All
                </Text>
              </TouchableOpacity>
            </View>

            <View className="flex-row flex-wrap gap-2 mt-4 px-4">
              {selectedTopics.map((topic, index) => {
                if (index < 5) {
                  const isSelected = selectedTopics.includes(topic);
                  return (
                    <View
                      key={topic}
                      className={`px-4 py-2 rounded-full border ${
                        isSelected
                          ? "bg-gray-300 border-gray-800"
                          : "bg-transparent border-border"
                      }`}
                    >
                      <Text
                        className={
                          isSelected
                            ? "text-gray-300-foreground"
                            : "text-foreground"
                        }
                      >
                        {topic}
                      </Text>
                    </View>
                  );
                }
              })}
            </View>
          </View>
        </View>
      </ScrollView>

      {isSeeAll && <SeeAllSelectedTopics />}
    </View>
  );
}
