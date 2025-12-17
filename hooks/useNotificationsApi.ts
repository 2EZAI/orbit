import { useEffect, useState } from "react";
import { useAuth } from "~/src/lib/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";

export interface NotificationData {
  type: string;
  chat_id?: string;
  sender_id?: string;
  group_name?: string;
  member_ids?: string[];
  stream_channel_id?: string;
  post_id?: string;
  event_id?: string;
  is_ticketmaster?: boolean;
  user_id?: string;
}

export interface Notification {
  id: string;
  user_id: string;
  sender_id: string;
  type: string;
  title: string;
  body: string;
  data: NotificationData;
  is_read: boolean;
  created_at: string; // You can use Date if you parse it
  sender: any | null; // Replace 'any' with a more specific type if known
}

export interface NotificationMeta {
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
  readCount: number;
  unreadCount: number;
}

export interface NotificationResponse {
  notifications: Notification[];
  meta: NotificationMeta;
}

interface useNotificationsReturn {
  loading: boolean;
  error: Error | null;
  fetchAllNoifications: (
    page: Partial<number>,
    pageSize: Partial<number>
  ) => Promise<NotificationResponse>;
  readNoifications: (notifId: Partial<string>) => Promise<void>;
  sendNotification: (params: {
    type: string;
    userId?: string;
    senderId?: string;
    postId?: string;
    chatId?: string;
    groupName?: string;
  }) => Promise<void>;
  unReadCount: number | null;
}
const saveUnReadNotifCount = async (count: string) => {
  try {
    await AsyncStorage.setItem("unread_notification", JSON.stringify(count));
  } catch (error) {}
};
export function useNotificationsApi(): useNotificationsReturn {
  const { session } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [unReadCount, setUnReadCount] = useState<number | null>(null);
  // fetch location events
  const fetchAllNoifications = async (
    pagee: Partial<number>,
    pageSize: Partial<number>
  ) => {
    try {
      if (!session?.user?.id) throw new Error("No user logged in");

      const response = await fetch(
        `${process.env.BACKEND_MAP_URL}/api/notifications/user/${session?.user?.id}?page=${pagee}&limit=${pageSize}`,
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

      const data = await response.json();
      const meta = data?.meta?.unreadCount;
      setUnReadCount(meta);
      saveUnReadNotifCount(String(meta || 0));

      return data;
    } catch (e) {
      setError(e instanceof Error ? e : new Error("An error occurred"));
      throw e;
    }
  };

  const readNoifications = async (notifId: string) => {
    try {
      if (!session) return;
      const response = await fetch(
        `${process.env.BACKEND_MAP_URL}/api/notifications/read/${notifId}`,
        {
          method: "POST",
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

      const notifDetail = await response.json();
      return notifDetail;
    } catch (error) {}
  };

  const sendNotification = async (params: {
    type: string;
    userId?: string;
    senderId?: string;
    postId?: string;
    chatId?: string;
    groupName?: string;
  }) => {
    if (!session?.user?.id) return;
    try {
      const requestData: any = {
        type: params.type,
      };

      if (params.userId) {
        requestData.userId = params.userId;
      }
      if (params.senderId) {
        requestData.senderId = params.senderId;
      } else {
        requestData.senderId = session.user.id;
      }

      requestData.data = {};
      if (params.postId) {
        requestData.data.post_id = params.postId;
      }
      if (params.chatId) {
        requestData.data.chat_id = params.chatId;
      }
      if (params.groupName) {
        requestData.data.group_name = params.groupName;
      }

      const response = await fetch(
        `${process.env.BACKEND_MAP_URL}/api/notifications/send`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify(requestData),
        }
      );

      if (!response.ok) {
        throw new Error(await response.text());
      }

      await response.json();
    } catch (e) {
      console.log("error_catch>", e);
    }
  };

  return {
    loading,
    error,
    fetchAllNoifications,
    readNoifications,
    sendNotification,
    unReadCount,
  };
}
