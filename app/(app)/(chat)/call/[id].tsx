import React from "react";
import { Stack, useLocalSearchParams } from "expo-router";
import VideoCallScreen from "~/src/components/video/VideoCallScreen";

export default function CallScreen() {
  const params = useLocalSearchParams<{
    id: string;
    type?: string;
    create?: string;
    members?: string;
  }>();

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <VideoCallScreen
        callId={params.id}
        callType={params.type as "default" | "audio_room" | "livestream"}
        isCreator={params.create === "true"}
        members={params.members}
      />
    </>
  );
}
