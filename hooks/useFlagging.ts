import Toast from "react-native-toast-message";
import { useAuth } from "~/src/lib/auth";

export type FlagReason =
  | "inappropriate_content"
  | "spam"
  | "misinformation"
  | "harassment"
  | "fake_event"
  | "wrong_location"
  | "other";
export type FlagStatus = "pending" | "reviewed" | "resolved" | "dismissed";
export interface CreateFlagRequest {
  event_id?: string;
  static_location_id?: string;
  reason: FlagReason;
  explanation?: string;
}
export function useFlagging() {
  const { session } = useAuth();

  const createFlag = async (data: CreateFlagRequest) => {
    if (!session?.access_token) {
      return null;
    }

    // Validate that either event_id or static_location_id is provided
    if (!data.event_id && !data.static_location_id) {
      Toast.show({
        type: "error",
        text1: "Event Id or Location Id required to flag",
        position: "top",
        visibilityTime: 3000,
        autoHide: true,
        topOffset: 50,
      });
      return;
    }

    if (data.event_id && data.static_location_id) {
      Toast.show({
        type: "error",
        text1: "Cannot provide both Event Id and Location Id to flag",
        position: "top",
        visibilityTime: 3000,
        autoHide: true,
        topOffset: 50,
      });
      return;
    }
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
