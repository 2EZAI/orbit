import React, { useState, useEffect } from "react";
import {
  View,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { useTheme } from "../ThemeProvider";
import { Text } from "../ui/text";
import { Avatar } from "../ui/avatar";
import { Phone, Video, Users, PhoneCall } from "lucide-react-native";
import { useVideo } from "../../lib/video";

interface ActiveCallBannerProps {
  channelId: string;
  channelName?: string;
}

interface ActiveCall {
  id: string;
  call_id: string;
  call_type: "default" | "audio_room" | "livestream";
  call_name?: string;
  status: "active";
  started_at: string;
  ended_at: null;
  duration_seconds: null;
  created_by: string;
  recording_enabled: boolean;
  screensharing_enabled: boolean;
  max_participants: number;
  created_at: string;
  updated_at: string;
  video_call_participants: Array<{
    user_id: string;
    left_at: null;
  }>;
  active_participants_count: number;
}

export default function ActiveCallBanner({
  channelId,
  channelName,
}: ActiveCallBannerProps) {
  const router = useRouter();
  const { theme } = useTheme();
  const { getActiveCalls } = useVideo();

  const [activeCall, setActiveCall] = useState<ActiveCall | null>(null);
  const [loading, setLoading] = useState(false);

  // Check for active calls related to this channel
  useEffect(() => {
    const checkForActiveCalls = async () => {
      try {
        setLoading(true);
        const { active_calls } = await getActiveCalls();

        // Look for calls that match this channel
        const channelCall = active_calls?.find((call: ActiveCall) =>
          call.call_id.includes(`channel-call-${channelId}`)
        );

        setActiveCall(channelCall || null);
      } catch (error) {
        console.warn("Active calls temporarily unavailable:", error);
        // Don't show error to user, just hide banner when backend has issues
        setActiveCall(null);
      } finally {
        setLoading(false);
      }
    };

    checkForActiveCalls();

    // Poll for updates every 10 seconds
    const interval = setInterval(checkForActiveCalls, 10000);

    return () => clearInterval(interval);
  }, [channelId, getActiveCalls]);

  const handleJoinCall = () => {
    if (!activeCall) return;

    router.push({
      pathname: "/call/[id]" as const,
      params: {
        id: activeCall.call_id,
        type: activeCall.call_type,
        create: "false", // Joining existing call
      },
    });
  };

  const formatDuration = (startTime: string): string => {
    const start = new Date(startTime);
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - start.getTime()) / 60000);

    if (diffMinutes < 1) return "Just started";
    if (diffMinutes < 60) return `${diffMinutes}m`;

    const hours = Math.floor(diffMinutes / 60);
    const minutes = diffMinutes % 60;
    return `${hours}h ${minutes}m`;
  };

  // Don't show banner if no active call
  if (!activeCall && !loading) return null;

  const isVideoCall = activeCall?.call_type === "default";
  const isAudioCall = activeCall?.call_type === "audio_room";

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.card,
          borderBottomColor: theme.colors.border,
        },
      ]}
    >
      <View style={styles.content}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={theme.colors.primary} />
            <Text style={[styles.loadingText, { color: theme.colors.text }]}>
              Checking for active calls...
            </Text>
          </View>
        ) : activeCall ? (
          <>
            {/* Call Info */}
            <View style={styles.callInfo}>
              <View style={styles.callHeader}>
                <View style={styles.callTypeContainer}>
                  {isVideoCall ? (
                    <Video size={16} color={theme.colors.primary} />
                  ) : isAudioCall ? (
                    <Phone size={16} color={theme.colors.primary} />
                  ) : (
                    <PhoneCall size={16} color={theme.colors.primary} />
                  )}
                  <Text
                    style={[
                      styles.callTypeText,
                      { color: theme.colors.primary },
                    ]}
                  >
                    {isVideoCall
                      ? "Video Call"
                      : isAudioCall
                      ? "Audio Call"
                      : "Call"}
                  </Text>
                </View>

                <View style={styles.participantInfo}>
                  <Users size={14} color={theme.colors.text + "80"} />
                  <Text
                    style={[
                      styles.participantCount,
                      { color: theme.colors.text + "80" },
                    ]}
                  >
                    {activeCall.active_participants_count}
                  </Text>
                </View>
              </View>

              <Text style={[styles.callName, { color: theme.colors.text }]}>
                {activeCall.call_name || channelName || "Call in progress"}
              </Text>

              <Text
                style={[styles.duration, { color: theme.colors.text + "60" }]}
              >
                Started {formatDuration(activeCall.started_at)} ago •{" "}
                {activeCall.video_call_participants.length} active
              </Text>
            </View>

            {/* Participants Avatars - Simplified since we don't have participant details */}
            <View style={styles.avatarsContainer}>
              <View
                style={[
                  styles.participantBadge,
                  { backgroundColor: theme.colors.primary },
                ]}
              >
                <Users size={16} color="white" />
                <Text style={[styles.participantBadgeText, { color: "white" }]}>
                  {activeCall.active_participants_count}
                </Text>
              </View>
            </View>

            {/* Join Button */}
            <TouchableOpacity
              style={[
                styles.joinButton,
                { backgroundColor: theme.colors.primary },
              ]}
              onPress={handleJoinCall}
            >
              <Text
                style={[
                  styles.joinButtonText,
                  { color: theme.colors.background },
                ]}
              >
                Join
              </Text>
            </TouchableOpacity>
          </>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  loadingText: {
    marginLeft: 8,
    fontSize: 14,
  },
  callInfo: {
    flex: 1,
    marginRight: 12,
  },
  callHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  callTypeContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  callTypeText: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: "600",
  },
  participantInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  participantCount: {
    marginLeft: 4,
    fontSize: 12,
    fontWeight: "500",
  },
  callName: {
    fontSize: 15,
    fontWeight: "500",
    marginBottom: 2,
  },
  duration: {
    fontSize: 12,
  },
  avatarsContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 12,
  },
  participantBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  participantBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 4,
  },
  joinButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  joinButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
});
