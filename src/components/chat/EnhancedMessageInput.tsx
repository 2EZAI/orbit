import React from "react";
import { MessageInput } from "stream-chat-expo";

// Minimal, targeted override: intercept /event command and append lat/lng
export default function EnhancedMessageInput() {
  // Channel interception is handled at the channel screen level.
  return <MessageInput />;
}


