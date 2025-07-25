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
  Alert,
} from "react-native";
import { supabase } from "~/src/lib/supabase";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Text } from "~/src/components/ui/text";
import { Button } from "~/src/components/ui/button";
import {
  useNotificationsApi,
  Notification,
  NotificationResponse,
} from "~/hooks/useNotificationsApi";
import { FeedEventCard } from "~/src/components/feed/FeedEventCard";
import { useChat } from "~/src/lib/chat";
import { DefaultGenerics, StreamChat } from "stream-chat";
import { useAuth } from "~/src/lib/auth";
import { GestureDetector, Gesture } from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from "react-native-reanimated";
import {
  ArrowLeft,
  Trash2,
  Check,
  CheckCheck,
  Bell,
  MessageCircle,
  Heart,
  Calendar,
  Users,
  User,
} from "lucide-react-native";

let clientLocal: StreamChat<DefaultGenerics> | null = null;

interface NotificationCardProps {
  item: Notification;
  index: number;
  onPress: (item: Notification) => void;
  onDelete: (id: string) => void;
}

const NotificationCard: React.FC<NotificationCardProps> = ({
  item,
  index,
  onPress,
  onDelete,
}) => {
  const translateX = useSharedValue(0);
  const scale = useSharedValue(1);

  const getNotificationIcon = () => {
    const type = item?.data?.type;
    const iconProps = {
      size: 20,
      color: item.is_read ? "#9CA3AF" : "#3B82F6",
    };

    switch (type) {
      case "comment":
      case "new_message":
      case "new_chat":
      case "new_group_chat":
      case "new_group_message":
        return <MessageCircle {...iconProps} />;
      case "like":
        return <Heart {...iconProps} />;
      case "friend_request":
      case "friend_request_back":
        return <User {...iconProps} />;
      case "event_reminder_60":
      case "event_reminder_5":
      case "event_started":
        return <Calendar {...iconProps} />;
      default:
        return <Bell {...iconProps} />;
    }
  };

  const gesture = Gesture.Pan()
    .onUpdate((e) => {
      translateX.value = e.translationX;
    })
    .onEnd((e) => {
      if (e.translationX < -100) {
        // Swipe left to delete
        translateX.value = withTiming(-300, { duration: 200 });
        scale.value = withTiming(0, { duration: 200 }, () => {
          runOnJS(onDelete)(item.id);
        });
      } else {
        // Return to original position
        translateX.value = withSpring(0);
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }, { scale: scale.value }],
  }));

  const deleteButtonStyle = useAnimatedStyle(() => ({
    opacity: translateX.value < -50 ? 1 : 0,
    transform: [{ translateX: translateX.value + 100 }],
  }));

  return (
    <View className="mx-4 mb-3">
      <GestureDetector gesture={gesture}>
        <Animated.View style={animatedStyle}>
          <TouchableOpacity
            onPress={() => onPress(item)}
            className={`relative overflow-hidden rounded-2xl border ${
              item.is_read
                ? "bg-gray-50 border-gray-200 opacity-75"
                : "bg-white border-blue-200 shadow-sm"
            }`}
          >
            {/* Unread indicator */}
            {!item.is_read && (
              <View className="absolute top-0 bottom-0 left-0 w-1 bg-blue-500" />
            )}

            <View className="flex-row items-start p-4">
              {/* Icon */}
              <View
                className={`w-10 h-10 rounded-full items-center justify-center mr-3 ${
                  item.is_read ? "bg-gray-100" : "bg-blue-50"
                }`}
              >
                {getNotificationIcon()}
              </View>

              {/* Content */}
              <View className="flex-1">
                <Text
                  className={`font-semibold text-base ${
                    item.is_read ? "text-gray-600" : "text-gray-900"
                  }`}
                >
                  {item.title}
                </Text>
                <Text
                  className={`text-sm mt-1 ${
                    item.is_read ? "text-gray-500" : "text-gray-700"
                  }`}
                >
                  {item.body}
                </Text>
                <Text className="mt-2 text-xs text-gray-400">
                  {new Date(item.created_at).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </Text>
              </View>

              {/* Status indicator */}
              <View className="ml-2">
                {item.is_read ? (
                  <CheckCheck size={16} color="#9CA3AF" />
                ) : (
                  <View className="w-2 h-2 bg-blue-500 rounded-full" />
                )}
              </View>
            </View>
          </TouchableOpacity>
        </Animated.View>
      </GestureDetector>

      {/* Delete button behind */}
      <Animated.View
        style={[deleteButtonStyle]}
        className="absolute top-0 bottom-0 right-4 justify-center"
      >
        <View className="p-3 bg-red-500 rounded-full">
          <Trash2 size={20} color="white" />
        </View>
      </Animated.View>
    </View>
  );
};

