import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "expo-router";
import {
  View,
  TextInput,
  TouchableOpacity,
  Animated,
  Pressable,
  Dimensions,
  LayoutAnimation,
  Platform,
  UIManager,
} from "react-native";
import {
  Search,
  X,
  Navigation2,
  Plus,
  Minus,
  MapPin,
} from "lucide-react-native";
import { useTheme } from "~/src/components/ThemeProvider";
import { Text } from "~/src/components/ui/text";
import { Icon } from "react-native-elements";
import { useNotificationsApi } from "~/hooks/useNotificationsApi";

// Enable LayoutAnimation for Android
if (Platform.OS === "android") {
  if (UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }
}

type TimeFrame = "Today" | "Week" | "Weekend";

interface MapControlsProps {
  onSearch: (text: string) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onRecenter: () => void;
  isFollowingUser: boolean;
  onSelectedTimeFrame: (text: string) => void;
}

export function MapControls({
  onSearch,
  onZoomIn,
  onZoomOut,
  onRecenter,
  isFollowingUser,
  timeFrame,
  onSelectedTimeFrame,
}: MapControlsProps) {
  const router = useRouter();
  const { theme } = useTheme();
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [selectedTimeFrame, setSelectedTimeFrame] =
    useState<TimeFrame>(timeFrame);
  const [searchQuery, setSearchQuery] = useState("");
  const { fetchAllNoifications, unReadCount } = useNotificationsApi();
  const timeFrames: TimeFrame[] = ["Today", "Week", "Weekend"];

  const toggleSearch = () => {
    LayoutAnimation.configureNext(
      LayoutAnimation.create(
        200,
        LayoutAnimation.Types.easeInEaseOut,
        LayoutAnimation.Properties.opacity
      )
    );

    setIsSearchExpanded(!isSearchExpanded);
    if (!isSearchExpanded) {
      setSearchQuery("");
    }
  };
  useEffect(() => {
    hitNotificationCount();
  }, []);

  useEffect(() => {
    // console.log("unReadCounta>>", unReadCount);
  }, [unReadCount]);

  const hitNotificationCount = async () => {
    await fetchAllNoifications(1, 20);
  };

  return (
    <>
      {/* Top Controls */}
      <View className="absolute left-0 right-0 z-50 top-10">
        <View className="flex-row items-center pb-2 pt-10">
          {/* Time Frame Tabs */}
          <View className=" w-[86%] px-4 ">
            <View className="flex-row p-1 border rounded-md bg-background/80 backdrop-blur-2xl border-border">
              {timeFrames.map((timeFrame) => (
                <Pressable
                  key={timeFrame}
                  onPress={() => {
                    setSelectedTimeFrame(timeFrame);
                    onSelectedTimeFrame(timeFrame);
                  }}
                  className={`flex-1 py-2 px-4 rounded-md ${
                    selectedTimeFrame === timeFrame ? "bg-primary" : ""
                  }`}
                >
                  <Text
                    className={`text-center font-medium ${
                      selectedTimeFrame === timeFrame
                        ? "text-primary-foreground"
                        : "text-muted-foreground"
                    }`}
                  >
                    {timeFrame}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <TouchableOpacity
            className=""
            onPress={() => {
              router.push({
                pathname: "/(app)/(notification)",
              });
            }}
          >
            <Icon
              name="bell"
              type="material-community"
              size={36}
              color="#239ED0"
              className="mt-4 mr-2"
            />

            {unReadCount != null && unReadCount !== 0 && (
              <View className="absolute top-1 right-0 bg-red-600 rounded-full w-8 h-8 items-center justify-center">
                <Text className="text-white text-xs font-bold">
                  {unReadCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
        {/* Search Bar */}
        <View className="px-4">
          <View
            className={`items-end ${isSearchExpanded ? "items-stretch" : ""}`}
          >
            {isSearchExpanded ? (
              <View className="flex-row items-center border rounded-full bg-background/80 backdrop-blur-lg border-border h-11">
                <View className="flex-row items-center flex-1 px-4">
                  {Platform.OS === "ios" ? (
                    <Search size={20} className="text-muted-foreground" />
                  ) : (
                    <Icon
                      name="magnify"
                      type="material-community"
                      size={20}
                      color="#239ED0"
                    />
                  )}
                  <TextInput
                    placeholder="Search For Events..."
                    placeholderTextColor={theme.colors.text}
                    className="flex-1 h-full ml-2 text-base text-foreground"
                    value={searchQuery}
                    onChangeText={(text) => {
                      setSearchQuery(text);
                      onSearch(text);
                    }}
                    autoFocus
                  />
                </View>
                <TouchableOpacity
                  onPress={toggleSearch}
                  className="justify-center h-full px-4"
                >
                  <X size={20} className="text-foreground" />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                // onPress={toggleSearch}
                onPress={() => {
                  setSearchQuery();
                  onSearch();
                }}
                className="items-center justify-center border rounded-full w-11 h-11 bg-background/80 backdrop-blur-lg border-border"
              >
                {Platform.OS === "ios" ? (
                  <Search size={20} className="text-foreground" />
                ) : (
                  <Icon
                    name="magnify"
                    type="material-community"
                    size={20}
                    color="#239ED0"
                  />
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>

      {/* Bottom Controls */}
      <View className="absolute left-0 right-0 bottom-16 mb-[125px]">
        {/* Zoom Controls */}
        <View className="absolute border rounded-lg left-4 bg-background/80 backdrop-blur-lg border-border">
          <TouchableOpacity
            onPress={onZoomIn}
            className="p-2 border-b border-border"
          >
            {Platform.OS === "ios" ? (
              <Plus size={20} />
            ) : (
              <Icon
                name="plus"
                type="material-community"
                size={20}
                color="#239ED0"
              />
            )}
          </TouchableOpacity>
          <TouchableOpacity onPress={onZoomOut} className="p-2">
            {Platform.OS === "ios" ? (
              <Minus size={20} />
            ) : (
              <Icon
                name="minus"
                type="material-community"
                size={20}
                color="#239ED0"
              />
            )}
          </TouchableOpacity>
        </View>

        {/* Recenter Button */}
        {!isFollowingUser && (
          <TouchableOpacity
            onPress={onRecenter}
            className="absolute items-center justify-center border rounded-full right-4 w-11 h-11 bg-background/80 backdrop-blur-lg border-border"
          >
            {Platform.OS === "ios" ? (
              <Navigation2 size={20} />
            ) : (
              <Icon
                name="navigation-outline"
                type="material-community"
                size={20}
                color="#239ED0"
              />
            )}
          </TouchableOpacity>
        )}
      </View>
    </>
  );
}
