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
const myAmazingScenario = [
  {
    component: "textRnwlkt",
    tooltipOptions: {
      tooltipComponent: ({ tooltipcntx }) => (
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
         Tap the 💬 icon in the bottom bar to start a new chat or group chat.
          </Text>

          {/* Buttons Row */}
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              marginTop: 10,
            }}
          >
            <Text onPress={tooltipcntx.onSkip} style={{ color: "gray" }}>
              
            </Text>
            <Text
              onPress={() => {
                tooltipcntx.onNext();
                router.push({
                  pathname: "/(app)/(chat)",
                });
              }}
              style={{ color: "blue", fontWeight: "bold" }}
            >
              Next
            </Text>
          </View>
        </View>
      ),
    },
    spotlightOptions: {
      borderColor: "orange",
      borderWidth: 2,
    },
  },
];
export default function TabBar() {
  const pathname = usePathname();

  console.log("[TabBar] Current route:", pathname);

  useEffect(() => {
    // startWalkthrough({ scenario: myAmazingScenario });
    DeviceEventEmitter.addListener("mapReload", (value) => {
      console.log("event----mapReload", value);
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
          return index === 2 ? (
            <WalkthroughComponent
              id="textRnwlkt"
              key={`walkthrough-${tab.path}`}
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
