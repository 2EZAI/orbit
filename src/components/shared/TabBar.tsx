import {
  View,
  TouchableOpacity,
  DeviceEventEmitter,
  Platform,
  Text,
} from "react-native";
import { useEffect, useState } from "react";
import {
  Home,
  MessageCircle,
  PlusCircle,
  Map,
  User,
  Send,
} from "lucide-react-native";
import { usePathname, router } from "expo-router";
import { Icon } from "react-native-elements";
import { WalkthroughComponent, startWalkthrough } from "react-native-wlkt";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Define the tab routes
const TAB_ROUTES = [
  { path: "/(app)/(home)", icon: Home, iconAndroid: "home-outline" },
  { path: "/(app)/(social)", icon: Send, iconAndroid: "send" },
  { path: "/(app)/(chat)", icon: MessageCircle, iconAndroid: "chat-outline" },
  {
    path: "/(app)/(create)",
    icon: PlusCircle,
    iconAndroid: "plus-circle-outline",
  },
  { path: "/(app)/(map)", icon: Map, iconAndroid: "map-outline" },
  { path: "/(app)/(profile)", icon: User, iconAndroid: "account-outline" },
];
const txt1 = `To Create Event Tap ➕ icon in the bottom bar.\n\nAdd the time,\ncategory,\nname,\nand other details.`;
const txt2 = `To start a chat or group chat, tap the 💬 icon in the bottom bar.`;
const txt3 = `To create a post, tap the 👤 icon in the bottom bar.\n\n• Then go to the Post tab.\n• Click on the Create New Post button.`;

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
        marginBottom: "10%",
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

  // console.log("[TabBar] Current route:", pathname);

  useEffect(() => {
   
     (async () => {
    const tutorialCheck = await getTutorialFinished();
    console.log('tutorialCheck:', tutorialCheck);
    if (tutorialCheck === null) {
      // Show tutorial
        startWalkthrough({ scenario: tutorialScenario });
    }
  })();
   
    DeviceEventEmitter.addListener("mapReload", (value) => {
      // console.log("event----mapReload", value);
      router.replace("/(app)/(map)");
    });
  }, []);

  // Hide the tab bar when in a channel
  if (pathname?.includes("/channel/")) {
    return null;
  }

  return (
    <View className="absolute right-0 bottom-0 left-0 items-center ">
      <View className="flex-row items-center p-3 mx-4 mb-8 rounded-2xl border bg-background border-border">
        {/*   {TAB_ROUTES.map((tab,index) => {
          const isActive =
            pathname?.startsWith(tab.path.replace("/(app)/", "/")) ||
            pathname === tab.path;
          const Iconn = tab.icon;
          const IconA = tab.iconAndroid;

          return (
           
            <TouchableOpacity
              key={tab.path}
              style={{ justifyContent: "center", alignItems: "center" }}
              onPress={() => {
                console.log("Navigating to:", tab.path);
                console.log("Current pathname:", pathname);
                router.replace(tab.path);
              }}
              className="flex-1 items- center"
            >
              {Platform.OS === "ios" ? (
                <Iconn
                  size={24}
                  className={
                    isActive ? "text-primary" : "text-muted-foreground"
                  }
                />
              ) : (
                <Icon
                  name={IconA}
                  type="material-community"
                  size={24}
                  color="#239ED0"
                />
              )}
            </TouchableOpacity>
          );
        })} */}

        {TAB_ROUTES.map((tab, index) => {
          const isActive =
            pathname?.startsWith(tab.path.replace("/(app)/", "/")) ||
            pathname === tab.path;
          const Iconn = tab.icon;
          const IconA = tab.iconAndroid;

          const TabButton = (
            <TouchableOpacity
              key={tab.path}
              style={{ justifyContent: "center", alignItems: "center" }}
              onPress={() => {
                console.log("Navigating to:", tab.path);
                console.log("Current pathname:", pathname);
                router.replace(tab.path);
              }}
              className="flex-1 items-center"
            >
              {Platform.OS === "ios" ? (
                <Iconn
                  size={24}
                  className={
                    isActive ? "text-primary" : "text-muted-foreground"
                  }
                />
              ) : (
                <Icon
                  name={IconA}
                  type="material-community"
                  size={24}
                  color="#239ED0"
                />
              )}
            </TouchableOpacity>
          );

          // Only wrap with WalkthroughComponent at index 3
          return index === 2 || index === 3 || index === 5 ? (
            <WalkthroughComponent
              id={
                index === 2
                  ? `createchat`
                  : index === 3
                  ? `createevent`
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
