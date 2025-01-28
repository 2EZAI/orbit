import { createContext, useContext, useEffect, useState } from "react";
import { StreamChat } from "stream-chat";
import { DefaultStreamChatGenerics } from "stream-chat-expo";
import { useAuth } from "./auth";
import { useUser } from "~/hooks/useUserData";
import Constants from "expo-constants";

const STREAM_API_KEY = Constants.expoConfig?.extra?.streamApiKey || "";
console.log("Stream API Key:", STREAM_API_KEY); // Debug log

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
  const { user } = useUser();
  const [client, setClient] =
    useState<StreamChat<DefaultStreamChatGenerics> | null>(chatClient);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState<Error | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (chatClient) {
        chatClient.disconnectUser();
      }
    };
  }, []);

  const connectUser = async (token: string) => {
    if (!session?.user || !user || !client) {
      console.error("Missing required data:", {
        hasSession: !!session?.user,
        hasUser: !!user,
        hasClient: !!client,
      });
      throw new Error("Missing required data for connection");
    }

    try {
      setIsConnecting(true);
      setConnectionError(null);

      // Check if user is already connected with the same ID
      if (client.userID === session.user.id) {
        console.log("User already connected:", client.userID);
        return;
      }

      // If a different user was connected, disconnect them first
      if (client.userID) {
        await client.disconnectUser();
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

      console.log("User connected successfully to Stream");
    } catch (error) {
      console.error("Error connecting to chat:", error);
      if (error instanceof Error) {
        console.error("Error details:", error.message, error.stack);
      }
      const errorMessage =
        error instanceof Error ? error.message : "Failed to connect to chat";
      setConnectionError(new Error(errorMessage));
      throw error;
    } finally {
      setIsConnecting(false);
    }
  };

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
