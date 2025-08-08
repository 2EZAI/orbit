import { Call } from "@stream-io/video-react-native-sdk";

export const generateCallId = (prefix: string = "call"): string => {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

export const formatCallDuration = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${remainingSeconds
      .toString()
      .padStart(2, "0")}`;
  }
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
};

export const formatCallDate = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - date.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 1) {
    return "Today";
  } else if (diffDays === 2) {
    return "Yesterday";
  } else if (diffDays <= 7) {
    return `${diffDays} days ago`;
  } else {
    return date.toLocaleDateString();
  }
};

export const getCallTypeDisplay = (callType: string): string => {
  switch (callType) {
    case "audio_room":
      return "Audio Call";
    case "default":
      return "Video Call";
    case "livestream":
      return "Live Stream";
    default:
      return "Call";
  }
};

export const getCallStatusColor = (status: string): string => {
  switch (status) {
    case "active":
      return "#34C759"; // Green
    case "ended":
      return "#8E8E93"; // Gray
    case "cancelled":
      return "#FF3B30"; // Red
    case "created":
      return "#007AFF"; // Blue
    default:
      return "#8E8E93"; // Gray
  }
};

export const validateCallId = (callId: string): boolean => {
  // Basic validation for call ID format
  return callId && callId.length > 0 && /^[a-zA-Z0-9-_]+$/.test(callId);
};

export const getParticipantDisplayName = (participant: any): string => {
  return participant.name || participant.userId || "Unknown";
};

export const isCallActive = (call: Call | null): boolean => {
  if (!call) return false;

  try {
    // Check if call state indicates it's active
    return call.state.callingState === "joined";
  } catch (error) {
    console.error("Error checking call state:", error);
    return false;
  }
};

export const getOptimalVideoQuality = (participantCount: number): string => {
  // Adjust video quality based on participant count for better performance
  if (participantCount <= 2) {
    return "720p";
  } else if (participantCount <= 4) {
    return "480p";
  } else {
    return "360p";
  }
};

export interface CallNotificationData {
  callId: string;
  callType: string;
  callerName: string;
  callerImage?: string;
  timestamp: number;
}

export const createCallNotification = (
  callId: string,
  callType: string,
  callerName: string,
  callerImage?: string
): CallNotificationData => {
  return {
    callId,
    callType,
    callerName,
    callerImage,
    timestamp: Date.now(),
  };
};
