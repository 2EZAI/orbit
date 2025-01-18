import React from "react";
import { View, TouchableOpacity, Dimensions } from "react-native";
import { usePathname, router } from "expo-router";
import { Home, Map, MessageCircle, Plus, User } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width } = Dimensions.get("window");
const TAB_BAR_WIDTH = width * 0.9; // 90% of screen width
const TAB_WIDTH = TAB_BAR_WIDTH / 5; // Equal width for each tab

const TABS = [
  {
    name: "Home",
    path: "/(app)/home",
    icon: Home,
  },
  {
    name: "Chat",
    path: "/(app)/chat",
    icon: MessageCircle,
  },
  {
    name: "Create",
    path: "/(app)/create",
    icon: Plus,
  },
  {
    name: "Map",
    path: "/(app)/map",
    icon: Map,
  },
  {
    name: "Profile",
    path: "/(app)/profile",
    icon: User,
  },
] as const;

export default function TabBar() {
  const pathname = usePathname();
  const insets = useSafeAreaInsets();

  return (
    <View
      className="absolute bottom-0 left-0 right-0 items-center"
      style={{ paddingBottom: Math.max(insets.bottom, 16) }}
    >
      <View
        className="flex-row items-center p-3 rounded-2xl bg-background/60 backdrop-blur-lg border border-border"
        style={{ width: TAB_BAR_WIDTH }}
      >
        {TABS.map((tab) => {
          const isActive = pathname.includes(tab.path);
          const Icon = tab.icon;

          return (
            <TouchableOpacity
              key={tab.path}
              onPress={() => router.push(tab.path)}
              className="items-center justify-center"
              style={{ width: TAB_WIDTH }}
            >
              <View className="items-center justify-center w-10 h-10">
                <Icon
                  size={24}
                  className={
                    isActive ? "text-primary" : "text-muted-foreground"
                  }
                  strokeWidth={2}
                />
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}
