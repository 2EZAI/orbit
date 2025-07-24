import React, { useState, useEffect } from "react";
import { useRouter } from "expo-router";
import {
  View,
  FlatList,
  TouchableOpacity,
  Image,
  RefreshControl,
  ActivityIndicator,
  DeviceEventEmitter,
} from "react-native";
import { supabase } from "~/src/lib/supabase";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Text } from "~/src/components/ui/text";
import { useNotificationsApi } from "~/hooks/useNotificationsApi";
import { FeedEventCard } from "~/src/components/feed/FeedEventCard";
import { useChat } from "~/src/lib/chat";
import { DefaultGenerics, StreamChat } from "stream-chat";
import { useAuth } from "~/src/lib/auth";
let clientLocal: StreamChat<DefaultGenerics> | null = null;

export default function NotificationView() {
  const { session } = useAuth();
  const { client } = useChat();
  const PAGE_SIZE = 20;
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [isEvent, setIsEvent] = useState(false);
  const { fetchAllNoifications, readNoifications, NotificationResponse } =
    useNotificationsApi();
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [notifications, setNotifications] = useState<NotificationResponse>([]);

  useEffect(() => {
    loadNoifications();
  }, []);
  useEffect(() => {
    if (client && client.userID) {
      // console.log("client.userID >", client.userID);
      clientLocal = client;
      // console.log("clientL.userID >", clientLocal.userID);
    }
  }, [client]);

  const handleDeleteNotification = async (notificationId) => {
    try {
      const { error } = await supabase
        .from("notifications")
        .delete()
        .eq("id", notificationId);

      if (error) {
        console.error("Delete error:", error.message);
        return;
      }
      // Optionally refetch or update your local state
      console.log("Notification deleted");
      onRefresh();
    } catch (err) {
      console.error("Unexpected error:", err);
    }
  };

  const onRefresh = async () => {
    setLoading(true);
    setRefreshing(true);
    setHasMore(true);

    try {
      console.log("loadNoifications:");
      const response: NotificationResponse = await fetchAllNoifications(
        1,
        PAGE_SIZE
      );
      const data = response.notifications;
      // console.log("data>:", data);
      if (data.length < PAGE_SIZE) setHasMore(false); // stop if no more

      if (data.length === 0) {
        setLoading(false);
        setHasMore(false);
        console.error("Fetch error:", error);
      } else {
        setNotifications([]);
        setNotifications(data);
        setPage(2);
      }

      setLoading(false);
      updateEndReached();
    } catch (error) {
      console.error("Refresh failed:", error);
    } finally {
      setRefreshing(false);
    }
  };

  const loadNoifications = async () => {
    console.log("loadNoifications:>");
    if (loading || !hasMore) return; // 👈 prevent infinite
    setLoading(true);

    console.log("loadNoifications:");
    const response: NotificationResponse = await fetchAllNoifications(
      page,
      PAGE_SIZE
    );
    const data = response.notifications;
    // console.log("data>:", data);
    if (data.length < PAGE_SIZE) setHasMore(false); // stop if no more

    if (data.length === 0) {
      setLoading(false);
      setHasMore(false);
      console.error("Fetch error:", error);
    } else {
      setNotifications((prev) => [...prev, ...data]);
      setPage((prev) => prev + 1);
    }

    setLoading(false);
    updateEndReached();
  };
  const updateEndReached = () => {};

  const handleNotificationClick = (item: NotificationResponse) => {
    // console.log("item>", item);
    readNoificationsApi(item?.id);
    if (item?.data?.type === "comment" || item?.data?.type === "like") {
      // console.log("post_id>", item?.data.post_id);
      hitApiPostDetail(item?.data.post_id);
    }
    if (
      item?.data?.type === "event_reminder_60" ||
      item?.data?.type === "event_reminder_5" ||
      item?.data?.type === "event_started"
    ) {
      const eventId = item?.data.event_id;
      const isTicketmaster = item?.data.is_ticketmaster;
      // console.log("eventId>", eventId);
      // console.log("is_ticketmaster>", isTicketmaster);
      fetchEventDetail(eventId, isTicketmaster);
      // fetchEventDetail("88f252e9-bc5a-4746-857e-859322cdd225"
      // ,false);
    }
    if (
      item?.data?.type === "friend_request" ||
      item?.data?.type === "friend_request_back"
    ) {
      // fetchEventDetail("88f252e9-bc5a-4746-857e-859322cdd225"
      // ,false);

      // console.log("user_id>", item?.data?.user_id);
      router.push({
        pathname: "/(app)/profile/[username]",
        params: { username: item?.data?.user_id },
      });
    }
    if (
      item?.data?.type === "new_chat" ||
      item?.data?.type === "new_group_chat" ||
      item?.data?.type === "new_group_message" ||
      item?.data?.type === "new_message"
    ) {
      // fetchEventDetail("88f252e9-bc5a-4746-857e-859322cdd225"
      // ,false);

      const groupName = item?.data?.group_name;
      const chatId = item?.data?.chat_id;
      const streamChanneld = item?.data?.stream_channel_id;
      const ids = item?.data?.member_ids;
      const senderId = item?.data?.sender_id;

      prepareChanel(groupName, chatId, ids, senderId, streamChanneld);
    }
  };

  const readNoificationsApi = async (notifId: string) => {
    console.log("readNoificationsApi:>");
    try {
      if (!session) return;
      const response = await readNoifications(notifId);
      onRefresh();
    } catch (error) {
      console.error("Error fetching read notification:", error);
    }
  };

  const prepareChanel = async (
    groupName: string,
    chatId: string,
    ids: string[],
    senderId: string,
    streamChannelId: string
  ) => {
    // console.log("clientL.userID prepareChanel>", clientLocal?.userID);
    if (!clientLocal?.userID || ids.length === 0) {
      console.log("Prerequisites not met, returning early");
      return;
    }
    const memberIds = [senderId, ...ids.map((u) => u)];
    // console.log("Member IDs:", memberIds);

    const channel = clientLocal.channel("messaging", streamChannelId, {
      members: memberIds,
      name: groupName,
    });

    // This both creates the channel and subscribes to it
    console.log("[NewChat] Watching channel...");
    await channel.watch();

    setTimeout(() => {
      router.push({
        pathname: "/(app)/(chat)/channel/[id]",
        params: {
          id: streamChannelId,
          name: groupName,
        },
      });
    }, 200);
  };

  // fetch event detail
  const fetchEventDetail = async (eventId: string, isTicketmaster: boolean) => {
    try {
      if (!session) throw new Error("No user logged in");

      const requestData = {
        source: isTicketmaster ? "ticketmaster" : "supabase",
      };
      const response = await fetch(
        `${process.env.BACKEND_MAP_URL}/api/events/${eventId}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify(requestData),
        }
      );
      // console.log("session.access_token>>",
      // session.access_token);
      // console.log("requestData>fetchEvent", requestData);
      if (!response.ok) {
        throw new Error(await response.text());
      }
      const data = await response.json();
      // console.log("event data", data);
      router.replace("/(app)/(map)");
      const mapEvent = {
        id: data?.id,
        name: data?.name,
        description: data?.description,
        start_datetime: data?.start_datetime,
        end_datetime: data?.end_datetime,
        venue_name: data?.venue_name,
        location: data?.location, // Assuming it's already a Location object
        address: data?.address,
        image_urls: data?.image_urls,
        distance: data?.distance,
        attendees: {
          count: data?.attendees?.count,
          profiles: data?.attendees?.profiles,
        },
        categories: data?.categories,
        type: data?.type,
        created_by: data?.created_by,
        static_location: data?.static_location,
      };

      DeviceEventEmitter.emit("eventNotification", mapEvent);
    } catch (e) {
      console.log(e instanceof Error ? e : new Error("An error occurred"));
      throw e;
    }
  };

  const hitApiPostDetail = async (postId: string) => {
    try {
      if (!session) return;
      const response = await fetch(
        `${process.env.BACKEND_MAP_URL}/api/posts/detail/${postId}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          // body: JSON.stringify(eventData),
        }
      );

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const postDetail = await response.json();
      // console.log("postDetail>", postDetail);
      router.push({
        pathname: `/post/${postId}`,
        params: {
          event: postDetail?.data?.event
            ? JSON.stringify(postDetail?.data?.event)
            : "",
        },
      });
    } catch (error) {
      console.error("Error fetching post details:", error);
    }
  };

  return (
    <SafeAreaView>
      <View>
        {!loading && notifications?.length > 0 && (
          <FlatList
            data={notifications}
            className=" mb-20"
            keyExtractor={(item, index) => `${item.id}-${index}`}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            renderItem={({ item, index }) => {
              const opacityClass = item?.is_read ? "opacity-500" : "opacity-20";
              return (
                <View
                  className={`flex-row items-center justify-between overflow-hidden mx-4 mb-4 p-4 rounded-3xl border border-border ${opacityClass}`}
                >
                  {/* Touchable notification content */}
                  <TouchableOpacity
                    onPress={() => handleNotificationClick(item)}
                    className="flex-1 pr-2"
                  >
                    <View>
                      <Text className="font-medium text-black">
                        {item?.title}
                      </Text>
                      <Text className="text-black">{item?.body}</Text>
                    </View>
                  </TouchableOpacity>

                  {/* Delete button */}
                  <TouchableOpacity
                    onPress={() => handleDeleteNotification(item?.id)}
                    className="pl-2"
                  >
                    <Text className="text-red-500 font-bold">Delete</Text>
                  </TouchableOpacity>
                </View>
              );
            }}
            onEndReached={(d) => {
              console.log("onEndReached", d.distanceFromEnd);
              loadNoifications();
            }}
            onEndReachedThreshold={0.5}
            ListFooterComponent={loading && hasMore && <ActivityIndicator />}
          />
        )}
        {loading && hasMore && (
          <View className="absolute left-0 right-0 top-0 items-center justify-center ">
            <ActivityIndicator size="large" color="#000080" />
          </View>
        )}
        {notifications?.length <= 0 && (
          <View className="mt-[50%] items-center justify-center">
            <Text className="text-primary">No notifications found</Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}
