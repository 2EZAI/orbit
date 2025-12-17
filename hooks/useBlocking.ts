import { useAuth } from "~/src/lib/auth";
import Toast from "react-native-toast-message";

export function useBlocking() {
  const { session } = useAuth();

  const getBlockStatus = async (userId: string) => {
    if (!session?.access_token) {
      return false;
    }
    const response = await fetch(
      `https://orbit-web-backend.onrender.com/api/users/${userId}/block-status`,
      {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
      }
    );
    if (!response.ok) {
      return false;
    }
    const data = await response.json();

    console.log("block status", data);
    return (data?.is_blocked as boolean) || false;
  };
  const blockUser = async (userId: string) => {
    if (!session?.access_token) {
      return false;
    }
    const response = await fetch(
      `https://orbit-web-backend.onrender.com/api/users/${userId}/block`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
      }
    );
    console.log("Block user response:", response);
    if (response.ok) {
      Toast.show({
        type: "success",
        text1: "User Blocked",
        text2: "You have successfully blocked this user.",
      });
      return true;
    } else {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Failed to block the user. Please try again.",
      });
    }
    return false;
  };
  const unblockUser = async (userId: string) => {
    if (!session?.access_token) {
      return false;
    }
    const response = await fetch(
      `https://orbit-web-backend.onrender.com/api/users/${userId}/block`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
      }
    );
    console.log("Unblock user response:", response);
    if (response.ok) {
      Toast.show({
        type: "success",
        text1: "User Unblocked",
        text2: "You have successfully unblocked this user.",
      });
      return true;
    } else {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Failed to unblock the user. Please try again.",
      });
    }
    return false;
  };
  return { getBlockStatus, blockUser, unblockUser };
}
