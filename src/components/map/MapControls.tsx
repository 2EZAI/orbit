import React, { useState, useRef } from "react";
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

// Enable LayoutAnimation for Android
if (Platform.OS === "android") {
  if (UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }
}

type TimeFrame = "Now" | "Today" | "Tomorrow";

interface MapControlsProps {
  onSearch: (text: string) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onRecenter: () => void;
  isFollowingUser: boolean;
}

export function MapControls({
  onSearch,
  onZoomIn,
  onZoomOut,
  onRecenter,
  isFollowingUser,
}: MapControlsProps) {
  const { theme } = useTheme();
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [selectedTimeFrame, setSelectedTimeFrame] = useState<TimeFrame>("Now");
  const [searchQuery, setSearchQuery] = useState("");

  const timeFrames: TimeFrame[] = ["Now", "Today", "Tomorrow"];

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

  return (
    <>
      {/* Top Controls */}
      <View className="absolute left-0 right-0 z-50 top-10">
        {/* Time Frame Tabs */}
        <View className="px-4 pb-2 pt-14">
          <View className="flex-row p-1 border rounded-md bg-background/80 backdrop-blur-2xl border-border">
            {timeFrames.map((timeFrame) => (
              <Pressable
                key={timeFrame}
                onPress={() => setSelectedTimeFrame(timeFrame)}
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

        {/* Search Bar */}
        <View className="px-4">
          <View
            className={`items-end ${isSearchExpanded ? "items-stretch" : ""}`}
          >
            {isSearchExpanded ? (
              <View className="flex-row items-center border rounded-full bg-background/80 backdrop-blur-lg border-border h-11">
                <View className="flex-row items-center flex-1 px-4">
                  <Search size={20} className="text-muted-foreground" />
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
                onPress={toggleSearch}
                className="items-center justify-center border rounded-full w-11 h-11 bg-background/80 backdrop-blur-lg border-border"
              >
                <Search size={20} className="text-foreground" />
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
            <Plus size={20} />
          </TouchableOpacity>
          <TouchableOpacity onPress={onZoomOut} className="p-2">
            <Minus size={20} />
          </TouchableOpacity>
        </View>

        {/* Recenter Button */}
        {!isFollowingUser && (
          <TouchableOpacity
            onPress={onRecenter}
            className="absolute items-center justify-center border rounded-full right-4 w-11 h-11 bg-background/80 backdrop-blur-lg border-border"
          >
            <Navigation2 size={20} />
          </TouchableOpacity>
        )}
      </View>
    </>
  );
}
