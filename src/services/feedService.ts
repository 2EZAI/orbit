/**
 * Feed Service
 * Integrates with web backend feeds API at https://orbit-web-backend.onrender.com
 * Based on actual web app implementation
 */

export interface FeedParams {
  latitude?: number
  longitude?: number
  radius?: number // Radius in meters (web uses 100000 = ~62 miles)
  limit?: number // Results per section
  includeEvents?: boolean
  includeLocations?: boolean
  includeTicketmaster?: boolean
}

export interface FeedSection {
  id: string
  title: string
  subtitle?: string
  items: any[] // Events, locations, or posts
  itemCount: number
  sectionType: string
  algorithm: string
  metadata?: {
    timeRange?: {
      start: string
      end: string
    }
  }
}

export interface FeedResponse {
  sections: FeedSection[]
  summary: {
    totalSections: number
    totalItems: number
    totalEvents: number
    totalLocations: number
    totalTicketmasterEvents: number
    locationFilter?: {
      latitude: number
      longitude: number
      radiusMeters: number
      radiusMiles: number
    }
    generatedAt: string
  }
  isAuthenticated: boolean
}

export class FeedService {
  private baseUrl: string
  private authToken: string | null = null

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl
  }

  setAuthToken(token: string | null) {
    this.authToken = token
  }

  /**
   * Get main feed data (events, locations, posts)
   */
  async getFeed(params: FeedParams = {}): Promise<FeedResponse> {
    const { 
      latitude, 
      longitude, 
      radius = 100000, // Default to 100km like web
      limit = 10, 
      includeEvents = true,
      includeLocations = true,
      includeTicketmaster = true
    } = params

    const requestBody: any = {
      includeEvents,
      includeLocations,
      includeTicketmaster,
      limit,
    }

    if (latitude !== undefined && longitude !== undefined) {
      requestBody.latitude = latitude
      requestBody.longitude = longitude
      requestBody.radius = radius
    }

    try {
      const response = await fetch(`${this.baseUrl}/api/feed`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.authToken && {
            Authorization: `Bearer ${this.authToken}`,
          }),
        },
        body: JSON.stringify(requestBody),
      })

      if (!response.ok) {
        const error = await response
          .json()
          .catch(() => ({ error: 'Feed fetch failed' }))
        throw new Error(
          error.error || `Feed fetch failed with status ${response.status}`,
        )
      }

      const data = await response.json()

      // Return the response as-is since it matches our interface
      return data as FeedResponse
    } catch (error) {
      console.error('❌ [FeedService] Feed fetch error:', error)
      throw error
    }
  }

  /**
   * Get events feed only
   */
  async getEventsFeed(params: FeedParams = {}): Promise<FeedResponse> {
    return this.getFeed({ ...params, includeEvents: true, includeLocations: false, includeTicketmaster: false })
  }

  /**
   * Get locations feed only
   */
  async getLocationsFeed(params: FeedParams = {}): Promise<FeedResponse> {
    return this.getFeed({ ...params, includeEvents: false, includeLocations: true, includeTicketmaster: false })
  }

  /**
   * Get social posts feed only
   */
  async getPostsFeed(params: FeedParams = {}): Promise<FeedResponse> {
    return this.getFeed({ ...params, includeEvents: false, includeLocations: false, includeTicketmaster: false })
  }
}

export const feedService = new FeedService(
  'https://orbit-web-backend.onrender.com',
)