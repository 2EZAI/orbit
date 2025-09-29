import { createContext, useContext, useEffect, useState } from "react";
import {
  StreamVideo,
  StreamVideoClient,
  Call,
} from "@stream-io/video-react-native-sdk";
import { useAuth } from "./auth";
import { supabase } from "./supabase";
import Constants from "expo-constants";
import { VideoCallService, createVideoCallService } from "./videoCallService";

const STREAM_VIDEO_API_KEY = Constants.expoConfig?.extra?.streamApiKey;
const BACKEND_URL = Constants.expoConfig?.extra?.backendUrl;
const BACKEND_CHAT_URL =
  Constants.expoConfig?.extra?.backendChatUrl ||
  "https://orbit-chat-backend-old-9d2b903ab237.herokuapp.com";

if (!STREAM_VIDEO_API_KEY) {
  console.error("Stream Video API key is not configured in Constants!");
}

if (!BACKEND_URL) {
  console.error("Backend URL is not configured in Constants!");
}

type VideoContextType = {
  videoClient: StreamVideoClient | null;
  callService: VideoCallService | null;
  isConnecting: boolean;
  isConnected: boolean;
  connectionError: Error | null;
  createCall: (
    callId: string,
    callType?: string,
    members?: Array<{ user_id: string; role?: string }>
  ) => Promise<Call>;
  joinCall: (callId: string, callType?: string) => Promise<Call>;
  getCallHistory: (limit?: number, offset?: number) => Promise<any>;
  getActiveCalls: () => Promise<any>;
};

const VideoContext = createContext<VideoContextType>({
  videoClient: null,
  callService: null,
  isConnecting: false,
  isConnected: false,
  connectionError: null,
  createCall: async () => {
    throw new Error("VideoProvider not initialized");
  },
  joinCall: async () => {
    throw new Error("VideoProvider not initialized");
  },
  getCallHistory: async () => {
    throw new Error("VideoProvider not initialized");
  },
  getActiveCalls: async () => {
    throw new Error("VideoProvider not initialized");
  },
});

