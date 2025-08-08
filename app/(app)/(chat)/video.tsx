import React from "react";
import { Stack } from "expo-router";
import VideoCallManager from "~/src/components/video/VideoCallManager";

export default function VideoPage() {
  return (
    <>
      <Stack.Screen
        options={{
          title: "Video Calls",
          headerShown: true,
        }}
      />
      <VideoCallManager />
    </>
  );
}
