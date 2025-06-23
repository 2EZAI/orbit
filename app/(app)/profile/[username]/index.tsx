import React, { useEffect, useState } from "react";
import { View, ScrollView, 
TouchableOpacity, Image,Pressable } from "react-native";
import { Text } from "~/src/components/ui/text";
import { useLocalSearchParams, useRouter } from "expo-router";
import { supabase } from "~/src/lib/supabase";
import { UserAvatar } from "~/src/components/ui/user-avatar";
import { Button } from "~/src/components/ui/button";
import { MapEvent } from "~/hooks/useMapEvents";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "~/src/lib/auth";
import Toast from "react-native-toast-message";
import PostsTab from "~/src/components/profile/PostsTab";
import EventsTab from "~/src/components/profile/EventsTab";
import InfoTabOtherUser from "~/src/components/profile/InfoTabOtherUser";
import { EventDetailsSheet } from "~/src/components/map/EventDetailsSheet";
import { LocationDetailsSheet } from "~/src/components/map/LocationDetailsSheet";

type Tab = "Events" | "Posts" | "Info";

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



export default function ProfilePage() {
  const { session } = useAuth();
  const { username } = useLocalSearchParams();
   const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [isEvent, setIsEvent] = useState(false);
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("Posts");
  const [userEvents, setUserEvents] = useState<MapEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFollowed, setIsFollowed] = useState(false);

  useEffect(() => {
    fetchUserProfile();
  }, [username]);

  const isUserFollowing = async (followerId: string, followingId: string) => {
    const { data, error } = await supabase
      .from("follows")
      .select("id") // or any minimal field
      .eq("follower_id", followerId)
      .eq("following_id", followingId)
      .maybeSingle();

    if (error) throw error;
    console.log("data>>", !!data);
    setIsFollowed(!!data);
    return !!data; // returns true if relationship exists
  };


const renderTabContent = () => {
    switch (activeTab) {
      case "Posts":
        return username ? <PostsTab userId={username} /> : null;
      case "Events":
        return username ? (
          <EventsTab
            userId_={username}
            selectedItem_={(selectedItem,locationDetail) => {
              // console.log("locationDetail>",locationDetail);
              //  console.log("selectedItem>",selectedItem);
              if (
                locationDetail &&
                selectedItem?.static_location &&
                (selectedItem?.type === "static" ||
                  selectedItem?.type === "googleApi")
              ) {
                setSelectedEvent(selectedItem.static_location);
                setIsEvent(false);
              } else {
                setSelectedEvent(selectedItem);
                setIsEvent(true);
              }
            }}
          />
        ) : null;

      case "Info":
       return username? (
          <InfoTabOtherUser
            userId_={username}
          
          />
        ) : null;
    }
  };


  const fetchUserProfile = async () => {
    try {
      console.error("username>>:", username);

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
        // .eq("username", username)
        .eq("id", username)
        .single();
      // console.error("fetchUserProfile:2");
      if (userError) throw userError;
      // console.error("fetchUserProfile:3");
      // Get counts
      const [
        { count: followersCount },
        { count: eventsCount },
        { count: orbitsCount },
      ] = await Promise.all([
        supabase
          .from("follows")
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
      // console.error("fetchUserProfile:4");
      setProfile({
        ...userData,
        followers_count: followersCount || 0,
        events_count: eventsCount || 0,
        orbits_count: orbitsCount || 0,
      });

      let existing = isUserFollowing(session.user.id, userData.id);

      // Fetch user's events
      console.log("userData.id>", userData.id);
      const { data: events } = await supabase
        .from("events")
        .select(
          `
          *,
          created_by:created_by (
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
          `created_by.eq.${userData.id},event_attendees.user_id.eq.${userData.id}`
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
      console.log("events>>>", events);
    } catch (error) {
      console.error("Error fetching profile:", error);
      setProfile({
        ...userData,
        followers_count: 0,
        events_count: 0,
        orbits_count: 0,
      });
      setIsLoading(false);
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

  const updateFollowStatus = async () => {
    if (!session?.user.id || !profile?.id) return;

    try {
      if (isFollowed) {
        // Step 2a: If relationship exists, delete it (unfollow)
        const { error: deleteError } = await supabase
          .from("follows")
          .delete()
          .eq("follower_id", session.user.id)
          .eq("following_id", profile.id);

        console.log("delete>", session.user.id + " " + profile.id);
        if (deleteError) throw deleteError;

        Toast.show({
          type: "info",
          text1: "User unfollowed",
        });
      } else {
        // Step 2b: If relationship does not exist, insert it (follow)
        const { error: insertError } = await supabase.from("follows").insert([
          {
            follower_id: session.user.id,
            following_id: profile.id,
          },
        ]);
        console.log("insert>", session.user.id + " " + profile.id);
        if (insertError) throw insertError;

        Toast.show({
          type: "success",
          text1: "User followed successfully",
        });
      }
      let existing = isUserFollowing(session.user.id, profile.id);
      fetchUserProfile();
    } catch (err) {
      console.error("Error updating follow status:", err);
      Toast.show({
        type: "error",
        text1: "Something went wrong",
      });
    }
  };

  return (
    <SafeAreaView className="flex-1">
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

          {/* <Button className="w-full" variant="outline">
        //   <Text>Message</Text>
         </Button>*/}
          <TouchableOpacity
            className="w-[30%]  bg-primary rounded-lg self-end"
            onPress={() => updateFollowStatus()}
          >
            <Text className="text-white text-center p-1">{isFollowed ? "UnFollow" : "Follow"}</Text>
          </TouchableOpacity>
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
      

      {/* Tab Content */}
      <View className="flex-1 mt-4">{renderTabContent()}</View>
      {selectedEvent && isEvent && (
        <EventDetailsSheet
          event={selectedEvent}
          isOpen={!!selectedEvent}
          onClose={() => setSelectedEvent(null)}
          // nearbyEvents={events}
          onEventSelect={setSelectedEvent}
          onShowControler={() => {}}
        />
      )}
      {selectedEvent && !isEvent && (
        <LocationDetailsSheet
          event={selectedEvent}
          isOpen={!!selectedEvent}
          onClose={() => setSelectedEvent(null)}
          // nearbyEvents={events}
          onShowControler={() => {}}
        />
      )}
 
       
      </View>
    </SafeAreaView>
  );
}
