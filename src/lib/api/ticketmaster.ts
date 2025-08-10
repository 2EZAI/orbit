import { supabase } from "~/src/lib/supabase";
import { format } from "date-fns";
import * as Location from "expo-location";

// Fetch all events from backend (including Ticketmaster)
export async function fetchAllEvents(options?: {
  latitude?: number | null;
  longitude?: number | null;
}) {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.access_token) {
      console.log("No session token available for events API");
      return [];
    }

    const backendUrl = process.env.BACKEND_MAP_URL;
    console.log("Fetching all events from:", `${backendUrl}/api/events/nearby`);

    // Create a timeout promise
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error("Request timeout")), 5000); // 5 second timeout
    });

    // Get current device location like the map does (unless overrides provided)
    let currentDeviceLocation: { latitude: number; longitude: number } | null =
      null;

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === "granted") {
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.BestForNavigation,
        });
        currentDeviceLocation = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        };
        console.log("Got current device location:", currentDeviceLocation);
      }
    } catch (error) {
      console.log("Could not get current device location:", error);
    }

    // Get user and user location like the map does
    let user: any = null;
    let userLocation: any = null;

    // Fetch user data
    try {
      const { data, error: supabaseError } = await supabase
        .from("users")
        .select("*")
        .eq("id", session.user.id)
        .single();

      if (supabaseError) throw supabaseError;
      user = data;
    } catch (e) {
      console.log("Could not get user data");
    }

    // Fetch most recent user location (handle multiple rows safely)
    try {
      const { data, error: supabaseError } = await supabase
        .from("user_locations")
        .select("*")
        .eq("user_id", session.user.id)
        .order("last_updated", { ascending: false })
        .limit(1);

      if (supabaseError) throw supabaseError;
      userLocation = (data && data[0]) || null;
    } catch (e) {
      console.log("Could not get user location", e);
    }

    // FIXED: Respect explicit coords from caller, then Orbit, then device
    const providedLat = options?.latitude ?? null;
    const providedLng = options?.longitude ?? null;

    const eventData = {
      latitude:
        providedLat != null
          ? providedLat
          : user?.event_location_preference === 1 &&
            userLocation?.latitude != null
          ? parseFloat(userLocation.latitude)
          : currentDeviceLocation?.latitude != null
          ? currentDeviceLocation.latitude
          : null,
      longitude:
        providedLng != null
          ? providedLng
          : user?.event_location_preference === 1 &&
            userLocation?.longitude != null
          ? parseFloat(userLocation.longitude)
          : currentDeviceLocation?.longitude != null
          ? currentDeviceLocation.longitude
          : null,
    };

    // Only proceed if we have valid coordinates
    if (eventData.latitude == null || eventData.longitude == null) {
      console.log("No valid coordinates available, returning empty events");
      return [];
    }

    console.log("Using coordinates for events:", eventData);

    const fetchPromise = fetch(
      `${backendUrl}/api/events/nearby?lat=${eventData.latitude}&lng=${
        eventData.longitude
      }&radius=${50_000}&limit_count=1000`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
      }
    );

    // Race between fetch and timeout
    const response = (await Promise.race([
      fetchPromise,
      timeoutPromise,
    ])) as Response;

    if (!response.ok) {
      console.error(
        "Failed to fetch all events:",
        response.status,
        response.statusText
      );
      const errorText = await response.text();
      console.error("Error response:", errorText);

      // Return empty array if API fails
      console.log("API failed, returning empty events array");
      return [];
    }

    const data = await response.json();

    // Nearby endpoint already returns an array
    const allEvents = Array.isArray(data) ? data : data?.events || [];
    console.log("Number of all events received:", allEvents.length);

    const transformedEvents = allEvents.map((event: any) => ({
      ...event,
      image: event.image_urls?.[0],
      title: event.name,
      date: format(new Date(event.start_datetime), "EEEE MMM d • h a"),
      location: event.address || event.venue_name,
      attendees: event.attendees?.count || 0,
    }));

    console.log("Transformed all events:", transformedEvents.length);
    return transformedEvents;
  } catch (error) {
    console.error("Error fetching all events:", error);

    // Return empty array if API fails
    console.log("API failed due to error, returning empty events array");
    return [];
  }
}

