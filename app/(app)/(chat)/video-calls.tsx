import React from "react";
import { Stack } from "expo-router";
import VideoCallManager from "~/src/components/video/VideoCallManager";

export default function VideoCallsScreen() {
  return (
    <>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />
      <VideoCallManager />
    </>
  );
}
