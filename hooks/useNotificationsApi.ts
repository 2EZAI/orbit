import { useEffect, useState } from "react";
import { useAuth } from "~/src/lib/auth";

export interface NotificationData {
  type: string;
  chat_id: string;
  sender_id: string;
  group_name: string;
  member_ids: string[];
  stream_channel_id: string;
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
  fetchAllNoifications: (page: Partial<number>,pageSize:Partial<number>) => Promise<void>;
  readNoifications: (notifId: Partial<string>) => Promise<void>;
  unReadCount: number | null;
}

export function useNotificationsApi(): useNotificationsReturn {
  const { session } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [unReadCount, setUnReadCount] = useState<number | null>(null);
 // fetch location events
 const fetchAllNoifications = async (pagee: Partial<number>,pageSize: Partial<number>) => {
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
          // console.log("notifications>", data);
          const meta= data?.meta?.unreadCount;
          // console.log("meta>",meta);
          setUnReadCount(meta);
  
    return data; 
          
  } catch (e) {
    setError(e instanceof Error ? e : new Error("An error occurred"));
    throw e;
  }
};

const readNoifications = async (notifId: string) => {
  console.log("readNoifications:>");
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
    // console.log("notifDetail>", notifDetail);
   return notifDetail;
  } catch (error) {
    console.error("Error fetching read notification:", error);
  }
};


  return {
    loading,
    error,
    fetchAllNoifications,
    readNoifications,
    unReadCount,
  };
}
