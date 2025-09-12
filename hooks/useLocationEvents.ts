import { useState, useEffect } from "react";
import { supabase } from "~/src/lib/supabase";

export interface LocationEvent {
  id: string;
  name: string;
  description: string | null;
  start_datetime: string;
  end_datetime: string | null;
  venue_name: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  external_url: string | null;
  image_urls: string[] | null;
  is_private: boolean;
  type: string | null;
  location_id: string | null;
  category_id: string | null;
  created_at: string | null;
  updated_at: string | null;
  created_by: string | null;
  // Joined data
  creator?: {
    id: string;
    name: string;
    username: string | null;
    avatar_url: string | null;
  };
  attendees?: {
    count: number;
    profiles: Array<{
      id: string;
      name: string;
      avatar_url: string | null;
    }>;
  };
}

interface UseLocationEventsResult {
  events: LocationEvent[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useLocationEvents(
  locationId: string | null
): UseLocationEventsResult {
  const [events, setEvents] = useState<LocationEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchEvents = async () => {
    if (!locationId) {
      setEvents([]);
      return;
    }

    setLoading(true);
    setError(null);
console.log("fetchEvents>>>")
    try {
      // Query events with creator information
      const { data: eventsData, error: eventsError } = await supabase
        .from("events")
        .select(
          `
          id,
          name,
          description,
          start_datetime,
          end_datetime,
          venue_name,
          address,
          city,
          state,
          postal_code,
          external_url,
          image_urls,
          is_private,
          type,
          location_id,
          category_id,
          created_at,
          updated_at,
          created_by,
          users(
            id,
            first_name,
            last_name,
            username,
            avatar_url
          )
        `
        )
        .eq("location_id", locationId)
        .order("start_datetime", { ascending: true });

      if (eventsError) {
        throw eventsError;
      }

      // Check if we found any events
      if (!eventsData || eventsData.length === 0) {
        setEvents([]);
        setLoading(false);
        return;
      }

      // Get attendee counts for each event
      const eventsWithAttendees = await Promise.all(
        (eventsData || []).map(async (event) => {
          try {
            // Get attendee count and profiles
            const { data: attendeesData, error: attendeesError } =
              await supabase
                .from("event_attendees")
                .select(
                  `
                user_id,
                user:user_id(
                  id,
                  first_name,
                  last_name,
                  username,
                  avatar_url
                )
              `
                )
                .eq("event_id", event.id);

            if (attendeesError) {
              // Silently handle attendees error
            }

            const attendees = {
              count: attendeesData?.length || 0,
              profiles: (attendeesData || [])
                .filter((a) => a.user)
                .map((a) => {
                  // Type assertion to handle Supabase's join result
                  const user = a.user as any;
                  return {
                    id: user.id,
                    name:
                      `${user.first_name || ""} ${
                        user.last_name || ""
                      }`.trim() ||
                      user.username ||
                      "Unknown User",
                    avatar_url: user.avatar_url,
                  };
                })
                .slice(0, 5), // Limit to first 5 for performance
            };

            // Extract creator from the joined users data
            const userInfo = (event as any).users;
            const creator = userInfo
              ? {
                  id: userInfo.id,
                  name:
                    `${userInfo.first_name || ""} ${
                      userInfo.last_name || ""
                    }`.trim() ||
                    userInfo.username ||
                    "Unknown User",
                  username: userInfo.username,
                  avatar_url: userInfo.avatar_url,
                }
              : undefined;

            return {
              ...event,
              creator,
              attendees,
            } as LocationEvent;
          } catch (err) {
            // Extract creator from the joined users data (fallback case)
            const creator = (event as any).users?.[0]
              ? {
                  id: (event as any).users[0].id,
                  name: (event as any).users[0].name,
                  username: (event as any).users[0].username,
                  avatar_url: (event as any).users[0].avatar_url,
                }
              : undefined;

            return {
              ...event,
              creator,
              attendees: { count: 0, profiles: [] },
            } as LocationEvent;
          }
        })
      );
console.log("fetRespo>",eventsWithAttendees)
      setEvents(eventsWithAttendees);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Unknown error occurred";
      setError(errorMessage);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [locationId]);

  return {
    events,
    loading,
    error,
    refetch: fetchEvents,
  };
}
