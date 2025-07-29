import React, { useState, useEffect } from "react";
import { useRouter } from "expo-router";
import {
  View,
  TouchableOpacity,
  Pressable,
  Platform,
  Image,
} from "react-native";
import { Search, Navigation2, Plus, Minus, Bell, X } from "lucide-react-native";
import { useTheme } from "~/src/components/ThemeProvider";
import { Text } from "~/src/components/ui/text";
import { Icon } from "react-native-elements";
import { useNotificationsApi } from "~/hooks/useNotificationsApi";
import { useUser } from "~/hooks/useUserData";
import { SearchSheet } from "~/src/components/search/SearchSheet";

type TimeFrame = "Today" | "Week" | "Weekend";

interface MapControlsProps {
  onSearch: (text: string) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onRecenter: () => void;
  isFollowingUser: boolean;
  timeFrame: TimeFrame;
  onSelectedTimeFrame: (text: string) => void;
  eventsList: any[];
  locationsList?: any[];
  onShowControler: (show: boolean) => void;
}

export function MapControls({
  onSearch,
  onZoomIn,
  onZoomOut,
  onRecenter,
  isFollowingUser,
  timeFrame,
  onSelectedTimeFrame,
  eventsList,
  locationsList = [],
  onShowControler,
}: MapControlsProps) {
  const router = useRouter();
  const { theme, isDarkMode } = useTheme();
  const { user } = useUser();
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const [selectedTimeFrame, setSelectedTimeFrame] =
    useState<TimeFrame>(timeFrame);
  const { fetchAllNoifications, unReadCount } = useNotificationsApi();
  const timeFrames: TimeFrame[] = ["Today", "Week", "Weekend"];

  const toggleSearch = () => {
    setIsSearchVisible(!isSearchVisible);
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
      {/* Pills Row - Avatar, Search, Notifications */}
      <View
        style={{
          position: "absolute",
          top: 80,
          left: 0,
          right: 0,
          zIndex: 40,
        }}
      >
        <View
          style={{
            marginHorizontal: 12,
            marginBottom: 15,
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          {/* Left Pill - Search Only */}
          <View
            style={{
              backgroundColor: theme.colors.card,
              borderRadius: 20,
              padding: 6,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 8,
              elevation: 5,
            }}
          >
            <TouchableOpacity
              onPress={toggleSearch}
              style={{
                width: 40,
                height: 40,
                borderRadius: 16,
                backgroundColor: isDarkMode
                  ? theme.colors.background
                  : "#F5F5F5",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Search size={16} color={theme.colors.text} strokeWidth={3} />
            </TouchableOpacity>
          </View>

          {/* Right Pill - Avatar + Notification */}
          <View
            style={{
              backgroundColor: theme.colors.card,
              borderRadius: 20,
              paddingHorizontal: 8,
              paddingVertical: 6,
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              shadowColor: isDarkMode ? theme.colors.border : "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: isDarkMode ? 0.3 : 0.1,
              shadowRadius: 8,
              elevation: 5,
            }}
          >
            {/* Notification */}
            <TouchableOpacity
              onPress={() => router.push("/(app)/(notification)")}
              style={{
                width: 40,
                height: 40,
                borderRadius: 16,
                backgroundColor: theme.colors.primary,
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Bell size={16} color="white" />
              {!!(unReadCount && unReadCount > 0) && (
                <View
                  style={{
                    position: "absolute",
                    top: -4,
                    right: -4,
                    backgroundColor: "#ff3b30",
                    borderRadius: 10,
                    minWidth: 20,
                    height: 20,
                    justifyContent: "center",
                    alignItems: "center",
                    borderWidth: 2,
                    borderColor: "white",
                  }}
                >
                  <Text
                    style={{ color: "white", fontSize: 12, fontWeight: "bold" }}
                  >
                    {unReadCount > 99 ? "99+" : String(unReadCount)}
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            {/* User Avatar */}
            <TouchableOpacity onPress={() => router.push("/(app)/(profile)")}>
              <Image
                source={
                  user?.avatar_url
                    ? { uri: user.avatar_url }
                    : require("~/assets/favicon.png")
                }
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 16,
                  borderWidth: 2,
                  borderColor: theme.colors.primary,
                }}
              />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Time Frame Tabs */}
      <View
        style={{
          position: "absolute",
          top: 130,
          left: 0,
          right: 0,
          zIndex: 35,
        }}
      >
        <View
          style={{
            backgroundColor: theme.colors.card,
            marginHorizontal: 12,
            marginTop: 10,
            borderRadius: 14,
            padding: 3,
            shadowColor: isDarkMode ? theme.colors.border : "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: isDarkMode ? 0.3 : 0.1,
            shadowRadius: 8,
            elevation: 5,
          }}
        >
          <View className="flex-row">
            {timeFrames.map((frame) => (
              <Pressable
                key={frame}
                onPress={() => {
                  setSelectedTimeFrame(frame);
                  onSelectedTimeFrame(frame);
                }}
                style={{
                  flex: 1,
                  backgroundColor:
                    selectedTimeFrame === frame
                      ? theme.colors.primary
                      : "transparent",
                  borderRadius: 10,
                  paddingVertical: 8,
                  paddingHorizontal: 12,
                  marginHorizontal: 1,
                }}
              >
                <Text
                  style={{
                    textAlign: "center",
                    fontWeight: "600",
                    fontSize: 14,
                    color:
                      selectedTimeFrame === frame ? "white" : theme.colors.text,
                  }}
                >
                  {frame}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </View>

      {/* Bottom Controls */}
      <View className="absolute left-0 right-0 bottom-20 mb-[125px] shadow-xs">
        {/* Zoom Controls */}
        <View
          style={{
            position: "absolute",
            left: 16,
            backgroundColor: theme.colors.card,
            borderRadius: 12,
            shadowColor: isDarkMode ? theme.colors.border : "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: isDarkMode ? 0.3 : 0.1,
            shadowRadius: 4,
            elevation: 3,
          }}
        >
          <TouchableOpacity
            onPress={onZoomIn}
            style={{
              padding: 12,
              borderBottomWidth: 1,
              borderBottomColor: theme.colors.border,
            }}
          >
            <Plus size={20} color={theme.colors.text} />
          </TouchableOpacity>
          <TouchableOpacity onPress={onZoomOut} style={{ padding: 12 }}>
            <Minus size={20} color={theme.colors.text} />
          </TouchableOpacity>
        </View>

        {/* Recenter Button */}
        {!isFollowingUser && (
          <TouchableOpacity
            onPress={onRecenter}
            style={{
              position: "absolute",
              right: 16,
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: theme.colors.card,
              justifyContent: "center",
              alignItems: "center",
              shadowColor: isDarkMode ? theme.colors.border : "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: isDarkMode ? 0.3 : 0.1,
              shadowRadius: 4,
              elevation: 3,
            }}
          >
            <Navigation2 size={20} color={theme.colors.text} />
          </TouchableOpacity>
        )}
      </View>

      {/* Search Sheet */}
      <SearchSheet
        isOpen={isSearchVisible}
        onClose={() => setIsSearchVisible(false)}
        eventsList={eventsList}
        locationsList={locationsList}
        onShowControler={() => onShowControler(true)}
      />
    </>
  );
}
