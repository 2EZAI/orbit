import { View, TouchableOpacity } from "react-native";
import {
  Home,
  MessageCircle,
  PlusCircle,
  Map,
  User,
} from "lucide-react-native";
import { usePathname, router } from "expo-router";

// Define the tab routes
const TAB_ROUTES = [
  { path: "/(app)/(home)", icon: Home },
  { path: "/(app)/(chat)", icon: MessageCircle },
  { path: "/(app)/(create)", icon: PlusCircle },
  { path: "/(app)/(map)", icon: Map },
  { path: "/(app)/(profile)", icon: User },
];

export default function TabBar() {
  const pathname = usePathname(); // Get the current pathname using usePathname hook

  console.log("Current pathname:", pathname); // Log the pathname to debug

  return (
    <View className="absolute bottom-0 left-0 right-0 items-center">
      <View className="flex-row items-center p-3 mx-4 mb-8 border rounded-2xl bg-background border-border">
        {TAB_ROUTES.map((tab) => {
          // Improved route matching: check if the pathname exactly matches or starts with the tab path
          const isActive =
            pathname === tab.path || pathname.startsWith(tab.path); // Match dynamic routes too

          const Icon = tab.icon; // Get the icon based on the current tab

          return (
            <TouchableOpacity
              key={tab.path}
              onPress={() => {
                console.log("Navigating to:", tab.path); // Log the navigation target
                router.push(tab.path);
              }} // Navigate to the selected path
              className="items-center flex-1"
            >
              <Icon
                size={24}
                className={isActive ? "text-primary" : "text-muted-foreground"} // Highlight the active tab
              />
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}