// Fetch ALL events without any limit (for home feed)
export async function fetchAllEventsUnlimited(options?: {
  latitude?: number | null;
  longitude?: number | null;
}) {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.access_token) {
      console.log("No session token available for unlimited events API");
      return [];
    }

    const backendUrl = process.env.BACKEND_MAP_URL;
    console.log(
      "Fetching unlimited events from:",
      `${backendUrl}/api/events/nearby`
    );

    // Create a timeout promise
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error("Request timeout")), 10000); // 10 second timeout for unlimited
    });

    // Get current device location like the map does (unless overrides provided)
    let currentDeviceLocation: { latitude: number; longitude: number } | null =
      null;

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === "granted") {
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.BestForNavigation,
        });
        currentDeviceLocation = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        };
        console.log("Got current device location:", currentDeviceLocation);
      }
    } catch (error) {
      console.log("Could not get current device location:", error);
    }

    // Get user and user location like the map does
    let user: any = null;
    let userLocation: any = null;

    // Fetch user data
    try {
      const { data, error: supabaseError } = await supabase
        .from("users")
        .select("*")
        .eq("id", session.user.id)
        .single();

      if (supabaseError) throw supabaseError;
      user = data;
    } catch (e) {
      console.log("Could not get user data");
    }

    // Fetch most recent user location (handle multiple rows safely)
    try {
      const { data, error: supabaseError } = await supabase
        .from("user_locations")
        .select("*")
        .eq("user_id", session.user.id)
        .order("last_updated", { ascending: false })
        .limit(1);

      if (supabaseError) throw supabaseError;
      userLocation = (data && data[0]) || null;
    } catch (e) {
      console.log("Could not get user location", e);
    }

    // FIXED: Respect explicit coords from caller, then Orbit, then device
    const providedLat = options?.latitude ?? null;
    const providedLng = options?.longitude ?? null;

    const eventData = {
      latitude:
        providedLat != null
          ? providedLat
          : user?.event_location_preference === 1 &&
            userLocation?.latitude != null
          ? parseFloat(userLocation.latitude)
          : currentDeviceLocation?.latitude != null
          ? currentDeviceLocation.latitude
          : null,
      longitude:
        providedLng != null
          ? providedLng
          : user?.event_location_preference === 1 &&
            userLocation?.longitude != null
          ? parseFloat(userLocation.longitude)
          : currentDeviceLocation?.longitude != null
          ? currentDeviceLocation.longitude
          : null,
    };

    // Only proceed if we have valid coordinates
    if (eventData.latitude == null || eventData.longitude == null) {
      console.log("No valid coordinates available, returning empty events");
      return [];
    }

    console.log("Using coordinates for unlimited events:", eventData);

    // Use /all endpoint to get both Supabase AND Ticketmaster events
    const fetchPromise = fetch(`${backendUrl}/api/events/all`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(eventData),
    });

    // Race between fetch and timeout
    const response = (await Promise.race([
      fetchPromise,
      timeoutPromise,
    ])) as Response;

    if (!response.ok) {
      console.error(
        "Failed to fetch unlimited events:",
        response.status,
        response.statusText
      );
      const errorText = await response.text();
      console.error("Error response:", errorText);

      // Return empty array if API fails
      console.log("API failed, returning empty events array");
      return [];
    }

    const data = await response.json();

    // /all endpoint returns {events: [...]} format
    const allEvents = Array.isArray(data) ? data : data?.events || [];
    console.log("Number of unlimited events received:", allEvents.length);

    const transformedEvents = allEvents.map((event: any) => ({
      ...event,
      image: event.image_urls?.[0],
      title: event.name,
      date: format(new Date(event.start_datetime), "EEEE MMM d • h a"),
      location: event.address || event.venue_name,
      attendees: event.attendees?.count || 0,
    }));

    console.log("Transformed unlimited events:", transformedEvents.length);
    return transformedEvents;
  } catch (error) {
    console.error("Error fetching unlimited events:", error);

    // Return empty array if API fails
    console.log("API failed due to error, returning empty events array");
    return [];
  }
}

// Keep the old function for backward compatibility
export async function fetchTicketmasterEvents() {
  const allEvents = await fetchAllEvents();
  // Filter only Ticketmaster events for backward compatibility
  return allEvents.filter((event: any) => event.is_ticketmaster);
}
