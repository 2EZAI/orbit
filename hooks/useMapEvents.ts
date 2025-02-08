import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Image } from "react-native";
import { supabase } from "~/src/lib/supabase";
import { debounce } from "lodash";

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
  created_by?: {
    id: string;
    name: string;
    username: string;
    avatar_url: string | null;
  };
}

type TimeRange = "now" | "today" | "tomorrow";

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

export function useMapEvents({
  center,
  radius = 500000,
  timeRange = "now",
}: UseMapEventsProps) {
  const [events, setEvents] = useState<MapEvent[]>([]);
  const [clusters, setClusters] = useState<EventCluster[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<MapEvent | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isMountedRef = useRef(true);
  const lastFetchTimeRef = useRef<number>(0);
  const cachedEventsRef = useRef<MapEvent[]>([]);

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

  const fetchAllEvents = useCallback(async () => {
    if (!isMountedRef.current || isLoading) return;
    setIsLoading(true);

    try {
      console.log("[Events] Fetching all events");

      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error("No valid auth session");
      }

      const response = await fetch(
        `${process.env.BACKEND_MAP_URL}/api/events/all`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const data = await response.json();
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

      // Create initial clusters
      const newClusters = clusterEvents(validEvents);
      console.log("[Events] Setting", newClusters.length, "clusters");
      setClusters(newClusters);
      setError(null);
    } catch (err) {
      console.error("[Events] Error fetching events:", err);
      if (!isMountedRef.current) return;
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      if (!isMountedRef.current) return;
      setIsLoading(false);
    }
  }, [clusterEvents]);

  // Initial fetch only
  useEffect(() => {
    isMountedRef.current = true;
    fetchAllEvents();
    return () => {
      isMountedRef.current = false;
    };
  }, [fetchAllEvents]);

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
    events,
    clusters,
    selectedEvent,
    isLoading,
    error,
    handleEventClick,
    handleCloseModal,
  };
}
