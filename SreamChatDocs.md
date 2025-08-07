# Stream Chat API Documentation

## 📋 Table of Contents

1. [🏗️ Your Current Backend (What You Have)](#your-current-backend-what-you-have)
2. [🌟 Stream Chat Complete Capabilities (What&#39;s Possible)](#stream-chat-complete-capabilities-whats-possible)
3. [📱 React Native Integration Examples](#react-native-integration-examples)
4. [🚧 Implementation Roadmap (What to Build Next)](#implementation-roadmap-what-to-build-next)
5. [❌ Error Handling](#error-handling)

---

## 🏗️ Your Current Backend (What You Have)

### **Base URL:** `https://your-domain.com`

### **Authentication:** `Authorization: Bearer <supabase_jwt_token>`

### ✅ **Available Endpoints (7 total):**

#### 🔑 **Chat Authentication**

```http
POST /chat/token              # Generate Stream Chat token
DELETE /chat/user             # Cleanup user from Stream
```

#### 📢 **Channel Management**

```http
POST /channels                # Create new channel
GET /channels                 # Get user's channels
POST /channels/:id/members    # Add members to channel
DELETE /channels/:id/members  # Remove members from channel
DELETE /channels/:id          # Delete channel
```

#### ⚡ **Custom Commands & Testing**

```http
POST /commands                # Handle /event command only
POST /chat/test-polls         # Test polls functionality
```

### 📝 **Current Usage Examples:**

#### Generate Chat Token:

```javascript
const response = await fetch("/chat/token", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${supabaseToken}`,
    "Content-Type": "application/json",
  },
});
const { token, expiresIn } = await response.json();
```

#### Create Channel:

```javascript
const response = await fetch("/channels", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${supabaseToken}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    name: "general-chat",
    type: "messaging",
    members: ["user-1", "user-2"],
  }),
});
```

### ⚠️ **Important Note:**

Your backend currently only handles **basic authentication and channel management**. All other features (messaging, reactions, files, etc.) happen **directly on the frontend** using the Stream Chat React Native SDK.

---

## 🌟 Stream Chat Complete Capabilities (What's Possible)

### 🔥 **ALL Stream Chat Features Available:**

#### **📱 Core Messaging**

- ✅ Real-time messaging with WebSocket connections
- ✅ Message threads and replies
- ✅ Message reactions and emoji responses
- ✅ Message editing and deletion
- ✅ Message pinning and starring
- ✅ Message search across channels
- ✅ Message quotation and forwarding
- ✅ Rich text formatting and markdown
- ✅ Message translation (50+ languages)

#### **📎 Media & Files**

- ✅ Image, video, and file uploads
- ✅ Image and video thumbnails
- ✅ File preview and download
- ✅ GIF integration (Giphy)
- ✅ Custom attachments and cards
- ✅ URL preview and link unfurling
- ✅ Audio message recording

#### **👥 User Features**

- ✅ Real-time presence indicators
- ✅ Custom user status messages
- ✅ User roles and permissions
- ✅ User mentions and @notifications
- ✅ Typing indicators
- ✅ User blocking and reporting
- ✅ Read receipts and unread counts

#### **🏢 Channel Management**

- ✅ Public and private channels
- ✅ Direct messages (1-on-1)
- ✅ Group chats (multiple users)
- ✅ Channel creation and deletion
- ✅ Member management (add/remove)
- ✅ Channel muting and notifications
- ✅ Channel search and discovery
- ✅ Channel categories and organization

#### **🛡️ Moderation & Safety**

- ✅ User banning and timeouts
- ✅ Message flagging and reporting
- ✅ Auto-moderation and content filtering
- ✅ Custom moderation rules
- ✅ Shadow banning
- ✅ IP blocking and rate limiting

#### **🔔 Notifications**

- ✅ Push notifications (iOS/Android)
- ✅ In-app notifications
- ✅ Email notifications
- ✅ Custom notification sounds
- ✅ Notification scheduling
- ✅ Do not disturb settings

#### **⚡ Advanced Features**

- ✅ Custom slash commands
- ✅ Webhooks and event handling
- ✅ Message scheduling
- ✅ Auto-translation
- ✅ Message templates
- ✅ Channel freeze/unfreeze
- ✅ Slow mode (rate limiting)

#### **🎮 Interactive Elements**

- ✅ **Polls and voting**
- ✅ Custom message actions
- ✅ Message buttons and cards
- ✅ Rich interactive attachments
- ✅ Forms and surveys
- ✅ Custom UI components

#### **🔧 Developer Tools**

- ✅ REST API and GraphQL
- ✅ Real-time WebSocket events
- ✅ Comprehensive analytics
- ✅ Export and backup tools
- ✅ GDPR compliance tools
- ✅ Multi-tenant support

---

## 📱 React Native Integration Examples

### **Basic Setup (What You Can Do Now):**

```javascript
import { StreamChat } from "stream-chat";
import {
  Chat,
  ChannelList,
  Channel,
  MessageList,
  MessageInput,
} from "stream-chat-react-native";

