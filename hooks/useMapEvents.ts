import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Image ,Platform } from "react-native";
import { supabase } from "~/src/lib/supabase";
import { debounce } from "lodash";
import { parseISO,format, isWithinInterval, addHours, isSameDay, addDays } from 'date-fns';
// import { utcToZonedTime } from 'date-fns-tz';
// import Toast from "react-native-toast-message";
import { useAuth } from "~/src/lib/auth";

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
  event_location_preference: number;
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
  type: string;
  created_by?: {
    id: string;
    name: string;
    username: string;
    avatar_url: string | null;
  };
  static_location?:MapLocation;
}

export interface Prompt {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
  location_id: string | null;
  category_id: string;
}

export interface Category {
  id: string;
  name: string;
  icon: string | null;
  created_at: string;
  updated_at: string;
  source: string;
  prompts: Prompt[];
}
export interface MapLocation {
  id: string;
  name: string;
  description: string;
  location: Location;
  address: string;
  image_urls: string[];
  distance: number;
  type:string;
  category: Category;
  
}


type TimeRange = "today" | "week" | "weekend";

interface UseMapEventsProps {
  center: [number, number]; // [latitude, longitude]
  radius?: number; // in meters
  timeRange?: TimeRange;
}

interface EventCluster {
  events: MapEvent[];
  location: Location;
  mainEvent: MapEvent; // The event whose image we'll show
}

interface LocationCluster {
  events: MapLocation[];
  location: Location;
  mainEvent: MapLocation; // The event whose image we'll show
}

