import { useState, useEffect } from 'react';

// Types from web app
export interface SimilarEvent {
  id: string;
  name: string;
  description: string;
  start_datetime: string;
  end_datetime: string;
  location: {
    type: string;
    coordinates: [number, number];
  };
  venue_name: string;
  address: string;
  image_urls: string[];
  external_url?: string;
  source_type?: string;
  type: string;
  created_by?: {
    id: string;
    name: string;
    username?: string;
    avatar_url?: string;
  };
  created_at: string;
  is_private: boolean;
  city: string;
  state: string;
  postal_code: string;
  location_id: string | null;
  category_id: string;
  category_name: string;
  similarity_score: number;
  distance_km?: number;
  // Additional fields for UnifiedDetailsSheet compatibility
  source?: string;
  user_id?: string;
  is_ticketmaster?: boolean;
  ticketmaster_details?: any;
  join_status?: boolean;
  attendees?: {
    count: number;
    profiles: Array<{
      id: string;
      name: string;
      avatar_url: string | null;
    }>;
  };
  categories?: Array<{
    id: string;
    name: string;
    icon?: string;
  }>;
}

export interface SimilarLocation {
  id: string;
  name: string;
  description: string;
  location: {
    type: string;
    coordinates: [number, number];
  };
  external_url?: string;
  image_urls: string[];
  operation_hours?: any;
  address: string;
  type: string;
  category?: any;
  category_id: string;
  place_id?: string;
  distance_km?: number;
  rating?: number;
  rating_count?: number;
  price_level?: number;
  phone?: string;
  similarity_score: number;
}

export interface SimilarItemsRequest {
  itemType: 'event' | 'location';
  itemId: string;
  category?: string;
  name?: string;
  tags?: string[];
  latitude: number;
  longitude: number;
  proximityKm?: number;
  limit?: number;
}

export interface SimilarItemsResponse {
  events: SimilarEvent[];
  locations: SimilarLocation[];
  source_item: {
    id: string;
    type: string;
    name: string;
    has_location: boolean;
  };
  isAuthenticated: boolean;
  user: any;
  criteria: {
    limit: number;
  };
}

export interface UseSimilarItemsParams extends SimilarItemsRequest {
  enabled?: boolean;
}

export function useSimilarItems({
  itemType,
  itemId,
  category,
  name,
  tags,
  latitude,
  longitude,
  proximityKm = 50,
  limit = 5,
  enabled = true,
}: UseSimilarItemsParams) {
  const [results, setResults] = useState<SimilarItemsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSimilarItems = async () => {
    if (!enabled || !itemId || !latitude || !longitude) {
      console.log('🚫 [useSimilarItems] API call disabled:', {
        enabled,
        itemId,
        latitude,
        longitude,
      });
      return;
    }


    setIsLoading(true);
    setError(null);

    try {
      const requestBody = {
        itemType,
        itemId,
        latitude,
        longitude,
        proximityKm,
        limit,
        ...(category && { category }),
        ...(name && { name }),
        ...(tags && tags.length > 0 && { tags }),
      };

      const response = await fetch('https://orbit-web-backend.onrender.com/api/similar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ [useSimilarItems] API error response:', errorText);
        throw new Error(`Similar items request failed with status ${response.status}: ${errorText}`);
      }

      const data = await response.json();


      // Sanitize the response to ensure required fields exist
      const sanitizedResults = {
        events: (data.events || []).map(sanitizeSimilarEvent),
        locations: (data.locations || []).map(sanitizeSimilarLocation),
        source_item: data.source_item || {
          id: itemId,
          type: itemType,
          name: '',
          has_location: false,
        },
        isAuthenticated: data.isAuthenticated || false,
        user: data.user || null,
        criteria: data.criteria || { limit },
      };


      setResults(sanitizedResults);
    } catch (err) {
      console.error('❌ [useSimilarItems] Error fetching similar items:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSimilarItems();
  }, [itemType, itemId, category, name, latitude, longitude, proximityKm, limit, enabled]);

  // Helper to get total count of results
  const totalResults = results
    ? (results.events.length || 0) + (results.locations.length || 0)
    : 0;

  // Helper to check if we have any results
  const hasResults = totalResults > 0;

  // Helper to get all items combined and sorted by similarity score
  const allItemsSorted = results
    ? [
        ...results.events.map((event) => ({
          ...event,
          type: 'event' as const,
        })),
        ...results.locations.map((location) => ({
          ...location,
          type: 'location' as const,
        })),
      ].sort((a, b) => b.similarity_score - a.similarity_score)
    : [];

  return {
    results,
    isLoading,
    error,
    refetch: fetchSimilarItems,
    totalResults,
    hasResults,
    allItemsSorted,
    // Separate arrays for convenience
    events: results?.events || [],
    locations: results?.locations || [],
    sourceItem: results?.source_item,
    criteria: results?.criteria,
    isAuthenticated: results?.isAuthenticated || false,
  };
}

// Sanitization functions to ensure required fields exist
function sanitizeSimilarEvent(event: any): SimilarEvent {
  return {
    id: event.id || '',
    name: event.name || 'Untitled Event',
    description: event.description || '',
    start_datetime: event.start_datetime || new Date().toISOString(),
    end_datetime: event.end_datetime || new Date().toISOString(),
    location: event.location || { type: 'Point', coordinates: [0, 0] },
    venue_name: event.venue_name || '',
    address: event.address || '',
    image_urls: event.image_urls || [],
    external_url: event.external_url || undefined,
    source_type: event.source_type || undefined,
    type: event.type || 'event',
    created_by: event.created_by ? (typeof event.created_by === 'string' ? { id: event.created_by } : event.created_by) : undefined,
    created_at: event.created_at || new Date().toISOString(),
    is_private: event.is_private || false,
    city: event.city || '',
    state: event.state || '',
    postal_code: event.postal_code || '',
    location_id: event.location_id || null,
    category_id: event.category_id || '',
    category_name: event.category_name || '',
    similarity_score: event.similarity_score || 0,
    distance_km: event.distance_km || undefined,
    // Add missing fields for UnifiedDetailsSheet compatibility
    source: event.source || 'database', // Default to 'database' for similar events
    user_id: event.user_id || (typeof event.created_by === 'string' ? event.created_by : event.created_by?.id) || undefined, // Use creator ID as fallback
    is_ticketmaster: event.is_ticketmaster || false,
    ticketmaster_details: event.ticketmaster_details || undefined,
    join_status: event.join_status || false,
    attendees: event.attendees || { count: 0, profiles: [] },
    categories: event.categories || (event.category_name ? [{ id: event.category_id || '', name: event.category_name }] : []),
  };
}

function sanitizeSimilarLocation(location: any): SimilarLocation {
  return {
    id: location.id || '',
    name: location.name || 'Unnamed Location',
    description: location.description || '',
    location: location.location || { type: 'Point', coordinates: [0, 0] },
    external_url: location.external_url || undefined,
    image_urls: location.image_urls || [],
    operation_hours: location.operation_hours || undefined,
    address: location.address || '',
    type: location.type || 'location',
    category: location.category || undefined,
    category_id: location.category_id || '',
    place_id: location.place_id || undefined,
    distance_km: location.distance_km || undefined,
    rating: location.rating || undefined,
    rating_count: location.rating_count || undefined,
    price_level: location.price_level || undefined,
    phone: location.phone || undefined,
    similarity_score: location.similarity_score || 0,
  };
}