import { supabase } from "~/src/lib/supabase";
// COMMENTED OUT: Old Ticketmaster API import - now using unified API
// import { fetchAllEvents } from "~/src/lib/api/ticketmaster";
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
      // Get all events and filter for Ticketmaster
      // COMMENTED OUT: Old API call - now using unified API
      // const allEvents = await fetchAllEvents();
      const allEvents: any[] = []; // Empty array - events now come from unified API
      allSectionData =
        allEvents.filter((event: any) => event.is_ticketmaster) || [];
    } else if (section.key === "this-weekend") {
      // Get all events and filter for this weekend
      // COMMENTED OUT: Old API call - now using unified API
      // const allEvents = await fetchAllEvents();
      const allEvents: any[] = []; // Empty array - events now come from unified API
      const today = new Date();
      allSectionData =
        allEvents.filter((event: any) => {
          const eventDate = new Date(event.start_datetime);
          const daysUntil = Math.floor(
            (eventDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
          );
          return daysUntil >= 0 && daysUntil <= 7;
        }) || [];
    } else if (section.key === "popular-events") {
      // Get all events and sort by popularity
      // COMMENTED OUT: Old API call - now using unified API
      // const allEvents = await fetchAllEvents();
      const allEvents: any[] = []; // Empty array - events now come from unified API
      allSectionData =
        allEvents
          .sort((a: any, b: any) => {
            const aAttendees = a.attendees?.count || 0;
            const bAttendees = b.attendees?.count || 0;
            return bAttendees - aAttendees;
          })
          .slice(0, 100) || [];
    } else if (section.key === "nearby-locations") {
      // Get all locations
      const { data: rpcData } = await supabase.rpc("get_home_feed_data", {});
      const locations = (rpcData?.locations || []).map(transformLocation);
      allSectionData = locations.slice(0, 100) || [];
    } else if (section.key === "trending-locations") {
      // Get all locations
      const { data: rpcData } = await supabase.rpc("get_home_feed_data", {});
      const locations = (rpcData?.locations || []).map(transformLocation);
      allSectionData = locations.slice(0, 100) || [];
    } else if (section.key === "featured-locations") {
      // Get all locations
      const { data: rpcData } = await supabase.rpc("get_home_feed_data", {});
      const locations = (rpcData?.locations || []).map(transformLocation);
      allSectionData = locations.slice(0, 100) || [];
    } else if (section.key === "new-locations") {
      // Get all locations
      const { data: rpcData } = await supabase.rpc("get_home_feed_data", {});
      const locations = (rpcData?.locations || []).map(transformLocation);
      allSectionData = locations.slice(0, 100) || [];
    } else if (section.key === "hot-locations") {
      // Get all locations
      const { data: rpcData } = await supabase.rpc("get_home_feed_data", {});
      const locations = (rpcData?.locations || []).map(transformLocation);
      allSectionData = locations.slice(0, 100) || [];
    } else if (section.key === "local-locations") {
      // Get all locations
      const { data: rpcData } = await supabase.rpc("get_home_feed_data", {});
      const locations = (rpcData?.locations || []).map(transformLocation);
      allSectionData = locations.slice(0, 100) || [];
    } else if (section.key === "this-week") {
      // Get all events and filter for this week
      // COMMENTED OUT: Old API call - now using unified API
      // const allEvents = await fetchAllEvents();
      const allEvents: any[] = []; // Empty array - events now come from unified API
      const today = new Date();
      allSectionData =
        allEvents.filter((event: any) => {
          const eventDate = new Date(event.start_datetime);
          const daysUntil = Math.floor(
            (eventDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
          );
          return daysUntil >= 0 && daysUntil <= 14;
        }) || [];
    } else if (section.key === "free-events") {
      // Get all events and filter for free events
      // COMMENTED OUT: Old API call - now using unified API
      // const allEvents = await fetchAllEvents();
      const allEvents: any[] = []; // Empty array - events now come from unified API
      allSectionData =
        allEvents.filter((event: any) => {
          const name = event.name?.toLowerCase() || "";
          const description = event.description?.toLowerCase() || "";
          return (
            name.includes("free") ||
            description.includes("free") ||
            name.includes("no cost") ||
            description.includes("no cost")
          );
        }) || [];
    } else if (section.key === "outdoor-events") {
      // Get all events and filter for outdoor events
      // COMMENTED OUT: Old API call - now using unified API
      // const allEvents = await fetchAllEvents();
      const allEvents: any[] = []; // Empty array - events now come from unified API
      allSectionData =
        allEvents.filter((event: any) => {
          const name = event.name?.toLowerCase() || "";
          const description = event.description?.toLowerCase() || "";
          const venue = event.venue_name?.toLowerCase() || "";
          return (
            name.includes("park") ||
            description.includes("park") ||
            venue.includes("park") ||
            name.includes("outdoor") ||
            description.includes("outdoor") ||
            name.includes("beach") ||
            description.includes("beach") ||
            name.includes("festival") ||
            description.includes("festival")
          );
        }) || [];
    } else if (section.key === "nightlife-events") {
      // Get all events and filter for nightlife
      // COMMENTED OUT: Old API call - now using unified API
      // const allEvents = await fetchAllEvents();
      const allEvents: any[] = []; // Empty array - events now come from unified API
      allSectionData =
        allEvents.filter((event: any) => {
          const name = event.name?.toLowerCase() || "";
          const description = event.description?.toLowerCase() || "";
          const venue = event.venue_name?.toLowerCase() || "";
          return (
            name.includes("club") ||
            description.includes("club") ||
            venue.includes("club") ||
            name.includes("bar") ||
            description.includes("bar") ||
            venue.includes("bar") ||
            name.includes("night") ||
            description.includes("night") ||
            name.includes("party") ||
            description.includes("party")
          );
        }) || [];
    } else if (section.key === "family-events") {
      // Get all events and filter for family friendly
      // COMMENTED OUT: Old API call - now using unified API
      // const allEvents = await fetchAllEvents();
      const allEvents: any[] = []; // Empty array - events now come from unified API
      allSectionData =
        allEvents.filter((event: any) => {
          const name = event.name?.toLowerCase() || "";
          const description = event.description?.toLowerCase() || "";
          return (
            name.includes("family") ||
            description.includes("family") ||
            name.includes("kids") ||
            description.includes("kids") ||
            name.includes("children") ||
            description.includes("children") ||
            name.includes("family-friendly") ||
            description.includes("family-friendly")
          );
        }) || [];
    } else if (section.key === "sports-events") {
      // Get all events and filter for sports
      // COMMENTED OUT: Old API call - now using unified API
      // const allEvents = await fetchAllEvents();
      const allEvents: any[] = []; // Empty array - events now come from unified API
      console.log("🔍 Sports Events - Total events fetched:", allEvents.length);

      allSectionData =
        allEvents.filter((event: any) => {
          const name = event.name?.toLowerCase() || "";
          const description = event.description?.toLowerCase() || "";
          const isSports =
            name.includes("sport") ||
            description.includes("sport") ||
            name.includes("game") ||
            description.includes("game") ||
            name.includes("match") ||
            description.includes("match") ||
            name.includes("tournament") ||
            description.includes("tournament");

          if (isSports) {
            console.log("🔍 Sports Event found:", event.name);
          }

          return isSports;
        }) || [];

      console.log("🔍 Sports Events - Filtered count:", allSectionData.length);
    } else if (section.key === "food-events") {
      // Get all events and filter for food & drink
      // COMMENTED OUT: Old API call - now using unified API
      // const allEvents = await fetchAllEvents();
      const allEvents: any[] = []; // Empty array - events now come from unified API
      allSectionData =
        allEvents.filter((event: any) => {
          const name = event.name?.toLowerCase() || "";
          const description = event.description?.toLowerCase() || "";
          return (
            name.includes("food") ||
            description.includes("food") ||
            name.includes("drink") ||
            description.includes("drink") ||
            name.includes("wine") ||
            description.includes("wine") ||
            name.includes("beer") ||
            description.includes("beer") ||
            name.includes("tasting") ||
            description.includes("tasting") ||
            name.includes("dinner") ||
            description.includes("dinner")
          );
        }) || [];
    } else if (section.key === "art-events") {
      // Get all events and filter for art & culture
      // COMMENTED OUT: Old API call - now using unified API
      // const allEvents = await fetchAllEvents();
      const allEvents: any[] = []; // Empty array - events now come from unified API
      allSectionData =
        allEvents.filter((event: any) => {
          const name = event.name?.toLowerCase() || "";
          const description = event.description?.toLowerCase() || "";
          return (
            name.includes("art") ||
            description.includes("art") ||
            name.includes("museum") ||
            description.includes("museum") ||
            name.includes("gallery") ||
            description.includes("gallery") ||
            name.includes("exhibition") ||
            description.includes("exhibition") ||
            name.includes("culture") ||
            description.includes("culture")
          );
        }) || [];
    } else if (section.key === "music-events") {
      // Get all events and filter for music
      // COMMENTED OUT: Old API call - now using unified API
      // const allEvents = await fetchAllEvents();
      const allEvents: any[] = []; // Empty array - events now come from unified API
      allSectionData =
        allEvents.filter((event: any) => {
          const name = event.name?.toLowerCase() || "";
          const description = event.description?.toLowerCase() || "";
          return (
            name.includes("concert") ||
            description.includes("concert") ||
            name.includes("music") ||
            description.includes("music") ||
            name.includes("band") ||
            description.includes("band") ||
            name.includes("dj") ||
            description.includes("dj") ||
            name.includes("live") ||
            description.includes("live")
          );
        }) || [];
    } else if (section.key === "business-events") {
      // Get all events and filter for business & networking
      // COMMENTED OUT: Old API call - now using unified API
      // const allEvents = await fetchAllEvents();
      const allEvents: any[] = []; // Empty array - events now come from unified API
      allSectionData =
        allEvents.filter((event: any) => {
          const name = event.name?.toLowerCase() || "";
          const description = event.description?.toLowerCase() || "";
          return (
            name.includes("business") ||
            description.includes("business") ||
            name.includes("networking") ||
            description.includes("networking") ||
            name.includes("conference") ||
            description.includes("conference") ||
            name.includes("workshop") ||
            description.includes("workshop") ||
            name.includes("seminar") ||
            description.includes("seminar")
          );
        }) || [];
    } else if (section.key === "tech-events") {
      // Get all events and filter for tech
      // COMMENTED OUT: Old API call - now using unified API
      // const allEvents = await fetchAllEvents();
      const allEvents: any[] = []; // Empty array - events now come from unified API
      allSectionData =
        allEvents.filter((event: any) => {
          const name = event.name?.toLowerCase() || "";
          const description = event.description?.toLowerCase() || "";
          return (
            name.includes("tech") ||
            description.includes("tech") ||
            name.includes("technology") ||
            description.includes("technology") ||
            name.includes("startup") ||
            description.includes("startup") ||
            name.includes("coding") ||
            description.includes("coding") ||
            name.includes("hackathon") ||
            description.includes("hackathon")
          );
        }) || [];
    } else if (section.key === "wellness-events") {
      // Get all events and filter for wellness & fitness
      // COMMENTED OUT: Old API call - now using unified API
      // const allEvents = await fetchAllEvents();
      const allEvents: any[] = []; // Empty array - events now come from unified API
      allSectionData =
        allEvents.filter((event: any) => {
          const name = event.name?.toLowerCase() || "";
          const description = event.description?.toLowerCase() || "";
          return (
            name.includes("yoga") ||
            description.includes("yoga") ||
            name.includes("fitness") ||
            description.includes("fitness") ||
            name.includes("wellness") ||
            description.includes("wellness") ||
            name.includes("meditation") ||
            description.includes("meditation") ||
            name.includes("workout") ||
            description.includes("workout")
          );
        }) || [];
    } else if (section.key === "educational-events") {
      // Get all events and filter for educational
      // COMMENTED OUT: Old API call - now using unified API
      // const allEvents = await fetchAllEvents();
      const allEvents: any[] = []; // Empty array - events now come from unified API
      allSectionData =
        allEvents.filter((event: any) => {
          const name = event.name?.toLowerCase() || "";
          const description = event.description?.toLowerCase() || "";
          return (
            name.includes("learn") ||
            description.includes("learn") ||
            name.includes("education") ||
            description.includes("education") ||
            name.includes("class") ||
            description.includes("class") ||
            name.includes("course") ||
            description.includes("course") ||
            name.includes("training") ||
            description.includes("training")
          );
        }) || [];
    } else if (section.key === "charity-events") {
      // Get all events and filter for charity & volunteer
      // COMMENTED OUT: Old API call - now using unified API
      // const allEvents = await fetchAllEvents();
      const allEvents: any[] = []; // Empty array - events now come from unified API
      allSectionData =
        allEvents.filter((event: any) => {
          const name = event.name?.toLowerCase() || "";
          const description = event.description?.toLowerCase() || "";
          return (
            name.includes("charity") ||
            description.includes("charity") ||
            name.includes("volunteer") ||
            description.includes("volunteer") ||
            name.includes("donation") ||
            description.includes("donation") ||
            name.includes("fundraiser") ||
            description.includes("fundraiser")
          );
        }) || [];
    } else if (section.key === "late-night-events") {
      // Get all events and filter for late night
      // COMMENTED OUT: Old API call - now using unified API
      // const allEvents = await fetchAllEvents();
      const allEvents: any[] = []; // Empty array - events now come from unified API
      allSectionData =
        allEvents.filter((event: any) => {
          const eventDate = new Date(event.start_datetime);
          const hours = eventDate.getHours();
          return hours >= 21 || hours <= 6; // 9 PM to 6 AM
        }) || [];
    } else if (section.key === "morning-events") {
      // Get all events and filter for morning
      // COMMENTED OUT: Old API call - now using unified API
      // const allEvents = await fetchAllEvents();
      const allEvents: any[] = []; // Empty array - events now come from unified API
      allSectionData =
        allEvents.filter((event: any) => {
          const eventDate = new Date(event.start_datetime);
          const hours = eventDate.getHours();
          return hours >= 6 && hours <= 12; // 6 AM to 12 PM
        }) || [];
    } else if (section.key === "afternoon-events") {
      // Get all events and filter for afternoon
      // COMMENTED OUT: Old API call - now using unified API
      // const allEvents = await fetchAllEvents();
      const allEvents: any[] = []; // Empty array - events now come from unified API
      allSectionData =
        allEvents.filter((event: any) => {
          const eventDate = new Date(event.start_datetime);
          const hours = eventDate.getHours();
          return hours >= 12 && hours <= 18; // 12 PM to 6 PM
        }) || [];
    } else if (section.key === "evening-events") {
      // Get all events and filter for evening
      // COMMENTED OUT: Old API call - now using unified API
      // const allEvents = await fetchAllEvents();
      const allEvents: any[] = []; // Empty array - events now come from unified API
      allSectionData =
        allEvents.filter((event: any) => {
          const eventDate = new Date(event.start_datetime);
          const hours = eventDate.getHours();
          return hours >= 18 && hours <= 21; // 6 PM to 9 PM
        }) || [];
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
    } else if (section.key === "more") {
      // Get all remaining events and locations
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
