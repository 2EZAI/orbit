import React, { useEffect, useState } from "react";
import { View, RefreshControl,Pressable } from "react-native";
import { Text } from "~/src/components/ui/text";
import PostGrid from "./PostGrid";
import CreatePostButton from "./CreatePostButton";
import { supabase } from "~/src/lib/supabase";
import { useUser } from "~/hooks/useUserData";
import PostsTab from "~/src/components/profile/PostsTab";
import CreatedEventList from "~/src/components/profile/CreatedEventList";
import JoinedEventsList from "~/src/components/profile/JoinedEventsList";


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
  userId_: string;
  selectedItem_: any;
}

export default function EventsTab({ userId_ , selectedItem_ }: EventsTabProps) {
   const { user } = useUser();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("Created Events");

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
        return userId_ ? <CreatedEventList userid={userId_}
         selectedItem={(item,locationDetail)=>{
selectedItem_(item,locationDetail);

        }} /> : null;
      case "Joined Events":
        return userId_ ? <JoinedEventsList userid={userId_}
         selectedItem={(item,locationDetail)=>{
selectedItem_(item,locationDetail);

        }} 
         /> : null;
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
