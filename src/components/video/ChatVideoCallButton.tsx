import { useRouter } from "expo-router";
import { Phone, Video } from "lucide-react-native";
import React, { useState } from "react";
import { Alert, StyleSheet, TouchableOpacity, View } from "react-native";
import { useTheme } from "~/src/components/ThemeProvider";
import { useVideo } from "~/src/lib/video";

interface ChatVideoCallButtonProps {
  channelId: string;
  channelMembers?: Array<{ user_id: string; name?: string }>;
  style?: any;
}

export default function ChatVideoCallButton({
  channelId,
  channelMembers = [],
  style,
}: ChatVideoCallButtonProps) {
  const router = useRouter();
  const { isConnected, createCall } = useVideo();
  const { theme } = useTheme();
  const [loading, setLoading] = useState(false);

  const startVideoCall = async () => {
    if (!isConnected) {
      Alert.alert("Error", "Video service not connected");
      return;
    }

    try {
      setLoading(true);
      const callId = `channel-video-${channelId}-${Date.now()}`;

      // Navigate to video call screen
      router.push({
        pathname: "/call/[id]",
        params: {
          id: callId,
          type: "video",
          create: "true",
        },
      });
    } catch (error) {
      Alert.alert("Error", "Failed to start video call");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const startAudioCall = async () => {
    if (!isConnected) {
      Alert.alert("Error", "Video service not connected");
      return;
    }

    try {
      setLoading(true);
      const callId = `channel-audio-${channelId}-${Date.now()}`;

      // Navigate to audio call screen
      router.push({
        pathname: "/call/[id]",
        params: {
          id: callId,
          type: "audio",
          create: "true",
        },
      });
    } catch (error) {
      Alert.alert("Error", "Failed to start audio call");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const showCallOptions = () => {
    Alert.alert("Start Call", "Choose call type", [
      {
        text: "Audio Call",
        onPress: startAudioCall,
      },
      {
        text: "Video Call",
        onPress: startVideoCall,
      },
      {
        text: "Cancel",
        style: "cancel",
      },
    ]);
  };

  return (
    <View style={[styles.container, style]}>
      <TouchableOpacity
        style={[
          styles.callButton,
          { backgroundColor: theme.colors.primary },
          loading && styles.disabled,
        ]}
        onPress={showCallOptions}
        disabled={!isConnected || loading}
      >
        <Phone size={20} color="white" />
        <Video size={20} color="white" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
  },
  callButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  disabled: {
    opacity: 0.6,
  },
});
