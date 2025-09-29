import { StreamVideoClient, Call } from "@stream-io/video-react-native-sdk";
import Constants from "expo-constants";

const BACKEND_CHAT_URL =
  Constants.expoConfig?.extra?.backendChatUrl ||
  "https://orbit-chat-backend-old-9d2b903ab237.herokuapp.com";

export interface CallMember {
  user_id: string;
  role?: "admin" | "moderator" | "user";
}

export interface CreateCallOptions {
  callId: string;
  callType?: "default" | "audio_room" | "livestream";
  members?: CallMember[];
  settings?: {
    audio?: {
      access_request_enabled?: boolean;
      default_device?: "speaker" | "earpiece";
    };
    video?: {
      access_request_enabled?: boolean;
      enabled?: boolean;
    };
    screensharing?: {
      access_request_enabled?: boolean;
      enabled?: boolean;
    };
  };
}

export class VideoCallService {
  private client: StreamVideoClient | null = null;
  private authToken: string | null = null;

  constructor(client: StreamVideoClient, authToken: string) {
    this.client = client;
    this.authToken = authToken;
  }

  /**
   * Create a new call with backend metadata tracking
   */
  async createCall(
    options: CreateCallOptions
  ): Promise<{ call: Call; metadata: any }> {
    if (!this.client) {
      throw new Error("Video client not initialized");
    }

    if (!this.authToken) {
      throw new Error("Authentication token not available");
    }

    try {
      // Step 1: Create call metadata in backend
      const metadataResponse = await fetch(`${BACKEND_CHAT_URL}/video/calls`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.authToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          call_id: options.callId,
          call_type: options.callType || "default",
          members: options.members || [],
          settings: options.settings,
        }),
      });

      if (!metadataResponse.ok) {
        const errorText = await metadataResponse.text();
        throw new Error(`Failed to create call metadata: ${errorText}`);
      }

      const callMetadata = await metadataResponse.json();

      // Step 2: Create actual call using Stream Video SDK
      const call = this.client.call(
        options.callType || "default",
        options.callId
      );
      await call.join({ create: true });

      // Step 3: Update call status to active in backend
      await this.updateCallStatus(options.callId, "active");

      // Step 4: Track join in backend
      await this.trackJoin(options.callId);

      return { call, metadata: callMetadata };
    } catch (error) {
      console.error("Failed to create call:", error);
      throw error;
    }
  }

  /**
   * Join an existing call
   */
  async joinCall(callId: string, callType: string = "default"): Promise<Call> {
    if (!this.client) {
      throw new Error("Video client not initialized");
    }

    try {
      // Step 1: Join call using Stream Video SDK
      const call = this.client.call(callType, callId);
      await call.join();

      // Step 2: Track join in backend
      await this.trackJoin(callId);

      return call;
    } catch (error) {
      console.error("Failed to join call:", error);
      throw error;
    }
  }

  /**
   * Leave a call and track in backend
   */
  async leaveCall(call: Call, callId: string): Promise<void> {
    try {
      // Step 1: Leave call using Stream Video SDK
      await call.leave();

      // Step 2: Track leave in backend
      await this.trackLeave(callId);
    } catch (error) {
      console.error("Failed to leave call:", error);
      throw error;
    }
  }

  /**
   * Update call status in backend
   */
  async updateCallStatus(
    callId: string,
    status: "created" | "active" | "ended" | "cancelled",
    metadata?: { participantCount?: number; reason?: string }
  ): Promise<void> {
    if (!this.authToken) return;

    try {
      const response = await fetch(`${BACKEND_CHAT_URL}/video/calls/${callId}/status`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${this.authToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          status,
          metadata: {
            ...metadata,
            updatedAt: new Date().toISOString(),
          }
        }),
      });

      if (!response.ok) {
        console.warn(`Failed to update call status: ${response.status}`);
      } else {
        console.log(`Call status updated to ${status} for call ${callId}`);
      }
    } catch (error) {
      console.error("Failed to update call status:", error);
      // Don't throw - this is for tracking only
    }
  }

  /**
   * Track user joining a call (for analytics)
   */
  async trackJoin(callId: string): Promise<void> {
    if (!this.authToken) return;

    try {
      await fetch(`${BACKEND_CHAT_URL}/video/calls/${callId}/join`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.authToken}`,
          "Content-Type": "application/json",
        },
      });
    } catch (error) {
      console.error("Failed to track join:", error);
      // Don't throw - this is for analytics only
    }
  }

  /**
   * Track user leaving a call (for analytics)
   */
  async trackLeave(callId: string): Promise<void> {
    if (!this.authToken) return;

    try {
      await fetch(`${BACKEND_CHAT_URL}/video/calls/${callId}/leave`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.authToken}`,
          "Content-Type": "application/json",
        },
      });
    } catch (error) {
      console.error("Failed to track leave:", error);
      // Don't throw - this is for analytics only
    }
  }

  /**
   * Get user's call history
   */
  async getCallHistory(limit: number = 25, offset: number = 0): Promise<any> {
    if (!this.authToken) {
      throw new Error("Authentication token not available");
    }

    try {
      const response = await fetch(
        `${BACKEND_CHAT_URL}/video/calls/history?limit=${limit}&offset=${offset}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${this.authToken}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to get call history");
      }

      return await response.json();
    } catch (error) {
      console.error("Failed to get call history:", error);
      throw error;
    }
  }

  /**
   * Get active calls
   */
  async getActiveCalls(): Promise<any> {
    if (!this.authToken) {
      throw new Error("Authentication token not available");
    }

    try {
      const response = await fetch(`${BACKEND_CHAT_URL}/video/calls/active`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${this.authToken}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to get active calls");
      }

      return await response.json();
    } catch (error) {
      console.error("Failed to get active calls:", error);
      throw error;
    }
  }

  /**
   * Generate a unique call ID
   */
  static generateCallId(): string {
    return `call-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate a unique audio call ID
   */
  static generateAudioCallId(): string {
    return `audio-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Check if a call should be ended (no active participants)
   */
  async shouldEndCall(call: Call): Promise<boolean> {
    try {
      const participants = call.state.participants;
      const activeParticipants = participants.filter(p => 
        p.isSpeaking || p.isVideoEnabled || p.isAudioEnabled
      );
      
      console.log(`Call ${call.id} has ${participants.length} participants, ${activeParticipants.length} active`);
      
      // If no active participants and only 1 or fewer total participants, end the call
      return activeParticipants.length === 0 && participants.length <= 1;
    } catch (error) {
      console.error("Error checking if call should be ended:", error);
      return false;
    }
  }

  /**
   * End an empty call and update backend status
   */
  async endEmptyCall(call: Call, callId: string): Promise<void> {
    try {
      console.log(`Ending empty call ${callId}`);
      
      // Update backend status first
      await this.updateCallStatus(callId, "ended", { 
        reason: "no_active_participants",
        participantCount: 0 
      });
      
      // End the call
      await call.endCall();
      
      console.log(`Successfully ended empty call ${callId}`);
    } catch (error) {
      console.error(`Error ending empty call ${callId}:`, error);
      throw error;
    }
  }
}

/**
 * Hook to create a video call service instance
 */
export function createVideoCallService(
  client: StreamVideoClient | null,
  authToken: string | null
): VideoCallService | null {
  if (!client || !authToken) {
    return null;
  }

  return new VideoCallService(client, authToken);
}
