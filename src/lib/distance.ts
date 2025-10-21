/**
 * Calculate the distance between two coordinates using the Haversine formula
 * @param lat1 Latitude of first point
 * @param lon1 Longitude of first point
 * @param lat2 Latitude of second point
 * @param lon2 Longitude of second point
 * @returns Distance in kilometers
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  return distance;
}

/**
 * Check if a location is outside the current loaded data radius
 * @param eventLocation The location of the event
 * @param currentCenter The current map center
 * @param radiusKm The radius of loaded data in kilometers
 * @returns Object with isOutside flag and distance
 */
export function isLocationOutsideRadius(
  eventLocation: { latitude: number; longitude: number },
  currentCenter: { latitude: number; longitude: number },
  radiusKm: number
): { isOutside: boolean; distance: number } {
  const distance = calculateDistance(
    eventLocation.latitude,
    eventLocation.longitude,
    currentCenter.latitude,
    currentCenter.longitude
  );

  return {
    isOutside: distance > radiusKm,
    distance,
  };
}
