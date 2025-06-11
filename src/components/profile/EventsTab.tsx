import React, { useEffect, useState } from "react";
import { View, RefreshControl,Pressable } from "react-native";
import { Text } from "~/src/components/ui/text";
import PostGrid from "./PostGrid";
import CreatePostButton from "./CreatePostButton";
import { supabase } from "~/src/lib/supabase";
import { useUser } from "~/hooks/useUserData";
import PostsTab from "~/src/components/profile/PostsTab";
import EventList from "~/src/components/profile/EventList";

interface Event {
  id: string;
  content: string;
  media_urls: string[];
  created_at: string;
  user: {
    username: string;
    avatar_url: string;
  };
  like_count: number;
  comment_count: number;
}

interface EventsTabProps {
  userId: string;
}

export default function EventsTab({ userId }: EventsTabProps) {
   const { user } = useUser();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("Created Events");

  const fetchEvents = async () => {
    try {
      const { data, error } = await supabase
        .from("posts")
        .select(
          `
          *,
          user:users!inner (
            username,
            avatar_url
          )
        `
        )
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setEvents(data || []);
    } catch (error) {
      console.error("Error fetching posts:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [userId]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchEvents();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center">
        <Text className="text-muted-foreground">Loading events...</Text>
      </View>
    );
  }

   const renderTabContent = () => {
    switch (activeTab) {
      case "Created Events":
        return user?.id ? <EventList userId={user.id} /> : null;
      case "Joined Events":
        return user?.id ? <PostsTab userId={user.id} /> : null;
    }
  };

  return (
    <View className="flex-1">
     {/* Tabs */}
          <View className="flex-row mt-6 border-b border-border">
            {(["Created Events", "Joined Events"] as Tab[]).map((tab) => (
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
    {/* Tab Content */}
        <View className="flex-1 mt-4">{renderTabContent()}</View>
    
    
    </View>
  );
}
