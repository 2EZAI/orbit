/**
 * Calculate the distance between two geographic points using the Haversine formula
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
  const R = 6371; // Radius of the Earth in kilometers
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  return distance;
}

/**
 * Check if a location is outside a specified radius from a center point
 * @param location The location to check
 * @param center The center point
 * @param radiusKm The radius in kilometers
 * @returns Object with isOutside boolean and distance in km
 */
export function isLocationOutsideRadius(
  location: { latitude: number; longitude: number },
  center: { latitude: number; longitude: number },
  radiusKm: number
): { isOutside: boolean; distance: number } {
  const distance = calculateDistance(
    center.latitude,
    center.longitude,
    location.latitude,
    location.longitude
  );
  
  return {
    isOutside: distance > radiusKm,
    distance: Math.round(distance * 10) / 10, // Round to 1 decimal place
  };
}
