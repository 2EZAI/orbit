import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Alert,
  StatusBar,
  SafeAreaView,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { router } from "expo-router";
import {
  StreamVideo,
  StreamCall,
  CallContent,
  RingingCallContent,
  Call,
} from "@stream-io/video-react-native-sdk";
import { useVideo } from "../../lib/video";
import { useAuth } from "../../lib/auth";
import {
  createVideoCallService,
  VideoCallService,
} from "../../lib/videoCallService";
import { useTheme } from "../ThemeProvider";
import { Text } from "../ui/text";
import { PhoneOff } from "lucide-react-native";

interface VideoCallScreenProps {
  callId: string;
  callType?: "default" | "audio_room" | "livestream";
  isCreator?: boolean;
  members?: string;
}

export default function VideoCallScreen({
  callId,
  callType = "default",
  isCreator = false,
  members,
}: VideoCallScreenProps) {
  const { videoClient, isConnected } = useVideo();
  const { session } = useAuth();
  const { theme, isDarkMode } = useTheme();

  const [call, setCall] = useState<Call | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [callService, setCallService] = useState<VideoCallService | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);

  const parsedMembers = members ? JSON.parse(members) : [];

  // Create call service when client is ready
  useEffect(() => {
    if (videoClient && session?.access_token) {
      const service = createVideoCallService(videoClient, session.access_token);
      setCallService(service);
    }
  }, [videoClient, session?.access_token]);

  // Initialize call
  const initializeCall = useCallback(async () => {
    if (!videoClient || !callService || !callId || isInitializing || call) {
      return;
    }

    try {
      setIsInitializing(true);
      setIsLoading(true);
      setError(null);

      let callInstance: Call;

      if (isCreator) {
        console.log("Creating new call:", callId);
        const { call: newCall } = await callService.createCall({
          callId,
          callType,
          members: parsedMembers,
          settings: {
            video: {
              enabled: callType !== "audio_room",
            },
            audio: {
              default_device: "speaker",
            },
            screensharing: {
              enabled: callType !== "audio_room",
            },
          },
        });
        callInstance = newCall;
      } else {
        console.log("Joining existing call:", callId);
        callInstance = await callService.joinCall(callId, callType);
      }

      // Disable video for audio-only calls
      if (callType === "audio_room") {
        await callInstance.camera.disable();
      }

      setCall(callInstance);
      console.log("Call initialized successfully");
    } catch (error) {
      console.error("Failed to initialize call:", error);
      setError(
        error instanceof Error ? error.message : "Failed to initialize call"
      );

      // Show error and go back
      Alert.alert("Call Error", "Failed to join the call. Please try again.", [
        {
          text: "OK",
          onPress: () => router.back(),
        },
      ]);
    } finally {
      setIsInitializing(false);
      setIsLoading(false);
    }
  }, [
    videoClient,
    callService,
    callId,
    callType,
    isCreator,
    parsedMembers,
    isInitializing,
    call,
  ]);

  // Handle leaving call
  const handleLeaveCall = useCallback(async () => {
    try {
      if (call && callService && callId) {
        await callService.leaveCall(call, callId);
      }
      router.back();
    } catch (error) {
      console.error("Error leaving call:", error);
      // Still go back even if tracking fails
      router.back();
    }
  }, [call, callService, callId]);

  // Initialize call when ready
  useEffect(() => {
    if (isConnected && callService && callId && !call && !isInitializing) {
      console.log("Starting call initialization...");
      initializeCall();
    }
  }, [isConnected, callService, callId, call, isInitializing]);

  // Handle call state changes
  useEffect(() => {
    if (call) {
      // Listen for call ended event
      const unsubscribe = call.on("call.ended", () => {
        console.log("Call ended");
        router.back();
      });

      return () => {
        unsubscribe();
      };
    }
  }, [call]);

  // Cleanup call when component unmounts
  useEffect(() => {
    return () => {
      if (call && callService && callId) {
        console.log("Cleaning up call on unmount:", callId);
        // Check if call is still active before trying to leave
        if (call.state.callingState !== "left") {
          call.leave().catch((error) => {
            // Only log if it's not the "already left" error
            if (!error.message?.includes("already been left")) {
              console.error("Error leaving call on unmount:", error);
            }
          });
        }

        // Track leave for analytics
        callService.trackLeave(callId).catch((error) => {
          console.error("Error tracking leave on unmount:", error);
        });
      }
    };
  }, []);

  // Loading state
  if (isLoading || isInitializing) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} />
        <View className="flex-1 justify-center items-center">
          <Text className="text-lg">
            {isCreator ? "Starting call..." : "Joining call..."}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Error state
  if (error) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} />
        <View className="flex-1 justify-center items-center p-6">
          <Text className="text-lg text-destructive mb-4">Call Error</Text>
          <Text className="text-center text-muted-foreground mb-6">
            {error}
          </Text>
          <Text className="text-primary" onPress={() => router.back()}>
            Go Back
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // No call instance
  if (!call || !videoClient) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} />
        <View className="flex-1 justify-center items-center">
          <Text className="text-lg">Call not available</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} />
      <StreamVideo client={videoClient}>
        <StreamCall call={call}>
          <View className="flex-1">
            {callType === "audio_room" ? (
              // Audio-only call content - for audio calls, use CallContent directly
              <CallContent />
            ) : (
              // Video call with ringing support
              <RingingCallContent />
            )}

            {/* Floating Leave Call Button */}
            <TouchableOpacity
              style={[
                styles.leaveButton,
                { backgroundColor: theme.colors.notification },
              ]}
              onPress={handleLeaveCall}
            >
              <PhoneOff size={24} color="white" />
            </TouchableOpacity>
          </View>
        </StreamCall>
      </StreamVideo>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  leaveButton: {
    position: "absolute",
    top: 60,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
});
