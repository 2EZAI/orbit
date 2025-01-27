import { createContext, useContext, useEffect, useState } from "react";
import { StreamChat } from "stream-chat";
import { DefaultStreamChatGenerics } from "stream-chat-expo";
import { useAuth } from "./auth";
import { streamClient, connectUserToStream, getStreamToken } from "./stream";
import { useUser } from "~/hooks/useUserData";

type ChatContextType = {
  client: StreamChat<DefaultStreamChatGenerics> | null;
  isConnecting: boolean;
  connectionError: Error | null;
};

const ChatContext = createContext<ChatContextType>({
  client: null,
  isConnecting: false,
  connectionError: null,
});

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const { user } = useUser();
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState<Error | null>(null);

  useEffect(() => {
    if (!session?.user || !user) return;

    const connectChat = async () => {
      try {
        setIsConnecting(true);
        setConnectionError(null);

        // Get token from backend
        const token = await getStreamToken(session.user.id);

        // Connect the user
        await connectUserToStream(
          session.user.id,
          user.username || user.email,
          token
        );
      } catch (error) {
        console.error("Error connecting to chat:", error);
        setConnectionError(
          error instanceof Error
            ? error
            : new Error("Failed to connect to chat")
        );
      } finally {
        setIsConnecting(false);
      }
    };

    connectChat();

    // Cleanup on unmount
    return () => {
      streamClient.disconnectUser();
    };
  }, [session?.user, user]);

  return (
    <ChatContext.Provider
      value={{
        client: streamClient,
        isConnecting,
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
