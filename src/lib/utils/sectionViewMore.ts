import { supabase } from "~/src/lib/supabase";
import { fetchTicketmasterEvents } from "~/src/lib/api/ticketmaster";
import {
  transformEvent,
  transformLocation,
} from "~/src/lib/utils/transformers";

function shuffleArray(array: any[]) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export async function handleSectionViewMore(section: any): Promise<any[]> {
  try {
    let allSectionData: any[] = [];
    const now = new Date();

    if (section.key === "mixed") {
      // Get all events + locations mixed
      const [eventsResponse, locationsResponse] = await Promise.all([
        supabase
          .from("events")
          .select("*")
          .gte("start_datetime", now.toISOString())
          .order("start_datetime", { ascending: true }),
        supabase.from("static_locations").select("*"),
      ]);
      const events = (eventsResponse.data || []).map(transformEvent);
      const locations = (locationsResponse.data || []).map(transformLocation);
      allSectionData = shuffleArray([...events, ...locations]);
    } else if (section.key === "popular-places") {
      // Get all locations
      const locationsResponse = await supabase
        .from("static_locations")
        .select("*");
      allSectionData = (locationsResponse.data || []).map(transformLocation);
    } else if (section.key === "upcoming") {
      // Get all upcoming events (30 days)
      const eventsResponse = await supabase
        .from("events")
        .select("*")
        .gte("start_datetime", now.toISOString())
        .order("start_datetime", { ascending: true });
      const events = (eventsResponse.data || []).map(transformEvent);
      allSectionData = events.filter((event) => {
        if (event.is_ticketmaster) return false;
        const eventDate = new Date(event.start_datetime);
        const daysUntil =
          (eventDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
        return daysUntil >= 0 && daysUntil <= 30;
      });
    } else if (section.key === "this-month") {
      // Get all this month events
      const eventsResponse = await supabase
        .from("events")
        .select("*")
        .gte("start_datetime", now.toISOString())
        .order("start_datetime", { ascending: true });
      const events = (eventsResponse.data || []).map(transformEvent);
      allSectionData = events.filter((event) => {
        if (event.is_ticketmaster) return false;
        const eventDate = new Date(event.start_datetime);
        return (
          eventDate.getFullYear() === now.getFullYear() &&
          eventDate.getMonth() === now.getMonth()
        );
      });
    } else if (section.key === "next-month") {
      // Get all next month events
      const eventsResponse = await supabase
        .from("events")
        .select("*")
        .gte("start_datetime", now.toISOString())
        .order("start_datetime", { ascending: true });
      const events = (eventsResponse.data || []).map(transformEvent);
      const nextMonth = new Date();
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      allSectionData = events.filter((event) => {
        if (event.is_ticketmaster) return false;
        const eventDate = new Date(event.start_datetime);
        return (
          eventDate.getFullYear() === nextMonth.getFullYear() &&
          eventDate.getMonth() === nextMonth.getMonth()
        );
      });
    } else if (section.key === "ticketmaster") {
      // Get all Ticketmaster events
      const ticketmasterEvents = await fetchTicketmasterEvents();
      allSectionData = ticketmasterEvents || [];
    } else if (section.key.startsWith("category-")) {
      // Get all events for this category
      const categoryId = section.key.replace("category-", "");
      const [eventsResponse, locationsResponse] = await Promise.all([
        supabase
          .from("events")
          .select("*")
          .eq("category_id", categoryId)
          .gte("start_datetime", now.toISOString())
          .order("start_datetime", { ascending: true }),
        supabase
          .from("static_locations")
          .select("*")
          .eq("category_id", categoryId),
      ]);
      const events = (eventsResponse.data || []).map(transformEvent);
      const locations = (locationsResponse.data || []).map(transformLocation);
      allSectionData = [...events, ...locations];
    } else {
      // For any other section, get all events and locations
      const [eventsResponse, locationsResponse] = await Promise.all([
        supabase
          .from("events")
          .select("*")
          .gte("start_datetime", now.toISOString())
          .order("start_datetime", { ascending: true }),
        supabase.from("static_locations").select("*"),
      ]);
      const events = (eventsResponse.data || []).map(transformEvent);
      const locations = (locationsResponse.data || []).map(transformLocation);
      allSectionData = shuffleArray([...events, ...locations]);
    }

    console.log(
      `🔍 See All: ${section.title} - Found ${allSectionData.length} total items`
    );
    return allSectionData;
  } catch (error) {
    console.error("Error fetching section data:", error);
    return [];
  }
}
