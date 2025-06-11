import React ,{ useEffect, useState } from "react";
import {
  View,
  FlatList,
  TouchableOpacity,
  Image,
  RefreshControl,
} from "react-native";
import { router } from "expo-router";
import { Text } from "~/src/components/ui/text";
import { MapLocation } from "~/hooks/useMapEvents";
import { supabase } from "~/src/lib/supabase";

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
  refreshControl?: React.ReactElement;
}

export default function EventList({ userId, refreshControl }: EventListProps) {
 const [events, setEvents] = useState<MapLocation[]>([]);
 const fetchEvents = async () => {
    try {
      const { data, error } = await supabase
        .from("events")
        .select(
          `
          *
        `
        )
        .eq("created_by", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setEvents(data || []);
    } catch (error) {
      console.error("Error fetching create events:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [userId]);
 
 
  const renderItem = ({ item: event }: { item: event }) => (
    <TouchableOpacity
      className="w-1/3 aspect-square p-0.5"
      onPress={() => router.push(`/post/${event.id}`)}
    >
      {event.media_urls && event.media_urls.length > 0 ? (
        <Image
          source={{ uri: event.media_urls[0] }}
          className="w-full h-full"
          resizeMode="cover"
        />
      ) : (
        <View className="w-full h-full bg-muted justify-center items-center">
          <View className="p-2">
            <Text
              className="text-xs text-center text-muted-foreground"
              numberOfLines={3}
            >
              {event.name}
            </Text>
          </View>
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <FlatList
      data={events}
      renderItem={renderItem}
      keyExtractor={(item) => item.id}
      numColumns={3}
  
      className="flex-1"
    />
  );
}