export default function NotificationView() {
  const { session } = useAuth();
  const { client } = useChat();
  const PAGE_SIZE = 20;
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [isEvent, setIsEvent] = useState(false);
  const { fetchAllNoifications, readNoifications } = useNotificationsApi();
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    loadNotifications();
  }, []);

  useEffect(() => {
    if (client && client.userID) {
      console.log("client.userID >", client.userID);
      clientLocal = client;
      console.log("clientL.userID >", clientLocal.userID);
    }
  }, [client]);

  const handleDeleteNotification = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from("notifications")
        .delete()
        .eq("id", notificationId);

      if (error) {
        console.error("Delete error:", error.message);
        return;
      }

      // Update local state
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
      console.log("Notification deleted");
    } catch (err) {
      console.error("Unexpected error:", err);
    }
  };

  const handleClearAll = () => {
    Alert.alert(
      "Clear All Notifications",
      "Are you sure you want to delete all notifications? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear All",
          style: "destructive",
          onPress: clearAllNotifications,
        },
      ]
    );
  };

  const clearAllNotifications = async () => {
    try {
      const { error } = await supabase
        .from("notifications")
        .delete()
        .eq("user_id", session?.user?.id);

      if (error) {
        console.error("Clear all error:", error.message);
        return;
      }

      setNotifications([]);
      setUnreadCount(0);
      console.log("All notifications cleared");
    } catch (err) {
      console.error("Clear all error:", err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", session?.user?.id)
        .eq("is_read", false);

      if (error) {
        console.error("Mark all read error:", error.message);
        return;
      }

      // Update local state
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
      console.log("All notifications marked as read");
    } catch (err) {
      console.error("Mark all read error:", err);
    }
  };

  const onRefresh = async () => {
    setLoading(true);
    setRefreshing(true);
    setHasMore(true);

    try {
      console.log("loadNotifications:");
      const response: NotificationResponse = await fetchAllNoifications(
        1,
        PAGE_SIZE
      );
      const data = response.notifications;
      console.log("data>:", data);

      if (data.length < PAGE_SIZE) setHasMore(false);

      setNotifications(data);
      setUnreadCount(response.meta?.unreadCount || 0);
      setPage(2);
      setLoading(false);
    } catch (error) {
      console.error("Refresh failed:", error);
      setLoading(false);
    } finally {
      setRefreshing(false);
    }
  };

  const loadNotifications = async () => {
    console.log("loadNotifications:>");
    if (loading || !hasMore) return;
    setLoading(true);

    try {
      console.log("loadNotifications:");
      const response: NotificationResponse = await fetchAllNoifications(
        page,
        PAGE_SIZE
      );
      const data = response.notifications;
      console.log("data>:", data);

      if (data.length < PAGE_SIZE) setHasMore(false);

      if (data.length === 0) {
        setLoading(false);
        setHasMore(false);
      } else {
        setNotifications((prev: Notification[]) => [...prev, ...data]);
        setUnreadCount(response.meta?.unreadCount || 0);
        setPage((prev) => prev + 1);
      }

      setLoading(false);
    } catch (error) {
      console.error("Load notifications failed:", error);
      setLoading(false);
    }
  };

  const handleNotificationClick = (item: Notification) => {
    console.log("item>", item);

    // Mark as read if not already read
    if (!item.is_read) {
      readNotificationsApi(item.id);
      // Update local state
      setNotifications((prev) =>
        prev.map((n) => (n.id === item.id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }

    if (item?.data?.type === "comment" || item?.data?.type === "like") {
      console.log("post_id>", item?.data.post_id);
      if (item?.data?.post_id) {
        hitApiPostDetail(item.data.post_id);
      }
    }

    if (
      item?.data?.type === "event_reminder_60" ||
      item?.data?.type === "event_reminder_5" ||
      item?.data?.type === "event_started"
    ) {
      const eventId = item?.data.event_id;
      const isTicketmaster = item?.data.is_ticketmaster;
      console.log("eventId>", eventId);
      console.log("is_ticketmaster>", isTicketmaster);
      if (eventId && typeof isTicketmaster === "boolean") {
        fetchEventDetail(eventId, isTicketmaster);
      }
    }

    if (
      item?.data?.type === "friend_request" ||
      item?.data?.type === "friend_request_back"
    ) {
      console.log("user_id>", item?.data?.user_id);
      if (item?.data?.user_id) {
        router.push({
          pathname: "/(app)/profile/[username]",
          params: { username: item.data.user_id },
        });
      }
    }

    if (
      item?.data?.type === "new_chat" ||
      item?.data?.type === "new_group_chat" ||
      item?.data?.type === "new_group_message" ||
      item?.data?.type === "new_message"
    ) {
      const groupName = item?.data?.group_name;
      const chatId = item?.data?.chat_id;
      const streamChanneld = item?.data?.stream_channel_id;
      const ids = item?.data?.member_ids;
      const senderId = item?.data?.sender_id;

      if (groupName && chatId && streamChanneld && ids && senderId) {
        prepareChanel(groupName, chatId, ids, senderId, streamChanneld);
      }
    }
  };

  const readNotificationsApi = async (notifId: string) => {
    console.log("readNotificationsApi:>");
    try {
      if (!session) return;
      const response = await readNoifications(notifId);
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
    console.log("clientL.userID prepareChanel>", clientLocal?.userID);
    if (!clientLocal?.userID || ids.length === 0) {
      console.log("Prerequisites not met, returning early");
      return;
    }
    const memberIds = [senderId, ...ids.map((u) => u)];
    console.log("Member IDs:", memberIds);

    const channel = clientLocal.channel("messaging", streamChannelId, {
      members: memberIds,
      name: groupName,
    });

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

      console.log("requestData>fetchEvent", requestData);
      if (!response.ok) {
        throw new Error(await response.text());
      }
      const data = await response.json();
      console.log("event data", data);
      router.replace("/(app)/(map)");
      const mapEvent = {
        id: data?.id,
        name: data?.name,
        description: data?.description,
        start_datetime: data?.start_datetime,
        end_datetime: data?.end_datetime,
        venue_name: data?.venue_name,
        location: data?.location,
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
        }
      );

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const postDetail = await response.json();
      console.log("postDetail>", postDetail);
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

  const renderEmptyState = () => (
    <View className="flex-1 justify-center items-center px-8 py-16">
      <View className="justify-center items-center mb-6 w-20 h-20 bg-gray-100 rounded-full">
        <Bell size={32} color="#9CA3AF" />
      </View>
      <Text className="mb-2 text-xl font-semibold text-gray-900">
        No notifications yet
      </Text>
      <Text className="leading-6 text-center text-gray-500">
        When you receive notifications, they'll appear here. Stay tuned for
        updates from your friends and events!
      </Text>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="px-4 py-3 bg-white border-b border-gray-200">
        <View className="flex-row justify-between items-center">
          <View className="flex-row items-center">
            <TouchableOpacity onPress={() => router.back()} className="mr-3">
              <ArrowLeft size={24} color="#000" />
            </TouchableOpacity>
            <Text className="text-xl font-bold">Notifications</Text>
            {!!(unreadCount > 0) && (
              <View className="ml-2 bg-blue-500 rounded-full px-2 py-1 min-w-[20px] items-center">
                <Text className="text-xs font-bold text-white">
                  {unreadCount > 99 ? "99+" : String(unreadCount)}
                </Text>
              </View>
            )}
          </View>

          <View className="flex-row gap-2">
            {notifications.length > 0 && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onPress={handleMarkAllRead}
                  className="px-3"
                >
                  <Check size={16} color="#3B82F6" />
                  <Text className="ml-1 font-medium text-blue-600">
                    Mark All Read
                  </Text>
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onPress={handleClearAll}
                  className="px-3"
                >
                  <Trash2 size={16} color="#EF4444" />
                  <Text className="ml-1 font-medium text-red-500">
                    Clear All
                  </Text>
                </Button>
              </>
            )}
          </View>
        </View>
      </View>

      {/* Content */}
      <View className="flex-1">
        {notifications.length === 0 && !loading ? (
          renderEmptyState()
        ) : (
          <FlatList
            data={notifications}
            className="flex-1"
            keyExtractor={(item, index) => `${item.id}-${index}`}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            renderItem={({ item, index }) => (
              <NotificationCard
                item={item}
                index={index}
                onPress={handleNotificationClick}
                onDelete={handleDeleteNotification}
              />
            )}
            onEndReached={() => {
              if (!loading && hasMore) {
                loadNotifications();
              }
            }}
            onEndReachedThreshold={0.5}
            ListFooterComponent={
              loading && hasMore ? (
                <View className="py-4">
                  <ActivityIndicator size="small" color="#3B82F6" />
                </View>
              ) : null
            }
            contentContainerStyle={
              notifications.length === 0 ? { flex: 1 } : { paddingVertical: 16 }
            }
            ItemSeparatorComponent={() => <View className="h-1" />}
          />
        )}

        {loading && notifications.length === 0 && (
          <View className="flex-1 justify-center items-center">
            <ActivityIndicator size="large" color="#3B82F6" />
            <Text className="mt-4 text-gray-500">Loading notifications...</Text>
          </View>
        )}
      </View>

      {/* Swipe hint for first notification */}
      {notifications.length > 0 && !notifications[0]?.is_read && (
        <View className="absolute right-4 left-4 bottom-20">
          <View className="px-4 py-2 bg-blue-500 rounded-lg shadow-lg">
            <Text className="text-sm text-center text-white">
              💡 Swipe left on notifications to delete them
            </Text>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}
