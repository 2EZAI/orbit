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
      console.log(response);
      return;
    }
    const data = await response.json();
    return data;
  };

  const getItemDetails = async (id: string, source: string) => {
    if (!session) {
      return null;
    }

    const response = await fetch(
      `${process.env.VITE_BACKEND_API}/api/details`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          id,
          source,
        }),
      }
    );

    if (!response.ok) {
      throw new Error("Failed to fetch item details");
    }

    const result = await response.json();

    if (!result.success || !result.items[0]?.found) {
      throw new Error(result.items[0]?.error || "Item not found");
    }

    return result.items[0].data;
  };

  const getMultipleEventDetails = async (
    items: { id: string; source: string }[]
  ) => {
    if (!session) {
      return;
    }
    const response = await fetch(
      `${process.env.VITE_BACKEND_API}/api/details`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          items,
        }),
      }
    );

    if (!response.ok) {
      return;
    }

    const data = await response.json();

    return data;
  };

  return { getEventDetails, getMultipleEventDetails, getItemDetails };
}
