/**
 * Social Post Service
 * Integrates with web backend posts API at https://orbit-web-backend.onrender.com/api/posts
 * Based on web app implementation to ensure consistency
 */

const BASE_URL = "https://orbit-web-backend.onrender.com";
const API_BASE_URL = `${BASE_URL}/api/posts`;

// ============================================================================
// TYPES (matching web app structure)
// ============================================================================

export interface PostFeedItem {
  type: "post";
  id: string;
  content: string;
  media_urls: Array<string> | null;
  created_at: string;
  updated_at: string;
  like_count: number;
  comment_count: number;
  is_liked: boolean;
  is_owner: boolean;
  is_following: boolean;
  // Address fields
  address?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  full_address?: string;
  // Location convenience object
  location?: {
    latitude: number;
    longitude: number;
  };
  // Lightweight author summary
  created_by?: {
    id: string;
    name: string;
    username: string;
    avatar_url: string;
  };
  // Full author profile
  user: {
    id: string;
    username: string;
    first_name: string;
    last_name: string;
    avatar_url: string;
    bio?: string;
    location?: string;
  };
  event?: {
    id: string;
    name: string;
    description: string;
    start_datetime: string;
    end_datetime?: string;
    venue_name?: string;
    address: string;
    city: string;
    state: string;
    postal_code?: string;
    location?: {
      longitude: string;
      latitude: string;
    };
    external_url?: string;
    image_urls: Array<string>;
    coordinates?: {
      lat: number;
      lng: number;
    };
    is_ticketmaster?: boolean;
    source?: "supabase" | "ticketmaster";
    category?: {
      id: string;
      name: string;
      icon?: string;
    };
    attendees?: {
      count: number;
      profiles: Array<{
        id: string;
        avatar_url: string;
        name: string;
        first_name: string;
        last_name: string;
      }>;
    };
    ticketmaster_details?: any;
    categories?: Array<{
      id: string;
      name: string;
      icon?: string;
      genre?: string;
      subGenre?: string;
      type?: string;
      subType?: string;
      isPrimary?: boolean;
    }>;
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
  };
  location_data?: {
    id?: string;
    name?: string;
    description?: string;
    type?: string;
    external_url?: string;
    image_urls?: Array<string>;
    address: string;
    city: string;
    state: string;
    postal_code: string;
    coordinates: {
      lat: number;
      lng: number;
    };
  };
  likes?: {
    count: number;
    users: Array<string>;
  };
  comments?: {
    count: number;
    items: Array<{
      id: string;
      content: string;
      created_at: string;
      updated_at?: string;
      user: {
        id: string;
        name: string;
        username: string;
        avatar_url: string;
      };
    }>;
  };
  source?: "supabase" | "ticketmaster";
}

export interface PostsApiResponse {
  feed_items: Array<PostFeedItem>;
  pagination: {
    next_cursor: string | null;
    has_more: boolean;
  };
  meta: {
    user_location?: {
      lat: number;
      lng: number;
    };
    total_posts: number;
    following_count?: number;
  };
}

export interface CreatePostData {
  content: string;
  media_urls?: Array<string>;
  // event_id accepts both Orbit event UUID and Ticketmaster event id
  event_id?: string;
  location_data?: {
    address?: string;
    city?: string;
    state?: string;
    postal_code?: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
  };
}