export function useMapEvents({
  center,
  radius = 500000,
  timeRange = "now",
}: UseMapEventsProps) {
  // Toast.show({
  //   type: "success",
  //   text1: "first :"+center,
  // });

  const now = new Date();
  const SEVEN_DAYS_IN_MS =  7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

  const twenty_HOURS_IN_MS = 24 * 60 * 60 * 1000; // 4 hours in milliseconds
  const FOUR_HOURS_IN_MS = 4 * 60 * 60 * 1000; // 4 hours in milliseconds
  const nowTime = now.getTime();
const fourHoursLater = nowTime + FOUR_HOURS_IN_MS;
const next24Hours = nowTime + twenty_HOURS_IN_MS;
const next7Days =  nowTime + SEVEN_DAYS_IN_MS;

// Get the current day of the week (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
const currentDay = now.getDay();

// Calculate how many days left until Sunday (end of the week)
const daysUntilSunday = 7 - currentDay; // 0 if Sunday, 1 if Saturday, etc.

// Convert days until Sunday to milliseconds
const endOfWeekTime = nowTime + (daysUntilSunday * 24 * 60 * 60 * 1000);



const twentyHoursLater = nowTime + 20 * 60 * 60 * 1000; // 20 hours

let user:any=null;
let userLocation:any =null;
let savedCentre:any[] =null;
const [locations, setLocations] = useState<MapEvent[]>([]);
  const [events, setEvents] = useState<MapEvent[]>([]);
  const [firstHit, setfirstHit] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [cLocation, setcLocation] = useState(center);
  const [eventsHome, setEventsHome] = useState<MapEvent[]>([]);
  const [eventsNow, setEventsNow] = useState<MapEvent[]>([]);
  const [eventsToday, setEventsToday] = useState<MapEvent[]>([]);
  const [eventsTomorrow, setEventsTomorrow] = useState<MapEvent[]>([]);
  const [clustersLocations, setClustersLocations] = useState<LocationCluster[]>([]);
  const [clusters, setClusters] = useState<EventCluster[]>([]);
  const [clustersNow, setClustersNow] = useState<EventCluster[]>([]);
  const [clustersToday, setClustersToday] = useState<EventCluster[]>([]);
  const [clustersTomorrow, setClustersTomorrow] = useState<EventCluster[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<MapEvent | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [ncenter, setcenter] = useState(center);
  const [error, setError] = useState<string | null>(null);
  const isMountedRef = useRef(true);
  const lastFetchTimeRef = useRef<number>(0);
  const cachedEventsRef = useRef<MapEvent[]>([]);
  const { session } = useAuth();
  // Function to group events by location with a smaller precision for better clustering
  const clusterEvents = useCallback((events: MapEvent[]) => {
    console.log("[Events] Clustering", events.length, "events");
    const locationMap = new Map<string, EventCluster>();

    events.forEach((event) => {
      if (
        !event.location ||
        typeof event.location.latitude !== "number" ||
        typeof event.location.longitude !== "number"
      ) {
        console.warn("[Events] Invalid location for event:", event.id);
        return;
      }

      // Log the actual coordinates for debugging
      console.log(`[Events] Event ${event.id} location:`, event.location);

      // Use 3 decimal places for clustering (roughly 100m precision)
      const key = `${event.location.latitude.toFixed(
        3
      )},${event.location.longitude.toFixed(3)}`;

      if (locationMap.has(key)) {
        const cluster = locationMap.get(key)!;
        cluster.events.push(event);
        // Update main event if this one has more attendees
        if (event.attendees.count > cluster.mainEvent.attendees.count) {
          cluster.mainEvent = event;
        }
      } else {
        locationMap.set(key, {
          events: [event],
          location: event.location,
          mainEvent: event,
        });
      }
    });

    const clusters = Array.from(locationMap.values());
    console.log(
      "[Events] Created clusters at locations:",
      clusters.map((c) => `${c.location.latitude},${c.location.longitude}`)
    );
    return clusters;
  }, []);

  const clusterLocations = useCallback((events: MapLocation[]) => {
    console.log("[Events] Clustering", events.length, "events");
    const locationMap = new Map<string, LocationCluster>();

    events.forEach((event) => {
      if (
        !event.location ||
        typeof event.location.latitude !== "number" ||
        typeof event.location.longitude !== "number"
      ) {
        console.warn("[Events] Invalid location for event:", event.id);
        return;
      }

      // Log the actual coordinates for debugging
      console.log(`[Events] Event ${event.id} location:`, event.location);

      // Use 3 decimal places for clustering (roughly 100m precision)
      const key = `${event.location.latitude.toFixed(
        3
      )},${event.location.longitude.toFixed(3)}`;

      if (locationMap.has(key)) {
        const cluster = locationMap.get(key)!;
        cluster.events.push(event);
        // Update main event if this one has more attendees
        // if (event.attendees.count > cluster.mainEvent.attendees.count) {
        //   cluster.mainEvent = event;
        // }
      } else {
        locationMap.set(key, {
          events: [event],
          location: event.location,
          mainEvent: event,
        });
      }
    });

    const clusters = Array.from(locationMap.values());
    console.log(
      "[Events] Created clusters at locations:",
      clusters.map((c) => `${c.location.latitude},${c.location.longitude}`)
    );
    return clusters;
  }, []);

  const hitEventsApi=async(page:string, pageSize:string,selectedCat:string) =>{
console.log("apihitt",page," ",pageSize," ",selectedCat);

setIsLoading(true);

    ///fetch user
    try {
      if (!session?.user?.id) {
        return;
      }

      const { data, error: supabaseError } = await supabase
        .from("users")
        .select("*")
        .eq("id", session.user.id)
        .single();

        
      if (supabaseError) throw supabaseError;
      console.log("fetch_user>?>>",data);
      user=data;
    } catch (e) {
    } finally {
    }

    ///fetch location
    try {
      if (!session?.user?.id) {
        return;
      }

      const { data, error: supabaseError } = await supabase
        .from("user_locations")
        .select("*")
        .eq("user_id", session.user.id)
        .single();

        
      if (supabaseError) throw supabaseError;
      console.log("fetch_location>?>>",data);
      userLocation =data;
    } catch (e) {
    } finally {
    }

    try {
      console.log("[Events] Fetching all events");

      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error("No valid auth session");
      }

 
  console.log('user?.event_location_preference>',user?.event_location_preference);
  console.log('userlocation?.latitude>',userLocation?.latitude);

 // 2. get event using our API
 const eventData = {
  // latitude: 41.884109,
  // longitude: -87.665881
  latitude: user != null && user?.event_location_preference == 1 ?
  userLocation?.latitude :savedCentre[0],
  longitude: user != null && user?.event_location_preference == 1 ?
  userLocation?.longitude : savedCentre[1],
  category:selectedCat !=null ? (
    selectedCat !=="All Events" ?selectedCat : "") :
  "",
};

try {
  if (!session?.user?.id) {
    return;
  }
///fetch events
      const response = await fetch(
        `${process.env.BACKEND_MAP_URL}/api/events/all?page=${page}&limit=${pageSize}`,
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
      console.log("eventData",
      eventData);
      
      if (!response.ok) {
        throw new Error(await response.text());
      }

      const data_ = await response.json();
      const data = data_.events;
      // console.log("event data", data);
      console.log("[Events] Fetched HOMEevents>:", data.length, "events from API");

      // Validate event data
      const validEvents = data.filter((event: any) => {
        const isValid =
          event.location &&
          typeof event.location.latitude === "number" &&
          typeof event.location.longitude === "number" &&
          !isNaN(event.location.latitude) &&
          !isNaN(event.location.longitude) &&
          Math.abs(event.location.latitude) <= 90 &&
          Math.abs(event.location.longitude) <= 180;
        if (!isValid) {
          console.warn(
            "[Events] Invalid event data:",
            event.id,
            JSON.stringify(event.location)
          );
        }
        return isValid;
      });

      console.log("[Events] Valid HOMEevents>:", validEvents);

      if (!isMountedRef.current) return;

      // Update cache and state
      cachedEventsRef.current = validEvents;
      lastFetchTimeRef.current = Date.now();
      setEventsHome(validEvents);
      // setEventsHome(prevEvents => [...prevEvents, ...validEvents]);
      return validEvents;
    }
    catch (e) {
    } finally {
    }
  }
    catch (err) {
      console.log("[Events] Error fetching events Pagination:", err);
      if (!isMountedRef.current) return;
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      if (!isMountedRef.current) return;
      setIsLoading(false);
    }
      
  };

  const fetchCategories = useCallback(async () => {
    try {
      console.log("[Events] Fetching all events");

      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error("No valid auth session");
      }

      const response = await fetch(
        `${process.env.BACKEND_MAP_URL}/api/events/categories`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          //body: JSON.stringify(eventData),
        }
      );
      console.log("session.access_token>>",
      session.access_token);
      
      if (!response.ok) {
        throw new Error(await response.text());
      }
      setCategories([]);
      const data = await response.json();
      // console.log("categories data", data);
      setCategories(data);
      if (!isMountedRef.current) return;


      setError(null);
    } catch (err) {
      console.log("[categories] Error fetching categories:", err);
      if (!isMountedRef.current) return;
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      if (!isMountedRef.current) return;
      setIsLoading(false);
    }
  }, [clusterEvents]);

  // Initial fetch only
  useEffect(() => {
    
    // isMountedRef.current = true;
    fetchCategories();
    // return () => {
    //   isMountedRef.current = false;
    // };
  }, [fetchCategories]);

  const fetchAllEvents = useCallback(async (centerr: any[]) => {
    if(centerr[0] == 0 && centerr[1] == 0)
    {
      return;
    }
    savedCentre=centerr;
    if (!isMountedRef.current || isLoading) return;
    setIsLoading(true);

    ///fetch user
    try {
      if (!session?.user?.id) {
        return;
      }

      const { data, error: supabaseError } = await supabase
        .from("users")
        .select("*")
        .eq("id", session.user.id)
        .single();

        
      if (supabaseError) throw supabaseError;
      console.log("fetch_user>?>>",data);
      user=data;
    } catch (e) {
    } finally {
    }

    ///fetch location
    try {
      if (!session?.user?.id) {
        return;
      }

      const { data, error: supabaseError } = await supabase
        .from("user_locations")
        .select("*")
        .eq("user_id", session.user.id)
        .single();

        
      if (supabaseError) throw supabaseError;
      console.log("fetch_location>?>>",data);
      userLocation =data;
    } catch (e) {
    } finally {
    }

    try {
      console.log("[Events] Fetching all events");

      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error("No valid auth session");
      }

 
  console.log('user?.event_location_preference>',user?.event_location_preference);
  console.log('userlocation?.latitude>',userLocation?.latitude);

 // 2. get event using our API
 const eventData = {
  // latitude: 41.884109,
  // longitude: -87.665881
  latitude: user != null && user?.event_location_preference == 1 ?
  userLocation?.latitude :centerr[0],
  longitude: user != null && user?.event_location_preference == 1 ?
  userLocation?.longitude : centerr[1]
};
// Toast.show({
//   type: "success",
//   text1: "eventData:"+eventData.latitude +"\n"+ eventData.longitude,
// });

////fetch locations

// const responseLocations = await fetch(
//   `${process.env.BACKEND_MAP_URL}/api/locations/all`,
//   {
//     method: "POST",
//     headers: {
//       "Content-Type": "application/json",
//       Authorization: `Bearer ${session.access_token}`,
//     },
//     body: JSON.stringify(eventData),
//   }
// );
// console.log("session.access_token>>",
// session.access_token);
// console.log("dataLocations",
// eventData);

// if (!responseLocations.ok) {
//   throw new Error(await responseLocations.text());
// }

// const dataLocations = await responseLocations.json();
// console.log("dataLocations", dataLocations);
// console.log("[Events] Locations", dataLocations.length, "Locations from API");

// // Validate event data
// const validLocations = dataLocations.filter((event: any) => {
//   const isValid =
//     event.location &&
//     typeof event.location.latitude === "number" &&
//     typeof event.location.longitude === "number" &&
//     !isNaN(event.location.latitude) &&
//     !isNaN(event.location.longitude) &&
//     Math.abs(event.location.latitude) <= 90 &&
//     Math.abs(event.location.longitude) <= 180;
//   if (!isValid) {
//     console.warn(
//       "[Events] Invalid event data:",
//       event.id,
//       JSON.stringify(event.location)
//     );
//   }
//   return isValid;
// });

// setLocations(validLocations);
// setClustersLocations([]);
//       // Create initial clusters
//       const newClustersLocations = clusterLocations(validLocations);
//       console.log("validLocations>", validLocations);
//       // console.log("validLocationscategory.prompts>", validLocations[1].category.prompts);
//       // console.log("[Events] Setting", newClusters.length, "clusters");
//       setClustersLocations(newClustersLocations);

///fetch events
      const response = await fetch(
        // `${process.env.BACKEND_MAP_URL}/api/events/all`,
        `${process.env.BACKEND_MAP_URL}/api/events/all/map`,
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
      console.log("eventData",
      eventData);
      
      if (!response.ok) {
        throw new Error(await response.text());
      }

      const data_ = await response.json();
      console.log("data_>", data_);
      
      ///locations
      
      const dataLocations = data_.locations;
      console.log("dataLocations", dataLocations);
      console.log("[Events] Locations", dataLocations.length, "Locations from API");
      
      // Validate event data
      const validLocations = dataLocations.filter((event: any) => {
        const isValid =
          event.location &&
          typeof event.location.latitude === "number" &&
          typeof event.location.longitude === "number" &&
          !isNaN(event.location.latitude) &&
          !isNaN(event.location.longitude) &&
          Math.abs(event.location.latitude) <= 90 &&
          Math.abs(event.location.longitude) <= 180;
        if (!isValid) {
          console.warn(
            "[Events] Invalid event data:",
            event.id,
            JSON.stringify(event.location)
          );
        }
        return isValid;
      });
      
      setLocations(validLocations);
      setClustersLocations([]);
            // Create initial clusters
            const newClustersLocations = clusterLocations(validLocations);
            console.log("validLocations>", validLocations);
            // console.log("validLocationscategory.prompts>", validLocations[1].category.prompts);
            // console.log("[Events] Setting", newClusters.length, "clusters");
            setClustersLocations(newClustersLocations);
      ////
      
      const data = data_.events;
      // console.log("event data", data);
      console.log("[Events] Fetched", data.length, "events from API");

      // Validate event data
      const validEvents = data.filter((event: any) => {
        const isValid =
          event.location &&
          typeof event.location.latitude === "number" &&
          typeof event.location.longitude === "number" &&
          !isNaN(event.location.latitude) &&
          !isNaN(event.location.longitude) &&
          Math.abs(event.location.latitude) <= 90 &&
          Math.abs(event.location.longitude) <= 180;
        if (!isValid) {
          console.warn(
            "[Events] Invalid event data:",
            event.id,
            JSON.stringify(event.location)
          );
        }
        return isValid;
      });

      console.log("[Events] Valid events:", validEvents.length);

      if (!isMountedRef.current) return;

      // Update cache and state
      cachedEventsRef.current = validEvents;
      lastFetchTimeRef.current = Date.now();
      setEvents(validEvents);
      setClusters([]);
      setClustersNow([]);
      setClustersToday([]);
      setClustersTomorrow([]);
      // Create initial clusters
      const newClusters = clusterEvents(validEvents);
      // console.log("validEvents>", validEvents);
      // console.log("[Events] Setting", newClusters.length, "clusters");
      setClusters(newClusters);
      // console.log("now>>", now);

  // "Now" = within the next 24 hours
  const nowListt = validEvents.filter((event: any) => {
  const eventTime = new Date(event?.start_datetime).getTime();

  // Check if the event starts between now and the next 24 hours
  // return eventTime >= nowTime && eventTime <= FOUR_HOURS_IN_MS;
  return eventTime >= nowTime && eventTime <= next24Hours;
});
const newClustersNow = clusterEvents(nowListt);
// console.log("[Events] Setting", newClustersNow.length, "newClustersNow");
setClustersNow(newClustersNow);

const todayListt = validEvents.filter((event: any) => {
  const eventDateObj = new Date(event?.start_datetime);
  // const eventTime = eventDateObj.getTime();
  let localEventTime =format(new Date(event?.start_datetime), 'yyyy-MM-dd')
  let localnow =format(new Date(now), 'yyyy-MM-dd')
  // console.log("localEventTime",localEventTime);
  // console.log("localnow",localnow);

 const day = new Date(localEventTime).getDay(); // 0 = Sunday, 5 = Friday, 6 = Saturday
  // console.log("day>>",day);
  const eventTime = new Date(localEventTime).getTime();
  return eventTime >= nowTime && eventTime <= next7Days;

});
const newClustersToday = clusterEvents(todayListt);
// console.log("todayListt", todayListt);

console.log("[Events] Setting", newClustersToday.length, "newClustersToday");
setClustersToday(newClustersToday);

const tomorrowListt = validEvents.filter((event: any) => {
  let localEventTime =format(new Date(event?.start_datetime), 'yyyy-MM-dd')
  let localnow =format(new Date(now), 'yyyy-MM-dd')
  // console.log("localEventTime",localEventTime);
  // console.log("localnow",localnow);

  const day = new Date(localEventTime).getDay(); // 0 = Sunday, 5 = Friday, 6 = Saturday
  // console.log("day>>",day);
  const eventTime = new Date(localEventTime).getTime();
  return (day === 5 || day === 6 || day === 0) && eventTime >= nowTime && eventTime <= next7Days;


});
const newClustersTomorrow = clusterEvents(tomorrowListt);
// console.log("tomorrowListt", tomorrowListt);
// console.log("[Events] Setting", newClustersTomorrow.length, "newClustersTomorrow");
setClustersTomorrow(newClustersTomorrow);

 // Validate event data
 const validEventsHome = data.filter((event: any) => {
  const isValid =
    !event.is_ticketmaster  &&
    event.location &&
    typeof event.location.latitude === "number" &&
    typeof event.location.longitude === "number" &&
    !isNaN(event.location.latitude) &&
    !isNaN(event.location.longitude) &&
    Math.abs(event.location.latitude) <= 90 &&
    Math.abs(event.location.longitude) <= 180;

  if (!isValid) {
    console.warn(
      "[Events] Invalid event data:",
      event.id,
      JSON.stringify(event.location)
    );
  }
  return isValid;
});
// console.log("validEventsHome>",validEventsHome.length);
// setEventsHome(validEventsHome);

  // "Now" = within the next 4 hours
const nowList = validEvents.filter((event: any) => {
  const eventTime = new Date(event?.start_datetime).getTime();

  // Check if the event starts between now and the next 4 hours
  // return eventTime >= nowTime && eventTime <= FOUR_HOURS_IN_MS;
  return eventTime >= nowTime && eventTime <= next24Hours;
});
// console.log("nowList???",nowList);
setEventsNow(nowList);

const todayList = validEvents.filter((event: any) => {
  const eventDateObj = new Date(event?.start_datetime);
  // const eventTime = eventDateObj.getTime();
  let localEventTime =format(new Date(event?.start_datetime), 'yyyy-MM-dd')
  let localnow =format(new Date(now), 'yyyy-MM-dd')
  // console.log("localEventTime",localEventTime);
  // console.log("localnow",localnow);
 const day = new Date(localEventTime).getDay(); // 0 = Sunday, 5 = Friday, 6 = Saturday
 const eventTime = new Date(localEventTime).getTime();
  return  eventTime >= nowTime && eventTime <= next7Days;
});
// console.log("todayList???",todayList);
setEventsToday(todayList);

const tomorrowList = validEvents.filter((event: any) => {
  let localEventTime =format(new Date(event?.start_datetime), 'yyyy-MM-dd')
  let localnow =format(new Date(now), 'yyyy-MM-dd')
  // console.log("localEventTime",localEventTime);
  // console.log("localnow",localnow);
 const day = new Date(localEventTime).getDay(); // 0 = Sunday, 5 = Friday, 6 = Saturday
  // console.log("day>>",day);
  const eventTime = new Date(localEventTime).getTime();
  return (day === 5 || day === 6 || day === 0) && eventTime >= nowTime && eventTime <= next7Days;

});
setEventsTomorrow(tomorrowList);

      setError(null);
    } catch (err) {
      console.log("[Events] Error fetching events:", err);
      if (!isMountedRef.current) return;
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      if (!isMountedRef.current) return;
      setIsLoading(false);
    }
  }, [clusterEvents]);

  // Initial fetch only
  useEffect(() => {
    // Toast.show({
    //   type: "success",
    //   text1: "iiinn :"+center,
    // });
    isMountedRef.current = true;
    fetchAllEvents(center);
    return () => {
      isMountedRef.current = false;
    };
  }, [fetchAllEvents]);

  useEffect(() => {
    if(Platform.OS === 'android')
    {
      if(!firstHit){
        console.log("center changed:", center);
        //setcLocation(center);
        // Toast.show({
        //   type: "success",
        //   text1: "center changed:"+center +firstHit,
        // });
        
        fetchAllEvents(center);
        setTimeout(() => {
          setfirstHit(true);
        }, 3000);
          
       }
    }
    else{
     if(!firstHit){
    console.log("center changed:", center);
    //setcLocation(center);
    // Toast.show({
    //   type: "success",
    //   text1: "center changed:"+center +firstHit,
    // });
    
    fetchAllEvents(center);
    setTimeout(() => {
      setfirstHit(true);
    }, 300);
      
   }
  }
    
  
  }, [center]); // This runs every time `location` changes


  // Memoize the center value to prevent unnecessary updates
  const memoizedCenter = useMemo(() => center, [center[0], center[1]]);

  // Update clusters when center changes, but only if we have events
  useEffect(() => {
    if (cachedEventsRef.current.length > 0) {
      const newClusters = clusterEvents(cachedEventsRef.current);
      setClusters(newClusters);
    }
  }, [memoizedCenter, clusterEvents]);

  const handleEventClick = useCallback((event: MapEvent) => {
    console.log("[Events] Selected event:", event.id);
    setSelectedEvent(event);
  }, []);

  const handleCloseModal = useCallback(() => {
    setSelectedEvent(null);
  }, []);

  return {
    hitEventsApi,
    eventsHome,
    categories,
    events,
    locations,
    eventsToday,
    eventsNow,
    eventsTomorrow,
    clusters,
    clustersLocations,
    clustersToday,
    clustersNow,
    clustersTomorrow,
    selectedEvent,
    isLoading,
    error,
    handleEventClick,
    handleCloseModal,
  };
}
