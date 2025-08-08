import React, { useState, useEffect } from "react";
import { useRouter } from "expo-router";
import { View, TouchableOpacity, Pressable, Image } from "react-native";
import {
  Search,
  Navigation2,
  Plus,
  Minus,
  Bell,
  Info,
} from "lucide-react-native";
import { useTheme } from "~/src/components/ThemeProvider";
import { Text } from "~/src/components/ui/text";
import { Icon } from "react-native-elements";
import { useNotificationsApi } from "~/hooks/useNotificationsApi";
import { useUser } from "~/hooks/useUserData";
import { SearchSheet } from "~/src/components/search/SearchSheet";
import { MarkerLegend } from "~/src/components/map/MarkerLegend";
import { MarkerFilter, FilterState } from "~/src/components/map/MarkerFilter";

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
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
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
  filters,
  onFilterChange,
}: MapControlsProps) {
  const router = useRouter();
  const { theme, isDarkMode } = useTheme();
  const { user } = useUser();
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const [isLegendVisible, setIsLegendVisible] = useState(false);
  const [isFilterVisible, setIsFilterVisible] = useState(false);
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
          top: 70,
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
          {/* Left Section - Search + Filter */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
            }}
          >
            {/* Search Pill */}
            <View
              style={{
                backgroundColor: theme.colors.card,
                borderRadius: 22,
                padding: 6,
                borderWidth: 1,
                borderColor: isDarkMode
                  ? "rgba(255,255,255,0.1)"
                  : "rgba(0,0,0,0.08)",
                shadowColor: isDarkMode ? "#000" : "#000",
                shadowOffset: { width: 0, height: 6 },
                shadowOpacity: isDarkMode ? 0.6 : 0.15,
                shadowRadius: 16,
                elevation: 12,
              }}
            >
              <TouchableOpacity
                onPress={toggleSearch}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 18,
                  borderWidth: 1.5,
                  borderColor: isDarkMode
                    ? "rgba(255,255,255,0.15)"
                    : "rgba(0,0,0,0.12)",
                  backgroundColor: isDarkMode
                    ? "rgba(255,255,255,0.08)"
                    : "rgba(255,255,255,0.9)",
                  justifyContent: "center",
                  alignItems: "center",
                }}
                activeOpacity={0.7}
              >
                <Search size={18} color={theme.colors.text} strokeWidth={2.5} />
              </TouchableOpacity>
            </View>

            {/* Filter Pill */}
            <View
              style={{
                backgroundColor: theme.colors.card,
                borderRadius: 22,
                padding: 6,
                borderWidth: 1,
                borderColor: isDarkMode
                  ? "rgba(255,255,255,0.1)"
                  : "rgba(0,0,0,0.08)",
                shadowColor: isDarkMode ? "#000" : "#000",
                shadowOffset: { width: 0, height: 6 },
                shadowOpacity: isDarkMode ? 0.6 : 0.15,
                shadowRadius: 16,
                elevation: 12,
              }}
            >
              <TouchableOpacity
                onPress={() => setIsFilterVisible(true)}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 18,
                  borderWidth: 1.5,
                  borderColor: isDarkMode
                    ? "rgba(255,255,255,0.15)"
                    : "rgba(0,0,0,0.12)",
                  backgroundColor: isDarkMode
                    ? "rgba(255,255,255,0.08)"
                    : "rgba(255,255,255,0.9)",
                  justifyContent: "center",
                  alignItems: "center",
                }}
                activeOpacity={0.7}
              >
                <Icon
                  name="tune"
                  type="material"
                  size={20}
                  color={theme.colors.text}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Right Pill - Avatar + Notification */}
          <View
            style={{
              backgroundColor: theme.colors.card,
              borderRadius: 22,
              paddingHorizontal: 10,
              paddingVertical: 8,
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
              borderWidth: 1,
              borderColor: isDarkMode
                ? "rgba(255,255,255,0.1)"
                : "rgba(0,0,0,0.08)",
              shadowColor: isDarkMode ? "#000" : "#000",
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: isDarkMode ? 0.6 : 0.15,
              shadowRadius: 16,
              elevation: 12,
            }}
          >
            {/* Notification */}
            <TouchableOpacity
              onPress={() => router.push("/(app)/(notification)")}
              style={{
                width: 42,
                height: 42,
                borderRadius: 18,
                backgroundColor: theme.colors.primary,
                justifyContent: "center",
                alignItems: "center",
                borderWidth: 2,
                borderColor: isDarkMode
                  ? "rgba(255,255,255,0.15)"
                  : "rgba(255,255,255,0.8)",
                shadowColor: theme.colors.primary,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
                elevation: 6,
              }}
              activeOpacity={0.8}
            >
              <Bell size={16} color="white" />
              {!!(unReadCount && unReadCount > 0) && (
                <View
                  style={{
                    position: "absolute",
                    top: -6,
                    right: -6,
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
                    style={{
                      color: "white",
                      fontSize: 9,
                      fontWeight: "700",
                      lineHeight: 12,
                    }}
                  >
                    {unReadCount > 99 ? "99+" : String(unReadCount)}
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            {/* User Avatar */}
            <TouchableOpacity
              onPress={() => router.push("/(app)/(profile)")}
              activeOpacity={0.8}
              style={{
                borderRadius: 18,
                borderWidth: 2.5,
                borderColor: theme.colors.primary,
                shadowColor: theme.colors.primary,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.25,
                shadowRadius: 8,
                elevation: 6,
              }}
            >
              <Image
                source={
                  user?.avatar_url
                    ? { uri: user.avatar_url }
                    : require("~/assets/favicon.png")
                }
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 18,
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
          top: 140,
          left: 0,
          right: 0,
          zIndex: 35,
        }}
      >
        <View
          style={{
            backgroundColor: theme.colors.card,
            marginHorizontal: 12,
            marginTop: 12,
            borderRadius: 18,
            padding: 4,
            borderWidth: 1,
            borderColor: isDarkMode
              ? "rgba(255,255,255,0.1)"
              : "rgba(0,0,0,0.08)",
            shadowColor: isDarkMode ? "#000" : "#000",
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: isDarkMode ? 0.6 : 0.12,
            shadowRadius: 16,
            elevation: 10,
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
                  borderRadius: 14,
                  paddingVertical: 10,
                  paddingHorizontal: 16,
                  marginHorizontal: 2,
                  borderWidth: selectedTimeFrame === frame ? 0 : 1,
                  borderColor: isDarkMode
                    ? "rgba(255,255,255,0.1)"
                    : "rgba(0,0,0,0.06)",
                  shadowColor:
                    selectedTimeFrame === frame
                      ? theme.colors.primary
                      : "transparent",
                  shadowOffset: { width: 0, height: 3 },
                  shadowOpacity: selectedTimeFrame === frame ? 0.3 : 0,
                  shadowRadius: 6,
                  elevation: selectedTimeFrame === frame ? 4 : 0,
                }}
                android_ripple={{ color: "rgba(255,255,255,0.1)" }}
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

      {/* Side Controls - 5px above menu bar */}
      <View
        style={{
          position: "absolute",
          right: 16,
          bottom: 105, // 5px above the menu bar
          zIndex: 30,
        }}
      >
        {/* Vertical Controls Container */}
        <View
          style={{
            backgroundColor: theme.colors.card,
            borderRadius: 28,
            padding: 10,
            borderWidth: 1,
            borderColor: isDarkMode
              ? "rgba(255,255,255,0.12)"
              : "rgba(0,0,0,0.08)",
            shadowColor: isDarkMode ? "#000" : "#000",
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: isDarkMode ? 0.7 : 0.18,
            shadowRadius: 20,
            elevation: 15,
          }}
        >
          <TouchableOpacity
            onPress={onZoomIn}
            style={{
              width: 38,
              height: 38,
              borderRadius: 19,
              backgroundColor: isDarkMode
                ? "rgba(255,255,255,0.12)"
                : "rgba(255,255,255,0.9)",
              borderWidth: 1,
              borderColor: isDarkMode
                ? "rgba(255,255,255,0.15)"
                : "rgba(0,0,0,0.1)",
              justifyContent: "center",
              alignItems: "center",
              marginBottom: 6,
              shadowColor: isDarkMode
                ? "rgba(255,255,255,0.1)"
                : "rgba(0,0,0,0.1)",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.8,
              shadowRadius: 4,
              elevation: 3,
            }}
            activeOpacity={0.7}
          >
            <Plus size={18} color={theme.colors.text} strokeWidth={2.5} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={onZoomOut}
            style={{
              width: 38,
              height: 38,
              borderRadius: 19,
              backgroundColor: isDarkMode
                ? "rgba(255,255,255,0.12)"
                : "rgba(255,255,255,0.9)",
              borderWidth: 1,
              borderColor: isDarkMode
                ? "rgba(255,255,255,0.15)"
                : "rgba(0,0,0,0.1)",
              justifyContent: "center",
              alignItems: "center",
              marginBottom: 6,
              shadowColor: isDarkMode
                ? "rgba(255,255,255,0.1)"
                : "rgba(0,0,0,0.1)",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.8,
              shadowRadius: 4,
              elevation: 3,
            }}
            activeOpacity={0.7}
          >
            <Minus size={18} color={theme.colors.text} strokeWidth={2.5} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setIsLegendVisible(true)}
            style={{
              width: 38,
              height: 38,
              borderRadius: 19,
              backgroundColor: isDarkMode
                ? "rgba(255,255,255,0.12)"
                : "rgba(255,255,255,0.9)",
              borderWidth: 1,
              borderColor: isDarkMode
                ? "rgba(255,255,255,0.15)"
                : "rgba(0,0,0,0.1)",
              justifyContent: "center",
              alignItems: "center",
              marginBottom: 6,
              shadowColor: isDarkMode
                ? "rgba(255,255,255,0.1)"
                : "rgba(0,0,0,0.1)",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.8,
              shadowRadius: 4,
              elevation: 3,
            }}
            activeOpacity={0.7}
          >
            <Info size={18} color={theme.colors.text} strokeWidth={2.5} />
          </TouchableOpacity>

          {/* Recenter Button - integrated into the vertical stack */}
          {!isFollowingUser && (
            <TouchableOpacity
              onPress={onRecenter}
              style={{
                width: 38,
                height: 38,
                borderRadius: 19,
                backgroundColor: theme.colors.primary,
                borderWidth: 1.5,
                borderColor: isDarkMode
                  ? "rgba(255,255,255,0.2)"
                  : "rgba(255,255,255,0.9)",
                justifyContent: "center",
                alignItems: "center",
                shadowColor: theme.colors.primary,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.4,
                shadowRadius: 8,
                elevation: 6,
              }}
              activeOpacity={0.8}
            >
              <Navigation2 size={18} color="white" strokeWidth={2.5} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Search Sheet */}
      <SearchSheet
        isOpen={isSearchVisible}
        onClose={() => setIsSearchVisible(false)}
        eventsList={eventsList}
        locationsList={locationsList}
        onShowControler={() => onShowControler(true)}
      />

      {/* Marker Legend */}
      <MarkerLegend
        isOpen={isLegendVisible}
        onClose={() => setIsLegendVisible(false)}
      />

      {/* Marker Filter */}
      <MarkerFilter
        eventsList={eventsList}
        locationsList={locationsList}
        isOpen={isFilterVisible}
        onClose={() => setIsFilterVisible(false)}
        filters={filters}
        onFilterChange={onFilterChange}
      />
    </>
  );
}
