import { useAuth } from "~/src/lib/auth";

export function useEventDetails() {
  const { session } = useAuth();
  const getEventDetails = async (eventId: string, source: string) => {
    if (!session) {
      return;
    }
    const response = await fetch(
      `${process.env.BACKEND_MAP_URL}/api/events/${eventId}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          source: source === "ticketmaster" ? "ticketmaster" : "supabase",
        }),
      }
    );
    if (!response.ok) {
      return;
    }
    const data = await response.json();
    return data;
  };
  return { getEventDetails };
}
