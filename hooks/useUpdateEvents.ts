import { useEffect, useState } from "react";
import { supabase } from "~/src/lib/supabase";
import { useAuth } from "~/src/lib/auth";
import Toast from "react-native-toast-message";

interface User {
  id: string;
  email: string;
  username: string | null;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  location: string | null;
  phone: string | null;
  created_at: string;
  updated_at: string;
}

interface UserLoation {
  user_id: string;
  location: string;
  accuracy: string | null;
  latitude: string | null;
  longitude: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
}


interface Location {
  latitude: number;
  longitude: number;
}

interface EventAttendee {
  id: string;
  avatar_url: string;
  name: string;
}

interface EventCategory {
  id: string;
  name: string;
  icon: string;
}

export interface MapEvent {
  id: string;
  name: string;
  is_ticketmaster: boolean;
  description: string;
  start_datetime: string;
  end_datetime: string;
  venue_name: string;
  location: Location;
  address: string;
  image_urls: string[];
  distance: number;
  attendees: {
    count: number;
    profiles: EventAttendee[];
  };
  categories: EventCategory[];
  created_by?: {
    id: string;
    name: string;
    username: string;
    avatar_url: string | null;
  };
}

interface UseUserReturn {
  loading: boolean;
  error: Error | null;
  refreshUser: () => Promise<void>;
  UpdateEventStatus: (updates: Partial<MapEvent>) => Promise<void>;
  fetchEventDetail: (updates: Partial<MapEvent>) => Promise<void>;
  fetchLocationEvents: (updates: Partial<any>,page: Partial<any>,pageSize:Partial<any>) => Promise<void>;
  fetchCreatedEvents: (type: String,updates: Partial<any>,page: Partial<any>,pageSize:Partial<any>) => Promise<void>;

  
}

export function useUpdateEvents(): UseUserReturn {
  const { session } = useAuth();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Refresh user data
  const refreshUser = async () => {
    setLoading(true);
  };

  // Update user data
  const UpdateEventStatus = async (event: Partial<MapEvent>) => {
    try {
      if (!session?.user?.id) throw new Error("No user logged in");

      const eventData = {
        user_id: session.user.id,
        status: "joined",
        source: event.is_ticketmaster ? "ticketmaster" : "supabase",
        joined_at: new Date().toISOString(),
      };
            const response = await fetch(
              `${process.env.BACKEND_MAP_URL}/api/events/join/${event.id}`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${session.access_token}`,
                },
                body: JSON.stringify(eventData),
              }
            );
            console.log("session.access_token>>",
            session.access_token);
            console.log("eventData>UpdateEventStatus",
            eventData);

            if (!response.ok) {
              throw new Error(await response.text());
            }
      
            const data = await response.json();
            // console.log("event data", data);
            console.log("[Events] Updated", data, "events from API");
      Toast.show({
        type: "success",
        text1: "Event Updated"
      });
      return data; 
            
    } catch (e) {
      setError(e instanceof Error ? e : new Error("An error occurred"));
      throw e;
    }
  };

  // fetch event detail
  const fetchEventDetail = async (event: Partial<MapEvent>) => {
    try {
      if (!session?.user?.id) throw new Error("No user logged in");

      const eventData = {
                source: event.is_ticketmaster ? "ticketmaster" : "supabase",
      };
            const response = await fetch(
              `${process.env.BACKEND_MAP_URL}/api/events/${event.id}`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${session.access_token}`,
                },
                body: JSON.stringify(eventData),
              }
            );
            console.log("session.access_token>>",
            session.access_token);
            console.log("eventData>fetchEvent",
            eventData);

            if (!response.ok) {
              throw new Error(await response.text());
            }
      
            const data = await response.json();
            // console.log("event data", data);
            console.log("[Events] Fetched", data, "events from API");
      // Toast.show({
      //   type: "success",
      //   text1: "Event fetched"
      // });
      return data; 
            
    } catch (e) {
      setError(e instanceof Error ? e : new Error("An error occurred"));
      throw e;
    }
  };

   // fetch location events
   const fetchLocationEvents = async (location: Partial<any>,pagee: Partial<any>,pageSize: Partial<any>) => {
    try {
      if (!session?.user?.id) throw new Error("No user logged in");

      const eventData = {
                page: pagee,
                limit: pageSize
      };
            const response = await fetch(
              `${process.env.BACKEND_MAP_URL}/api/events/location/${location.id}`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${session.access_token}`,
                },
                body: JSON.stringify(eventData),
              }
            );
            console.log("session.access_token>>",
            session.access_token);
            console.log("fetchLocationEvents>fetchEvent",
            eventData);

            if (!response.ok) {
              throw new Error(await response.text());
            }
      
            const data = await response.json();
            // console.log("event data", data);
            console.log("[Events] fetchLocationEvents", data, "events from API");
      // Toast.show({
      //   type: "success",
      //   text1: "Event fetched"
      // });
      return data.events; 
            
    } catch (e) {
      setError(e instanceof Error ? e : new Error("An error occurred"));
      throw e;
    }
  };

 // fetch location events
 const fetchCreatedEvents = async (type_: String,pagee: Partial<any>,pageSize: Partial<any>,userid:string) => {
  try {
    if (!session?.user?.id) throw new Error("No user logged in");

    const eventData = {
              page: pagee,
              limit: pageSize,
              type:type_,
              user_id:userid,
    };
          const response = await fetch(
            
            `${process.env.BACKEND_MAP_URL}/api/events/my-events?page=${pagee}&limit=${pageSize}`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${session.access_token}`,
              },
              body: JSON.stringify(eventData),
            }
          );
          console.log("session.access_token>>",
          session.access_token);
          console.log("fetchCreatedEvents>fetchEvent",
          eventData);

          if (!response.ok) {
            throw new Error(await response.text());
          }
    
          const data = await response.json();
          // console.log("event data", data);
          console.log("[Events] fetchCreatedEvents", data, "events from API");
    // Toast.show({
    //   type: "success",
    //   text1: "Event fetched"
    // });
    return data.events; 
          
  } catch (e) {
    setError(e instanceof Error ? e : new Error("An error occurred"));
    throw e;
  }
};


  // Subscribe to realtime changes
  useEffect(() => {
    if (!session?.user?.id) return;

    const subscription = supabase
      .channel(`public:users:id=eq.${session.user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "users",
          filter: `id=eq.${session.user.id}`,
        },
        (payload) => {
          if (payload.new) {
            setUser(payload.new as User);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [session?.user?.id]);

  // Initial fetch
  useEffect(() => {
  }, [session?.user?.id]);

  return {

    loading,
    error,
    refreshUser,
    UpdateEventStatus,
    fetchEventDetail,
    fetchLocationEvents,
    fetchCreatedEvents,
  };
}
