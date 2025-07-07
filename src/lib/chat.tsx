import { createContext, useContext, useEffect, useState } from "react";
import { StreamChat } from "stream-chat";
import { useAuth } from "./auth";
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
      if (!session?.user?.id || !STREAM_API_KEY || !session?.access_token) {
        console.log("Missing required data, skipping chat initialization", {
          hasUserId: !!session?.user?.id,
          hasApiKey: !!STREAM_API_KEY,
          hasAccessToken: !!session?.access_token,
        });
        return;
      }

      try {
        setIsConnecting(true);
        setConnectionError(null);
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

        console.log("Connecting user to Stream...");
        await currentClient.connectUser(
          {
            id: session.user.id,
            name: session.user.email,
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
  }, [session?.user?.id, session?.access_token]);

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
