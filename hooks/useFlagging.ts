import Toast from "react-native-toast-message";
import { useAuth } from "~/src/lib/auth";

export type FlagReason =
  | "sexual_adult_content"
  | "hate_speech_harassment_bullying"
  | "violence_threats_self_harm"
  | "illegal_activity"
  | "spam_scam_fraud"
  | "copyright_ip_violation"
  | "misinformation"
  | "fake_event"
  | "wrong_location"
  | "other";
export type FlagStatus = "pending" | "reviewed" | "resolved" | "dismissed";
export interface CreateFlagRequest {
  event_id?: string;
  static_location_id?: string;
  reason: FlagReason;
  explanation?: string;
  post_id?: string;
  post_comment_id?: string;
  user_id?: string;
}
export function useFlagging() {
  const { session } = useAuth();

  const createFlag = async (data: CreateFlagRequest) => {
    if (!session?.access_token) {
      return null;
    }

    // Validate that at least one content type ID is provided
    const hasContentId =
      data.event_id ||
      data.static_location_id ||
      data.post_id ||
      data.post_comment_id ||
      data.user_id;

    if (!hasContentId) {
      Toast.show({
        type: "error",
        text1: "Content ID required to flag",
        position: "top",
        visibilityTime: 3000,
        autoHide: true,
        topOffset: 50,
      });
      return;
    }

    // Count how many content types are provided (should be exactly one)
    const contentTypeCount = [
      data.event_id,
      data.static_location_id,
      data.post_id,
      data.post_comment_id,
      data.user_id,
    ].filter(Boolean).length;

    if (contentTypeCount > 1) {
      Toast.show({
        type: "error",
        text1: "Can only flag one content type at a time",
        position: "top",
        visibilityTime: 3000,
        autoHide: true,
        topOffset: 50,
      });
      return;
    }
    console.log("\n\nfinal data>", data);
    const response = await fetch(
      `https://orbit-web-backend.onrender.com/api/flags`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(data),
      }
    );
    console.log("response>", response);

    if (!response.ok) {
      Toast.show({
        type: "error",
        text1: "Failed to create flag. Please try again later.",
        position: "top",
        visibilityTime: 3000,
        autoHide: true,
        topOffset: 50,
      });
      return;
    }
    return await response.json();
  };
  return { createFlag };
}