// Initialize client
const client = StreamChat.getInstance("YOUR_API_KEY");

// Connect user (using your backend token)
const connectUser = async () => {
  const tokenResponse = await fetch("/chat/token", {
    headers: { Authorization: `Bearer ${supabaseToken}` },
  });
  const { token } = await tokenResponse.json();

  await client.connectUser(
    {
      id: user.id,
      name: user.name,
      image: user.avatar,
    },
    token
  );
};

// Basic Chat UI
const ChatScreen = () => (
  <Chat client={client}>
    <ChannelList />
  </Chat>
);

const ChannelScreen = ({ channel }) => (
  <Chat client={client}>
    <Channel channel={channel}>
      <MessageList />
      <MessageInput />
    </Channel>
  </Chat>
);
```

### **Advanced Features You Can Use (Frontend Only):**

#### **Message Reactions:**

```javascript
// Add reaction
await message.react("like");

// Remove reaction
await message.deleteReaction("like");

// Custom reactions
await message.react("🔥");
```

#### **File Uploads:**

```javascript
// Upload image
const response = await channel.sendImage(imageFile);

// Upload file
const response = await channel.sendFile(file);

// Custom attachments
await channel.sendMessage({
  text: "Check this out!",
  attachments: [
    {
      type: "image",
      image_url: "https://example.com/image.jpg",
      title: "Cool Image",
    },
  ],
});
```

#### **Message Threading:**

```javascript
// Reply to message
await channel.sendMessage({
  text: "This is a reply",
  parent_id: originalMessage.id,
});

// Get thread replies
const thread = await client.getThread(parentMessageId);
```

#### **User Presence:**

```javascript
// Update user presence
await client.upsertUser({
  id: userId,
  online: true,
  last_active: new Date(),
});

// Custom status
await client.upsertUser({
  id: userId,
  status: "In a meeting",
  emoji: "📞",
});
```

#### **Real-time Events:**

```javascript
// Listen to typing
channel.on("typing.start", (event) => {
  console.log(`${event.user.name} is typing...`);
});

// Listen to new messages
channel.on("message.new", (event) => {
  console.log("New message:", event.message);
});

// Listen to user presence
client.on("user.presence.changed", (event) => {
  console.log(
    `${event.user.name} is ${event.user.online ? "online" : "offline"}`
  );
});
```

#### **Search Messages:**

```javascript
// Search across channels
const results = await client.search(
  {
    query: "hello world",
  },
  {
    channels: [channel.cid],
  }
);
```

#### **Moderation:**

```javascript
// Ban user
await channel.banUser(userId, {
  timeout: 3600, // 1 hour
  reason: "Spam",
});

// Mute user
await channel.muteUser(userId);

// Flag message
await client.flagMessage(messageId);
```

#### **🗳️ Polls (READY TO USE!):**

```javascript
// Create and send a poll
const poll = await client.createPoll({
  name: "Where should we host our next company event?",
  options: [
    {
      text: "Amsterdam, The Netherlands",
    },
    {
      text: "Boulder, CO",
    },
  ],
  voting_visibility: "public", // or "anonymous"
  enforce_unique_vote: true,
  max_votes_allowed: 1,
  allow_user_suggested_options: false,
  allow_answers: false,
});

// Send message with poll
const { message } = await channel.sendMessage({
  text: "We want to know your opinion!",
  poll_id: poll.id,
});

// Cast a vote
await poll.castVote({ option_id: "option-uuid" });

// Remove a vote
await poll.removeVote({ vote_id: "vote-uuid" });

// Close a poll
await poll.close();

// Listen to poll events
channel.on("poll.vote_casted", (event) => {
  console.log("New vote:", event.poll_vote);
});

channel.on("poll.vote_changed", (event) => {
  console.log("Vote changed:", event.poll_vote);
});