export interface CreatePostResponse {
  success: boolean;
  post: PostFeedItem;
}
export interface IPost {
  id: string;
  content: string;
  media_urls: Array<string> | null;
  created_at: string;
  updated_at: string;
  like_count: number;
  comment_count: number;
  is_liked: boolean | null;
  is_owner: boolean | null;
  is_following: boolean | null;
  // Address fields
  address?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  full_address?: string;
  // Location convenience object
  location?: {
    latitude: number;
    longitude: number;
  };
  // Lightweight author summary
  created_by?: {
    id: string;
    name: string;
    username: string;
    avatar_url: string;
  };
  // Full author profile
  user: {
    id: string;
    username: string;
    first_name: string;
    last_name: string;
    avatar_url: string;
    bio?: string;
    location?: string;
  };
  event?: {
    id: string;
    name: string;
    description: string;
    start_datetime: string;
    end_datetime?: string;
    venue_name?: string;
    address: string;
    city: string;
    state: string;
    postal_code?: string;
    location?: {
      longitude: string;
      latitude: string;
    };
    external_url?: string;
    image_urls: Array<string>;
    coordinates?: {
      lat: number;
      lng: number;
    };
    // TicketMaster specific fields
    is_ticketmaster?: boolean;
    source?: "supabase" | "ticketmaster";
    category?: {
      id: string;
      name: string;
      icon?: string;
    };
    attendees?: {
      count: number;
      profiles: Array<{
        id: string;
        avatar_url: string;
        name: string;
        first_name: string;
        last_name: string;
      }>;
    };
    ticketmaster_details?: {
      type: string;
      locale: string;
      name: string;
      description: string;
      url: string;
      id: string;
      dates: {
        start: any;
        end: any;
        timezone: string;
        status: any;
        spanMultipleDays: boolean;
      };
      sales: {
        public: any;
        presales: any[];
      } | null;
      priceRanges: any[];
      enhanced_images: any[];
      venue: {
        id: string;
        name: string;
        type: string;
        url: string;
        locale: string;
        timezone: string;
        city: any;
        state: any;
        country: any;
        address: any;
        location: any;
        postalCode: string;
        boxOfficeInfo: any;
        parkingDetail: any;
        accessibleSeatingDetail: any;
        generalInfo: any;
        social: any;
        images: any[];
        markets: any[];
        dmas: any[];
        distance: any;
        units: any;
      };
      attractions: Array<{
        id: string;
        name: string;
        type: string;
        url: string;
        locale: string;
        externalLinks: any;
        aliases: any;
        images: any[];
        classifications: any[];
        upcomingEvents: any;
        _links: any;
      }>;
      classifications: Array<{
        primary: boolean;
        segment: any;
        genre: any;
        subGenre: any;
        type: any;
        subType: any;
        family: boolean;
      }>;
      promoter: any;
      pleaseNote: string;
      info: string;
      accessibility: any;
      ticketLimit: any;
      ageRestrictions: any;
      ticketing: any;
      _links: any;
      seatmap: any;
      externalLinks: any;
      test: boolean;
      aliases: any;
    };
    categories?: Array<{
      id: string;
      name: string;
      icon?: string;
      genre?: string;
      subGenre?: string;
      type?: string;
      subType?: string;
      isPrimary?: boolean;
    }>;
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
  };
  location_data?: {
    address: string;
    city: string;
    state: string;
    postal_code: string;
    coordinates: {
      lat: number;
      lng: number;
    };
  };
  // Likes structure: { count, users[] } where users is array of user ids
  likes: {
    count: number;
    users: Array<string>;
  };
  // Comments structure: { count, items[] } where items contains full comment objects
  comments: {
    count: number;
    items: Array<{
      id: string;
      content: string;
      created_at: string;
      updated_at?: string;
      user: {
        id: string;
        name: string;
        username: string;
        avatar_url: string;
      };
    }>;
  };
  // Source field
  source?: "supabase" | "ticketmaster";
}
export interface PostDetailResponse {
  success: boolean;
  data: IPost;
  meta: {
    total_comments: number;
    total_likes: number;
    has_event: boolean;
    has_location: boolean;
  };
  // Legacy fields for backward compatibility
  post?: PostDetailResponse["data"];
  comments?: PostDetailResponse["data"]["comments"]["items"];
  likes?: Array<{
    created_at: string;
    user: {
      id: string;
      username: string;
      first_name: string;
      last_name: string;
      avatar_url: string;
    };
  }>;
}

// ============================================================================
// SERVICE CLASS
// ============================================================================

export class SocialPostService {
  private baseUrl: string;

  constructor(baseUrl: string = BASE_URL) {
    this.baseUrl = baseUrl;
  }

  /**
   * Fetch posts feed (matches web app API)
   * Supports both cursor-based pagination (web) and page-based (mobile fallback)
   */
  async fetchPosts(params: {
    cursor?: string;
    page?: number;
    limit?: number;
    lat?: number;
    lng?: number;
    authToken?: string;
  }): Promise<PostsApiResponse> {
    const { cursor, page, limit = 20, lat, lng, authToken } = params;

    const searchParams = new URLSearchParams();

    // Use cursor if provided (web app style), otherwise use page
    if (cursor) {
      searchParams.set("cursor", cursor);
    } else if (page !== undefined) {
      // Fallback to page-based for backward compatibility
      searchParams.set("page", page.toString());
    }

    if (limit) searchParams.set("limit", limit.toString());
    if (lat !== undefined) searchParams.set("lat", lat.toString());
    if (lng !== undefined) searchParams.set("lng", lng.toString());

    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };

    if (authToken) {
      headers.Authorization = `Bearer ${authToken}`;
    }

