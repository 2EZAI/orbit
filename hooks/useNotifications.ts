import { useEffect, useRef, useState } from "react";
import { Platform, DeviceEventEmitter } from "react-native";
import * as Notifications from "expo-notifications";
import type { EventSubscription } from "expo-modules-core";
import registerForPushNotificationsAsync from "~/app/notificationHelper";
import { supabase } from "~/src/lib/supabase";
import { useAuth } from "~/src/lib/auth";
import { platform } from "os";
import { useRouter } from "expo-router";
import { MapEvent } from "~/hooks/useMapEvents";
import { useChat } from "~/src/lib/chat";
import { DefaultGenerics, StreamChat } from "stream-chat";
let clientLocal: StreamChat<DefaultGenerics> | null = null;
import { useNotificationsApi } from "~/hooks/useNotificationsApi";

export default function useNotifications() {
  const notificationListener = useRef<EventSubscription | undefined>(undefined);
  const responseListener = useRef<EventSubscription | undefined>(undefined);
  const { session } = useAuth();
  const router = useRouter();
  const { client } = useChat();
  const { fetchAllNoifications, readNoifications } = useNotificationsApi();

  useEffect(() => {
    if (client && client.userID) {
      clientLocal = client;
    }
  }, [client]);
  useEffect(() => {
    hitPushToken();
    setNotifHandler();
    if (Platform.OS === "android") {
      Notifications.setNotificationChannelAsync("orbitNotifiation", {
        name: "orbitNotifiation",
        importance: Notifications.AndroidImportance.HIGH,
        lightColor: "#FF231F7C",
      });
    }
    notificationListener.current =
      Notifications.addNotificationReceivedListener((notification) => {
        const isLocal = notification.request.content.data?.localEcho;
        if (isLocal) return; // 🛡 prevent infinite loop

        // Show as a local notification
        // if (Platform.OS === 'ios') {
        // showLocalNotification(notification);
        // }
        hitNotificationCount();
      });

    responseListener.current =
      Notifications.addNotificationResponseReceivedListener((response) => {
      
        const content = response.notification.request.content;
        const notificationId = content?.data?.notification_id;
        console.log("addNotificationResponseReceivedListener>>>",
        content?.data)
        readNoificationsApi(notificationId);
        if (
          content?.data?.type === "comment" ||
          content?.data?.type === "like"
        ) {
          hitApiPostDetail(content?.data.post_id);
        }
        if (
          content?.data?.type === "event_reminder_60" ||
          content?.data?.type === "event_reminder_5" ||
          content?.data?.type === "event_started" ||
          content?.data?.type === "event_invite" 
        ) {
          const eventId = content?.data.event_id;
          let isTicketmaster = content?.data?.is_ticketmaster ?? false;
          fetchEventDetail(eventId, isTicketmaster);
          // fetchEventDetail("88f252e9-bc5a-4746-857e-859322cdd225"
          // ,false);
        }
        if (
          content?.data?.type === "friend_request" ||
          content?.data?.type === "friend_request_back"
        ) {
          // fetchEventDetail("88f252e9-bc5a-4746-857e-859322cdd225"
          // ,false);

          router.push({
            pathname: "/(app)/profile/[username]",
            params: { username: content?.data?.user_id },
          });
        }
        if (
          content?.data?.type === "new_chat" ||
          content?.data?.type === "new_group_chat" ||
          content?.data?.type === "new_group_message" ||
          content?.data?.type === "new_message"
        ) {
          // fetchEventDetail("88f252e9-bc5a-4746-857e-859322cdd225"
          // ,false);

          const groupName = content?.data?.group_name;
          const chatId = content?.data?.chat_id;
          const streamChanneld = content?.data?.stream_channel_id;
          const ids = content?.data?.member_ids;
          const senderId = content?.data?.sender_id;

          prepareChanel(groupName, chatId, ids, senderId, streamChanneld);
        }
      });
    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) {
        // App was launched from a notification tap
        // Handle navigation or logic here
      }
    });

    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, []);

  const prepareChanel = async (
    groupName: string,
    chatId: string,
    ids: string[],
    senderId: string,
    streamChannelId: string
  ) => {
    if (!clientLocal?.userID || ids.length === 0) {
      return;
    }
    const memberIds = [senderId, ...ids.map((u) => u)];

    const channel = clientLocal.channel("messaging", streamChannelId, {
      members: memberIds,
      name: groupName,
    });

    // This both creates the channel and subscribes to it
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

  const readNoificationsApi = async (notifId: string) => {
    try {
      if (!session) return;
      await readNoifications(notifId);
    } catch (error) {}
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
      console.log("requestData>>",requestData);
      // console.log("session.access_token>>",
      // session.access_token);
      if (!response.ok) {
        throw new Error(await response.text());
      }
      const data = await response.json();
      console.log("data>>",data);
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
      router.push({
        pathname: `/post/${postId}`,
        params: {
          event: postDetail?.data?.event
            ? JSON.stringify(postDetail?.data?.event)
            : "",
        },
      });
    } catch (error) {}
  };

  async function showLocalNotification(remoteNotification: any) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: remoteNotification.request.content.title || "New Notification",
        body: remoteNotification.request.content.body || "",
        data: { ...remoteNotification.request.content.data, localEcho: true },
      },
      trigger: null, // immediate
    });
  }
  async function setNotifHandler() {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: false,
        shouldSetBadge: false,
      }),
    });
  }

  async function hitPushToken() {
    console.log("hitPushToken>");
    const pushToken = await registerForPushNotificationsAsync();
    console.log("pushToken>",pushToken);
    if (pushToken != null) {
      upsertDeviceToken(pushToken);
    }
  }
  // Function to insert or update device token
  async function upsertDeviceToken(newDeviceToken: string) {
    if (!session?.user) return false;
    // 1. Check if entry exists
    const { data: existing, error: selectError } = await supabase
      .from("device_tokens")
      .select("*")
      .eq("user_id", session?.user?.id)
      .single();

    if (selectError && selectError.code !== "PGRST116") {
    } else if (existing) {
      // 2. Update
      await supabase
        .from("device_tokens")
        .update({ token: newDeviceToken })
        .eq("user_id", session?.user?.id);
    } else {
      // 3. Insert
      await supabase.from("device_tokens").insert({
        user_id: session?.user?.id,
        token: newDeviceToken,
        platform: Platform?.OS,
      });
    }
  }

  const hitNotificationCount = async () => {
    await fetchAllNoifications(1, 20);
  };
}
