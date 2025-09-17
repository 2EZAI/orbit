/**
 * Map Data Service - Two-Stage Loading Strategy
 * Implements the same strategy as orbit-web-app with nearby + complete endpoints
 */

export interface LocationData {
  latitude: number
  longitude: number
  accuracy?: number
}

export interface MapDataRequest {
  latitude: number
  longitude: number
  radius?: number
  timeRange?: 'today' | 'week' | 'weekend'
  includeTicketmaster?: boolean
}

export interface NearbyDataRequest {
  latitude: number
  longitude: number
  timeRange?: 'today' | 'week' | 'weekend'
  includeTicketmaster?: boolean
}

export interface EventData {
  id: string
  name: string
  description?: string
  start_datetime: string
  end_datetime?: string
  venue_name?: string
  address?: string
  location: {
    type: 'Point'
    coordinates: [number, number] // [longitude, latitude]
  }
  image_urls?: Array<string>
  is_ticketmaster?: boolean
  external_url?: string
  source: 'database' | 'ticketmaster'
  type?: string
  created_by?: {
    id: string
    name: string
    username?: string
    avatar_url?: string
  }
  categories?: Array<{
    id: string
    name: string
    icon?: string
  }>
  attendees?: {
    count: number
    profiles: Array<{
      id: string
      name: string
      avatar_url?: string
    }>
  }
  join_status?: boolean
  distance_km?: number
  pricing?: {
    currency?: string
    min_price?: number
    max_price?: number
    price_ranges?: Array<{
      type: string
      currency: string
      min: number
      max: number
    }>
  }
}

export interface LocationDataResponse {
  id: string
  name: string
  description?: string
  address?: string
  location: {
    type: 'Point'
    coordinates: [number, number] // [longitude, latitude]
  }
  image_urls?: Array<string>
  type?: string
  operation_hours?: Record<string, string>
  rating?: number
  rating_count?: number
  price_level?: number
  phone?: string
  external_url?: string
  place_id?: string
  distance_km?: number
  category_id?: string
  category?: {
    id: string
    name: string
    icon?: string
  }
}

export interface MapDataResponse {
  events: Array<EventData>
  locations: Array<LocationDataResponse>
  isAuthenticated: boolean
  user?: {
    id: string
    name: string
    username?: string
  }
}

export class MapDataService {
  private baseUrl: string

  constructor(baseUrl: string = 'https://orbit-web-backend.onrender.com') {
    this.baseUrl = baseUrl
  }

  /**
   * Fetch nearby data (events and locations) within 100 miles for fast initial loading
   */
  async getNearbyData(params: NearbyDataRequest): Promise<MapDataResponse> {
    const { latitude, longitude, timeRange = 'today', includeTicketmaster = true } = params

    // Validate coordinates
    if (latitude < -90 || latitude > 90) {
      throw new Error('Invalid latitude: must be between -90 and 90')
    }
    if (longitude < -180 || longitude > 180) {
      throw new Error('Invalid longitude: must be between -180 and 180')
    }

    const response = await fetch(`${this.baseUrl}/api/events/nearby`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        latitude,
        longitude,
        timeRange,
        includeTicketmaster,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Nearby API Error ${response.status}: ${errorText}`)
    }

    const data: MapDataResponse = await response.json()

    console.log(
      `🎯 Stage 1 (Nearby): Got ${data.events?.length || 0} events, ${
        data.locations?.length || 0
      } locations`
    )

    return data
  }

  /**
   * Fetch complete map data (events and locations) for a given location with configurable radius
   */
  async getMapData(params: MapDataRequest): Promise<MapDataResponse> {
    const {
      latitude,
      longitude,
      radius = 500000,
      timeRange = 'today',
      includeTicketmaster = true,
    } = params

    // Validate coordinates
    if (latitude < -90 || latitude > 90) {
      throw new Error('Invalid latitude: must be between -90 and 90')
    }
    if (longitude < -180 || longitude > 180) {
      throw new Error('Invalid longitude: must be between -180 and 180')
    }

    const response = await fetch(`${this.baseUrl}/api/events/user-location`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        latitude,
        longitude,
        radius,
        timeRange,
        includeTicketmaster,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Map API Error ${response.status}: ${errorText}`)
    }

    const data: MapDataResponse = await response.json()

    console.log(
      `🌍 Stage 2 (Complete): Got ${data.events?.length || 0} events, ${
        data.locations?.length || 0
      } locations`
    )

    return data
  }

  /**
   * Health check endpoint
   */
  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    const response = await fetch(`${this.baseUrl}/health`)

    if (!response.ok) {
      throw new Error(`Health check failed: ${response.status}`)
    }

    return response.json()
  }
}

// Default instance
export const mapDataService = new MapDataService()
