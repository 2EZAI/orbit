import { createContext, useContext, useEffect, useState } from "react";
import { StreamChat } from "stream-chat";
import { useAuth } from "./auth";
import { supabase } from "./supabase";
import Constants from "expo-constants";

const STREAM_API_KEY = Constants.expoConfig?.extra?.streamApiKey;
const BACKEND_URL = Constants.expoConfig?.extra?.backendUrl;

if (!STREAM_API_KEY) {
  console.error("Stream API key is not configured in Constants!");
}

if (!BACKEND_URL) {
  console.error("Backend URL is not configured in Constants!");
}

type ChatContextType = {
  client: StreamChat | null;
  isConnecting: boolean;
  isConnected: boolean;
  connectionError: Error | null;
};

const ChatContext = createContext<ChatContextType>({
  client: null,
  isConnecting: false,
  isConnected: false,
  connectionError: null,
});

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const [client, setClient] = useState<StreamChat | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<Error | null>(null);
  const { session } = useAuth();

  useEffect(() => {
    let currentClient: StreamChat | null = null;

    const initChat = async () => {
      // If no session, make sure to clean up any existing client
      if (!session?.user?.id || !STREAM_API_KEY || !session?.access_token) {
        console.log("Missing required data, cleaning up chat client", {
          hasSession: !!session,
          hasUserId: !!session?.user?.id,
          hasApiKey: !!STREAM_API_KEY,
          hasAccessToken: !!session?.access_token,
        });

        // Clean up existing client if session is gone
        if (client) {
          console.log(
            "Disconnecting existing Stream client due to missing session..."
          );
          try {
            await client.disconnectUser();
          } catch (error) {
            console.error("Error disconnecting Stream client:", error);
          }
          setClient(null);
          setIsConnected(false);
        }
        return;
      }

      try {
        setIsConnecting(true);
        setConnectionError(null);

        // Get user profile data from database
        console.log("Fetching user profile data...");
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

        // Get Stream token from backend
        console.log("Requesting Stream token from backend...");
        const response = await fetch(`${BACKEND_URL}/chat/token`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to get chat token: ${await response.text()}`);
        }

        const { token } = await response.json();
        if (!token) {
          throw new Error("No token received from backend");
        }

        console.log("Initializing Stream client...");
        currentClient = StreamChat.getInstance(STREAM_API_KEY);

        console.log("Connecting user to Stream with name:", displayName);
        await currentClient.connectUser(
          {
            id: session.user.id,
            name: displayName,
            first_name: userData?.first_name,
            last_name: userData?.last_name,
            username: userData?.username,
            image: userData?.avatar_url,
          },
          token
        );

        console.log("Connection state changed:", {
          online: currentClient.wsConnection?.isHealthy,
          userId: session.user.id,
        });

        setClient(currentClient);
        setIsConnected(true);
        console.log("Chat initialization complete");
      } catch (error) {
        console.error("Error initializing chat:", error);
        setConnectionError(
          error instanceof Error
            ? error
            : new Error("Failed to connect to chat")
        );
        // Clean up the client if connection fails
        if (currentClient) {
          currentClient.disconnectUser();
        }
      } finally {
        setIsConnecting(false);
      }
    };

    initChat();

    // Cleanup function
    return () => {
      if (currentClient) {
        console.log("Disconnecting Stream client...");
        currentClient.disconnectUser();
        setClient(null);
        setIsConnected(false);
      }
    };
  }, [session?.user?.id, session?.access_token, session]);

  // Monitor connection state
  useEffect(() => {
    if (!client) return;

    const handleConnectionChange = ({ online = false }) => {
      console.log("Stream connection state changed:", { online });
      setIsConnected(online);
    };

    client.on("connection.changed", handleConnectionChange);

    return () => {
      client.off("connection.changed", handleConnectionChange);
    };
  }, [client]);

  return (
    <ChatContext.Provider
      value={{
        client,
        isConnecting,
        isConnected,
        connectionError,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  return useContext(ChatContext);
}
