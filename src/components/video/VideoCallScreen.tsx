import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Alert,
  StatusBar,
  SafeAreaView,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from "react-native";
import { router } from "expo-router";
import Constants from "expo-constants";
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

      // Check if running on simulator
      const isSimulator = Constants.platform?.ios?.simulator || Constants.platform?.android?.emulator;
      console.log("🔍 Running on simulator:", isSimulator);

      let callInstance: Call;

      if (isCreator) {
        console.log("Creating new call:", callId);
        const { call: newCall } = await callService.createCall({
          callId,
          callType,
          members: parsedMembers,
          settings: {
            video: {
              enabled: callType !== "audio_room" && !isSimulator, // Disable video on simulator
            },
            audio: {
              default_device: "speaker",
            },
            screensharing: {
              enabled: callType !== "audio_room" && !isSimulator, // Disable screenshare on simulator
            },
          },
        });
        callInstance = newCall;
      } else {
        console.log("Joining existing call:", callId);
        callInstance = await callService.joinCall(callId, callType);
      }

      // Disable video for audio-only calls or on simulator
      if (callType === "audio_room" || isSimulator) {
        try {
          await callInstance.camera.disable();
          console.log("📷 Camera disabled for", callType === "audio_room" ? "audio call" : "simulator");
        } catch (cameraError) {
          console.warn("Could not disable camera:", cameraError);
          // Continue anyway - audio-only calls should work without camera
        }
      }

      setCall(callInstance);
      console.log("Call initialized successfully");
    } catch (error) {
      console.error("Failed to initialize call:", error);
      
      // Handle specific error types
      let errorMessage = "Failed to join the call. Please try again.";
      if (error instanceof Error) {
        if (error.message.includes("permission") || error.message.includes("Permission")) {
          errorMessage = "Camera or microphone permission is required for calls. Please enable permissions in Settings.";
        } else if (error.message.includes("No permission to publish")) {
          errorMessage = "Camera permission is required for video calls. Please enable camera access in Settings.";
        } else {
          errorMessage = error.message;
        }
      }
      
      setError(errorMessage);

      // Show error and go back
      Alert.alert("Call Error", errorMessage, [
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

  // Check if running on simulator (no permission requests needed)
  useEffect(() => {
    const isSimulator = Constants.platform?.ios?.simulator || Constants.platform?.android?.emulator;
    console.log("🔍 Running on simulator:", isSimulator);
    
    if (isSimulator) {
      console.log("📱 Simulator detected - skipping permission checks");
      // On simulator, we'll handle permissions through Stream SDK
    }
  }, []);

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
      const unsubscribeEnded = call.on("call.ended", async () => {
        console.log("🎬 Call ended event received");
        
        // Update backend status to ended
        if (callService && callId) {
          try {
            await callService.updateCallStatus(callId, "ended", { 
              reason: "call_ended_event",
              participantCount: 0 
            });
            console.log("✅ Call status updated to ended in backend");
          } catch (error) {
            console.error("❌ Failed to update call status:", error);
          }
        }
        
        router.back();
      });

      // Listen for participant changes to detect when call becomes empty
      const unsubscribeJoined = call.on("call.session_participant_joined", (event) => {
        console.log("👋 Participant joined:", event.participant.userId);
      });

      const unsubscribeLeft = call.on("call.session_participant_left", (event) => {
        console.log("👋 Participant left:", event.participant.userId);
        
        // Check if call is now empty (only creator left or no participants)
        setTimeout(async () => {
          if (callService && callId) {
            try {
              const shouldEnd = await callService.shouldEndCall(call);
              
              if (shouldEnd) {
                console.log("🏁 No active participants, ending call");
                await callService.endEmptyCall(call, callId);
                router.back();
              }
            } catch (error) {
              console.error("Error checking/ending empty call:", error);
            }
          }
        }, 1500); // Wait 1.5 seconds to ensure state is updated
      });

      // Listen for call state changes
      const unsubscribeStateChange = call.on("call.state_changed", (event) => {
        console.log("Call state changed:", event.state.callingState);
        
        // If call state is 'left', navigate back
        if (event.state.callingState === "left") {
          console.log("Call state is 'left', navigating back");
          router.back();
        }
      });

      return () => {
        unsubscribeEnded();
        unsubscribeJoined();
        unsubscribeLeft();
        unsubscribeStateChange();
      };
    }
  }, [call]);

  // Cleanup call when component unmounts
  useEffect(() => {
    return () => {
      if (call && callService && callId) {
        console.log("Cleaning up call on unmount:", callId);
        
        // Check if call is still active before trying to leave
        if (call.state.callingState !== "left" && call.state.callingState !== "ended") {
          console.log("Leaving call on unmount, current state:", call.state.callingState);
          
          // Try to leave the call
          call.leave().catch((error) => {
            // Only log if it's not the "already left" error
            if (!error.message?.includes("already been left") && 
                !error.message?.includes("call has already ended")) {
              console.error("Error leaving call on unmount:", error);
            }
          });
        }

        // Track leave for analytics (don't wait for it to complete)
        callService.trackLeave(callId).catch((error) => {
          console.error("Error tracking leave on unmount:", error);
        });
        
        // Update call status to ended in backend
        callService.updateCallStatus(callId, "ended").catch((error) => {
          console.error("Error updating call status on unmount:", error);
        });
      }
    };
  }, [call, callService, callId]);


  // Loading state - only show when actually loading
  if (isLoading || isInitializing) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} />
        <View className="flex-1 justify-center items-center">
          <View className="items-center">
            <View className="w-16 h-16 bg-primary rounded-full items-center justify-center mb-4">
              <Text className="text-white text-2xl">
                {callType === "audio_room" ? "📞" : "📹"}
              </Text>
            </View>
            <Text className="text-lg font-semibold mb-2">
              {isCreator ? "Starting call..." : "Joining call..."}
            </Text>
            <Text className="text-sm text-gray-500 dark:text-gray-400">
              Please wait while we connect you
            </Text>
          </View>
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
          <Text className="mb-4 text-lg text-destructive">Call Error</Text>
          <Text className="mb-6 text-center text-muted-foreground">
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