export function VideoProvider({ children }: { children: React.ReactNode }) {
  const [videoClient, setVideoClient] = useState<StreamVideoClient | null>(
    null
  );
  const [callService, setCallService] = useState<VideoCallService | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<Error | null>(null);

  const { session } = useAuth();

  useEffect(() => {
    let currentClient: StreamVideoClient | null = null;

    const initVideo = async () => {
      // If no session, make sure to clean up any existing client
      if (
        !session?.user?.id ||
        !STREAM_VIDEO_API_KEY ||
        !session?.access_token
      ) {
        console.log("Missing required data, cleaning up video client", {
          hasSession: !!session,
          hasUserId: !!session?.user?.id,
          hasApiKey: !!STREAM_VIDEO_API_KEY,
          hasAccessToken: !!session?.access_token,
        });

        // Clean up existing client if session is gone
        if (videoClient) {
          console.log(
            "Disconnecting existing Stream Video client due to missing session..."
          );
          try {
            await videoClient.disconnectUser();
          } catch (error) {
            console.error("Error disconnecting Stream Video client:", error);
          }
          setVideoClient(null);
          setCallService(null);
          setIsConnected(false);
        }
        return;
      }

      try {
        setIsConnecting(true);
        setConnectionError(null);

        // Get user profile data from database
        console.log("Fetching user profile data for video...");
        const { data: userData, error: userError } = await supabase
          .from("users")
          .select("first_name, last_name, username, avatar_url")
          .eq("id", session.user.id)
          .single();

        if (userError) {
          console.error("Error fetching user data:", userError);
        }

        // Prepare user name - use first_name + last_name, fallback to username, never use email
        let displayName = "User";
        if (userData?.first_name || userData?.last_name) {
          displayName = `${userData.first_name || ""} ${
            userData.last_name || ""
          }`.trim();
        } else if (userData?.username) {
          displayName = userData.username;
        }

        // Get Stream Video token from backend (using dedicated video token endpoint)
        console.log("Requesting Stream video token from backend...");
        const response = await fetch(`${BACKEND_CHAT_URL}/video/token`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to get token: ${await response.text()}`);
        }

        const { token, api_key } = await response.json();
        if (!token || !api_key) {
          throw new Error("No token or API key received from backend");
        }

        console.log("Initializing Stream Video client...");
        currentClient = new StreamVideoClient({
          apiKey: api_key,
          user: {
            id: session.user.id,
            name: displayName,
            image: userData?.avatar_url,
          },
          token,
        });

        setVideoClient(currentClient);
        
        // Create call service instance
        const service = createVideoCallService(currentClient, session.access_token);
        setCallService(service);
        
        setIsConnected(true);
        console.log("Video initialization complete");
      } catch (error) {
        console.error("Error initializing video:", error);
        setConnectionError(
          error instanceof Error
            ? error
            : new Error("Failed to connect to video")
        );
        // Clean up the client if connection fails
        if (currentClient) {
          currentClient.disconnectUser();
        }
        setCallService(null);
      } finally {
        setIsConnecting(false);
      }
    };

    initVideo();

    // Cleanup function
    return () => {
      if (currentClient) {
        console.log("Disconnecting Stream Video client...");
        currentClient.disconnectUser();
        setVideoClient(null);
        setCallService(null);
        setIsConnected(false);
      }
    };
  }, [session?.user?.id]); // Only reconnect when user changes, not on token refresh

  // Video service methods
  const createCall = async (
    callId: string,
    callType: string = "default",
    members: Array<{ user_id: string; role?: string }> = []
  ): Promise<Call> => {
    if (!videoClient || !session?.access_token) {
      throw new Error("Video client not initialized or no auth token");
    }

    try {
      // Step 1: Create call metadata in backend
      const metadataResponse = await fetch(`${BACKEND_CHAT_URL}/video/calls`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          call_id: callId,
          call_type: callType,
          members: members,
        }),
      });

      if (!metadataResponse.ok) {
        throw new Error(
          `Failed to create call metadata: ${await metadataResponse.text()}`
        );
      }

      // Step 2: Create actual call using Stream Video SDK
      const call = videoClient.call(callType, callId);
      await call.join({ create: true });

      // Step 3: Update call status to active in backend
      await fetch(`${BACKEND_CHAT_URL}/video/calls/${callId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ status: "active" }),
      });

      // Step 4: Track join in backend
      await trackJoin(callId);

      return call;
    } catch (error) {
      console.error("Failed to create call:", error);
      throw error;
    }
  };

  const joinCall = async (
    callId: string,
    callType: string = "default"
  ): Promise<Call> => {
    if (!videoClient || !session?.access_token) {
      throw new Error("Video client not initialized or no auth token");
    }

    try {
      // Step 1: Join call using Stream Video SDK
      const call = videoClient.call(callType, callId);
      await call.join();

      // Step 2: Track join in backend
      await trackJoin(callId);

      return call;
    } catch (error) {
      console.error("Failed to join call:", error);
      throw error;
    }
  };

  const trackJoin = async (callId: string) => {
    if (!session?.access_token) return;

    try {
      await fetch(`${BACKEND_CHAT_URL}/video/calls/${callId}/join`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
      });
    } catch (error) {
      console.error("Failed to track join:", error);
      // Don't throw - this is for analytics only
    }
  };

  const trackLeave = async (callId: string) => {
    if (!session?.access_token) return;

    try {
      await fetch(`${BACKEND_CHAT_URL}/video/calls/${callId}/leave`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
      });
    } catch (error) {
      console.error("Failed to track leave:", error);
      // Don't throw - this is for analytics only
    }
  };

  const getCallHistory = async (limit: number = 25, offset: number = 0) => {
    if (!session?.access_token) {
      throw new Error("No auth token");
    }

    try {
      const response = await fetch(
        `${BACKEND_CHAT_URL}/video/calls/history?limit=${limit}&offset=${offset}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to get call history: ${await response.text()}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Failed to get call history:", error);
      throw error;
    }
  };

  const getActiveCalls = async () => {
    if (!session?.access_token) {
      throw new Error("No auth token");
    }

    try {
      const response = await fetch(`${BACKEND_CHAT_URL}/video/calls/active`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to get active calls: ${await response.text()}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Failed to get active calls:", error);
      throw error;
    }
  };

  return (
    <VideoContext.Provider
      value={{
        videoClient,
        callService,
        isConnecting,
        isConnected,
        connectionError,
        createCall,
        joinCall,
        getCallHistory,
        getActiveCalls,
      }}
    >
      {children}
    </VideoContext.Provider>
  );
}

export function useVideo() {
  return useContext(VideoContext);
}

export function useVideoCallService() {
  const { callService } = useVideo();
  return callService;
}