    try {
      const response = await fetch(`${API_BASE_URL}?${searchParams}`, {
        method: "GET",
        headers,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Failed to fetch posts: ${response.statusText} - ${errorText}`
        );
      }

      const data = (await response.json()) as PostsApiResponse;

      // Debug: Log first post to see actual structure
      if (data.feed_items && data.feed_items.length > 0) {
        const firstPost = data.feed_items[0];
        if (firstPost.type === "post") {
          console.log("🔍 [SocialPostService] First post structure:", {
            like_count: (firstPost as PostFeedItem).like_count,
            comment_count: (firstPost as PostFeedItem).comment_count,
            likes: (firstPost as PostFeedItem).likes,
            comments: (firstPost as PostFeedItem).comments,
          });
        }
      }

      return data;
    } catch (error) {
      console.error("❌ [SocialPostService] Fetch posts error:", error);
      throw error;
    }
  }

  /**
   * Create a new post (matches web app API)
   * Transforms mobile app format to web API format
   */
  async createPost(
    postData: {
      content: string;
      media_urls?: string[];
      address?: string;
      city?: string;
      state?: string;
      postal_code?: string;
      event_id?: string;
      location?: {
        coordinates: [number, number];
      };
    },
    authToken: string
  ): Promise<CreatePostResponse> {
    // Transform to web API format
    const webPostData: CreatePostData = {
      content: postData.content,
      media_urls: postData.media_urls || [],
    };

    // Add event_id if provided
    if (postData.event_id) {
      webPostData.event_id = postData.event_id;
    }

    // Transform location fields to location_data format (web API)
    if (postData.address || postData.city || postData.state) {
      webPostData.location_data = {
        address: postData.address,
        city: postData.city,
        state: postData.state,
        postal_code: postData.postal_code,
      };

      // Add coordinates if available
      if (postData.location?.coordinates) {
        webPostData.location_data.coordinates = {
          lat: postData.location.coordinates[1], // [lng, lat] -> {lat, lng}
          lng: postData.location.coordinates[0],
        };
      }
    }

    try {
      const response = await fetch(API_BASE_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(webPostData),
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `Failed to create post: ${response.statusText}`;

        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch {
          // If not JSON, use the text as error message
          if (errorText) errorMessage = errorText;
        }

        throw new Error(errorMessage);
      }

      const result = (await response.json()) as CreatePostResponse;
      return result;
    } catch (error) {
      console.error("❌ [SocialPostService] Create post error:", error);
      throw error;
    }
  }

  /**
   * Transform web API response to mobile app format (for backward compatibility)
   * This preserves all existing functionality while using web API
   */
  transformPostToMobileFormat(post: PostFeedItem): any {
    return {
      id: post.id,
      content: post.content,
      media_urls: post.media_urls || [],
      created_at: post.created_at,
      address: post.address,
      city: post.city,
      state: post.state,
      postal_code: post.postal_code,
      like_count: post.like_count ?? 0,
      comment_count: post.comment_count ?? 0,
      user: (() => {
        // Handle user data - prefer full user object, fallback to created_by, then create minimal object
        if (post.user) {
          return {
            id: post.user.id,
            username: post.user.username || null,
            avatar_url: post.user.avatar_url || null,
            first_name: post.user.first_name || null,
            last_name: post.user.last_name || null,
          };
        }
        if (post.created_by) {
          return {
            id: post.created_by.id,
            username: post.created_by.username || null,
            avatar_url: post.created_by.avatar_url || null,
            first_name: null,
            last_name: null,
          };
        }
        // Fallback minimal user object
        return {
          id: post.id,
          username: null,
          avatar_url: null,
          first_name: null,
          last_name: null,
        };
      })(),
      event: post.event || null,
      isLiked: post.is_liked || false,
      // Preserve location_data for event/location detection
      location_data: post.location_data,
      // Preserve source for ticketmaster detection
      source: post.source,
      // Preserve event details for sharing functionality
      event_id: post.event?.id || null,
    };
  }

  /**
   * Transform posts array to mobile format
   */
  transformPostsToMobileFormat(posts: PostFeedItem[]): any[] {
    return posts.map((post) => this.transformPostToMobileFormat(post));
  }

  async getPostDetails(postId: string, authToken: string) {
    if (!authToken) {
      return null;
    }
    try {
      const response = await fetch(`${BASE_URL}/api/posts/${postId}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
      });
      if (!response.ok) {
        // Don't spam logs for 404s - these are expected for non-existent posts
        if (response.status === 404) {
          console.log(`Post ${postId} not found (404) - skipping`);
          return null;
        }
        return null;
      }
      const responseData = (await response.json()) as PostDetailResponse;
      
      // Normalize response structure - matching web app pattern
      // API returns { success, data, meta } but we want backward compatibility with { post, comments, likes }
      if (responseData.data && !responseData.post) {
        // Convert new structure to legacy structure for backward compatibility (same as web app)
        const normalizedResponse: PostDetailResponse = {
          ...responseData,
          post: responseData.data,
          // Convert comments.items array to legacy comments array
          comments: responseData.data.comments?.items || [],
          // Convert likes.users (array of IDs) to legacy likes array format
          likes:
            responseData.data.likes?.users.map((userId) => ({
              created_at: "",
              user: {
                id: userId,
                username: "",
                first_name: "",
                last_name: "",
                avatar_url: "",
              },
            })) || [],
        };
        
        return normalizedResponse;
      }
      
      // Return response as-is if already normalized or legacy structure
      return responseData;
    } catch (error) {
      console.error("Error fetching post details:", error);
      return null;
    }
  }
  /**
   * Delete a post
   */
  async deletePost(postId: string, authToken: string): Promise<void> {
    try {
      const response = await fetch(`${API_BASE_URL}/${postId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `Failed to delete post: ${response.statusText}`;

        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch {
          if (errorText) errorMessage = errorText;
        }

        throw new Error(errorMessage);
      }
    } catch (error) {
      console.error("❌ [SocialPostService] Delete post error:", error);
      throw error;
    }
  }
}

// Export singleton instance
export const socialPostService = new SocialPostService(BASE_URL);
