import {
  View,
  TouchableOpacity,
  DeviceEventEmitter,
  Platform,
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

export default function TabBar() {
  const pathname = usePathname();

  console.log("[TabBar] Current route:", pathname);

  useEffect(() => {
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
    <View className="absolute right-0 bottom-0 left-0 items-center">
      <View className="flex-row items-center p-3 mx-4 mb-8 rounded-2xl border bg-background border-border">
        {TAB_ROUTES.map((tab) => {
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
        })}
      </View>
    </View>
  );
}
