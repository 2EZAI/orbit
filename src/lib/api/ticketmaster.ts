import { supabase } from "~/src/lib/supabase";
import { format } from "date-fns";

// Fetch Ticketmaster events from backend
export async function fetchTicketmasterEvents() {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.access_token) return [];

    const response = await fetch(
      `${process.env.BACKEND_MAP_URL}/api/events/ticketmaster?limit=200`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
      }
    );

    if (!response.ok) {
      console.error("Failed to fetch Ticketmaster events:", response.status);
      return [];
    }

    const data = await response.json();
    return (data.events || []).map((event: any) => ({
      ...event,
      is_ticketmaster: true,
      image: event.image_urls?.[0],
      title: event.name,
      date: format(new Date(event.start_datetime), "EEEE MMM d • h a"),
      location: event.address || event.venue_name,
      attendees: 0, // Ticketmaster events don't have join counts
    }));
  } catch (error) {
    return [];
  }
}
