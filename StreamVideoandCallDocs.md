# Stream Video & Audio API Backend Documentation

## Overview

This documentation provides comprehensive instructions for frontend developers to integrate video calling and audio chat functionality using our Stream Video backend API. The backend is built with Node.js, Express, and integrates with Stream's Video SDK for React Native.

## Table of Contents

1. [Authentication](#authentication)
2. [API Endpoints](#api-endpoints)
3. [React Native Integration](#react-native-integration)
4. [Environment Setup](#environment-setup)
5. [Database Schema](#database-schema)
6. [Usage Examples](#usage-examples)
7. [Error Handling](#error-handling)
8. [Best Practices](#best-practices)
9. [Troubleshooting](#troubleshooting)ggg

## Authentication

All video API endpoints require authentication using a Bearer token obtained from your main authentication flow.

### Headers Required

```javascript
{
  "Authorization": "Bearer <your_auth_token>",
  "Content-Type": "application/json"
}
```

## API Endpoints

### Base URL

```
 ENV const: BACKEND_CHAT_URL
https://orbit-chat-backend-old-9d2b903ab237.herokuapp.com

```

---

### 1. Get Video Token

**Endpoint:** `POST /video/token`

**Description:** Generates a Stream Video token for the authenticated user.

**Headers:**

- `Authorization: Bearer <auth_token>`
- `Content-Type: application/json`

**Request Body:** None

**Response:**

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user_id": "user-123",
  "api_key": "your-stream-api-key",
  "expires_at": 1703808000
}
```

**Error Response:**

```json
{
  "error": "Failed to generate video token",
  "message": "Token generation failed"
}
```

---

### 2. Create Call Metadata

**Endpoint:** `POST /video/calls`

**Description:** Creates call metadata for a new video/audio call.

**Headers:**

- `Authorization: Bearer <auth_token>`
- `Content-Type: application/json`

**Request Body:**

```json
{
  "call_id": "unique-call-id",
  "call_type": "default", // Optional: "default", "livestream", "audio_room"
  "members": [
    {
      "user_id": "user-456",
      "role": "user"
    }
  ],
  "settings": {
    "audio": {
      "access_request_enabled": false,
      "default_device": "speaker"
    },
    "video": {
      "access_request_enabled": false,
      "enabled": true
    },
    "screensharing": {
      "access_request_enabled": false,
      "enabled": true
    }
  }
}
```

**Response:**

```json
{
  "call_id": "unique-call-id",
  "call_type": "default",
  "created_by": "user-123",
  "members": [
    {
      "user_id": "user-123",
      "role": "admin"
    },
    {
      "user_id": "user-456",
      "role": "user"
    }
  ],
  "settings": {
    "audio": {
      "access_request_enabled": false,
      "default_device": "speaker"
    },
    "video": {
      "access_request_enabled": false,
      "enabled": true
    },
    "screensharing": {
      "access_request_enabled": false,
      "enabled": true
    },
    "recording": {
      "mode": "disabled"
    },
    "transcription": {
      "mode": "disabled"
    }
  },
  "message": "Call metadata created. Use Stream Video client on frontend to create and join call."
}
```

---

### 3. Get User Video Info

**Endpoint:** `GET /video/user`

**Description:** Retrieves user information formatted for Stream Video.

**Headers:**

- `Authorization: Bearer <auth_token>`

**Response:**

```json
{
  "user_id": "user-123",
  "api_key": "your-stream-api-key",
  "user_data": {
    "id": "user-123",
    "name": "John Doe",
    "image": "https://getstream.io/random_svg/?id=user-123&name=John%20Doe",
    "email": "john@example.com"
  }
}
```

**Note:** The user name will fallback to email prefix if no display name is set in user metadata.

---

### 4. Get User's Call History

**Endpoint:** `GET /video/calls/history`

**Description:** Retrieves the authenticated user's call participation history.

**Headers:**

- `Authorization: Bearer <auth_token>`

**Query Parameters:**

- `limit`: Number of calls to return (default: 25)
- `offset`: Number of calls to skip for pagination (default: 0)

**Response:**

```json
{
  "calls": [
    {
      "id": "uuid-789",
      "call_id": "call-20231201-123",
      "call_type": "default",
      "call_name": "Team Standup",
      "status": "ended",
      "started_at": "2023-12-01T14:00:00Z",
      "ended_at": "2023-12-01T14:30:00Z",
      "duration_seconds": 1800,
      "user_role": "participant",
      "joined_at": "2023-12-01T14:00:00Z",
      "left_at": "2023-12-01T14:30:00Z",
      "user_duration_seconds": 1800,
      "created_by": "uuid-456",
      "created_at": "2023-12-01T13:55:00Z"
    }
  ],
  "limit": 25,
  "offset": 0
}
```

**Note:** This endpoint now uses direct table joins instead of database views for better performance and reliability.

---

### 5. Get Active Calls

**Endpoint:** `GET /video/calls/active`

**Description:** Retrieves currently active calls for the authenticated user.

**Headers:**

- `Authorization: Bearer <auth_token>`

**Response:**

```json
{
  "active_calls": [
    {
      "id": "uuid-789",
      "call_id": "call-20231201-123",
      "call_type": "default",
      "call_name": "Team Standup",
      "status": "active",
      "started_at": "2023-12-01T14:00:00Z",
      "ended_at": null,
      "duration_seconds": null,
      "created_by": "uuid-456",
      "recording_enabled": false,
      "screensharing_enabled": true,
      "max_participants": 50,
      "created_at": "2023-12-01T13:55:00Z",
      "updated_at": "2023-12-01T14:00:00Z",
      "video_call_participants": [
        {
          "user_id": "uuid-456",
          "left_at": null
        },
        {
          "user_id": "uuid-789",
          "left_at": null
        }
      ],
      "active_participants_count": 2
    }
  ]
}
```

**Note:** This endpoint now uses optimized table joins to fetch active calls where the user is either the creator or an active participant.

---

### 6. Update Call Status

**Endpoint:** `PATCH /video/calls/:callId/status`

**Description:** Updates the status of a call (creator only).

**Headers:**

- `Authorization: Bearer <auth_token>`
- `Content-Type: application/json`

**URL Parameters:**

- `callId`: The Stream call ID

**Request Body:**

```json
{
  "status": "active" // 'created', 'active', 'ended', 'cancelled'
}
```

**Response:**

```json
{
  "success": true,
  "call_id": "call-20231201-123",
  "status": "active",
  "updated_at": "2023-12-01T14:00:00Z"
}
```

---

### 7. Join Call (Database Tracking)

**Endpoint:** `POST /video/calls/:callId/join`

**Description:** Updates participant join time in database (for analytics).

**Headers:**

- `Authorization: Bearer <auth_token>`

**URL Parameters:**

- `callId`: The Stream call ID

**Response:**

```json
{
  "success": true,
  "call_id": "call-20231201-123",
  "user_id": "user-123",
  "joined_at": "2023-12-01T14:05:00Z"
}
```

---

### 8. Leave Call (Database Tracking)

**Endpoint:** `POST /video/calls/:callId/leave`

**Description:** Updates participant leave time and calculates duration.

**Headers:**

- `Authorization: Bearer <auth_token>`

**URL Parameters:**

- `callId`: The Stream call ID

**Response:**

```json
{
  "success": true,
  "call_id": "call-20231201-123",
  "user_id": "user-123",
  "left_at": "2023-12-01T14:30:00Z",
  "duration_seconds": 1500,
  "call_auto_ended": false
}
```

**Note:** If this is the last participant leaving the call, `call_auto_ended` will be `true` and the call status will automatically be set to "ended".

---

### 9. Video Service Health Check

**Endpoint:** `GET /video/health`

**Description:** Checks if the video service is running properly.

**Headers:** None required

**Response:**

```json
{
  "status": "ok",
  "service": "video",
  "timestamp": "2023-12-01T12:00:00.000Z",
  "env": {
    "streamApiKey": true,
    "streamApiSecret": true
  }
}
```

## React Native Integration

### Installation

Install the required packages in your React Native project:

```bash
npm install @stream-io/video-react-native-sdk
npm install @stream-io/react-native-webrtc react-native-incall-manager react-native-svg @react-native-community/netinfo

# For iOS
cd ios && pod install
```

### Basic Setup

#### 1. Initialize Stream Video Client

```javascript
// VideoService.js
import { StreamVideoClient } from "@stream-io/video-react-native-sdk";

class VideoService {
  constructor() {
    this.client = null;
    this.user = null;
  }

  async initialize(authToken) {
    try {
      // Get video token from backend
      const response = await fetch("/video/token", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${authToken}`,
          "Content-Type": "application/json",
        },
      });

      const { token, api_key, user_id } = await response.json();

      // Get user data
      const userResponse = await fetch("/video/user", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      const { user_data } = await userResponse.json();

      // Initialize Stream Video client
      this.client = new StreamVideoClient({
        apiKey: api_key,
        user: user_data,
        token: token,
      });

      this.user = user_data;
      return this.client;
    } catch (error) {
      console.error("Failed to initialize video service:", error);
      throw error;
    }
  }

  getClient() {
    return this.client;
  }

  getUser() {
    return this.user;
  }
}

export default new VideoService();
```

#### 2. Create a Call

```javascript
// CallManager.js
import VideoService from "./VideoService";

export const createCall = async (
  callId,
  callType = "default",
  members = []
) => {
  try {
    const client = VideoService.getClient();

    if (!client) {
      throw new Error("Video client not initialized");
    }

    // Create call using Stream Video client
    const call = client.call(callType, callId);

    // Join the call and create it if it doesn't exist
    await call.join({ create: true });

    return call;
  } catch (error) {
    console.error("Failed to create call:", error);
    throw error;
  }
};

export const joinCall = async (callId, callType = "default") => {
  try {
    const client = VideoService.getClient();

    if (!client) {
      throw new Error("Video client not initialized");
    }

    const call = client.call(callType, callId);
    await call.join();

    return call;
  } catch (error) {
    console.error("Failed to join call:", error);
    throw error;
  }
};
```

#### 3. Video Call Component

```jsx
// VideoCallScreen.jsx
import React, { useEffect, useState } from "react";
import { View, Button, Alert } from "react-native";
import {
  StreamVideo,
  StreamCall,
  CallContent,
  CallControls,
} from "@stream-io/video-react-native-sdk";
import VideoService from "./VideoService";
import { createCall, joinCall } from "./CallManager";

const VideoCallScreen = ({ route, navigation }) => {
  const { callId, callType = "default", isCreator = false } = route.params;
  const [call, setCall] = useState(null);
  const [client, setClient] = useState(null);

  useEffect(() => {
    initializeCall();
  }, []);

  const initializeCall = async () => {
    try {
      const videoClient = VideoService.getClient();
      setClient(videoClient);

      let callInstance;
      if (isCreator) {
        callInstance = await createCall(callId, callType);
      } else {
        callInstance = await joinCall(callId, callType);
      }

      setCall(callInstance);
    } catch (error) {
      Alert.alert("Error", "Failed to join call");
      navigation.goBack();
    }
  };

  const leaveCall = async () => {
    try {
      if (call) {
        await call.leave();
        navigation.goBack();
      }
    } catch (error) {
      console.error("Error leaving call:", error);
      navigation.goBack();
    }
  };

  if (!client || !call) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text>Loading call...</Text>
      </View>
    );
  }

  return (
    <StreamVideo client={client}>
      <StreamCall call={call}>
        <View style={{ flex: 1 }}>
          <CallContent />
          <CallControls onLeave={leaveCall} />
        </View>
      </StreamCall>
    </StreamVideo>
  );
};

export default VideoCallScreen;
```

#### 4. Audio Call Component

```jsx
// AudioCallScreen.jsx
import React, { useEffect, useState } from "react";
import { View, Text, Button, StyleSheet } from "react-native";
import {
  StreamVideo,
  StreamCall,
  CallControls,
} from "@stream-io/video-react-native-sdk";
import VideoService from "./VideoService";
import { createCall, joinCall } from "./CallManager";

const AudioCallScreen = ({ route, navigation }) => {
  const { callId, isCreator = false } = route.params;
  const [call, setCall] = useState(null);
  const [client, setClient] = useState(null);
  const [participants, setParticipants] = useState([]);

  useEffect(() => {
    initializeCall();
  }, []);

  const initializeCall = async () => {
    try {
      const videoClient = VideoService.getClient();
      setClient(videoClient);

      let callInstance;
      if (isCreator) {
        callInstance = await createCall(callId, "audio_room");
        // Disable video for audio-only call
        await callInstance.camera.disable();
      } else {
        callInstance = await joinCall(callId, "audio_room");
        await callInstance.camera.disable();
      }

      setCall(callInstance);

      // Listen to participant changes
      callInstance.state.participants$.subscribe(setParticipants);
    } catch (error) {
      Alert.alert("Error", "Failed to join audio call");
      navigation.goBack();
    }
  };

  const leaveCall = async () => {
    try {
      if (call) {
        await call.leave();
        navigation.goBack();
      }
    } catch (error) {
      console.error("Error leaving call:", error);
      navigation.goBack();
    }
  };

  const toggleMute = async () => {
    try {
      if (call.microphone.state.status === "enabled") {
        await call.microphone.disable();
      } else {
        await call.microphone.enable();
      }
    } catch (error) {
      console.error("Error toggling mute:", error);
    }
  };

  if (!client || !call) {
    return (
      <View style={styles.loading}>
        <Text>Loading audio call...</Text>
      </View>
    );
  }

  return (
    <StreamVideo client={client}>
      <StreamCall call={call}>
        <View style={styles.container}>
          <Text style={styles.title}>Audio Call</Text>

          <View style={styles.participants}>
            <Text style={styles.participantCount}>
              {participants.length} participant(s)
            </Text>
            {participants.map((participant) => (
              <Text key={participant.userId} style={styles.participantName}>
                {participant.name || participant.userId}
                {participant.isSpeaking ? " 🎤" : ""}
              </Text>
            ))}
          </View>

          <View style={styles.controls}>
            <Button title="Toggle Mute" onPress={toggleMute} />
            <Button title="Leave Call" onPress={leaveCall} color="red" />
          </View>
        </View>
      </StreamCall>
    </StreamVideo>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#000",
  },
  loading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 24,
    color: "white",
    textAlign: "center",
    marginTop: 50,
  },
  participants: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  participantCount: {
    fontSize: 18,
    color: "white",
    marginBottom: 20,
  },
  participantName: {
    fontSize: 16,
    color: "white",
    marginVertical: 5,
  },
  controls: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 50,
  },
});

export default AudioCallScreen;
```

#### 5. Complete Integration Example

Here's a complete example showing how to set up video calling from initialization to ending a call:

```jsx
// VideoCallService.js - Complete service implementation
import { StreamVideoClient } from "@stream-io/video-react-native-sdk";

class VideoCallService {
  constructor() {
    this.client = null;
    this.authToken = null;
  }

  // Initialize the service with auth token
  async initialize(authToken) {
    this.authToken = authToken;

    try {
      // Step 1: Get video token from backend
      const tokenResponse = await fetch("/video/token", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${authToken}`,
          "Content-Type": "application/json",
        },
      });

      if (!tokenResponse.ok) {
        throw new Error("Failed to get video token");
      }

      const { token, api_key, user_id } = await tokenResponse.json();

      // Step 2: Get user data for Stream Video
      const userResponse = await fetch("/video/user", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      if (!userResponse.ok) {
        throw new Error("Failed to get user data");
      }

      const { user_data } = await userResponse.json();

      // Step 3: Initialize Stream Video client
      this.client = new StreamVideoClient({
        apiKey: api_key,
        user: user_data,
        token: token,
      });

      console.log("Video service initialized successfully");
      return this.client;
    } catch (error) {
      console.error("Failed to initialize video service:", error);
      throw error;
    }
  }

  // Create a new call with backend tracking
  async createCall(callId, callType = "default", members = []) {
    if (!this.client) {
      throw new Error("Video service not initialized");
    }

    try {
      // Step 1: Create call metadata in backend
      const metadataResponse = await fetch("/video/calls", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.authToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          call_id: callId,
          call_type: callType,
          members: members,
        }),
      });

      if (!metadataResponse.ok) {
        throw new Error("Failed to create call metadata");
      }

      const callMetadata = await metadataResponse.json();

      // Step 2: Create actual call using Stream Video SDK
      const call = this.client.call(callType, callId);
      await call.join({ create: true });

      // Step 3: Update call status to active in backend
      await fetch(`/video/calls/${callId}/status`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${this.authToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: "active" }),
      });

      // Step 4: Track join in backend
      await this.trackJoin(callId);

      return { call, metadata: callMetadata };
    } catch (error) {
      console.error("Failed to create call:", error);
      throw error;
    }
  }

  // Join an existing call
  async joinCall(callId, callType = "default") {
    if (!this.client) {
      throw new Error("Video service not initialized");
    }

    try {
      // Step 1: Join call using Stream Video SDK
      const call = this.client.call(callType, callId);
      await call.join();

      // Step 2: Track join in backend
      await this.trackJoin(callId);

      return call;
    } catch (error) {
      console.error("Failed to join call:", error);
      throw error;
    }
  }

  // Leave a call and track in backend
  async leaveCall(call, callId) {
    try {
      // Step 1: Leave call using Stream Video SDK
      await call.leave();

      // Step 2: Track leave in backend
      await this.trackLeave(callId);
    } catch (error) {
      console.error("Failed to leave call:", error);
      throw error;
    }
  }

  // Track user joining a call (for analytics)
  async trackJoin(callId) {
    try {
      await fetch(`/video/calls/${callId}/join`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.authToken}`,
          "Content-Type": "application/json",
        },
      });
    } catch (error) {
      console.error("Failed to track join:", error);
      // Don't throw - this is for analytics only
    }
  }

  // Track user leaving a call (for analytics)
  async trackLeave(callId) {
    try {
      await fetch(`/video/calls/${callId}/leave`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.authToken}`,
          "Content-Type": "application/json",
        },
      });
    } catch (error) {
      console.error("Failed to track leave:", error);
      // Don't throw - this is for analytics only
    }
  }

  // Get user's call history
  async getCallHistory(limit = 25, offset = 0) {
    try {
      const response = await fetch(
        `/video/calls/history?limit=${limit}&offset=${offset}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${this.authToken}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to get call history");
      }

      return await response.json();
    } catch (error) {
      console.error("Failed to get call history:", error);
      throw error;
    }
  }

  // Get active calls
  async getActiveCalls() {
    try {
      const response = await fetch("/video/calls/active", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${this.authToken}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to get active calls");
      }

      return await response.json();
    } catch (error) {
      console.error("Failed to get active calls:", error);
      throw error;
    }
  }
}

export default new VideoCallService();
```

#### 6. React Native Component with Full Integration

```jsx
// VideoCallManager.jsx - Complete component implementation
import React, { useState, useEffect } from "react";
import { View, Text, Button, Alert, FlatList, StyleSheet } from "react-native";
import VideoCallService from "./VideoCallService";

const VideoCallManager = ({ navigation, authToken }) => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [activeCalls, setActiveCalls] = useState([]);
  const [callHistory, setCallHistory] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    initializeVideoService();
    loadActiveCalls();
    loadCallHistory();
  }, []);

  const initializeVideoService = async () => {
    try {
      setLoading(true);
      await VideoCallService.initialize(authToken);
      setIsInitialized(true);
    } catch (error) {
      Alert.alert("Error", "Failed to initialize video service");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const loadActiveCalls = async () => {
    try {
      const { active_calls } = await VideoCallService.getActiveCalls();
      setActiveCalls(active_calls);
    } catch (error) {
      console.error("Failed to load active calls:", error);
    }
  };

  const loadCallHistory = async () => {
    try {
      const { calls } = await VideoCallService.getCallHistory(10, 0);
      setCallHistory(calls);
    } catch (error) {
      console.error("Failed to load call history:", error);
    }
  };

  const startNewCall = async () => {
    if (!isInitialized) {
      Alert.alert("Error", "Video service not initialized");
      return;
    }

    try {
      const callId = `call-${Date.now()}`;
      const { call } = await VideoCallService.createCall(callId);

      // Navigate to video call screen
      navigation.navigate("VideoCall", {
        call,
        callId,
        isCreator: true,
      });
    } catch (error) {
      Alert.alert("Error", "Failed to start call");
      console.error(error);
    }
  };

  const joinCall = async (callId) => {
    if (!isInitialized) {
      Alert.alert("Error", "Video service not initialized");
      return;
    }

    try {
      const call = await VideoCallService.joinCall(callId);

      // Navigate to video call screen
      navigation.navigate("VideoCall", {
        call,
        callId,
        isCreator: false,
      });
    } catch (error) {
      Alert.alert("Error", "Failed to join call");
      console.error(error);
    }
  };

  if (loading) {
    return (
      <View style={styles.loading}>
        <Text>Initializing video service...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Video Calls</Text>

      <Button
        title="Start New Call"
        onPress={startNewCall}
        disabled={!isInitialized}
      />

      <Text style={styles.sectionTitle}>Active Calls</Text>
      <FlatList
        data={activeCalls}
        keyExtractor={(item) => item.call_id}
        renderItem={({ item }) => (
          <View style={styles.callItem}>
            <Text>{item.call_name || item.call_id}</Text>
            <Text>{item.active_participants_count} participants</Text>
            <Button title="Join" onPress={() => joinCall(item.call_id)} />
          </View>
        )}
        ListEmptyComponent={<Text>No active calls</Text>}
      />

      <Text style={styles.sectionTitle}>Recent Calls</Text>
      <FlatList
        data={callHistory}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.historyItem}>
            <Text>{item.call_name || item.call_id}</Text>
            <Text>
              Duration: {Math.floor(item.user_duration_seconds / 60)}m
            </Text>
            <Text>{new Date(item.joined_at).toLocaleDateString()}</Text>
          </View>
        )}
        ListEmptyComponent={<Text>No call history</Text>}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#fff",
  },
  loading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 20,
    marginBottom: 10,
  },
  callItem: {
    padding: 15,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    marginBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  historyItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
});

export default VideoCallManager;
```

## Environment Setup

### Backend Environment Variables

Add the following to your `.env` file:

```bash
# Stream Configuration
STREAM_API_KEY=your_stream_api_key
STREAM_API_SECRET=your_stream_api_secret

# Other existing variables...
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_supabase_service_key
```

### React Native Permissions

#### iOS (Info.plist)

```xml
<key>NSCameraUsageDescription</key>
<string>This app needs camera access for video calls</string>
<key>NSMicrophoneUsageDescription</key>
<string>This app needs microphone access for voice and video calls</string>
```

#### Android (AndroidManifest.xml)

```xml
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.RECORD_AUDIO" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
<uses-permission android:name="android.permission.CHANGE_NETWORK_STATE" />
<uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS" />
<uses-permission android:name="android.permission.WAKE_LOCK" />
```

## Database Schema

The backend uses Supabase (PostgreSQL) to store video call metadata, user tokens, and analytics data. Here's an overview of the database structure:

### Tables Overview

The video functionality uses these 5 main tables:

1. **stream_video_users** - Stores video tokens for each user
2. **video_calls** - Main call metadata and settings
3. **video_call_participants** - Tracks who joins/leaves calls
4. **video_call_recordings** - Stores recording information
5. **video_call_invitations** - Manages call invitations

### 1. stream_video_users

Stores Stream Video tokens for authenticated users.

```sql
CREATE TABLE public.stream_video_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  stream_video_token text NULL,
  token_expires_at timestamp with time zone NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);
```

**Purpose:**

- Store encrypted video tokens securely
- Track token expiration for automatic refresh
- Link tokens to authenticated users

**Example Data:**

```json
{
  "id": "uuid-123",
  "user_id": "user-456",
  "stream_video_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_expires_at": "2023-12-02T12:00:00Z",
  "created_at": "2023-12-01T12:00:00Z",
  "updated_at": "2023-12-01T12:00:00Z"
}
```

### 2. video_calls

Main table for storing call metadata and settings.

```sql
CREATE TABLE public.video_calls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id text UNIQUE NOT NULL, -- Stream's call ID
  call_type text NOT NULL DEFAULT 'default', -- 'default', 'audio_room', 'livestream'
  created_by uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  call_name text NULL,
  status text NOT NULL DEFAULT 'created', -- 'created', 'active', 'ended', 'cancelled'
  started_at timestamp with time zone NULL,
  ended_at timestamp with time zone NULL,
  duration_seconds integer NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  event_id uuid NULL REFERENCES events(id), -- Optional: link to events
  max_participants integer DEFAULT 50,
  recording_enabled boolean DEFAULT false,
  screensharing_enabled boolean DEFAULT true
);
```

**Call Status Flow:**

- `created` → Call metadata created but not started
- `active` → Call is live with participants
- `ended` → Call completed normally
- `cancelled` → Call was cancelled before starting

**Call Types:**

- `default` → Standard video/audio call
- `audio_room` → Audio-only call (no video)
- `livestream` → Live streaming to audience

**Example Data:**

```json
{
  "id": "uuid-789",
  "call_id": "call-20231201-123",
  "call_type": "default",
  "created_by": "user-456",
  "call_name": "Team Standup",
  "status": "active",
  "started_at": "2023-12-01T14:00:00Z",
  "ended_at": null,
  "duration_seconds": null,
  "max_participants": 10,
  "recording_enabled": false,
  "screensharing_enabled": true,
  "event_id": "event-123"
}
```

### 3. video_call_participants

Tracks who joins and leaves calls, including roles and duration.

```sql
CREATE TABLE public.video_call_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id uuid NOT NULL REFERENCES video_calls(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'participant', -- 'admin', 'moderator', 'participant'
  joined_at timestamp with time zone NULL,
  left_at timestamp with time zone NULL,
  duration_seconds integer NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(call_id, user_id) -- Prevent duplicate participants
);
```

**Participant Roles:**

- `admin` → Can manage call settings, recordings, and participants
- `moderator` → Can mute/unmute others, manage some settings
- `participant` → Standard participant with basic controls

**Duration Calculation:**

```sql
-- Auto-calculate duration when participant leaves
UPDATE video_call_participants
SET duration_seconds = EXTRACT(EPOCH FROM (left_at - joined_at))
WHERE left_at IS NOT NULL AND duration_seconds IS NULL;
```

**Example Data:**

```json
{
  "id": "uuid-abc",
  "call_id": "uuid-789",
  "user_id": "user-456",
  "role": "admin",
  "joined_at": "2023-12-01T14:00:00Z",
  "left_at": "2023-12-01T14:30:00Z",
  "duration_seconds": 1800
}
```

### 4. video_call_recordings

Stores information about call recordings when enabled.

```sql
CREATE TABLE public.video_call_recordings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id uuid NOT NULL REFERENCES video_calls(id) ON DELETE CASCADE,
  stream_recording_id text UNIQUE NOT NULL, -- Stream's recording ID
  recording_url text NULL,
  file_size_bytes bigint NULL,
  duration_seconds integer NULL,
  status text NOT NULL DEFAULT 'processing', -- 'processing', 'ready', 'failed'
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);
```

**Recording Status Flow:**

- `processing` → Recording is being processed by Stream
- `ready` → Recording is available for download/viewing
- `failed` → Recording failed due to error

**Example Data:**

```json
{
  "id": "uuid-def",
  "call_id": "uuid-789",
  "stream_recording_id": "rec_123456789",
  "recording_url": "https://stream.com/recordings/rec_123456789.mp4",
  "file_size_bytes": 52428800,
  "duration_seconds": 1800,
  "status": "ready"
}
```

### 5. video_call_invitations

Manages call invitations and responses.

```sql
CREATE TABLE public.video_call_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id uuid NOT NULL REFERENCES video_calls(id) ON DELETE CASCADE,
  invited_by uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  invited_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending', -- 'pending', 'accepted', 'declined', 'expired'
  invited_at timestamp with time zone DEFAULT now(),
  responded_at timestamp with time zone NULL,
  expires_at timestamp with time zone NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(call_id, invited_user_id) -- Prevent duplicate invitations
);
```

**Invitation Status Flow:**

- `pending` → Invitation sent, awaiting response
- `accepted` → User accepted and will join call
- `declined` → User declined the invitation
- `expired` → Invitation expired without response

**Example Data:**

```json
{
  "id": "uuid-ghi",
  "call_id": "uuid-789",
  "invited_by": "user-456",
  "invited_user_id": "user-789",
  "status": "accepted",
  "invited_at": "2023-12-01T13:45:00Z",
  "responded_at": "2023-12-01T13:50:00Z",
  "expires_at": "2023-12-01T15:45:00Z"
}
```

### Database Views

The schema includes helpful views for common queries:

#### active_video_calls

Shows currently active calls with participant counts:

```sql
CREATE VIEW public.active_video_calls AS
SELECT
  vc.*,
  u.email as creator_email,
  u.email as creator_name,
  (
    SELECT COUNT(*)
    FROM video_call_participants vcp
    WHERE vcp.call_id = vc.id AND vcp.left_at IS NULL
  ) as active_participants_count
FROM video_calls vc
JOIN users u ON vc.created_by = u.id
WHERE vc.status = 'active';
```

#### user_call_history

Shows user's call participation history:

```sql
CREATE VIEW public.user_call_history AS
SELECT
  vc.id,
  vc.call_id,
  vc.call_type,
  vc.call_name,
  vc.status,
  vc.started_at,
  vc.ended_at,
  vc.duration_seconds,
  vcp.role as user_role,
  vcp.joined_at,
  vcp.left_at,
  vcp.duration_seconds as user_duration_seconds,
  creator.email as creator_email,
  creator.email as creator_name
FROM video_calls vc
JOIN video_call_participants vcp ON vc.id = vcp.call_id
JOIN users creator ON vc.created_by = creator.id
ORDER BY vcp.joined_at DESC;
```

### Row Level Security (RLS)

All tables have Row Level Security enabled with appropriate policies:

**Security Principles:**

- Users can only see their own tokens
- Users can only see calls they created or participated in
- Only call creators can update call settings
- Users can only update their own participation records
- Invitation visibility restricted to sender and recipient

**Example Policies:**

```sql
-- Users can view calls they created or participate in
CREATE POLICY "Users can view calls they created or participate in"
ON public.video_calls FOR SELECT USING (
  auth.uid() = created_by OR
  auth.uid() IN (
    SELECT user_id FROM video_call_participants
    WHERE call_id = video_calls.id
  )
);
```

### Performance Indexes

Key indexes for optimal query performance:

```sql
-- User lookups
CREATE INDEX idx_stream_video_users_user_id ON stream_video_users(user_id);

-- Call queries
CREATE INDEX idx_video_calls_created_by ON video_calls(created_by);
CREATE INDEX idx_video_calls_status ON video_calls(status);
CREATE INDEX idx_video_calls_call_type ON video_calls(call_type);
CREATE INDEX idx_video_calls_started_at ON video_calls(started_at);

-- Participant queries
CREATE INDEX idx_video_call_participants_call ON video_call_participants(call_id);
CREATE INDEX idx_video_call_participants_user ON video_call_participants(user_id);
CREATE INDEX idx_video_call_participants_joined_at ON video_call_participants(joined_at);

-- Invitation queries
CREATE INDEX idx_video_call_invitations_user ON video_call_invitations(invited_user_id);
CREATE INDEX idx_video_call_invitations_status ON video_call_invitations(status);
```

### Common Queries

Here are some common database queries you might need:

#### Get User's Active Calls

```sql
SELECT vc.*, vcp.role
FROM video_calls vc
JOIN video_call_participants vcp ON vc.id = vcp.call_id
WHERE vcp.user_id = $1
  AND vc.status = 'active'
  AND vcp.left_at IS NULL;
```

#### Get Call Statistics

```sql
SELECT
  COUNT(*) as total_calls,
  COUNT(CASE WHEN status = 'active' THEN 1 END) as active_calls,
  AVG(duration_seconds) as avg_duration,
  SUM(duration_seconds) as total_duration
FROM video_calls
WHERE created_by = $1;
```

#### Get Popular Call Times

```sql
SELECT
  EXTRACT(HOUR FROM started_at) as hour_of_day,
  COUNT(*) as call_count
FROM video_calls
WHERE started_at IS NOT NULL
GROUP BY EXTRACT(HOUR FROM started_at)
ORDER BY call_count DESC;
```

### Migration Guide

To add these tables to your existing Supabase database:

1. **Run the SQL Migration:**

   ```sql
   -- Copy and paste the entire supabase_video_schema.sql file
   -- into your Supabase SQL Editor and execute
   ```

2. **Verify Tables Created:**

   ```sql
   -- Check if all tables exist
   SELECT table_name
   FROM information_schema.tables
   WHERE table_schema = 'public'
     AND table_name LIKE '%video%';
   ```

3. **Test RLS Policies:**

   ```sql
   -- Test as authenticated user
   SELECT * FROM video_calls; -- Should only show user's calls
   ```

4. **Update Your Application:**

   - Deploy updated backend code
   - Test token generation endpoint
   - Test call creation endpoint

## Important Implementation Notes

### Authentication Flow

1. **User Authentication**: All video endpoints require a valid Bearer token from your main auth system
2. **Token Generation**: Video tokens are generated server-side and have a 24-hour expiration
3. **Token Storage**: Tokens are automatically stored in Supabase for tracking and analytics

### Call Lifecycle Management

1. **Call Creation**: Use `POST /video/calls` to create call metadata, then use Stream Video SDK on frontend to create actual call
2. **Status Updates**: Backend automatically tracks call status changes (created → active → ended)
3. **Participant Tracking**: Use `/join` and `/leave` endpoints to track user participation for analytics
4. **Duration Calculation**: Call and participant durations are automatically calculated

### Query Optimization

The backend uses optimized database queries for better performance:

- **Call History**: Uses direct joins between `video_call_participants` and `video_calls` tables
- **Active Calls**: Uses separate queries for created calls and participated calls, then deduplicates
- **Participant Count**: Automatically calculated from participant data, filtering active participants
- **Auto Call Management**: Automatically ends calls when all participants leave
- **No Database Views**: Direct table queries provide better flexibility and debugging

### Automatic Call Management

The backend automatically manages call lifecycle:

- **Auto-End Calls**: When the last participant leaves, the call status is automatically set to "ended"
- **Duration Tracking**: Call duration is calculated from start time to end time
- **Participant Tracking**: Real-time tracking of who's currently in calls vs who has left

### Database Integration

- All video call data is stored in Supabase for analytics and history
- RLS policies ensure users can only access their own data or calls they participated in
- Direct table queries with joins provide optimal performance and flexibility

### Error Handling

- All endpoints return consistent error format: `{"error": "description", "message": "details"}`
- Handle 401 errors by refreshing the auth token
- Handle 404 errors for non-existent calls or unauthorized access

## Usage Examples

### 1. Starting a Video Call

```javascript
// In your component
const startVideoCall = async () => {
  try {
    // Navigate to video call screen
    navigation.navigate("VideoCall", {
      callId: `call-${Date.now()}`,
      callType: "default",
      isCreator: true,
    });
  } catch (error) {
    console.error("Failed to start video call:", error);
  }
};
```

### 2. Joining an Existing Call

```javascript
const joinExistingCall = async (callId) => {
  try {
    navigation.navigate("VideoCall", {
      callId: callId,
      callType: "default",
      isCreator: false,
    });
  } catch (error) {
    console.error("Failed to join call:", error);
  }
};
```

### 3. Audio-Only Call

```javascript
const startAudioCall = async () => {
  try {
    navigation.navigate("AudioCall", {
      callId: `audio-${Date.now()}`,
      isCreator: true,
    });
  } catch (error) {
    console.error("Failed to start audio call:", error);
  }
};
```

## Error Handling

### Common Error Scenarios

1. **Authentication Errors (401)**

```javascript
if (response.status === 401) {
  // Token expired or invalid
  await refreshAuthToken();
  // Retry the request
}
```

2. **Network Errors**

```javascript
try {
  const response = await fetch("/video/token", options);
} catch (error) {
  if (error.name === "NetworkError") {
    // Handle offline scenario
    showOfflineMessage();
  }
}
```

3. **Stream Video Errors**

```javascript
call.on("error", (error) => {
  console.error("Call error:", error);
  // Handle call errors (network issues, permissions, etc.)
});
```

### Error Response Format

All API errors follow this format:

```json
{
  "error": "Error type description",
  "message": "Detailed error message"
}
```

## Best Practices

### 1. Token Management

- Store video tokens securely
- Refresh tokens before expiration
- Handle token refresh during active calls

### 2. Call Management

- Always check permissions before starting calls
- Handle call state changes gracefully
- Properly clean up resources when leaving calls

### 3. Performance

- Initialize video service on app start
- Reuse video client instances
- Optimize for different device capabilities

### 4. User Experience

- Show loading states during call setup
- Provide clear error messages
- Handle network disconnections gracefully

## Troubleshooting

### Common Issues

1. **"Video client not initialized"**

   - Ensure VideoService.initialize() is called before creating calls
   - Check authentication token validity

2. **Camera/Microphone permissions denied**

   - Request permissions before starting calls
   - Guide users to enable permissions in settings

3. **Call connection failures**

   - Check network connectivity
   - Verify Stream API credentials
   - Check backend endpoint availability

4. **Audio echo or feedback**

   - Use react-native-incall-manager for audio routing
   - Test on physical devices (not simulators)

### Database-Related Issues

5. **"relation does not exist" errors**

   - Ensure you've run the complete `supabase_video_schema.sql` in your Supabase dashboard
   - Verify all tables are created: `video_calls`, `video_call_participants`, `stream_video_users`, etc.
   - Check RLS policies are properly configured

6. **"Failed to get call history" or "Failed to get active calls"**

   - These endpoints use direct table queries, not database views
   - Ensure foreign key relationships are properly set up
   - Check that the authenticated user has proper permissions

7. **"invalid input syntax for type uuid" errors**

   - This was caused by malformed OR query syntax in active calls endpoint
   - Fixed by using separate queries for creator/participant lookups instead of complex OR logic
   - The error `((created_by.eq.user_id,video_call_participants.user_id.eq.user_id))` indicates incorrect parentheses usage
   - Update to the latest backend code which uses proper Supabase PostgREST syntax

### Backend Query Debugging

8. **Call history returns empty results**

   - Ensure calls are properly created with participant records
   - Check that the user has actually joined calls (use `/join` endpoint)
   - Verify `video_call_participants` table has correct foreign key references

9. **Active calls not showing up**

   - Ensure call status is set to "active" using the `/status` endpoint
   - Check that participants haven't left (left_at should be null)
   - Verify the user is either creator or participant in the call

10. **Calls remain "active" after all users leave**

- This is now automatically handled by the backend
- When the last participant leaves via `/leave` endpoint, call status is automatically set to "ended"
- If you're not using the `/leave` endpoint properly, calls may remain active indefinitely
- Always call the `/leave` endpoint when users disconnect from calls

11. **Call status synchronization issues**

- The backend now handles call lifecycle automatically
- Call status changes: `created` → `active` (manual) → `ended` (automatic when last user leaves)
- Frontend should always use the `/leave` endpoint to ensure proper cleanup
- Monitor the `call_auto_ended` field in leave responses to detect automatic call endings

### Debug Mode

Enable debug logging in development:

```javascript
// Add this when initializing the Stream Video client
const client = new StreamVideoClient({
  apiKey: api_key,
  user: user_data,
  token: token,
  options: {
    logger: console, // Enable debug logging
  },
});
```

### Backend Debugging

Check backend logs for video-related requests:

```bash
# Look for video token generation logs
[timestamp] Generating video token
[timestamp] Video token generated successfully for user: user-123

# Look for call creation logs
[timestamp] Creating new call
[timestamp] Call metadata prepared successfully: call-456
```

## Support

For additional support:

1. Check Stream Video React Native documentation: https://getstream.io/video/docs/react-native/
2. Review backend logs for specific error messages
3. Test API endpoints using tools like Postman or curl
4. Ensure all environment variables are properly configured

---

**Last Updated:** December 2024
**API Version:** v1.0
**Backend Version:** Node.js + Express + Stream Chat/Video
