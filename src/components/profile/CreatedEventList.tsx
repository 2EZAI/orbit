import React, { useEffect, useState } from "react";
import {
  View,
  FlatList,
  TouchableOpacity,
  Image,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Text } from "~/src/components/ui/text";
import { MapLocation } from "~/hooks/useMapEvents";
import { supabase } from "~/src/lib/supabase";
import { useUpdateEvents } from "~/hooks/useUpdateEvents";
import { FeedEventCard } from "~/src/components/feed/FeedEventCard";

interface Post {
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

interface EventListProps {
  posts: Post[];
   selectedItem:any;
  refreshControl?: React.ReactElement;
}

export default function CreatedEventList({
  userid,
  selectedItem,
    refreshControl,
}: EventListProps) {
  const PAGE_SIZE = 5;
    const [selectedEvent, setSelectedEvent] = useState<any>(null);
   const [isEvent, setIsEvent] = useState(false);
  const { fetchCreatedEvents } = useUpdateEvents();
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [events, setEvents] = useState<MapLocation[]>([]);
  //  const fetchEvents = async () => {
  //     try {
  //       const { data, error } = await supabase
  //         .from("events")
  //         .select(
  //           `
  //           *
  //         `
  //         )
  //         .eq("created_by", userId)
  //         .order("created_at", { ascending: false });

  //       if (error) throw error;
  //       setEvents(data || []);
  //     } catch (error) {
  //       console.error("Error fetching create events:", error);
  //     } finally {
  //       setLoading(false);
  //     }
  //   };

  useEffect(() => {
    loadEvents();
  }, [userid]);

  const loadEvents = async () => {
    console.log("loadEvents:>");
     if (loading || !hasMore) return; // 👈 prevent infinite
    setLoading(true);

    console.log("loadEvents:");
    const data = await fetchCreatedEvents("created", page, PAGE_SIZE,userid);
    console.log("data>:", data);
    if (data.length === 0) {
      setLoading(false);
      setHasMore(false);
      console.error("Fetch error:", error);
    } else {
      setEvents((prev) => [...prev, ...data]);
      setPage((prev) => prev + 1);
      // if (data.length < PAGE_SIZE) setHasMore(false); // stop if no more
    }

    setLoading(false);
    updateEndReached();
  };
  const updateEndReached = () => {
    // setonEndReached(false);
    // setTimeout(() => {
    //   setonEndReached(true);
    // }, 300);
  };



  return (
    <View>
    {events?.length > 0 && (
  <FlatList
    data={events}
    renderItem={({ item }) => {
      // console.log("item>", item);
      return (
        <FeedEventCard
          key={item.id}
          event={item}
          onEventSelect={(item, locDetail) => {
            selectedItem(item,locDetail);
           
          }}
          // nearbyEvents={events}
          // nearbyEvents={eventsHome}
        />
      );
    }}
    keyExtractor={(item) => item.id.toString()}
   
    onEndReached={(d) => {
      console.log("onEndReached", d.distanceFromEnd);
      loadEvents();
    }}
    onEndReachedThreshold={0.5}
    ListFooterComponent={loading && hasMore && <ActivityIndicator />}
  />
)}
  {loading && hasMore &&
            <SafeAreaView className="absolute left-0 right-0 mb-[20%] bottom-0 items-center justify-center ">
        <ActivityIndicator size="large" color="#000080"/>
      </SafeAreaView>
  
  }
      {events?.length <= 0 && (
        <View className="mt-[50%] items-center justify-center">
          <Text className="text-primary">No events found</Text>
        </View>
      )}
       
    </View>
  );
}
