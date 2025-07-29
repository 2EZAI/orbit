import { supabase } from "~/src/lib/supabase";
import { format } from "date-fns";
import * as Location from "expo-location";

// Fetch all events from backend (including Ticketmaster)
export async function fetchAllEvents() {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.access_token) {
      console.log("No session token available for events API");
      return [];
    }

    const backendUrl = process.env.BACKEND_MAP_URL;
    console.log("Fetching all events from:", `${backendUrl}/api/events/all`);

    // Create a timeout promise
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error("Request timeout")), 5000); // 5 second timeout
    });

    // Get current device location like the map does
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

    // Fetch user location
    try {
      const { data, error: supabaseError } = await supabase
        .from("user_locations")
        .select("*")
        .eq("user_id", session.user.id)
        .single();

      if (supabaseError) throw supabaseError;
      userLocation = data;
    } catch (e) {
      console.log("Could not get user location");
    }

    // Use the same location logic as the map - prioritize current device location
    const eventData = {
      latitude:
        currentDeviceLocation?.latitude != null
          ? currentDeviceLocation.latitude
          : user != null &&
            user?.event_location_preference == 1 &&
            userLocation?.latitude != null
          ? parseFloat(userLocation.latitude)
          : null,
      longitude:
        currentDeviceLocation?.longitude != null
          ? currentDeviceLocation.longitude
          : user != null &&
            user?.event_location_preference == 1 &&
            userLocation?.longitude != null
          ? parseFloat(userLocation.longitude)
          : null,
    };

    // Only proceed if we have valid coordinates
    if (eventData.latitude == null || eventData.longitude == null) {
      console.log("No valid coordinates available, returning empty events");
      return [];
    }

    console.log("Using coordinates for events:", eventData);

    const fetchPromise = fetch(
      `${backendUrl}/api/events/all?page=1&limit=500`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          latitude: eventData.latitude,
          longitude: eventData.longitude,
          radius: 50, // Reduced to 50 mile radius like the map
        }),
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
    console.log("All events API response:", data);

    // Return ALL events from the response (not just Ticketmaster)
    const allEvents = data.events || [];
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

// Keep the old function for backward compatibility
export async function fetchTicketmasterEvents() {
  const allEvents = await fetchAllEvents();
  // Filter only Ticketmaster events for backward compatibility
  return allEvents.filter((event: any) => event.is_ticketmaster);
}
