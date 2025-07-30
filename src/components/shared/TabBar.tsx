import {
  View,
  TouchableOpacity,
  DeviceEventEmitter,
  Platform,
  Text,
  Animated,
  Dimensions,
} from "react-native";
import { useEffect, useState, useRef } from "react";
import {
  Home,
  MessageCircle,
  PlusCircle,
  Map,
  Send,
} from "lucide-react-native";
import { usePathname, router, useSegments } from "expo-router";
import { Icon } from "react-native-elements";
import { useTheme } from "~/src/components/ThemeProvider";
import { WalkthroughComponent, startWalkthrough } from "react-native-wlkt";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Define the tab routes in the requested order
const TAB_ROUTES = [
  {
    path: "/(app)/(home)",
    icon: Home,
    iconAndroid: "home-outline",
    segment: "(home)",
  },
  {
    path: "/(app)/(social)",
    icon: Send,
    iconAndroid: "send",
    segment: "(social)",
  },
  {
    path: "/(app)/(create)",
    icon: PlusCircle,
    iconAndroid: "plus-circle-outline",
    segment: "(create)",
  },
  {
    path: "/(app)/(chat)",
    icon: MessageCircle,
    iconAndroid: "chat-outline",
    segment: "(chat)",
  },
  {
    path: "/(app)/(map)",
    icon: Map,
    iconAndroid: "map-outline",
    segment: "(map)",
  },
];
const txt1 = `To Create Event Tap ➕ icon in the bottom bar.\n\nAdd the time,\ncategory,\nname,\nand other details.`;
const txt2 = `To start a chat or group chat, tap the 💬 icon in the bottom bar.`;
const txt3 = `To create a post, tap the 👤 icon on top right side.\n\n• Select users.\n• Click on the Create button.`;

const tutorialScenario = [
  {
    component: "createevent",
    tooltipOptions: {
      tooltipComponent: ({ tooltipcntx }) => tutorialView(txt1, 0, tooltipcntx),
    },
    spotlightOptions: {
      borderColor: "orange",
      borderWidth: 2,
    },
  },
  {
    component: "createchat",
    tooltipOptions: {
      tooltipComponent: ({ tooltipcntx }) => tutorialView(txt2, 1, tooltipcntx),
    },
    spotlightOptions: {
      borderColor: "orange",
      borderWidth: 2,
    },
  },
  {
    component: "createpost",
    tooltipOptions: {
      tooltipComponent: ({ tooltipcntx }) => tutorialView(txt3, 2, tooltipcntx),
    },
    spotlightOptions: {
      borderColor: "orange",
      borderWidth: 2,
    },
  },
];

