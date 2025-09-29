import { format } from "date-fns";

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=600&q=80";

// Helper functions for event processing
export function transformEvent(event: any) {
  if (!event) {
    console.error("❌ Event is undefined or null");
    return null;
  }
  
  try {
    return {
      ...event,
      image: event.image_urls?.[0],
      title: event.name || "Untitled Event",
      date: event.start_datetime ? format(new Date(event.start_datetime), "EEEE MMM d • h a") : "Date TBD",
      location: event.address || "Location TBD",
      attendees:
        event.event_joins?.filter((j: any) => j.status === "joined").length || 0,
    };
  } catch (error) {
    console.error("❌ Error transforming event:", error);
    return {
      ...event,
      image: event.image_urls?.[0],
      title: event.name || "Untitled Event",
      date: "Date TBD",
      location: event.address || "Location TBD",
      attendees: 0,
    };
  }
}

export function transformLocation(location: any) {
  if (!location) {
    console.error("❌ Location is undefined or null");
    return null;
  }
  
  try {
    // Safely extract coordinates
    let coordinates = { latitude: 0, longitude: 0 };
    if (location.location && location.location.coordinates && Array.isArray(location.location.coordinates)) {
      coordinates = {
        latitude: location.location.coordinates[1] || 0,
        longitude: location.location.coordinates[0] || 0,
      };
    }
    
    return {
      ...location,
      image: location.image_urls?.[0] || FALLBACK_IMAGE,
      title: location.name || "Untitled Location",
      coordinates,
      // Remove fake date fields - locations don't have dates!
      location: location.address || location.type || "Location",
      category: location.category || location.type,
      isLocation: true, // Flag to identify this as a location
      // Remove fake attendees and start_datetime - these don't apply to static locations
      operation_hours: location.operation_hours, // Preserve actual location data
      rating: location.rating,
    };
  } catch (error) {
    console.error("❌ Error transforming location:", error);
    return {
      ...location,
      image: location.image_urls?.[0] || FALLBACK_IMAGE,
      title: location.name || "Untitled Location",
      coordinates: { latitude: 0, longitude: 0 },
      location: location.address || location.type || "Location",
      category: location.category || location.type,
      isLocation: true,
      operation_hours: location.operation_hours,
      rating: location.rating,
    };
  }
}
