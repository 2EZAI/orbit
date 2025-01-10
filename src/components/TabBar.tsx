import React from "react";
import { View, Pressable } from "react-native";
import { useRouter, usePathname } from "expo-router";
import { MessageCircle, Map, Plus, User, Home } from "lucide-react-native";

const TAB_ROUTES = [
  { route: "/(app)/chat", Icon: MessageCircle },
  { route: "/(app)/map", Icon: Map },
  { route: "/(app)/create", Icon: Plus, isMain: true },
  { route: "/(app)/profile", Icon: User },
  { route: "/(app)/home", Icon: Home },
];

const TabBar = () => {
  const router = useRouter();

  const handlePress = (route: string) => {
    router.replace(route);
  };

  return (
    <View className="absolute bottom-8 left-6 right-6">
      <View className="flex-row items-center justify-between px-6 py-4 bg-gray-800 rounded-full shadow-lg backdrop-blur-3xl">
        {TAB_ROUTES.map(({ route, Icon, isMain }) => (
          <Pressable
            key={route}
            onPress={() => handlePress(route)}
            className="items-center justify-center"
          >
            <View
              className={`
                items-center justify-center rounded-full
                ${isMain ? "bg-primary p-4 shadow-lg -mt-9" : "p-3"}
              `}
              style={{
                elevation: isMain ? 8 : 0,
                shadowColor: isMain ? "bg-primary" : "transparent",
                shadowOffset: { width: 0, height: 9 },
                shadowOpacity: isMain ? 0.3 : 0,
                shadowRadius: 8,
              }}
            >
              <Icon size={24} color={isMain ? "white" : "#94A3B8"} />
            </View>
          </Pressable>
        ))}
      </View>
    </View>
  );
};

export default TabBar;
