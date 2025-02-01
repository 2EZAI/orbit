import { useState, useEffect, useCallback } from "react";

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

interface MapEvent {
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
  const [lastFetchTime, setLastFetchTime] = useState<number>(0);
  const [lastFetchedCenter, setLastFetchedCenter] =
    useState<[number, number]>(center);

  // Debounced fetch function
  const fetchEvents = useCallback(async () => {
    const now = Date.now();
    // Only fetch if it's been more than 2 seconds since the last fetch
    // or if we've moved more than 20% of the radius
    const timeSinceLastFetch = now - lastFetchTime;
    const distanceFromLastFetch =
      Math.sqrt(
        Math.pow(center[0] - lastFetchedCenter[0], 2) +
          Math.pow(center[1] - lastFetchedCenter[1], 2)
      ) * 111000; // Convert to meters (roughly)

    if (timeSinceLastFetch < 2000 && distanceFromLastFetch < radius * 0.2) {
      console.log("Skipping fetch, too soon or too close");
      return;
    }

    setIsLoading(true);
    setLastFetchTime(now);
    setLastFetchedCenter(center);

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
        radius: radius.toString(),
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
      })}`;

      console.log("Fetching from URL:", url);

      const response = await fetch(url);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Error response:", errorText);
        throw new Error("Failed to fetch events");
      }

      const data = await response.json();
      console.log("Received events:", data);

      // Merge new events with existing ones, keeping existing events that are still in range
      const newEventIds = new Set(data.map((e: MapEvent) => e.id));
      const existingEventsInRange = events.filter((e) => {
        const distance =
          Math.sqrt(
            Math.pow(e.location.latitude - center[0], 2) +
              Math.pow(e.location.longitude - center[1], 2)
          ) * 111000; // Convert to meters (roughly)
        return distance <= radius * 1.2; // Keep events within 120% of radius
      });
      const existingEventsToKeep = existingEventsInRange.filter(
        (e) => !newEventIds.has(e.id)
      );

      setEvents([...existingEventsToKeep, ...data]);
    } catch (err) {
      console.error("Error fetching events:", err);
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  }, [center, radius, timeRange, lastFetchTime, lastFetchedCenter, events]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const handleEventClick = (event: MapEvent) => {
    setSelectedEvent(event);
  };

  const handleCloseModal = () => {
    setSelectedEvent(null);
  };

  return {
    events,
    selectedEvent,
    isLoading,
    error,
    handleEventClick,
    handleCloseModal,
  };
}
