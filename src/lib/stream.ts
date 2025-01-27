import { StreamChat, DefaultGenerics } from "stream-chat";
import { DefaultStreamChatGenerics } from "stream-chat-expo";
import Constants from "expo-constants";

// GetStream credentials from environment variables
const STREAM_API_KEY = Constants.expoConfig?.extra?.streamApiKey || "";
const STREAM_API_SECRET = Constants.expoConfig?.extra?.streamApiSecret || ""; // Only for development

// Create Stream Client
export const streamClient =
  StreamChat.getInstance<DefaultStreamChatGenerics>(STREAM_API_KEY);

// Helper function to connect user to Stream
export async function connectUserToStream(
  userId: string,
  username: string,
  userToken: string
) {
  try {
    await streamClient.connectUser(
      {
        id: userId,
        name: username,
      },
      userToken
    );
    return true;
  } catch (error) {
    console.error("Error connecting to Stream:", error);
    return false;
  }
}

// Helper function to disconnect user from Stream
export async function disconnectUser() {
  try {
    await streamClient.disconnectUser();
    return true;
  } catch (error) {
    console.error("Error disconnecting from Stream:", error);
    return false;
  }
}

// Temporary development-only token generation
// TODO: Replace with backend token generation before deploying to production
export function getStreamToken(userId: string) {
  if (!STREAM_API_SECRET) {
    throw new Error("Stream API Secret not configured");
  }
  return streamClient.createToken(userId);
}
