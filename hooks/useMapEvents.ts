import { useState, useEffect, useCallback, useRef } from "react";
import { Image } from "react-native";

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
  image_urls: string[];
  distance: number;
  attendees: {
    count: number;
    profiles: EventAttendee[];
  };
  categories: EventCategory[];
}

type TimeRange = "now" | "today" | "tomorrow";

interface UseMapEventsProps {
  center: [number, number]; // [latitude, longitude]
  radius?: number; // in meters
  timeRange?: TimeRange;
}

export function useMapEvents({
  center,
  radius = 5000,
  timeRange = "now",
}: UseMapEventsProps) {
  const [events, setEvents] = useState<MapEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<MapEvent | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastFetchTimeRef = useRef<number>(0);
  const lastFetchedCenterRef = useRef<[number, number]>(center);
  const eventCacheRef = useRef<Map<string, MapEvent>>(new Map());
  const isMountedRef = useRef(true);

  // Pre-load images for better performance
  const preloadEventImages = useCallback(async (newEvents: MapEvent[]) => {
    console.log("Preloading images for", newEvents.length, "events");
    const imagePromises = newEvents.flatMap((event) =>
      event.image_urls.map((url) =>
        Image.prefetch(url).catch((err) => {
          console.warn("Failed to preload image:", url, err);
          return false;
        })
      )
    );
    await Promise.all(imagePromises);
    console.log("Finished preloading images");
  }, []);

  // Debounced fetch function with better logging
  const fetchEvents = useCallback(
    async (forceFetch = false) => {
      const now = Date.now();
      const timeSinceLastFetch = now - lastFetchTimeRef.current;
      const [lastLat, lastLng] = lastFetchedCenterRef.current;
      const [newLat, newLng] = center;

      const distanceFromLastFetch =
        Math.sqrt(
          Math.pow(newLat - lastLat, 2) + Math.pow(newLng - lastLng, 2)
        ) * 111000; // Convert to meters

      console.log("Fetch check:", {
        timeSinceLastFetch: `${timeSinceLastFetch}ms`,
        distanceFromLastFetch: `${distanceFromLastFetch.toFixed(2)}m`,
        forceFetch,
        currentEvents: events.length,
      });

      // Only fetch if:
      // 1. Force fetch is true OR
      // 2. It's been more than 2 seconds since last fetch OR
      // 3. We've moved more than 20% of the radius OR
      // 4. This is the first fetch (lastFetchTime === 0)
      if (
        !forceFetch &&
        timeSinceLastFetch < 2000 &&
        distanceFromLastFetch < radius * 0.2 &&
        lastFetchTimeRef.current !== 0
      ) {
        console.log("Skipping fetch - using cached events");
        return;
      }

      if (!isMountedRef.current) return;
      setIsLoading(true);
      lastFetchTimeRef.current = now;
      lastFetchedCenterRef.current = center;

      try {
        const [lat, lng] = center;
        console.log("Fetching events with params:", {
          lat,
          lng,
          radius,
          timeRange,
        });

        // Calculate time range based on selection
        let startTime = new Date();
        let endTime = new Date();

        switch (timeRange) {
          case "today":
            startTime.setHours(0, 0, 0, 0);
            endTime.setHours(23, 59, 59, 999);
            break;
          case "tomorrow":
            startTime.setDate(startTime.getDate() + 1);
            startTime.setHours(0, 0, 0, 0);
            endTime.setDate(endTime.getDate() + 1);
            endTime.setHours(23, 59, 59, 999);
            break;
          case "now":
            // Show events starting in the next 30 days
            endTime.setDate(endTime.getDate() + 30);
            break;
        }

        const url = `${
          process.env.BACKEND_MAP_URL
        }/api/events/nearby?${new URLSearchParams({
          lat: lat.toString(),
          lng: lng.toString(),
          radius: (radius * 1.5).toString(), // Increase fetch radius by 50% to have buffer
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
        })}`;

        const response = await fetch(url);

        if (!response.ok) {
          throw new Error(await response.text());
        }

        const data = await response.json();
        console.log("Fetched", data.length, "events");

        // Update cache with new events
        const newCache = new Map(eventCacheRef.current);
        data.forEach((event: MapEvent) => {
          newCache.set(event.id, event);
        });
        eventCacheRef.current = newCache;

        // Combine cached events with new events
        const allEvents = Array.from(newCache.values());

        // Filter events by actual radius and remove duplicates
        const filteredEvents = allEvents.filter((event) => {
          const distance =
            Math.sqrt(
              Math.pow(event.location.latitude - center[0], 2) +
                Math.pow(event.location.longitude - center[1], 2)
            ) * 111000; // Convert to meters
          return distance <= radius * 1.2; // Keep events within 120% of requested radius
        });

        // Preload images before updating state
        await preloadEventImages(filteredEvents);

        if (!isMountedRef.current) return;
        setEvents(filteredEvents);
        setError(null);
      } catch (err) {
        console.error("Error fetching events:", err);
        if (!isMountedRef.current) return;
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        if (!isMountedRef.current) return;
        setIsLoading(false);
      }
    },
    [center, radius, timeRange, preloadEventImages]
  );

  // Initial fetch
  useEffect(() => {
    isMountedRef.current = true;
    fetchEvents(true); // Force fetch on mount
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Fetch when parameters change
  useEffect(() => {
    fetchEvents(false);
  }, [center, radius, timeRange]);

  const handleEventClick = useCallback((event: MapEvent) => {
    setSelectedEvent(event);
  }, []);

  const handleCloseModal = useCallback(() => {
    setSelectedEvent(null);
  }, []);

  return {
    events,
    selectedEvent,
    isLoading,
    error,
    handleEventClick,
    handleCloseModal,
  };
}
