import React, { useEffect, useState } from "react";
import {
  View,
  SafeAreaView,
  TouchableOpacity,
  Image,
  ScrollView,
  Pressable,
} from "react-native";
import { Text } from "~/src/components/ui/text";
import { useAuth } from "~/src/lib/auth";
import { useUser } from "~/hooks/useUserData";
import { useFollow } from "~/hooks/useFollow";
import { Settings } from "lucide-react-native";
import { router } from "expo-router";
import { Button } from "~/src/components/ui/button";
import PostsTab from "~/src/components/profile/PostsTab";

type Tab = "Events" | "Posts" | "Info";

export default function Profile() {
  const { session } = useAuth();
  const { user } = useUser();
  const { getFollowCounts } = useFollow();
  const [activeTab, setActiveTab] = useState<Tab>("Events");
  const [counts, setCounts] = useState({
    followerCount: 0,
    followingCount: 0,
  });

  useEffect(() => {
    if (user?.id) {
      loadCounts();
    }
  }, [user?.id]);

  const loadCounts = async () => {
    if (user?.id) {
      const counts = await getFollowCounts(user.id);
      setCounts(counts);
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case "Posts":
        return user?.id ? <PostsTab userId={user.id} /> : null;
      case "Events":
        return (
          <View className="p-4">
            <Text className="text-muted-foreground">No events yet</Text>
          </View>
        );
      case "Info":
        return (
          <View className="p-4">
            <Text className="text-muted-foreground">No additional info</Text>
          </View>
        );
    }
  };

  if (!user) return null;

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-row items-center justify-end px-4 py-2">
        <TouchableOpacity
          onPress={() => router.push("/(app)/(profile)/settings")}
        >
          <Settings size={24} className="text-foreground" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View className="px-4 pt-2">
          {/* Profile Header */}
          <View className="flex-row items-start">
            <Image
              source={
                user.avatar_url
                  ? { uri: user.avatar_url }
                  : require("~/assets/favicon.png")
              }
              className="w-20 h-20 bg-gray-800 rounded-full"
            />
            <View className="flex-1 ml-4">
              <Text className="text-xl font-bold">
                {user.first_name} {user.last_name}
              </Text>
              <Text className="text-muted-foreground">
                @{user.username || "username"}
              </Text>

              <View className="flex-row items-center mt-2 space-x-4 gap-x-4">
                <View>
                  <Text className="font-medium">{counts.followerCount}</Text>
                  <Text className="text-sm text-muted-foreground">
                    followers
                  </Text>
                </View>
                <View>
                  <Text className="font-medium">5</Text>
                  <Text className="text-sm text-muted-foreground">events</Text>
                </View>
                <View>
                  <Text className="font-medium">23</Text>
                  <Text className="text-sm text-muted-foreground">Orbits</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Bio */}
          {user.bio && (
            <Text className="mt-4 text-foreground">
              {user.bio ? user.bio : "No bio yet"}
            </Text>
          )}

          {/* Action Buttons */}
          <View className="flex-row mt-4 space-x-2 gap-x-4">
            <Button
              className="flex-1 bg-gray-800"
              onPress={() => router.push(`/(app)/(profile)/${user.id}`)}
            >
              <Text className="font-medium text-primary-foreground">
                Edit Profile
              </Text>
            </Button>
            <Button
              className="flex-1 bg-gray-800"
              onPress={() => {
                /* Handle share */
              }}
            >
              <Text className="font-medium text-primary-foreground">
                Share Profile
              </Text>
            </Button>
          </View>

          {/* Tabs */}
          <View className="flex-row mt-6 border-b border-border">
            {(["Posts", "Events", "Info"] as Tab[]).map((tab) => (
              <Pressable
                key={tab}
                onPress={() => setActiveTab(tab)}
                className={`flex-1 py-2 ${
                  activeTab === tab ? "border-b-2 border-primary" : ""
                }`}
              >
                <Text
                  className={`text-center ${
                    activeTab === tab
                      ? "text-primary font-medium"
                      : "text-muted-foreground"
                  }`}
                >
                  {tab}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Tab Content */}
        <View className="flex-1 mt-4">{renderTabContent()}</View>
      </ScrollView>
    </SafeAreaView>
  );
}
