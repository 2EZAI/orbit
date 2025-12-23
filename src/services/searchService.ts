/**
 * Search Service
 * Based on web app implementation with React Native adaptations
 */

export interface SearchParams {
  query: string;
  latitude?: number;
  longitude?: number;
  radius?: number; // Max 100 miles (161km) for location-based searches
  limit?: number; // 1-100 results per category
}

export interface SearchResponse {
  users: UserResult[];
  events: EventResult[];
  locations: LocationResult[];
  isAuthenticated: boolean;
  user: any | null;
  query: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
}

export interface UserResult {
  id: string;
  name: string;
  username?: string;
  avatar_url?: string;
  bio?: string;
  location?: string;
  distance_km?: number;
}

export interface EventResult {
  id: string;
  name: string;
  description?: string;
  start_datetime?: string;
  end_datetime?: string;
  venue_name?: string;
  address?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  location?: {
    type: "Point";
    coordinates: [number, number]; // [longitude, latitude]
  };
  image_urls?: string[];
  external_url?: string;
  source: "database" | "ticketmaster" | "location";
  type?: string;
  created_by?: {
    id: string;
    name: string;
    username?: string;
    avatar_url?: string;
  };
  attendees?: {
    count: number;
    profiles: Array<{
      id: string;
      name: string;
      avatar_url?: string;
    }>;
  };
  categories?: Array<{
    id: string;
    name: string;
    icon?: string;
  }>;
  distance_km?: number;
  pricing?: {
    currency?: string;
    min_price?: number;
    max_price?: number;
    price_ranges?: Array<{
      type: string;
      currency: string;
      min: number;
      max: number;
    }>;
  };
  is_ticketmaster?: boolean;
  ticketmaster_details?: any;
}

export interface LocationResult {
  id: string;
  name: string;
  description?: string;
  address?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  location: {
    type: "Point";
    coordinates: [number, number]; // [longitude, latitude]
  };
  image_urls?: string[];
  external_url?: string;
  source: "database" | "ticketmaster" | "location";
  type?: string;
  categories?: Array<{
    id: string;
    name: string;
    icon?: string;
  }>;
  distance_km?: number;
}

export class SearchService {
  private baseUrl: string;
  private authToken: string | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  async search(params: SearchParams): Promise<SearchResponse> {
    const { query, latitude, longitude, radius = 100, limit = 10 } = params;

    if (!query || query.trim().length < 2) {
      throw new Error("Query must be at least 2 characters long");
    }

    const requestBody: any = {
      query: query.trim(),
      limit,
    };

    if (latitude !== undefined && longitude !== undefined) {
      requestBody.latitude = latitude;
      requestBody.longitude = longitude;
      requestBody.radius = Math.min(radius, 161); // Cap at 100 miles (161km)
    }

    try {
      const response = await fetch(`${this.baseUrl}/api/search`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const error = await response
          .json()
          .catch(() => ({ error: "Search failed" }));
        throw new Error(
          error.error || `Search failed with status ${response.status}`
        );
      }

      const data = await response.json();

      const sanitizedResponse: SearchResponse = {
        users: (data.users || []).map(this.sanitizeUser),
        events: (data.events || []).map(this.sanitizeEvent),
        locations: (data.locations || []).map(this.sanitizeLocation),
        isAuthenticated: data.isAuthenticated || false,
        user: data.user || null,
        query: data.query || params.query,
        coordinates: data.coordinates || undefined,
      };
      return sanitizedResponse;
    } catch (error) {
      console.error("❌ [SearchService] Search error:", error);
      throw error;
    }
  }

  /**
   * Sanitize user data
   */
  private sanitizeUser(user: any): UserResult {
    console.log("🔍 [SearchService] Sanitizing user:", user);
    return {
      id: user?.id || "",
      name:
        !user?.first_name || !user?.last_name
          ? "Unknown User"
          : `${user?.first_name} ${user?.last_name}`,
      username: user?.username || undefined,
      avatar_url: user?.avatar_url || undefined,
      bio: user?.bio || undefined,
      location: user?.location || undefined,
      distance_km: user?.distance_km || undefined,
    };
  }

  /**
   * Sanitize event data
   */
  private sanitizeEvent(event: any): EventResult {
    return {
      id: event?.id || "",
      name: event?.name || "Untitled Event",
      description: event?.description || undefined,
      start_datetime: event?.start_datetime || undefined,
      end_datetime: event?.end_datetime || undefined,
      venue_name: event?.venue_name || undefined,
      address: event?.address || undefined,
      city: event?.city || undefined,
      state: event?.state || undefined,
      postal_code: event?.postal_code || undefined,
      location: event?.location || { type: "Point", coordinates: [0, 0] },
      image_urls: Array.isArray(event?.image_urls)
        ? event.image_urls
        : undefined,
      external_url: event?.external_url || undefined,
      source: event?.source || "database",
      type: event?.type || undefined,
      created_by: event?.created_by || undefined,
      attendees: event?.attendees || undefined,
      categories: Array.isArray(event?.categories)
        ? event.categories
        : undefined,
      distance_km: event?.distance_km || undefined,
      pricing: event?.pricing || undefined,
      is_ticketmaster: event?.is_ticketmaster || false,
      ticketmaster_details: event?.ticketmaster_details || undefined,
    };
  }

  /**
   * Sanitize location data
   */
  private sanitizeLocation(location: any): LocationResult {
    return {
      id: location?.id || "",
      name: location?.name || "Untitled Location",
      description: location?.description || undefined,
      address: location?.address || undefined,
      city: location?.city || undefined,
      state: location?.state || undefined,
      postal_code: location?.postal_code || undefined,
      location: location?.location || { type: "Point", coordinates: [0, 0] },
      image_urls: Array.isArray(location?.image_urls)
        ? location.image_urls
        : undefined,
      external_url: location?.external_url || undefined,
      source: location?.source || "database",
      type: location?.type || undefined,
      categories: Array.isArray(location?.categories)
        ? location.categories
        : undefined,
      distance_km: location?.distance_km || undefined,
    };
  }
}

export const searchService = new SearchService(
  "https://orbit-web-backend.onrender.com"
);
