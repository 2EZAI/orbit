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
import { router ,useLocalSearchParams} from "expo-router";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
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
import { useTheme } from "~/src/components/ThemeProvider";

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
  const { theme, isDarkMode } = useTheme();
  const translateX = useSharedValue(0);
  const scale = useSharedValue(1);

  const getNotificationIcon = () => {
    const type = item?.data?.type;
    const iconProps = {
      size: 22,
      color: item.is_read
        ? isDarkMode
          ? "#9CA3AF"
          : "#6B7280"
        : theme.colors.primary,
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
    <View style={{ marginHorizontal: 16, marginBottom: 12 }}>
      <GestureDetector gesture={gesture}>
        <Animated.View style={animatedStyle}>
          <TouchableOpacity
            onPress={() => onPress(item)}
            style={{
              backgroundColor: theme.colors.card,
              borderRadius: 20,
              borderWidth: 2,
              borderColor: item.is_read
                ? isDarkMode
                  ? "rgba(139, 92, 246, 0.2)"
                  : "rgba(139, 92, 246, 0.15)"
                : theme.colors.primary + "40",
              shadowColor: item.is_read ? "transparent" : theme.colors.primary,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: item.is_read ? 0 : 0.15,
              shadowRadius: 12,
              elevation: item.is_read ? 0 : 6,
              overflow: "hidden",
              opacity: item.is_read ? 0.8 : 1,
            }}
          >
            {/* Unread indicator */}
            {!item.is_read && (
              <View
                style={{
                  position: "absolute",
                  top: 0,
                  bottom: 0,
                  left: 0,
                  width: 4,
                  backgroundColor: theme.colors.primary,
                  borderTopLeftRadius: 18,
                  borderBottomLeftRadius: 18,
                }}
              />
            )}

            <View
              style={{
                flexDirection: "row",
                alignItems: "flex-start",
                padding: 20,
              }}
            >
              {/* Icon */}
              <View
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  backgroundColor: item.is_read
                    ? isDarkMode
                      ? "rgba(139, 92, 246, 0.2)"
                      : "rgba(139, 92, 246, 0.15)"
                    : theme.colors.primary + "20",
                  justifyContent: "center",
                  alignItems: "center",
                  marginRight: 16,
                  borderWidth: 2,
                  borderColor: item.is_read
                    ? "transparent"
                    : theme.colors.primary + "30",
                }}
              >
                {getNotificationIcon()}
              </View>

              {/* Content */}
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: "700",
                    color: item.is_read
                      ? theme.colors.text + "CC"
                      : theme.colors.text,
                    marginBottom: 4,
                    lineHeight: 22,
                  }}
                >
                  {item.title}
                </Text>
                <Text
                  style={{
                    fontSize: 14,
                    color: item.is_read
                      ? theme.colors.text + "99"
                      : theme.colors.text + "DD",
                    lineHeight: 20,
                    marginBottom: 8,
                  }}
                >
                  {item.body}
                </Text>
                <Text
                  style={{
                    fontSize: 12,
                    color: theme.colors.text + "77",
                    fontWeight: "500",
                  }}
                >
                  {new Date(item.created_at).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </Text>
              </View>

              {/* Status indicator */}
              <View
                style={{
                  marginLeft: 12,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {item.is_read ? (
                  <View
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: 12,
                      backgroundColor: isDarkMode
                        ? "rgba(156, 163, 175, 0.3)"
                        : "rgba(107, 114, 128, 0.2)",
                      justifyContent: "center",
                      alignItems: "center",
                    }}
                  >
                    <CheckCheck
                      size={14}
                      color={isDarkMode ? "#9CA3AF" : "#6B7280"}
                    />
                  </View>
                ) : (
                  <View
                    style={{
                      width: 12,
                      height: 12,
                      borderRadius: 6,
                      backgroundColor: theme.colors.primary,
                      shadowColor: theme.colors.primary,
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.5,
                      shadowRadius: 4,
                      elevation: 3,
                    }}
                  />
                )}
              </View>
            </View>
          </TouchableOpacity>
        </Animated.View>
      </GestureDetector>

      {/* Delete button behind */}
      <Animated.View
        style={[
          deleteButtonStyle,
          {
            position: "absolute",
            top: 0,
            bottom: 0,
            right: 16,
            justifyContent: "center",
            alignItems: "center",
          },
        ]}
      >
        <View
          style={{
            width: 56,
            height: 56,
            borderRadius: 28,
            backgroundColor: isDarkMode ? "#DC2626" : "#EF4444",
            justifyContent: "center",
            alignItems: "center",
            shadowColor: isDarkMode ? "#DC2626" : "#EF4444",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 6,
          }}
        >
          <Trash2 size={24} color="white" />
        </View>
      </Animated.View>
    </View>
  );
};

