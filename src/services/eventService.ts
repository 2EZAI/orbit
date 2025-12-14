/**
 * Event Service
 * Integrates with web backend events API at https://orbit-web-backend.onrender.com/api/events
 * Handles event interest/like functionality
 */

const BASE_URL = "https://orbit-web-backend.onrender.com";
const API_BASE_URL = `${BASE_URL}/api/events`;

export interface EventInterestResponse {
  success: boolean;
  data?: {
    id: string;
    event_id: string;
    user_id: string;
    status: "interested" | "not_interested";
    created_at?: string;
  } | null;
  message?: string;
}

export class EventService {
  private baseUrl: string;

  constructor(baseUrl: string = BASE_URL) {
    this.baseUrl = baseUrl;
  }

  /**
   * Get interest status for an event
   * GET /api/events/:id/interest
   */
  async getInterestStatus(eventId: string, authToken: string): Promise<EventInterestResponse> {
    const url = `${API_BASE_URL}/${eventId}/interest`;
    console.log("🔍 [EventService] Getting interest status - URL:", url);
    
    try {
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
      });

      console.log("🔍 [EventService] GET Response status:", response.status, response.statusText);

      if (!response.ok) {
        // If 404, it means no interest status is set, which is not an error for this endpoint
        if (response.status === 404) {
          console.log("ℹ️ [EventService] No interest status found (404) - returning null");
          return { success: true, data: null, message: "No interest status set" };
        }
        
        const errorText = await response.text();
        console.error("❌ [EventService] Error response:", errorText);
        let errorMessage = `Failed to get interest status: ${response.status} ${response.statusText}`;

        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch {
          if (errorText) errorMessage = errorText;
        }

        throw new Error(errorMessage);
      }

      const result = await response.json();
      console.log("✅ [EventService] Get interest status success:", result);
      return result;
    } catch (error) {
      console.error("❌ [EventService] Get interest status error:", error);
      if (error instanceof TypeError && error.message.includes("fetch")) {
        console.error("❌ [EventService] Network error - backend may be down or unreachable");
      }
      throw error;
    }
  }

  /**
   * Set interest for an event (like/interested)
   * POST /api/events/:id/interest
   * Requires body: { status: "interested" | "not_interested" }
   */
  async setInterest(eventId: string, authToken: string): Promise<EventInterestResponse> {
    const url = `${API_BASE_URL}/${eventId}/interest`;
    console.log("🔍 [EventService] Setting interest - URL:", url);
    console.log("🔍 [EventService] Base URL:", BASE_URL);
    console.log("🔍 [EventService] API Base URL:", API_BASE_URL);
    
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          status: "interested",
        }),
      });

      console.log("🔍 [EventService] Response status:", response.status, response.statusText);
      console.log("🔍 [EventService] Response headers:", Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ [EventService] Error response:", errorText);
        let errorMessage = `Failed to set interest: ${response.status} ${response.statusText}`;

        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch {
          if (errorText) errorMessage = errorText;
        }

        // Check if it's a 404 (route doesn't exist)
        if (response.status === 404) {
          errorMessage = `Endpoint not found. Backend route may not be deployed: ${url}`;
        }

        throw new Error(errorMessage);
      }

      const result = await response.json();
      console.log("✅ [EventService] Set interest success:", result);
      return result;
    } catch (error) {
      console.error("❌ [EventService] Set interest error:", error);
      if (error instanceof TypeError && error.message.includes("fetch")) {
        console.error("❌ [EventService] Network error - backend may be down or unreachable");
      }
      throw error;
    }
  }

  /**
   * Remove interest from an event (unlike/not interested)
   * DELETE /api/events/:id/interest
   */
  async removeInterest(eventId: string, authToken: string): Promise<EventInterestResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/${eventId}/interest`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `Failed to remove interest: ${response.statusText}`;

        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch {
          if (errorText) errorMessage = errorText;
        }

        throw new Error(errorMessage);
      }

      return await response.json();
    } catch (error) {
      console.error("❌ [EventService] Remove interest error:", error);
      throw error;
    }
  }
}

// Export singleton instance
export const eventService = new EventService(BASE_URL);

