import { format } from "date-fns";

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=600&q=80";

// Helper functions for event processing
export function transformEvent(event: any) {
  return {
    ...event,
    image: event.image_urls?.[0],
    title: event.name,
    date: format(new Date(event.start_datetime), "EEEE MMM d • h a"),
    location: event.address,
    attendees:
      event.event_joins?.filter((j: any) => j.status === "joined").length || 0,
  };
}

export function transformLocation(location: any) {
  console.log("Transforming location:", location);
  return {
    ...location,
    image: location.image_urls?.[0] || FALLBACK_IMAGE,
    title: location.name || "Untitled Location",
    coordinates: {
      latitude: location.location.coordinates[1],
      longitude: location.location.coordinates[0],
    },
    // Remove fake date fields - locations don't have dates!
    location: location.address || location.type || "Location",
    category: location.category || location.type,
    isLocation: true, // Flag to identify this as a location
    // Remove fake attendees and start_datetime - these don't apply to static locations
    operation_hours: location.operation_hours, // Preserve actual location data
    rating: location.rating,
  };
}
