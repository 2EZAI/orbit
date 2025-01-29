import { createContext, useContext, useEffect, useState, useRef } from "react";
import { StreamChat } from "stream-chat";
import { DefaultStreamChatGenerics } from "stream-chat-expo";
import { useAuth } from "./auth";
import { useUser } from "~/hooks/useUserData";
import Constants from "expo-constants";
import AsyncStorage from "@react-native-async-storage/async-storage";

const STREAM_API_KEY = Constants.expoConfig?.extra?.streamApiKey || "";
const BACKEND_URL = Constants.expoConfig?.extra?.backendUrl;
const STREAM_TOKEN_KEY = "stream_chat_token";
const STREAM_TOKEN_EXPIRY_KEY = "stream_chat_token_expiry";

if (!BACKEND_URL) {
  throw new Error("Backend URL is not configured");
}

type ChatContextType = {
  client: StreamChat<DefaultStreamChatGenerics> | null;
  isConnecting: boolean;
  connectionError: Error | null;
  isConnected: boolean;
};

const ChatContext = createContext<ChatContextType>({
  client: null,
  isConnecting: false,
  connectionError: null,
  isConnected: false,
});

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const { user, loading: userLoading } = useUser();
  const [client, setClient] =
    useState<StreamChat<DefaultStreamChatGenerics> | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState<Error | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const hasInitialized = useRef(false);

  // Initialize chat client and handle connection
  useEffect(() => {
    let chatClient: StreamChat<DefaultStreamChatGenerics> | null = null;
    let isMounted = true;

    const initChat = async () => {
      // Skip if already initialized or still loading user data
      if (hasInitialized.current || userLoading) {
        return;
      }

      // Wait for session and user data
      if (!session?.access_token || !user) {
        if (isMounted) {
          setIsConnected(false);
          setClient(null);
        }
        return;
      }

      try {
        if (isMounted) {
          setIsConnecting(true);
          setConnectionError(null);
        }

        // Get token
        const token = await getToken();
        if (!token || !isMounted) {
          throw new Error("Failed to get chat token");
        }

        // Initialize client
        console.log("Initializing Stream client...");
        chatClient =
          StreamChat.getInstance<DefaultStreamChatGenerics>(STREAM_API_KEY);

        // Set up connection event handler
        const handleConnectionChange = ({ online = false }) => {
          console.log("Connection state changed:", { online });
          if (isMounted) {
            setIsConnected(online);
          }
        };

        chatClient.on("connection.changed", handleConnectionChange);

        // Connect user
        console.log("Connecting user to Stream...");
        await chatClient.connectUser(
          {
            id: user.id,
            name:
              `${user.first_name || ""} ${user.last_name || ""}`.trim() ||
              user.email ||
              "",
            image: user.avatar_url || undefined,
          },
          token
        );

        if (isMounted) {
          setClient(chatClient);
          hasInitialized.current = true;
        }
        console.log("Chat initialization complete");
      } catch (error) {
        console.error("Chat initialization failed:", error);
        if (isMounted) {
          setConnectionError(
            error instanceof Error
              ? error
              : new Error("Failed to initialize chat")
          );
          setIsConnected(false);
        }

        // Cleanup on error
        if (chatClient) {
          chatClient.disconnectUser();
          chatClient = null;
        }
      } finally {
        if (isMounted) {
          setIsConnecting(false);
        }
      }
    };

    // Get token from backend
    const getToken = async () => {
      if (!session?.access_token) return null;

      try {
        // Check cached token
        const cachedToken = await AsyncStorage.getItem(STREAM_TOKEN_KEY);
        const cachedExpiry = await AsyncStorage.getItem(
          STREAM_TOKEN_EXPIRY_KEY
        );

        if (cachedToken && cachedExpiry) {
          const expiryTime = parseInt(cachedExpiry, 10);
          if (Date.now() < expiryTime - 5 * 60 * 1000) {
            console.log("Using cached token");
            return cachedToken;
          }
        }

        // Get new token
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
        if (!data.token || typeof data.token !== "string") {
          throw new Error("Invalid token received from server");
        }

        // Cache token
        await AsyncStorage.setItem(STREAM_TOKEN_KEY, data.token);
        await AsyncStorage.setItem(
          STREAM_TOKEN_EXPIRY_KEY,
          data.expires.toString()
        );

        return data.token;
      } catch (error) {
        console.error("Error getting token:", error);
        return null;
      }
    };

    initChat();

    // Cleanup function
    return () => {
      isMounted = false;
      hasInitialized.current = false;

      if (chatClient) {
        console.log("Cleaning up chat client...");
        chatClient.disconnectUser().then(() => {
          if (chatClient) {
            chatClient.closeConnection();
            if (isMounted) {
              setClient(null);
              setIsConnected(false);
            }
          }
        });
      }
    };
  }, [session?.access_token, user, userLoading]);

  return (
    <ChatContext.Provider
      value={{
        client,
        isConnecting,
        connectionError,
        isConnected,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  return useContext(ChatContext);
}