channel.on("poll.closed", (event) => {
  console.log("Poll closed:", event.poll);
});
```

---

## 🚧 Implementation Roadmap (What to Build Next)

### **🔥 HIGH PRIORITY - Build These Backend Endpoints:**

#### **1. Message Reactions**

```http
POST   /chat/messages/:messageId/reactions
DELETE /chat/messages/:messageId/reactions/:type
```

#### **2. File Upload Support**

```http
POST   /chat/channels/:channelId/files
POST   /chat/channels/:channelId/images
```

#### **3. Message Management**

```http
POST   /chat/messages/:messageId/pin
POST   /chat/messages/:messageId/translate
GET    /chat/messages/:messageId/replies
```

#### **4. User Features**

```http
POST   /chat/users/:userId/status
POST   /chat/users/:userId/block
POST   /chat/users/:userId/mute
```

#### **5. Push Notifications**

```http
POST   /chat/push-tokens
POST   /chat/notifications/send
```

### **⚡ MEDIUM PRIORITY:**

#### **6. Search & Analytics**

```http
GET    /chat/search
GET    /chat/analytics/usage
GET    /chat/analytics/messages
```

#### **7. Advanced Moderation**

```http
POST   /chat/channels/:channelId/moderation/ban
POST   /chat/channels/:channelId/moderation/timeout
POST   /chat/channels/:channelId/moderation/flag
```

#### **8. Custom Commands**

```http
POST   /chat/commands/register
GET    /chat/commands/list
```

### **🎯 LOW PRIORITY (Nice to Have):**

#### **9. Advanced Features**

```http
POST   /chat/webhooks
GET    /chat/export
POST   /chat/polls
```

### **💡 Quick Implementation Example:**

```javascript
// Add Message Reactions Endpoint
router.post(
  "/messages/:messageId/reactions",
  validateToken,
  async (req, res) => {
    const { messageId } = req.params;
    const { type } = req.body; // 'like', 'love', 'laugh', etc.
    const user = req.user;

    try {
      // Use Stream SDK to add reaction
      const response = await streamClient.sendReaction(
        messageId,
        { type },
        user.id
      );
      res.json(response);
    } catch (error) {
      res.status(500).json({ error: "Failed to add reaction" });
    }
  }
);

// Add File Upload Endpoint
router.post(
  "/channels/:channelId/files",
  validateToken,
  upload.single("file"),
  async (req, res) => {
    const { channelId } = req.params;
    const file = req.file;

    try {
      // Upload to Stream
      const uploadResponse = await streamClient.uploadFile(
        file.buffer,
        file.originalname,
        file.mimetype
      );

      // Send message with attachment
      const channel = streamClient.channel("messaging", channelId);
      await channel.sendMessage({
        text: `Shared a ${file.mimetype.includes("image") ? "photo" : "file"}`,
        attachments: [
          {
            type: file.mimetype.includes("image") ? "image" : "file",
            file_url: uploadResponse.file,
            title: file.originalname,
          },
        ],
      });

      res.json(uploadResponse);
    } catch (error) {
      res.status(500).json({ error: "File upload failed" });
    }
  }
);
```

---

## ❌ Error Handling

### **Common Errors:**

```javascript
// Token expired
{
  "error": "JWT token expired",
  "code": 401
}

// Invalid channel
{
  "error": "Channel not found",
  "code": 404
}

// Rate limited
{
  "error": "Too many requests",
  "code": 429,
  "retry_after": 60
}

// Polls not enabled
{
  "error": "Polls are not enabled for this application",
  "code": 403
}
```

### **🗳️ Polls Troubleshooting:**

If polls aren't working on the frontend, try these steps:

#### **1. Test Backend Configuration:**

```javascript
// Test if polls are enabled on your backend
const response = await fetch("/chat/test-polls", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${supabaseToken}`,
    "Content-Type": "application/json",
  },
});
const result = await response.json();
console.log("Polls test result:", result);
```

#### **2. Check Frontend Permissions:**

```javascript
// Make sure your user has the right permissions
const client = StreamChat.getInstance("YOUR_API_KEY");
await client.connectUser(userdata, token);

// Test creating a poll
try {
  const poll = await client.createPoll({
    name: "Test Poll",
    options: [{ text: "Option 1" }, { text: "Option 2" }],
  });
  console.log("Poll created:", poll);
} catch (error) {
  console.error("Poll creation failed:", error);
}
```

#### **3. Common Issues:**

- **"Polls not enabled"** - Your backend configuration isn't applied yet. Restart your server.
- **"Permission denied"** - User doesn't have CreatePoll permission. Check your app permissions in Stream dashboard.
- **"Invalid poll options"** - Poll needs at least 2 options with text content.
- **"Channel doesn't support polls"** - Channel type 'messaging' needs `polls: true` in configuration.

### **Frontend Error Handling:**

```javascript
const handleChatError = (error) => {
  switch (error.code) {
    case 401:
      // Refresh token
      refreshChatToken();
      break;
    case 404:
      // Channel not found
      navigateToChannelList();
      break;
    case 429:
      // Rate limited
      showMessage("Please slow down");
      break;
    default:
      showMessage("Something went wrong");
  }
};
```

---

## 🎯 Summary

### **What You Have Now:**

- ✅ Basic authentication (token generation)
- ✅ Basic channel management (create, join, leave)
- ✅ One custom command (/event)

### **What Stream Chat Can Do:**

- 🌟 **60+ advanced features** for complete chat experience
- 🚀 **Real-time messaging** with reactions, files, threads
- 🔧 **Advanced moderation** and user management
- 📱 **Rich UI components** for React Native

### **Next Steps:**

1. **Pick 3-5 high priority features** from the roadmap
2. **Implement backend endpoints** for those features
3. **Update frontend** to use new capabilities
4. **Test and iterate** based on user feedback

The beauty of Stream Chat is that **most features work out-of-the-box** on the frontend. You only need backend endpoints for **server-side operations** like file uploads, moderation, and push notifications!
