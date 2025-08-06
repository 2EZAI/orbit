# Stream Chat API Backend Documentation

## Overview

This documentation provides comprehensive instructions for frontend developers to integrate chat messaging functionality using our Stream Chat backend API. The backend is built with Node.js, Express, and integrates with Stream's Chat SDK for React Native.

## Table of Contents

1. [Authentication](#authentication)
2. [API Endpoints](#api-endpoints)
3. [React Native Integration](#react-native-integration)
4. [Environment Setup](#environment-setup)
5. [Usage Examples](#usage-examples)
6. [Database Schema](#database-schema)
7. [Error Handling](#error-handling)
8. [Best Practices](#best-practices)
9. [Troubleshooting](#troubleshooting)

## Authentication

All chat API endpoints require authentication using a Bearer token obtained from your main authentication flow.

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

### 1. Get Chat Token

**Endpoint:** `POST /chat/token`

**Description:** Generates a Stream Chat token for the authenticated user.

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
  "error": "Failed to generate chat token",
  "message": "Token generation failed"
}
```

---

### 2. Create Channel

**Endpoint:** `POST /channels`

**Description:** Creates a new chat channel.

**Headers:**

- `Authorization: Bearer <auth_token>`
- `Content-Type: application/json`

**Request Body:**

```json
{
  "channel_id": "unique-channel-id",
  "channel_type": "messaging", // Optional: "messaging", "team", "gaming"
  "name": "Channel Name",
  "members": ["user-456", "user-789"],
  "custom_data": {
    "description": "Channel description",
    "category": "general"
  },
  "event_id": "event-uuid" // Optional: link to an event
}
```

**Response:**

```json
{
  "id": "channel-uuid",
  "stream_channel_id": "unique-channel-id",
  "channel_type": "messaging",
  "name": "Channel Name",
  "created_by": "user-123",
  "members": ["user-123", "user-456", "user-789"],
  "created_at": "2023-12-01T12:00:00.000Z",
  "custom_data": {
    "description": "Channel description",
    "category": "general"
  },
  "stream_response": {
    "channel": {
      "id": "unique-channel-id",
      "type": "messaging",
      "created_at": "2023-12-01T12:00:00.000Z"
    }
  }
}
```

---

### 3. Join Channel

**Endpoint:** `POST /channels/:channelId/join`

**Description:** Adds the authenticated user to an existing channel.

**Headers:**

- `Authorization: Bearer <auth_token>`
- `Content-Type: application/json`

**URL Parameters:**

- `channelId`: The Stream channel ID

**Request Body:**

```json
{
  "role": "member" // Optional: "admin", "moderator", "member"
}
```

**Response:**

```json
{
  "success": true,
  "channel_id": "unique-channel-id",
  "user_id": "user-123",
  "role": "member",
  "joined_at": "2023-12-01T12:00:00.000Z"
}
```

---

### 4. Leave Channel

**Endpoint:** `DELETE /channels/:channelId/leave`

**Description:** Removes the authenticated user from a channel.

**Headers:**

- `Authorization: Bearer <auth_token>`

**URL Parameters:**

- `channelId`: The Stream channel ID

**Response:**

```json
{
  "success": true,
  "message": "Successfully left channel",
  "channel_id": "unique-channel-id",
  "user_id": "user-123"
}
```

---

### 5. Get User's Channels

**Endpoint:** `GET /channels`

**Description:** Retrieves all channels the authenticated user is a member of.

**Headers:**

- `Authorization: Bearer <auth_token>`

**Query Parameters:**

- `limit`: Number of channels to return (default: 25)
- `offset`: Number of channels to skip (default: 0)
- `type`: Filter by channel type (optional)

**Response:**

```json
{
  "channels": [
    {
      "id": "channel-uuid",
      "stream_channel_id": "unique-channel-id",
      "channel_type": "messaging",
      "name": "Channel Name",
      "created_by": "user-123",
      "created_at": "2023-12-01T12:00:00.000Z",
      "member_count": 3,
      "last_message_at": "2023-12-01T14:30:00.000Z"
    }
  ],
  "total_count": 15,
  "has_more": true
}
```

---

### 6. Get Channel Details

**Endpoint:** `GET /channels/:channelId`

**Description:** Retrieves detailed information about a specific channel.

**Headers:**

- `Authorization: Bearer <auth_token>`

**URL Parameters:**

- `channelId`: The Stream channel ID

**Response:**

```json
{
  "id": "channel-uuid",
  "stream_channel_id": "unique-channel-id",
  "channel_type": "messaging",
  "name": "Channel Name",
  "created_by": "user-123",
  "created_at": "2023-12-01T12:00:00.000Z",
  "members": [
    {
      "user_id": "user-123",
      "role": "admin",
      "joined_at": "2023-12-01T12:00:00.000Z"
    },
    {
      "user_id": "user-456",
      "role": "member",
      "joined_at": "2023-12-01T12:05:00.000Z"
    }
  ],
  "custom_data": {
    "description": "Channel description",
    "category": "general"
  }
}
```

---

### 7. Update Channel

**Endpoint:** `PATCH /channels/:channelId`

**Description:** Updates channel information (admin/creator only).

**Headers:**

- `Authorization: Bearer <auth_token>`
- `Content-Type: application/json`

**URL Parameters:**

- `channelId`: The Stream channel ID

**Request Body:**

```json
{
  "name": "Updated Channel Name",
  "custom_data": {
    "description": "Updated description",
    "category": "announcements"
  }
}
```

**Response:**

```json
{
  "success": true,
  "channel": {
    "id": "channel-uuid",
    "stream_channel_id": "unique-channel-id",
    "name": "Updated Channel Name",
    "updated_at": "2023-12-01T15:00:00.000Z"
  }
}
```

---

### 8. Delete Channel

**Endpoint:** `DELETE /channels/:channelId`

**Description:** Deletes a channel (creator only).

**Headers:**

- `Authorization: Bearer <auth_token>`

**URL Parameters:**

- `channelId`: The Stream channel ID

**Response:**

```json
{
  "success": true,
  "message": "Channel deleted successfully",
  "channel_id": "unique-channel-id"
}
```

---

### 9. Add Members to Channel

**Endpoint:** `POST /channels/:channelId/members`

**Description:** Adds new members to a channel.

**Headers:**

- `Authorization: Bearer <auth_token>`
- `Content-Type: application/json`

**URL Parameters:**

- `channelId`: The Stream channel ID

**Request Body:**

```json
{
  "user_ids": ["user-789", "user-101"],
  "role": "member" // Optional: default role for new members
}
```

**Response:**

```json
{
  "success": true,
  "added_members": [
    {
      "user_id": "user-789",
      "role": "member",
      "added_at": "2023-12-01T16:00:00.000Z"
    },
    {
      "user_id": "user-101",
      "role": "member",
      "added_at": "2023-12-01T16:00:00.000Z"
    }
  ]
}
```

---

### 10. Remove Members from Channel

**Endpoint:** `DELETE /channels/:channelId/members`

**Description:** Removes members from a channel.

**Headers:**

- `Authorization: Bearer <auth_token>`
- `Content-Type: application/json`

**URL Parameters:**

- `channelId`: The Stream channel ID

**Request Body:**

```json
{
  "user_ids": ["user-789"]
}
```

**Response:**

```json
{
  "success": true,
  "removed_members": ["user-789"],
  "removed_at": "2023-12-01T16:30:00.000Z"
}
```

---

### 11. Chat Service Health Check

**Endpoint:** `GET /chat/health`

**Description:** Checks if the chat service is running properly.

**Headers:** None required

**Response:**

```json
{
  "status": "ok",
  "service": "chat",
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
npm install stream-chat-react-native stream-chat
# For React Native CLI projects
npm install react-native-svg react-native-image-picker react-native-document-picker
cd ios && pod install

# For Expo projects
expo install react-native-svg expo-image-picker expo-document-picker
```

### Basic Setup

#### 1. Initialize Stream Chat Client

```javascript
// ChatService.js
import { StreamChat } from "stream-chat";

class ChatService {
  constructor() {
    this.client = null;
    this.user = null;
  }

  async initialize(authToken) {
    try {
      // Get chat token from backend
      const response = await fetch("/chat/token", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${authToken}`,
          "Content-Type": "application/json",
        },
      });

      const { token, api_key, user_id } = await response.json();

      // Initialize Stream Chat client
      this.client = StreamChat.getInstance(api_key);

      // Connect user
      await this.client.connectUser(
        {
          id: user_id,
          name: "User Name", // Get from your user data
          image: "https://example.com/avatar.jpg", // User avatar
        },
        token
      );

      this.user = this.client.user;
      return this.client;
    } catch (error) {
      console.error("Failed to initialize chat service:", error);
      throw error;
    }
  }

  getClient() {
    return this.client;
  }

  getUser() {
    return this.user;
  }

  async disconnect() {
    if (this.client) {
      await this.client.disconnectUser();
      this.client = null;
      this.user = null;
    }
  }
}

export default new ChatService();
```

#### 2. Chat List Component

```jsx
// ChatListScreen.jsx
import React, { useEffect, useState } from "react";
import { View, StyleSheet } from "react-native";
import { ChannelList, Chat } from "stream-chat-react-native";
import ChatService from "./ChatService";

const ChatListScreen = ({ navigation }) => {
  const [client, setClient] = useState(null);

  useEffect(() => {
    initializeChat();
    return () => {
      ChatService.disconnect();
    };
  }, []);

  const initializeChat = async () => {
    try {
      const chatClient = await ChatService.initialize(authToken);
      setClient(chatClient);
    } catch (error) {
      console.error("Failed to initialize chat:", error);
    }
  };

  const onSelectChannel = (channel) => {
    navigation.navigate("ChatChannel", { channel });
  };

  if (!client) {
    return (
      <View style={styles.loading}>
        <Text>Loading chats...</Text>
      </View>
    );
  }

  return (
    <Chat client={client}>
      <View style={styles.container}>
        <ChannelList
          onSelect={onSelectChannel}
          filters={{ members: { $in: [client.userID] } }}
          sort={{ last_message_at: -1 }}
        />
      </View>
    </Chat>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});

export default ChatListScreen;
```

#### 3. Chat Channel Component

```jsx
// ChatChannelScreen.jsx
import React from "react";
import { View, SafeAreaView } from "react-native";
import {
  Channel,
  MessageList,
  MessageInput,
  Chat,
} from "stream-chat-react-native";
import ChatService from "./ChatService";

const ChatChannelScreen = ({ route, navigation }) => {
  const { channel } = route.params;
  const client = ChatService.getClient();

  if (!client) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <Chat client={client}>
        <Channel channel={channel}>
          <View style={{ flex: 1 }}>
            <MessageList />
            <MessageInput />
          </View>
        </Channel>
      </Chat>
    </SafeAreaView>
  );
};

export default ChatChannelScreen;
```

#### 4. Create Channel Component

```jsx
// CreateChannelScreen.jsx
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";

const CreateChannelScreen = ({ navigation }) => {
  const [channelName, setChannelName] = useState("");
  const [loading, setLoading] = useState(false);

  const createChannel = async () => {
    if (!channelName.trim()) {
      Alert.alert("Error", "Please enter a channel name");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/channels", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${authToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          channel_id: `channel-${Date.now()}`,
          name: channelName,
          members: [], // Add member selection logic here
        }),
      });

      const result = await response.json();

      if (response.ok) {
        Alert.alert("Success", "Channel created successfully");
        navigation.goBack();
      } else {
        Alert.alert("Error", result.error || "Failed to create channel");
      }
    } catch (error) {
      Alert.alert("Error", "Network error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Create New Channel</Text>

      <TextInput
        style={styles.input}
        placeholder="Channel Name"
        value={channelName}
        onChangeText={setChannelName}
      />

      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={createChannel}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading ? "Creating..." : "Create Channel"}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 30,
    textAlign: "center",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
    fontSize: 16,
  },
  button: {
    backgroundColor: "#007AFF",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
  },
  buttonDisabled: {
    backgroundColor: "#ccc",
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
});

export default CreateChannelScreen;
```

## Database Schema

The following tables are used to manage chat data in Supabase:

### 1. stream_chat_users

Stores Stream Chat tokens for users.

```sql
CREATE TABLE public.stream_chat_users (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  stream_chat_token text NULL,
  token_expires_at timestamp with time zone NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT stream_chat_users_pkey PRIMARY KEY (id),
  CONSTRAINT stream_chat_users_user_id_key UNIQUE (user_id),
  CONSTRAINT stream_chat_users_user_id_fkey FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);
```

### 2. chat_channels

Stores channel metadata and links to Stream Chat channels.

```sql
CREATE TABLE public.chat_channels (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  stream_channel_id text NOT NULL,
  channel_type text NOT NULL DEFAULT 'messaging'::text,
  created_by uuid NOT NULL,
  name text NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  event_id uuid NULL,
  CONSTRAINT chat_channels_pkey PRIMARY KEY (id),
  CONSTRAINT chat_channels_stream_id_key UNIQUE (stream_channel_id),
  CONSTRAINT chat_channels_created_by_fkey FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT chat_channels_event_id_fkey FOREIGN KEY (event_id) REFERENCES events (id)
);
```

### 3. chat_channel_members

Tracks channel membership and roles.

```sql
CREATE TABLE public.chat_channel_members (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  channel_id uuid NOT NULL,
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'member'::text,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT chat_channel_members_pkey PRIMARY KEY (id),
  CONSTRAINT chat_channel_members_unique UNIQUE (channel_id, user_id),
  CONSTRAINT chat_channel_members_channel_id_fkey FOREIGN KEY (channel_id) REFERENCES chat_channels (id) ON DELETE CASCADE,
  CONSTRAINT chat_channel_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);
```

## Usage Examples

### 1. Creating a Direct Message

```javascript
const createDirectMessage = async (otherUserId) => {
  try {
    const response = await fetch("/channels", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${authToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        channel_id: `dm-${currentUserId}-${otherUserId}`,
        channel_type: "messaging",
        members: [otherUserId],
      }),
    });

    const result = await response.json();
    return result;
  } catch (error) {
    console.error("Failed to create DM:", error);
  }
};
```

### 2. Joining a Channel

```javascript
const joinChannel = async (channelId) => {
  try {
    const response = await fetch(`/channels/${channelId}/join`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${authToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        role: "member",
      }),
    });

    const result = await response.json();
    return result;
  } catch (error) {
    console.error("Failed to join channel:", error);
  }
};
```

### 3. Loading User's Channels

```javascript
const loadUserChannels = async () => {
  try {
    const response = await fetch("/channels", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });

    const { channels } = await response.json();
    return channels;
  } catch (error) {
    console.error("Failed to load channels:", error);
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

2. **Channel Not Found (404)**

```javascript
if (response.status === 404) {
  // Channel doesn't exist or user doesn't have access
  Alert.alert("Error", "Channel not found or access denied");
}
```

3. **Permission Errors (403)**

```javascript
if (response.status === 403) {
  // User doesn't have permission
  Alert.alert("Error", "You don't have permission to perform this action");
}
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

- Store chat tokens securely
- Refresh tokens before expiration
- Handle token refresh during active chats

### 2. Channel Management

- Use meaningful channel IDs
- Handle channel state changes gracefully
- Implement proper cleanup when leaving channels

### 3. Performance

- Initialize chat service on app start
- Reuse chat client instances
- Implement pagination for channel lists

### 4. User Experience

- Show loading states during operations
- Provide clear error messages
- Handle offline scenarios gracefully

## Troubleshooting

### Common Issues

1. **"Chat client not initialized"**

   - Ensure ChatService.initialize() is called before using chat features
   - Check authentication token validity

2. **Messages not appearing**

   - Verify user is connected to Stream Chat
   - Check channel membership
   - Ensure proper event listeners

3. **Channel creation failures**

   - Verify unique channel IDs
   - Check user permissions
   - Ensure backend endpoint availability

### Debug Mode

Enable debug logging in development:

```javascript
// Add this when initializing the Stream Chat client
const client = StreamChat.getInstance(api_key, {
  logger: console, // Enable debug logging
});
```

### Backend Debugging

Check backend logs for chat-related requests:

```bash
# Look for chat token generation logs
[timestamp] Generating chat token
[timestamp] Chat token generated successfully for user: user-123

# Look for channel creation logs
[timestamp] Creating channel
[timestamp] Channel created successfully: channel-456
```

## Support

For additional support:

1. Check Stream Chat React Native documentation: https://getstream.io/chat/docs/react-native/
2. Review backend logs for specific error messages
3. Test API endpoints using tools like Postman or curl
4. Ensure all environment variables are properly configured

---

**Last Updated:** December 2024
**API Version:** v1.0
**Backend Version:** Node.js + Express + Stream Chat
