import React, { useEffect, useState } from "react";
import { View, ScrollView, TouchableOpacity, Image } from "react-native";
import { Text } from "~/src/components/ui/text";
import { useLocalSearchParams, useRouter } from "expo-router";
import { supabase } from "~/src/lib/supabase";
import { UserAvatar } from "~/src/components/ui/user-avatar";
import { Button } from "~/src/components/ui/button";
import { MapEvent } from "~/hooks/useMapEvents";
import { EventDetailsSheet } from "~/src/components/map/EventDetailsSheet";

type UserProfile = {
  id: string;
  username: string;
  first_name: string;
  last_name: string;
  avatar_url: string | null;
  bio: string | null;
  followers_count: number;
  events_count: number;
  orbits_count: number;
};

type TabType = "posts" | "events" | "info";

export default function ProfilePage() {
  const { username } = useLocalSearchParams();
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>("posts");
  const [userEvents, setUserEvents] = useState<MapEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<MapEvent | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchUserProfile();
  }, [username]);

  const fetchUserProfile = async () => {
    try {
      // Fetch user profile
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select(
          `
          id,
          username,
          first_name,
          last_name,
          avatar_url,
          bio
        `
        )
        .eq("username", username)
        .single();

      if (userError) throw userError;

      // Get counts
      const [
        { count: followersCount },
        { count: eventsCount },
        { count: orbitsCount },
      ] = await Promise.all([
        supabase
          .from("followers")
          .select("*", { count: "exact" })
          .eq("following_id", userData.id),
        supabase
          .from("event_attendees")
          .select("*", { count: "exact" })
          .eq("user_id", userData.id),
        supabase
          .from("channel_members")
          .select("*", { count: "exact" })
          .eq("user_id", userData.id),
      ]);

      setProfile({
        ...userData,
        followers_count: followersCount || 0,
        events_count: eventsCount || 0,
        orbits_count: orbitsCount || 0,
      });

      // Fetch user's events
      const { data: events } = await supabase
        .from("events")
        .select(
          `
          *,
          created_by:created_by_id (
            id,
            username,
            first_name,
            last_name,
            avatar_url
          ),
          event_attendees (
            user_id,
            users (
              id,
              avatar_url,
              first_name,
              last_name
            )
          ),
          event_topics (
            topics (
              id,
              name,
              icon
            )
          )
        `
        )
        .or(
          `created_by_id.eq.${userData.id},event_attendees.user_id.eq.${userData.id}`
        )
        .order("start_datetime", { ascending: true });

      if (events) {
        setUserEvents(
          events.map((event) => ({
            ...event,
            attendees: {
              count: event.event_attendees?.length || 0,
              profiles:
                event.event_attendees?.map((a: any) => ({
                  id: a.users.id,
                  avatar_url: a.users.avatar_url,
                  name: `${a.users.first_name} ${a.users.last_name}`.trim(),
                })) || [],
            },
            categories:
              event.event_topics?.map((t: any) => ({
                id: t.topics?.id,
                name: t.topics?.name,
                icon: t.topics?.icon,
              })) || [],
          }))
        );
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading || !profile) {
    return (
      <View className="items-center justify-center flex-1">
        <Text>Loading profile...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      {/* Profile Header */}
      <View className="p-4">
        <View className="flex-row items-center mb-4">
          <UserAvatar
            user={{
              id: profile.id,
              name: `${profile.first_name} ${profile.last_name}`,
              image: profile.avatar_url,
            }}
            size={80}
          />
          <View className="flex-1 ml-4">
            <Text className="text-2xl font-semibold">
              {profile.first_name} {profile.last_name}
            </Text>
            <Text className="text-muted-foreground">@{profile.username}</Text>
          </View>
        </View>

        {profile.bio && (
          <Text className="mb-4 text-muted-foreground">{profile.bio}</Text>
        )}

        <View className="flex-row justify-between mb-4">
          <View className="items-center">
            <Text className="text-lg font-semibold">
              {profile.events_count}
            </Text>
            <Text className="text-muted-foreground">events</Text>
          </View>
          <View className="items-center">
            <Text className="text-lg font-semibold">
              {profile.followers_count}
            </Text>
            <Text className="text-muted-foreground">followers</Text>
          </View>
          <View className="items-center">
            <Text className="text-lg font-semibold">
              {profile.orbits_count}
            </Text>
            <Text className="text-muted-foreground">Orbits</Text>
          </View>
        </View>

        <Button className="w-full" variant="outline">
          <Text>Message</Text>
        </Button>
      </View>

      {/* Tabs */}
      <View className="flex-row border-b border-border">
        <TouchableOpacity
          className={`flex-1 py-3 ${
            activeTab === "posts" ? "border-b-2 border-primary" : ""
          }`}
          onPress={() => setActiveTab("posts")}
        >
          <Text
            className={`text-center ${
              activeTab === "posts"
                ? "text-primary font-medium"
                : "text-muted-foreground"
            }`}
          >
            Posts
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          className={`flex-1 py-3 ${
            activeTab === "events" ? "border-b-2 border-primary" : ""
          }`}
          onPress={() => setActiveTab("events")}
        >
          <Text
            className={`text-center ${
              activeTab === "events"
                ? "text-primary font-medium"
                : "text-muted-foreground"
            }`}
          >
            Events
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          className={`flex-1 py-3 ${
            activeTab === "info" ? "border-b-2 border-primary" : ""
          }`}
          onPress={() => setActiveTab("info")}
        >
          <Text
            className={`text-center ${
              activeTab === "info"
                ? "text-primary font-medium"
                : "text-muted-foreground"
            }`}
          >
            Info
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tab Content */}
      <ScrollView className="flex-1">
        {activeTab === "posts" && (
          <View className="p-4">
            <Text className="text-center text-muted-foreground">
              No posts yet
            </Text>
          </View>
        )}

        {activeTab === "events" && (
          <View>
            {userEvents.map((event) => (
              <TouchableOpacity
                key={event.id}
                onPress={() => setSelectedEvent(event)}
                className="p-4 border-b border-border"
              >
                <View className="flex-row">
                  <Image
                    source={{ uri: event.image_urls[0] }}
                    className="w-16 h-16 rounded-lg"
                  />
                  <View className="flex-1 ml-3">
                    <Text className="mb-1 font-medium">{event.name}</Text>
                    <Text className="text-sm text-muted-foreground">
                      {event.venue_name}
                    </Text>
                    <Text className="text-sm text-muted-foreground">
                      {event.attendees.count} attendees
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {activeTab === "info" && (
          <View className="p-4">
            <Text className="text-center text-muted-foreground">
              No additional info
            </Text>
          </View>
        )}
      </ScrollView>

      {selectedEvent && (
        <EventDetailsSheet
          event={selectedEvent}
          isOpen={!!selectedEvent}
          onClose={() => setSelectedEvent(null)}
          nearbyEvents={userEvents}
          onEventSelect={setSelectedEvent}
        />
      )}
    </View>
  );
}
