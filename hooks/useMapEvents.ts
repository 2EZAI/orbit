import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Image, Platform } from "react-native";
import { supabase } from "~/src/lib/supabase";
import { debounce } from "lodash";
import {
  parseISO,
  format,
  isWithinInterval,
  addHours,
  isSameDay,
  addDays,
} from "date-fns";
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
  category: Category;
  type: string;
  created_by?: {
    id: string;
    name: string;
    username: string;
    avatar_url: string | null;
  };
  static_location?: MapLocation;
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
  type: string;
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
  timeRange = "today",
}: UseMapEventsProps) {
  // Toast.show({
  //   type: "success",
  //   text1: "first :"+center,
  // });

  const now = new Date();
  const SEVEN_DAYS_IN_MS = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

  const twenty_HOURS_IN_MS = 24 * 60 * 60 * 1000; // 4 hours in milliseconds
  const FOUR_HOURS_IN_MS = 4 * 60 * 60 * 1000; // 4 hours in milliseconds
  const nowTime = now.getTime();
  const fourHoursLater = nowTime + FOUR_HOURS_IN_MS;
  const next24Hours = nowTime + twenty_HOURS_IN_MS;
  const next7Days = nowTime + SEVEN_DAYS_IN_MS;

  // Get the current day of the week (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
  const currentDay = now.getDay();

  // Calculate how many days left until Sunday (end of the week)
  const daysUntilSunday = 7 - currentDay; // 0 if Sunday, 1 if Saturday, etc.

  // Convert days until Sunday to milliseconds
  const endOfWeekTime = nowTime + daysUntilSunday * 24 * 60 * 60 * 1000;

  const twentyHoursLater = nowTime + 20 * 60 * 60 * 1000; // 20 hours

  let user: any = null;
  let userLocation: any = null;
  let savedCentre: any[] = [];
  const [locations, setLocations] = useState<MapLocation[]>([]);
  const [events, setEvents] = useState<MapEvent[]>([]);
  const [firstHit, setfirstHit] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [cLocation, setcLocation] = useState(center);
  const [eventsHome, setEventsHome] = useState<MapEvent[]>([]);
  const [eventsNow, setEventsNow] = useState<MapEvent[]>([]);
  const [eventsToday, setEventsToday] = useState<MapEvent[]>([]);
  const [eventsTomorrow, setEventsTomorrow] = useState<MapEvent[]>([]);
  const [clustersLocations, setClustersLocations] = useState<LocationCluster[]>(
    []
  );
  const [clusters, setClusters] = useState<EventCluster[]>([]);
  const [clustersNow, setClustersNow] = useState<EventCluster[]>([]);
  const [clustersToday, setClustersToday] = useState<EventCluster[]>([]);
  const [clustersTomorrow, setClustersTomorrow] = useState<EventCluster[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<MapEvent | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [ncenter, setcenter] = useState(center);
  const [error, setError] = useState<string | null>(null);
  const isMountedRef = useRef(true);
  const isLoadingRef = useRef(false);
  const lastFetchTimeRef = useRef<number>(0);
  const cachedEventsRef = useRef<MapEvent[]>([]);
  const lastCenterRef = useRef<[number, number] | null>(null);
  const lastEventsRef = useRef<MapEvent[]>([]);
  const lastLocationsRef = useRef<MapLocation[]>([]);
  const { session } = useAuth();
  // Function to group events by location with a smaller precision for better clustering
  const clusterEvents = (events: MapEvent[]) => {
    const locationMap = new Map<string, EventCluster>();

    events.forEach((event) => {
      if (!event || typeof event !== "object") return;
      if (
        !event.location ||
        typeof event.location.latitude !== "number" ||
        typeof event.location.longitude !== "number"
      ) {
        return;
      }

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
    return clusters;
  };

  const clusterLocations = (events: MapLocation[]) => {
    const locationMap = new Map<string, LocationCluster>();

    events.forEach((event) => {
      if (!event || typeof event !== "object") return;
      if (
        !event.location ||
        typeof event.location.latitude !== "number" ||
        typeof event.location.longitude !== "number"
      ) {
        return;
      }

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
    return clusters;
  };

  const hitEventsApi = async (
    page: number | string,
    pageSize: number | string,
    selectedCat: string,
    currentDeviceLocation?: { latitude: number; longitude: number } | null
  ): Promise<MapEvent[]> => {
    setIsLoading(true);

    ///fetch user
    try {
      if (!session?.user?.id) {
        return [] as MapEvent[];
      }

      const { data, error: supabaseError } = await supabase
        .from("users")
        .select("*")
        .eq("id", session.user.id)
        .single();

      if (supabaseError) throw supabaseError;
      user = data;
    } catch (e) {
    } finally {
    }

    ///fetch location
    try {
      if (!session?.user?.id) {
        return [] as MapEvent[];
      }

      const { data, error: supabaseError } = await supabase
        .from("user_locations")
        .select("*")
        .eq("user_id", session.user.id)
        .order("last_updated", { ascending: false })
        .limit(1);

      if (supabaseError) throw supabaseError;
      userLocation = (data as any[])?.[0] ?? null;
    } catch (e) {
    } finally {
    }

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error("No valid auth session");
      }

      // 2. get event using our API
      const eventData = {
        latitude:
          currentDeviceLocation?.latitude != null
            ? currentDeviceLocation.latitude
            : user != null &&
              user?.event_location_preference == 1 &&
              userLocation?.latitude != null
            ? parseFloat(userLocation.latitude)
            : center && center[0] && center[0] !== 0
            ? center[0]
            : 25.7617, // Fallback to Miami
        longitude:
          currentDeviceLocation?.longitude != null
            ? currentDeviceLocation.longitude
            : user != null &&
              user?.event_location_preference == 1 &&
              userLocation?.longitude != null
            ? parseFloat(userLocation.longitude)
            : center && center[1] && center[1] !== 0
            ? center[1]
            : -80.1918, // Fallback to Miami
        category:
          selectedCat != null
            ? selectedCat !== "All Events"
              ? selectedCat
              : ""
            : "",
      };

      // We always have valid coordinates now (Miami fallback)
      console.log("📍 Map events API coordinates:", `${eventData.latitude}, ${eventData.longitude}`);

      try {
        if (!session?.user?.id) {
          return [] as MapEvent[];
        }
        ///fetch events
        const response = await fetch(
          `${process.env.BACKEND_MAP_URL}/api/events/all?page=${page}&limit=999999`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify(eventData),
          }
        );

        if (!response.ok) {
          throw new Error(await response.text());
        }

        const data_ = await response.json();
        const data = data_.events;

        // Validate event data
        const validEvents = (data || []).filter((event: any) => {
          if (!event || typeof event !== "object") return false;
          const isValid =
            event.location &&
            typeof event.location.latitude === "number" &&
            typeof event.location.longitude === "number" &&
            !isNaN(event.location.latitude) &&
            !isNaN(event.location.longitude) &&
            Math.abs(event.location.latitude) <= 90 &&
            Math.abs(event.location.longitude) <= 180;

          if (!isValid) {
          } else {
          }
          return isValid;
        });

        if (!isMountedRef.current) return [] as MapEvent[];

        // Update cache and state
        cachedEventsRef.current = validEvents;
        lastFetchTimeRef.current = Date.now();
        setEventsHome(validEvents);
        // setEventsHome(prevEvents => [...prevEvents, ...validEvents]);
        return validEvents;
      } catch (e) {
        return [] as MapEvent[];
      } finally {
      }
    } catch (err) {
      if (!isMountedRef.current) return [] as MapEvent[];
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      if (!isMountedRef.current) return [] as MapEvent[];
      setIsLoading(false);
    }

    return [] as MapEvent[];
  };

  const fetchCategories = useCallback(async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error("No valid auth session");
      }
console.log("session.access_token>",session.access_token);
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

      if (!response.ok) {
        throw new Error(await response.text());
      }
      setCategories([]);
      const data = await response.json();
      setCategories(data);
      if (!isMountedRef.current) return;

      setError(null);
    } catch (err) {
      if (!isMountedRef.current) return;
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      if (!isMountedRef.current) return;
      setIsLoading(false);
    }
  }, []);

  // Initial fetch only
  useEffect(() => {
    // isMountedRef.current = true;
    fetchCategories();
    // return () => {
    //   isMountedRef.current = false;
    // };
  }, [fetchCategories]);

  const fetchAllEvents = useCallback(
    async (centerr: any[]) => {
      console.log("[Events] fetchAllEvents center:", centerr);
      console.log(
        "[Events] isLoading:",
        isLoadingRef.current,
        "isMounted:",
        isMountedRef.current
      );
      // Guard against invalid centers
      if (
        centerr == null ||
        !Array.isArray(centerr) ||
        centerr.length < 2 ||
        typeof centerr[0] !== "number" ||
        typeof centerr[1] !== "number" ||
        !Number.isFinite(centerr[0]) ||
        !Number.isFinite(centerr[1]) ||
        (centerr[0] === 0 && centerr[1] === 0)
      ) {
        console.log("[Events] Skipping fetch due to invalid center");
        return;
      }
      savedCentre = centerr;
      if (!isMountedRef.current || isLoadingRef.current) return;

      // Cache validation: Don't refetch if we have fresh data (within 5 minutes for expanded radius)
      const now = Date.now();
      const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes for large radius searches
      const lastCenter = lastCenterRef.current;
      const timeSinceLastFetch = now - lastFetchTimeRef.current;

      // Calculate the threshold based on radius - larger radius allows larger movement before invalidating cache
      const radiusInKm = radius / 1000;
      const movementThreshold = Math.min(
        0.05,
        Math.max(0.01, radiusInKm / 1000)
      ); // 0.01-0.05 degrees based on radius

      // For long-distance navigation (different continents/states), invalidate cache more aggressively
      let hasValidCache = false;
      if (lastCenter) {
        // Calculate distance moved
        const R = 6371; // Earth's radius in km
        const dLat = ((centerr[0] - lastCenter[0]) * Math.PI) / 180;
        const dLng = ((centerr[1] - lastCenter[1]) * Math.PI) / 180;
        const a =
          Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos((lastCenter[0] * Math.PI) / 180) *
            Math.cos((centerr[0] * Math.PI) / 180) *
            Math.sin(dLng / 2) *
            Math.sin(dLng / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distanceMoved = R * c;

        // If moved >100km, invalidate cache to ensure fresh data for new region
        if (distanceMoved > 100) {
          console.log(
            `[Events] 🌍 Long distance movement (${distanceMoved.toFixed(
              1
            )}km) - invalidating cache for fresh data load`
          );
          hasValidCache = false;
          // Don't clear location data here - let fresh data load and replace it naturally
        } else {
          // Standard cache validation for regional movement
          hasValidCache =
            cachedEventsRef.current.length > 0 &&
            timeSinceLastFetch < CACHE_DURATION &&
            Math.abs(lastCenter[0] - centerr[0]) < movementThreshold &&
            Math.abs(lastCenter[1] - centerr[1]) < movementThreshold;
        }
      }

      if (hasValidCache) {
        console.log("[Events] Using cached data, skipping API call");
        console.log(
          `[Events] Cache age: ${Math.round(
            timeSinceLastFetch / 1000
          )}s, radius: ${radiusInKm}km`
        );

        // Use cached events and trigger clustering
        setEvents(cachedEventsRef.current);
        return;
      }

      console.log("[Events] Fetching fresh data from API");
      lastCenterRef.current = [centerr[0], centerr[1]];
      isLoadingRef.current = true;
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
        user = data;
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
          .order("last_updated", { ascending: false })
          .limit(1);

        if (supabaseError) throw supabaseError;
        userLocation = (data as any[])?.[0] ?? null;
      } catch (e) {
      } finally {
      }

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session?.access_token) {
          throw new Error("No valid auth session");
        }

        // 2. get event using our API
        const eventData = {
          latitude:
            user != null &&
            user?.event_location_preference == 1 &&
            userLocation?.latitude != null
              ? parseFloat(userLocation.latitude)
              : savedCentre && savedCentre[0]
              ? savedCentre[0]
              : 0,
          longitude:
            user != null &&
            user?.event_location_preference == 1 &&
            userLocation?.longitude != null
              ? parseFloat(userLocation.longitude)
              : savedCentre && savedCentre[1]
              ? savedCentre[1]
              : 0,
        };
        // Toast.show({
        //   type: "success",
        //   text1: "eventData:"+eventData.latitude +"\n"+ eventData.longitude,
        // });

        ////fetch locations (POST all)
        try {
          console.log("[Events] 🚀 Starting locations/all API call...");
          console.log("[Events] 🚀 Backend URL:", process.env.BACKEND_MAP_URL);
          console.log("[Events] 🚀 Event data being sent:", eventData);

          const responseLocations = await fetch(
            `${process.env.BACKEND_MAP_URL}/api/locations/all`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${session.access_token}`,
              },
              body: JSON.stringify(eventData),
            }
          );

          console.log("[Events] 🚀 Response status:", responseLocations.status);
          console.log("[Events] 🚀 Response ok:", responseLocations.ok);

          if (!responseLocations.ok) {
            const errText = await responseLocations.text();
            console.log(
              "[Events] locations/all error:",
              responseLocations.status,
              errText
            );
          } else {
            const dataLocations = await responseLocations.json();
            const validLocations = (dataLocations || []).filter((loc: any) => {
              const isValid =
                loc.location &&
                typeof loc.location.latitude === "number" &&
                typeof loc.location.longitude === "number" &&
                Number.isFinite(loc.location.latitude) &&
                Number.isFinite(loc.location.longitude) &&
                Math.abs(loc.location.latitude) <= 90 &&
                Math.abs(loc.location.longitude) <= 180;
              return isValid;
            });
            console.log(
              `[Events] 📍 Loaded ${validLocations.length} static locations from API`
            );
            console.log(
              `[Events] 📍 Sample locations:`,
              validLocations.slice(0, 3).map((loc: any) => ({
                id: loc.id,
                name: loc.name,
                coords: [loc.location?.latitude, loc.location?.longitude],
                hasImages: !!loc.image_urls && loc.image_urls.length > 0,
                imageCount: loc.image_urls?.length || 0,
                firstImage: loc.image_urls?.[0],
              }))
            );

            // Log specific location if it contains "akodahatchee" or "wetlands"
            const searchedLocation = validLocations.find(
              (loc: any) =>
                loc.name?.toLowerCase().includes("akodahatchee") ||
                loc.name?.toLowerCase().includes("wetlands")
            );
            if (searchedLocation) {
              console.log(`[Events] 🔍 FOUND SEARCHED LOCATION:`, {
                id: searchedLocation.id,
                name: searchedLocation.name,
                coords: [
                  searchedLocation.location?.latitude,
                  searchedLocation.location?.longitude,
                ],
                image_urls: searchedLocation.image_urls,
                hasImages:
                  !!searchedLocation.image_urls &&
                  searchedLocation.image_urls.length > 0,
                category: searchedLocation.category,
                fullData: searchedLocation,
              });
            }
            setLocations(validLocations);
            // Don't clear clusters here - let the clustering effect handle it
            // setClustersLocations([]);
          }
        } catch (locErr) {
          console.log(
            "[Events] ❌ locations/all fetch failed, continuing without locations:",
            locErr
          );
          console.log(
            "[Events] ❌ Error details:",
            locErr instanceof Error ? locErr.message : String(locErr)
          );
          console.log(
            "[Events] ❌ Error stack:",
            locErr instanceof Error ? locErr.stack : "No stack trace available"
          );
        }
        // Set locations first, clustering will be done in a separate effect
        // setLocations(validLocations); // Removed duplicate call

        ///fetch events (POST all with high limit)
        const response = await fetch(
          `${process.env.BACKEND_MAP_URL}/api/events/all?page=1&limit=999999`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify(eventData),
          }
        );

        if (!response.ok) {
          throw new Error(await response.text());
        }

        const data_ = await response.json();
        const data = data_?.events || [];
        console.log(
          "[Events] Raw events count:",
          Array.isArray(data) ? data.length : 0
        );

        // Validate event data
        const validEvents = (data || []).filter((event: any) => {
          if (!event || typeof event !== "object") return false;
          const isValid =
            event.location &&
            typeof event.location.latitude === "number" &&
            typeof event.location.longitude === "number" &&
            !isNaN(event.location.latitude) &&
            !isNaN(event.location.longitude) &&
            Math.abs(event.location.latitude) <= 90 &&
            Math.abs(event.location.longitude) <= 180;
          if (!isValid) {
          }
          return isValid;
        });

        if (!isMountedRef.current) return;

        // Update cache and state
        cachedEventsRef.current = validEvents;
        lastFetchTimeRef.current = Date.now();
        setEvents(validEvents);
        console.log("[Events] Valid events count:", validEvents.length);
        setClusters([]);
        setClustersNow([]);
        setClustersToday([]);
        setClustersTomorrow([]);
        // Set events first, clustering will be done in a separate effect
        setEvents(validEvents);

        // Validate event data
        const validEventsHome = data.filter((event: any) => {
          const isValid =
            !event.is_ticketmaster &&
            event.location &&
            typeof event.location.latitude === "number" &&
            typeof event.location.longitude === "number" &&
            !isNaN(event.location.latitude) &&
            !isNaN(event.location.longitude) &&
            Math.abs(event.location.latitude) <= 90 &&
            Math.abs(event.location.longitude) <= 180;

          if (!isValid) {
          }
          return isValid;
        });
        setEventsHome(validEventsHome);

        // "Now" = within the next 4 hours
        const nowList = validEvents.filter((event: any) => {
          const eventTime = new Date(event?.start_datetime).getTime();

          // Check if the event starts between now and the next 4 hours
          // return eventTime >= nowTime && eventTime <= FOUR_HOURS_IN_MS;
          return eventTime >= nowTime && eventTime <= next24Hours;
        });
        setEventsNow(nowList);
        const newClustersNow = clusterEvents(nowList);
        setClustersNow(newClustersNow);

        const todayList = validEvents.filter((event: any) => {
          const eventDateObj = new Date(event?.start_datetime);
          // const eventTime = eventDateObj.getTime();
          let localEventTime = format(
            new Date(event?.start_datetime),
            "yyyy-MM-dd"
          );
          let localnow = format(new Date(now), "yyyy-MM-dd");

          const day = new Date(localEventTime).getDay(); // 0 = Sunday, 5 = Friday, 6 = Saturday
          const eventTime = new Date(localEventTime).getTime();
          return eventTime >= nowTime && eventTime <= next7Days;
        });
        setEventsToday(todayList);
        const newClustersToday = clusterEvents(todayList);
        setClustersToday(newClustersToday);

        const tomorrowList = validEvents.filter((event: any) => {
          let localEventTime = format(
            new Date(event?.start_datetime),
            "yyyy-MM-dd"
          );
          let localnow = format(new Date(now), "yyyy-MM-dd");

          const day = new Date(localEventTime).getDay(); // 0 = Sunday, 5 = Friday, 6 = Saturday
          const eventTime = new Date(localEventTime).getTime();
          return (
            (day === 5 || day === 6 || day === 0) &&
            eventTime >= nowTime &&
            eventTime <= next7Days
          );
        });
        setEventsTomorrow(tomorrowList);

        const newClustersTomorrow = clusterEvents(tomorrowList);
        setClustersTomorrow(newClustersTomorrow);
        setError(null);
      } catch (err) {
        if (!isMountedRef.current) return;
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        if (!isMountedRef.current) return;
        isLoadingRef.current = false;
        setIsLoading(false);
      }
    },
    [session]
  );

  // Handle clustering when events change
  useEffect(() => {
    if (
      events.length > 0 &&
      JSON.stringify(events) !== JSON.stringify(lastEventsRef.current)
    ) {
      lastEventsRef.current = events;

      // Create initial clusters
      const newClusters = clusterEvents(events);
      setClusters(newClusters);

      // "Now" = show all events for now (temporarily disable time filtering)
      const nowListt = events.filter((event: any) => {
        const eventTime = new Date(event?.start_datetime).getTime();
        const isInRange = true; // Show all events
        return isInRange;
      });
      const newClustersNow = clusterEvents(nowListt);
      setClustersNow(newClustersNow);

      const todayListt = events.filter((event: any) => {
        const eventDateObj = new Date(event?.start_datetime);
        let localEventTime = format(
          new Date(event?.start_datetime),
          "yyyy-MM-dd"
        );
        let localnow = format(new Date(now), "yyyy-MM-dd");

        const day = new Date(localEventTime).getDay(); // 0 = Sunday, 5 = Friday, 6 = Saturday
        const eventTime = new Date(localEventTime).getTime();
        const isInRange = true; // Show all events
        return isInRange;
      });
      const newClustersToday = clusterEvents(todayListt);
      setClustersToday(newClustersToday);

      const tomorrowListt = events.filter((event: any) => {
        let localEventTime = format(
          new Date(event?.start_datetime),
          "yyyy-MM-dd"
        );
        let localnow = format(new Date(now), "yyyy-MM-dd");

        const day = new Date(localEventTime).getDay(); // 0 = Sunday, 5 = Friday, 6 = Saturday
        const eventTime = new Date(localEventTime).getTime();
        const isWeekend = day === 5 || day === 6 || day === 0;
        const isInRange = true; // Show all events
        return isInRange;
      });
      const newClustersTomorrow = clusterEvents(tomorrowListt);
      setClustersTomorrow(newClustersTomorrow);
    }
  }, [events]);

  // Handle clustering when locations change
  useEffect(() => {
    if (
      locations.length > 0 &&
      JSON.stringify(locations) !== JSON.stringify(lastLocationsRef.current)
    ) {
      console.log(`[Events] 🔄 Location data changed, updating clusters`);
      console.log(
        `[Events] 📍 Processing ${locations.length} locations for clustering`
      );

      // Log the searched location in the clustering process
      const searchedLocation = locations.find(
        (loc: any) =>
          loc.name?.toLowerCase().includes("akodahatchee") ||
          loc.name?.toLowerCase().includes("wetlands")
      );
      if (searchedLocation) {
        console.log(`[Events] 🔍 SEARCHED LOCATION IN CLUSTERING:`, {
          id: searchedLocation.id,
          name: searchedLocation.name,
          coords: [
            searchedLocation.location?.latitude,
            searchedLocation.location?.longitude,
          ],
          hasImages:
            !!searchedLocation.image_urls &&
            searchedLocation.image_urls.length > 0,
          image_urls: searchedLocation.image_urls,
        });
      }

      lastLocationsRef.current = locations;
      const newClustersLocations = clusterLocations(locations);

      // Log if our searched location made it into clusters
      const searchedCluster = newClustersLocations.find(
        (cluster: any) =>
          cluster.mainEvent?.name?.toLowerCase().includes("akodahatchee") ||
          cluster.mainEvent?.name?.toLowerCase().includes("wetlands")
      );
      if (searchedCluster) {
        console.log(`[Events] 🔍 SEARCHED LOCATION CLUSTERED:`, {
          mainEventId: searchedCluster.mainEvent?.id,
          mainEventName: searchedCluster.mainEvent?.name,
          coords: [
            searchedCluster.location.latitude,
            searchedCluster.location.longitude,
          ],
          hasMainEvent: !!searchedCluster.mainEvent,
          mainEventImages: searchedCluster.mainEvent?.image_urls,
        });
      } else {
        console.log(`[Events] ⚠️ SEARCHED LOCATION NOT FOUND IN CLUSTERS`);
      }

      console.log(
        `[Events] 📍 Created ${newClustersLocations.length} location clusters`
      );
      setClustersLocations(newClustersLocations);
    } else if (locations.length === 0) {
      console.log(`[Events] ⚠️ No locations to cluster`);
    } else {
      console.log(`[Events] 📍 Location data unchanged, skipping clustering`);
    }
  }, [locations]);

  // Initial fetch only - with proper center change management
  useEffect(() => {
    isMountedRef.current = true;

    // Only fetch if center is valid and has significantly changed
    if (center && center[0] !== 0 && center[1] !== 0) {
      const lastCenter = lastCenterRef.current;

      // Calculate distance from last center to determine if we need to fetch
      let shouldFetch = false;

      if (!lastCenter) {
        // First time, always fetch
        shouldFetch = true;
        console.log("[Events] Initial center set, fetching data");
      } else {
        // Calculate distance moved
        const radiusInKm = radius / 1000;
        const movementThreshold = Math.min(
          0.05,
          Math.max(0.01, radiusInKm / 1000)
        );
        const distance = Math.sqrt(
          Math.pow(center[0] - lastCenter[0], 2) +
            Math.pow(center[1] - lastCenter[1], 2)
        );

        if (distance > movementThreshold) {
          shouldFetch = true;
          console.log(
            `[Events] Center moved ${distance.toFixed(
              4
            )} degrees (threshold: ${movementThreshold.toFixed(
              4
            )}), fetching new data`
          );
        } else {
          console.log(
            `[Events] Center change too small (${distance.toFixed(
              4
            )} < ${movementThreshold.toFixed(4)}), using cached data`
          );
        }
      }

      if (shouldFetch) {
        // Debounce the fetch call to prevent rapid API calls
        if (fetchTimeoutRef.current) {
          clearTimeout(fetchTimeoutRef.current);
        }

        fetchTimeoutRef.current = setTimeout(() => {
          fetchAllEvents(center);
        }, 500); // 500ms debounce
      }
    }

    return () => {
      isMountedRef.current = false;
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
    };
  }, [center, radius]); // Add radius to dependencies since it affects threshold calculation

  // useEffect(() => {
  //   if (Platform.OS === "android") {
  //     if (!firstHit) {
  //       console.log("center changed:", center);
  //       //setcLocation(center);
  //       // Toast.show({
  //       //   type: "success",
  //       //   text1: "center changed:"+center +firstHit,
  //       // });

  //       fetchAllEvents(center);
  //       lastCenterRef.current = center;
  //       setTimeout(() => {
  //         setfirstHit(true);
  //       }, 3000);
  //     } else {
  //       // Check if center has meaningfully changed (more than 0.01 degrees)
  //       const lastCenter = lastCenterRef.current;
  //       console.log("[Events] Checking center change:", {
  //         current: center,
  //         last: lastCenter,
  //         changed:
  //           !lastCenter ||
  //           Math.abs(center[0] - lastCenter[0]) > 0.01 ||
  //           Math.abs(center[1] - lastCenter[1]) > 0.01,
  //       });

  //       if (
  //         !lastCenter ||
  //         Math.abs(center[0] - lastCenter[0]) > 0.01 ||
  //         Math.abs(center[1] - lastCenter[1]) > 0.01
  //       ) {
  //         // Fetch new events when center changes after initial load
  //         console.log(
  //         "[Events] Center changed, fetching new events for:",
  //         center
  //       );
  //         fetchAllEvents(center);
  //         lastCenterRef.current = center;
  //       } else {
  //         console.log("[Events] Center unchanged, skipping fetch");
  //       }
  //     }
  //   } else {
  //     if (!firstHit) {
  //       console.log("center changed:", center);
  //       //setcLocation(center);
  //       // Toast.show({
  //       //   type: "success",
  //       //   text1: "center changed:"+center +firstHit,
  //       // });

  //       fetchAllEvents(center);
  //       lastCenterRef.current = center;
  //       lastCenterRef.current = center;
  //       setTimeout(() => {
  //         setfirstHit(true);
  //       }, 300);
  //     } else {
  //       // Check if center has meaningfully changed (more than 0.01 degrees)
  //       const lastCenter = lastCenterRef.current;
  //       console.log("[Events] Checking center change:", {
  //         current: center,
  //         last: lastCenter,
  //         changed:
  //           !lastCenter ||
  //           Math.abs(center[0] - lastCenter[0]) > 0.01 ||
  //           Math.abs(center[1] - lastCenter[1]) > 0.01,
  //       });

  //       if (
  //         !lastCenter ||
  //         Math.abs(center[0] - lastCenter[0]) > 0.01 ||
  //         Math.abs(center[1] - lastCenter[1]) > 0.01
  //       ) {
  //         // Fetch new events when center changes after initial load
  //         console.log(
  //         "[Events] Center changed, fetching new events for:",
  //         center
  //       );
  //         fetchAllEvents(center);
  //         lastCenterRef.current = center;
  //       } else {
  //         console.log("[Events] Center unchanged, skipping fetch");
  //       }
  //     }
  //   }
  // }, [center]); // This runs every time `location` changes

  // Memoize the center value to prevent unnecessary updates
  const memoizedCenter = useMemo(() => center, [center[0], center[1]]);

  const handleEventClick = useCallback((event: MapEvent) => {
    setSelectedEvent(event);
  }, []);

  const handleCloseModal = useCallback(() => {
    setSelectedEvent(null);
  }, []);

  // Debounce ref for force refresh to prevent rapid calls
  const forceRefreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastForceRefreshRef = useRef<number>(0);
  const fetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Force refresh function for external use (e.g., from search navigation)
  const forceRefreshLocations = useCallback(() => {
    const now = Date.now();
    const timeSinceLastRefresh = now - lastForceRefreshRef.current;

    // Prevent rapid successive calls (minimum 2 seconds between calls)
    if (timeSinceLastRefresh < 2000) {
      console.log(
        `[Events] 🚫 Force refresh debounced (${timeSinceLastRefresh}ms since last call)`
      );
      return;
    }

    // Clear any pending timeout
    if (forceRefreshTimeoutRef.current) {
      clearTimeout(forceRefreshTimeoutRef.current);
    }

    console.log("[Events] 🔄 Force refreshing location data...");
    lastForceRefreshRef.current = now;

    // Don't clear existing data immediately - let new data load first
    // Reset cache to force fresh fetch
    lastFetchTimeRef.current = 0;

    // Trigger fetch if we have a center
    if (center && center[0] !== 0 && center[1] !== 0) {
      fetchAllEvents(center);
    }
  }, [center, fetchAllEvents]);

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
    forceRefreshLocations,
  };
}
