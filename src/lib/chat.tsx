import { createContext, useContext, useEffect, useState, useRef } from "react";
import { StreamChat } from "stream-chat";
import { DefaultStreamChatGenerics } from "stream-chat-expo";
import { useAuth } from "./auth";
import { useUser } from "~/hooks/useUserData";
import Constants from "expo-constants";

const STREAM_API_KEY = Constants.expoConfig?.extra?.streamApiKey || "";
const MAX_RECONNECT_ATTEMPTS = 3;
const BACKEND_URL = Constants.expoConfig?.extra?.backendUrl;

if (!BACKEND_URL) {
  throw new Error("Backend URL is not configured");
}

type ChatContextType = {
  client: StreamChat<DefaultStreamChatGenerics> | null;
  isConnecting: boolean;
  connectionError: Error | null;
  connectUser: (token: string) => Promise<void>;
};

const ChatContext = createContext<ChatContextType>({
  client: null,
  isConnecting: false,
  connectionError: null,
  connectUser: async () => {},
});

// Create a single instance of the chat client
const chatClient =
  StreamChat.getInstance<DefaultStreamChatGenerics>(STREAM_API_KEY);

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const { user, loading: userLoading } = useUser();
  const [client] = useState<StreamChat<DefaultStreamChatGenerics>>(chatClient);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState<Error | null>(null);
  const initializationAttemptsRef = useRef(0);
  const isUnmountedRef = useRef(false);
  const currentTokenRef = useRef<string | null>(null);

  const getNewToken = async () => {
    if (!session?.access_token) {
      console.log("No session access token available");
      return null;
    }

    try {
      console.log("Requesting new chat token...");
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

      const data = await response.json();
      console.log("Raw token response:", data);

      // Validate token response
      if (!data.token || typeof data.token !== "string") {
        console.error("Invalid token response:", data);
        throw new Error("Invalid token received from server");
      }

      // Handle both timestamp and duration formats
      let expiresIn: number;
      if (data.expires) {
        // If we get a timestamp, convert it to duration
        const expiresAt = new Date(data.expires);
        expiresIn = Math.floor((expiresAt.getTime() - Date.now()) / 1000);
      } else if (data.expiresIn && typeof data.expiresIn === "number") {
        expiresIn = data.expiresIn;
      } else {
        console.error("Invalid expiration format:", data);
        throw new Error("Invalid token expiration format");
      }

      // Validate expiration
      if (expiresIn <= 0) {
        console.error("Token is already expired:", { expiresIn });
        throw new Error("Received expired token from server");
      }

      console.log("Got new token:", {
        expiresIn,
        tokenLength: data.token.length,
        expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
      });

      return data.token;
    } catch (error) {
      console.error("Error getting new token:", error);
      return null;
    }
  };

  const connectUser = async (token: string) => {
    if (!session?.user || !user || !client) {
      console.error("Missing required data:", {
        hasSession: !!session?.user,
        hasUser: !!user,
        hasClient: !!client,
      });
      return;
    }

    if (isConnecting) {
      console.log("Already connecting, skipping...");
      return;
    }

    // If we're already connected with this token, skip
    if (currentTokenRef.current === token && client.userID) {
      console.log("Already connected with this token");
      return;
    }

    try {
      setIsConnecting(true);
      setConnectionError(null);

      // Ensure clean disconnect
      if (client.userID) {
        console.log("Disconnecting existing user...");
        await client.disconnectUser();
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      console.log("Connecting user to Stream...", {
        userId: session.user.id,
        userName: user.username || user.email,
        tokenLength: token.length,
      });

      await client.connectUser(
        {
          id: session.user.id,
          name: user.username || user.email,
        },
        token
      );

      currentTokenRef.current = token;
      initializationAttemptsRef.current = 0;
      console.log("Successfully connected to Stream");
    } catch (error: any) {
      console.error("Error connecting to chat:", error);
      const errorMessage = error.message || "Unknown error";
      console.log("Connection error details:", {
        message: errorMessage,
        code: error.code,
        statusCode: error.StatusCode,
      });

      // Clear current token if it's expired
      if (errorMessage.includes("token is expired")) {
        console.log("Token expired, clearing current token");
        currentTokenRef.current = null;

        if (initializationAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
          console.log(
            `Attempt ${
              initializationAttemptsRef.current + 1
            }/${MAX_RECONNECT_ATTEMPTS} to get new token`
          );
          initializationAttemptsRef.current++;
          const newToken = await getNewToken();
          if (newToken) {
            return connectUser(newToken);
          }
        } else {
          console.log("Max reconnection attempts reached");
        }
      }

      setConnectionError(
        error instanceof Error ? error : new Error("Connection failed")
      );
    } finally {
      if (!isUnmountedRef.current) {
        setIsConnecting(false);
      }
    }
  };

  useEffect(() => {
    const initializeChat = async () => {
      if (
        !session?.access_token ||
        !user ||
        userLoading ||
        !client ||
        isConnecting
      ) {
        console.log("Skipping chat initialization:", {
          hasSession: !!session?.access_token,
          hasUser: !!user,
          isLoading: userLoading,
          hasClient: !!client,
          isConnecting,
        });
        return;
      }

      try {
        // Only get a new token if we don't have a valid connection
        if (!currentTokenRef.current || !client.userID) {
          console.log("No current token or user ID, getting new token");
          const token = await getNewToken();
          if (token) {
            await connectUser(token);
          } else {
            console.error("Failed to get new token");
          }
        } else {
          console.log("Using existing connection");
        }
      } catch (error) {
        console.error("Failed to initialize chat:", error);
        setConnectionError(
          error instanceof Error
            ? error
            : new Error("Failed to initialize chat")
        );
      }
    };

    initializeChat();
  }, [session?.access_token, user, userLoading]);

  useEffect(() => {
    isUnmountedRef.current = false;
    return () => {
      isUnmountedRef.current = true;
      if (client) {
        client.disconnectUser();
      }
    };
  }, []);

  return (
    <ChatContext.Provider
      value={{
        client,
        isConnecting,
        connectionError,
        connectUser,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  return useContext(ChatContext);
}