export default function NotificationView() {
  const { theme, isDarkMode } = useTheme();
  const {from} =  useLocalSearchParams();

  const { session } = useAuth();
  const { client } = useChat();
  const insets = useSafeAreaInsets();
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
    console.log('params:', from); 
      
  useEffect(() => {

    loadNotifications();
  }, []);

  useEffect(() => {
    if (client && client.userID) {
      // console.log("client.userID >", client.userID);
      clientLocal = client;
      // console.log("clientL.userID >", clientLocal.userID);
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

    console.log("[NewChat] Watching channel...");
    await channel.watch();

    setTimeout(() => {
      router.push({
        pathname: "/(app)/(chat)/channel/[id]",
        params: {
          id: streamChannelId,
          name: groupName,
          from:from,
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
      // console.log("event data", data);
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

  const renderEmptyState = () => (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: 32,
        paddingVertical: 64,
      }}
    >
      <View
        style={{
          width: 120,
          height: 120,
          borderRadius: 60,
          backgroundColor: isDarkMode
            ? "rgba(139, 92, 246, 0.15)"
            : "rgba(139, 92, 246, 0.1)",
          justifyContent: "center",
          alignItems: "center",
          marginBottom: 32,
          borderWidth: 3,
          borderColor: isDarkMode
            ? "rgba(139, 92, 246, 0.3)"
            : "rgba(139, 92, 246, 0.2)",
          shadowColor: theme.colors.primary,
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.1,
          shadowRadius: 16,
          elevation: 4,
        }}
      >
        <Bell size={48} color={theme.colors.primary} />
      </View>
      <Text
        style={{
          fontSize: 28,
          fontWeight: "900",
          color: theme.colors.text,
          marginBottom: 16,
          textAlign: "center",
          lineHeight: 34,
        }}
      >
        No notifications yet
      </Text>
      <Text
        style={{
          fontSize: 16,
          color: theme.colors.text + "CC",
          textAlign: "center",
          lineHeight: 24,
          maxWidth: 280,
        }}
      >
        When you receive notifications, they'll appear here. Stay tuned for
        updates from your friends and events!
      </Text>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.card }}>
      {/* Header */}
      <View
        style={{
          backgroundColor: theme.colors.card,
          borderBottomWidth: 1,
          borderBottomColor: theme.colors.border,
          paddingTop: Math.max(insets.top + 16, 50),
          paddingBottom: 16,
          paddingHorizontal: 20,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              flex: 1,
              marginRight: 12,
            }}
          >
            <TouchableOpacity
              onPress={() => {
                if(from === 'home'){
                  router.push('/(app)/(home)')
                }
               else if(from === 'social'){
                  router.push('/(app)/(social)')
                }
                else if(from === 'map'){
                  router.back()
                }
                else{
                router.back()
                }
                }
              }
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: isDarkMode
                  ? "rgba(255, 255, 255, 0.1)"
                  : "rgba(255, 255, 255, 0.9)",
                borderWidth: 1,
                borderColor: isDarkMode
                  ? "rgba(139, 92, 246, 0.3)"
                  : "rgba(139, 92, 246, 0.2)",
                justifyContent: "center",
                alignItems: "center",
                marginRight: 12,
                shadowColor: theme.colors.primary,
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
                elevation: 2,
              }}
            >
              <ArrowLeft size={20} color={theme.colors.text} />
            </TouchableOpacity>
            <Text
              numberOfLines={1}
              ellipsizeMode="tail"
              style={{
                fontSize: 24,
                fontWeight: "900",
                color: theme.colors.text,
                lineHeight: 28,
                flex: 1,
              }}
            >
              Notifications
            </Text>
            {!!(unreadCount > 0) && (
              <View
                style={{
                  backgroundColor: theme.colors.primary,
                  borderRadius: 10,
                  paddingHorizontal: 6,
                  paddingVertical: 2,
                  marginLeft: 8,
                  minWidth: 20,
                  alignItems: "center",
                  shadowColor: theme.colors.primary,
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.3,
                  shadowRadius: 4,
                  elevation: 3,
                }}
              >
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: "700",
                    color: "white",
                  }}
                >
                  {unreadCount > 99 ? "99+" : String(unreadCount)}
                </Text>
              </View>
            )}
          </View>

          <View style={{ flexDirection: "row", gap: 6 }}>
            {notifications.length > 0 && (
              <>
                <TouchableOpacity
                  onPress={handleMarkAllRead}
                  style={{
                    backgroundColor: theme.colors.primary + "20",
                    borderRadius: 20,
                    paddingHorizontal: 10,
                    paddingVertical: 8,
                    borderWidth: 1,
                    borderColor: theme.colors.primary + "40",
                    minWidth: 40,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Check size={16} color={theme.colors.primary} />
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleClearAll}
                  style={{
                    backgroundColor: isDarkMode
                      ? "rgba(239, 68, 68, 0.2)"
                      : "rgba(239, 68, 68, 0.15)",
                    borderRadius: 20,
                    paddingHorizontal: 10,
                    paddingVertical: 8,
                    borderWidth: 1,
                    borderColor: isDarkMode
                      ? "rgba(239, 68, 68, 0.4)"
                      : "rgba(239, 68, 68, 0.3)",
                    minWidth: 40,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Trash2
                    size={16}
                    color={isDarkMode ? "#F87171" : "#EF4444"}
                  />
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </View>

      {/* Content */}
      <View style={{ flex: 1 }}>
        {notifications.length === 0 && !loading ? (
          renderEmptyState()
        ) : (
          <FlatList
            data={notifications}
            style={{ flex: 1 }}
            keyExtractor={(item, index) => `${item.id}-${index}`}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={theme.colors.primary}
                colors={[theme.colors.primary]}
              />
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
                <View style={{ paddingVertical: 20, alignItems: "center" }}>
                  <ActivityIndicator
                    size="large"
                    color={theme.colors.primary}
                  />
                  <Text
                    style={{
                      fontSize: 14,
                      color: theme.colors.text + "CC",
                      marginTop: 8,
                      fontWeight: "500",
                    }}
                  >
                    Loading more...
                  </Text>
                </View>
              ) : null
            }
            contentContainerStyle={{
              flexGrow: notifications.length === 0 ? 1 : 0,
              paddingTop: 16,
              paddingBottom: 32,
            }}
            showsVerticalScrollIndicator={false}
          />
        )}

        {loading && notifications.length === 0 && (
          <View
            style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
          >
            <View
              style={{
                width: 80,
                height: 80,
                borderRadius: 40,
                backgroundColor: theme.colors.primary + "20",
                justifyContent: "center",
                alignItems: "center",
                marginBottom: 24,
                borderWidth: 2,
                borderColor: theme.colors.primary + "40",
              }}
            >
              <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
            <Text
              style={{
                fontSize: 18,
                fontWeight: "600",
                color: theme.colors.text,
                marginBottom: 8,
              }}
            >
              Loading notifications...
            </Text>
            <Text
              style={{
                fontSize: 14,
                color: theme.colors.text + "CC",
                textAlign: "center",
              }}
            >
              Fetching your latest updates
            </Text>
          </View>
        )}
      </View>

      {/* Swipe hint for first notification */}
      {notifications.length > 0 && !notifications[0]?.is_read && (
        <View
          style={{
            position: "absolute",
            bottom: Math.max(insets.bottom + 20, 40),
            left: 20,
            right: 20,
          }}
        >
          <View
            style={{
              backgroundColor: theme.colors.primary,
              borderRadius: 16,
              paddingHorizontal: 16,
              paddingVertical: 12,
              shadowColor: theme.colors.primary,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: 6,
              borderWidth: 1,
              borderColor: theme.colors.primary + "40",
            }}
          >
            <Text
              style={{
                fontSize: 14,
                fontWeight: "600",
                color: "white",
                textAlign: "center",
                lineHeight: 20,
              }}
            >
              💡 Swipe left on notifications to delete them
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}