const tutorialView = (txt: string, position: number, componentId: string) => {
  return (
    <View
      style={{
        position: "absolute",
        bottom: 0,
        right: 0,
        left: 0,
        marginBottom: "14%",
        marginHorizontal: 40, // replaces margingLeft + marginRight
        backgroundColor: "white",
        padding: 20,
        borderRadius: 12,
      }}
    >
      <Text style={{ color: "black", fontSize: 16, marginBottom: 12 }}>
        {txt}
      </Text>

      {/* Buttons Row */}
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          marginTop: 10,
        }}
      >
        <Text onPress={componentId.onSkip} style={{ color: "gray" }}></Text>
        <Text
          onPress={() => {
            componentId.onNext();
            if (position === 2) {
              saveTutorialFinished();
            }
          }}
          style={{ color: "blue", fontWeight: "bold" }}
        >
          {position < 2 ? "Next" : "Finish"}
        </Text>
      </View>
    </View>
  );
};
const getTutorialFinished = async () => {
  try {
    const value = await AsyncStorage.getItem("tutorial_finished");
    if (value !== null) {
      const parsedValue = JSON.parse(value);
      console.log("Fetched value:", parsedValue);
      return parsedValue;
    } else {
      console.log("No value found for tutorial_finished");
      return null;
    }
  } catch (error) {
    console.error("Error fetching tutorial_finished:", error);
    return null;
  }
};
const saveTutorialFinished = async () => {
  try {
    await AsyncStorage.setItem("tutorial_finished", JSON.stringify("1"));
    console.log("Saved successfully");
  } catch (error) {
    console.error("Error saving tutorial_finished:", error);
  }
};
export default function TabBar() {
  const pathname = usePathname();
  const segments = useSegments();
  const { theme, isDarkMode } = useTheme();
  const slideAnimation = useRef(new Animated.Value(0)).current;
  const [activeIndex, setActiveIndex] = useState(0);

  console.log("[TabBar] Current route:", pathname);
  console.log("[TabBar] Segments:", segments);

  // Calculate the current active index
  const currentActiveIndex = TAB_ROUTES.findIndex((tab) =>
    segments.includes(tab.segment)
  );

  useEffect(() => {
    if (currentActiveIndex !== -1 && currentActiveIndex !== activeIndex) {
      setActiveIndex(currentActiveIndex);
      // Animate to the new position
      Animated.spring(slideAnimation, {
        toValue: currentActiveIndex,
        useNativeDriver: true,
        tension: 120,
        friction: 8,
      }).start();
    }
  }, [currentActiveIndex, activeIndex, slideAnimation]);

  useEffect(() => {
   
     (async () => {
    const tutorialCheck = await getTutorialFinished();
    console.log('tutorialCheck:', tutorialCheck);
    if (tutorialCheck === null) {
      // Show tutorial
        startWalkthrough({ scenario: tutorialScenario });
    }
  })();
   
    const subscription = DeviceEventEmitter.addListener(
      "mapReload",
      (value) => {
        // console.log("event----mapReload", value);
        // Add a small delay to ensure navigation context is available
        setTimeout(() => {
          router.replace("/(app)/(map)");
        }, 100);
      }
    );

    return () => {
      subscription?.remove();
    };
  }, []);

  // Hide the tab bar when in a channel
  if (pathname?.includes("/channel/")) {
    return null;
  }

  // Calculate the tab width (accounting for padding and margins)
  const screenWidth = Dimensions.get("window").width;
  const containerPadding = 16 * 2; // marginHorizontal
  const containerInnerPadding = 8 * 2; // padding
  const tabContainerWidth =
    screenWidth - containerPadding - containerInnerPadding;
  const tabWidth = tabContainerWidth / TAB_ROUTES.length;
  const tabMargin = 2 * 2; // marginHorizontal for each tab
  const effectiveTabWidth = tabWidth - tabMargin;

  return (
    <View className="absolute right-0 bottom-0 left-0 items-center">
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          padding: 8,
          marginHorizontal: 16,
          marginBottom: 32,
          borderRadius: 20,
          backgroundColor: theme.colors.card,
          borderWidth: 1,
          borderColor: theme.colors.border,
          shadowColor: isDarkMode ? theme.colors.border : "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: isDarkMode ? 0.3 : 0.1,
          shadowRadius: 8,
          elevation: 5,
          position: "relative",
        }}
      >
        {/* Animated Background Pill */}
        <Animated.View
          style={{
            position: "absolute",
            top: 8,
            left: 8,
            width: effectiveTabWidth,
            height: 48, // paddingVertical 12 * 2 + icon size
            backgroundColor: theme.colors.primary,
            borderRadius: 16,
            transform: [
              {
                translateX: slideAnimation.interpolate({
                  inputRange: [0, 1, 2, 3, 4],
                  outputRange: [
                    2,
                    tabWidth + 2,
                    tabWidth * 2 + 2,
                    tabWidth * 3 + 2,
                    tabWidth * 4 + 2,
                  ],
                }),
              },
            ],
          }}
        />

        {TAB_ROUTES.map((tab, index) => {
          // Use segments to determine active state
          const isActive = segments.includes(tab.segment);

          const Iconn = tab.icon;
          const IconA = tab.iconAndroid;

          console.log(
            `[TabBar] Tab ${tab.segment}: segments=${JSON.stringify(
              segments
            )}, isActive=${isActive}`
          );
           const TabButton = (
 <TouchableOpacity
              key={tab.path}
              style={{
                justifyContent: "center",
                alignItems: "center",
                flex: 1,
                paddingVertical: 12,
                paddingHorizontal: 8,
                marginHorizontal: 2,
                borderRadius: 16,
                zIndex: 1, // Ensure icons are above the animated background
              }}
              onPress={() => {
                console.log("Navigating to:", tab.path);
                console.log("Current pathname:", pathname);

                // Check if we're already on this tab and it's the same tab being clicked
                const isOnThisTab = segments.includes(tab.segment);
                const isClickingSameTab = currentActiveIndex === index;
                // Check if we're on a sub-page (not a main route)
                const isOnSubPage =
                  pathname.includes("/post/") ||
                  pathname.includes("/channel/") ||
                  pathname.includes("/profile/") ||
                  (segments.length > 2 &&
                    pathname !== "/" &&
                    !pathname.endsWith("index"));

                // If we're already on this tab and clicking the same tab and not on a sub-page, don't navigate
                if (isOnThisTab && isClickingSameTab && !isOnSubPage) {
                  console.log(
                    "Already on main route of this tab, skipping navigation"
                  );
                  return;
                }

                router.replace(tab.path);
              }}
            >
              {Platform.OS === "ios" ? (
                <Iconn
                  size={24}
                  color={isActive ? "white" : theme.colors.text}
                />
              ) : (
                <Icon
                  name={IconA}
                  type="material-community"
                  size={24}
                  color={isActive ? "white" : theme.colors.text}
                />
              )}
            </TouchableOpacity>);
          
             // Only wrap with WalkthroughComponent at index 3
          return index === 2 || index === 3 || index === 5 ? (
            <WalkthroughComponent
              id={
                index === 2
                  ?`createevent` 
                  : index === 3
                  ? `createchat`
                  : `createpost`
              }
              key={
                index === 2
                  ? `createchat-${tab.path}`
                  : index === 3
                  ? `createevent-${tab.path}`
                  : `createpost-${tab.path}`
              }
            >
              {TabButton}
            </WalkthroughComponent>
          ) : (
            TabButton
          );
         
        })}
      </View>
    </View>
  );
}
