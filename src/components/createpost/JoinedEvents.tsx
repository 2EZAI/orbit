import React, { useEffect, useState } from "react";
import {
  View,
  FlatList,
  TouchableOpacity,
  Image,
  RefreshControl,
  ActivityIndicator,
  TextInput,
} from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Text } from "~/src/components/ui/text";
import { MapLocation } from "~/hooks/useMapEvents";
import { supabase } from "~/src/lib/supabase";
import { useUpdateEvents } from "~/hooks/useUpdateEvents";
import { FeedEventCard } from "~/src/components/feed/FeedEventCard";



interface JoinedEventsProps {
   selectedItem:any;
  refreshControl?: React.ReactElement;
}

export default function JoinedEvents({
  selectedItem,
    refreshControl,
}: JoinedEventsProps) {
  const PAGE_SIZE = 20;
    const [selectedEvent, setSelectedEvent] = useState<any>(null);
   const [isEvent, setIsEvent] = useState(false);
  const { filterEvents } = useUpdateEvents();
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [events, setEvents] = useState<MapLocation[]>([]);
let filterText='';

  useEffect(() => {
    loadEvents();
  }, []);


 const fetchEvent = async (text:string) => {
    console.log("fetchEvent:>");
     if (loading || !hasMore) return; // 👈 prevent infinite
    setLoading(true);

    console.log("fetchEvent:");
    const data = await filterEvents(text, 1, PAGE_SIZE);
    console.log("data>:", data);
    setEvents([]);
    if (data.length === 0) {
       
      setLoading(false);
       setHasMore(false);
      console.error("Fetch error:", error);
    } else {
      setEvents(data);
      setPage((prev) => prev + 1);
      if (data.length < PAGE_SIZE) setHasMore(false); // stop if no more
    }

    setLoading(false);
    updateEndReached();
  };
  const loadEvents = async () => {
    console.log("loadEvents:>");
     if (loading || !hasMore) return; // 👈 prevent infinite
    setLoading(true);

    console.log("loadEvents:");
    const data = await filterEvents(filterText, page, PAGE_SIZE);
    console.log("data>:", data);
    if (data.length === 0) {
      setLoading(false);
       setHasMore(false);
      console.error("Fetch error:", error);
    } else {
      setEvents((prev) => [...prev, ...data]);
      setPage((prev) => prev + 1);
      if (data.length < PAGE_SIZE) setHasMore(false); // stop if no more
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
    <View className=" flex-1 px-4 mb-[6%]">
    <TextInput
                 
                  onChangeText={(text) => {
                    console.log("text>",text);
                    if(text.length >2){
                    filterText=text;
                    setHasMore(true);
                    fetchEvent(text);
                    }
                    if(text.length ==0){
                    filterText=text;
                    setHasMore(true);
                    fetchEvent('');
                    }
                  }}
                  placeholder="Search address..."
                  className="h-12 mt-4 p-4 bg-background  rounded-full"
                />
    {events?.length > 0 && (
      <View className=" flex-1">
      
  <FlatList
    data={events}
    renderItem={({ item }) => {
      // console.log("item>", item);
      return (
        <TouchableOpacity
                  onPress={() => {
                  selectedItem(item);
                  }}
                  className={` rounded ${
                      "bg-transparent"
                  }`}
                >
                  <Text
                    className={`text-muted-foreground m-4 ${
                     "text-muted-foreground w-[90%]"
                    }`}
                    numberOfLines={1}
                  >
                    {item?.name}
                  </Text>
                </TouchableOpacity>
      );
    }}
    keyExtractor={(item) => item?.id?.toString()}
   
    onEndReached={(d) => {
      console.log("onEndReached", d.distanceFromEnd);
      if(page > 1){
      loadEvents();
      }
    }}
    onEndReachedThreshold={0.5}
    ListFooterComponent={loading && hasMore && <ActivityIndicator />}
  />
  </View>
)}
  {loading && hasMore && 
            <SafeAreaView className="absolute left-0 right-0 mb-[20%] bottom-0 items-center justify-center ">
        <ActivityIndicator size="large" color="#000080"/>
      </SafeAreaView>
  
  }
      
       
    </View>
  );
}
