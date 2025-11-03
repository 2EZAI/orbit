# Siri Integration Guide

This guide explains how to set up Siri Shortcuts for Orbit app, allowing users to create events and search for events using voice commands like "Hey Siri, create an event".

## Overview

The Orbit app uses iOS App Intents (iOS 17.0+) to integrate with Siri. Users can:
- Create events: "Hey Siri, create an event in Orbit"
- Search events: "Hey Siri, search for concerts in Orbit"

## Prerequisites

- iOS 17.0 or later
- Xcode 15.0 or later
- App Intent definitions in Swift

## Setup Instructions

### 1. Configure iOS Project

The App Intents are already defined in `ios/Orbit/OrbitAppIntents.swift`. No additional entitlements are needed for iOS 17+.

### 2. Store Auth Token

When users log in, store their auth token in Keychain so Siri can access it:

```typescript
// In your auth/login flow (e.g., app/_layout.tsx or auth component)
import { NativeModules } from 'react-native';

const { OrbitAuthService } = NativeModules;

// After successful login
const storeTokenForSiri = async (token: string) => {
  try {
    await OrbitAuthService.storeToken(token);
    console.log('✅ Token stored for Siri integration');
  } catch (error) {
    console.error('❌ Failed to store token:', error);
  }
};

// Call this after user logs in:
// await storeTokenForSiri(session.access_token);
```

### 3. Delete Token on Logout

```typescript
// On logout
const deleteTokenForSiri = async () => {
  try {
    await OrbitAuthService.deleteToken();
  } catch (error) {
    console.error('Failed to delete token:', error);
  }
};
```

### 4. Build and Test

1. **Build the app:**
   ```bash
   eas build --platform ios --profile production
   ```

2. **Install on device** (App Intents only work on physical devices, not simulators)

3. **Test Siri Integration:**
   - Open Settings → Siri & Search
   - Find "Orbit" and enable it
   - Try: "Hey Siri, create an event called 'Test Event' in Orbit"

### 5. User Setup

Users need to:
1. Enable Siri for Orbit in Settings → Siri & Search
2. Set up Siri Shortcuts (iOS may prompt automatically)
3. Say commands like:
   - "Hey Siri, create an event [event name] in Orbit"
   - "Hey Siri, search for [category] events in Orbit"

## Available App Intents

### CreateEventIntent

**Voice Command:** "Hey Siri, create an event [event name] in Orbit"

**Parameters:**
- `eventName` (required): Event name
- `description` (optional): Event description
- `location` (optional): Location address
- `date` (optional): Event date/time

**Example:**
- "Hey Siri, create an event called 'Birthday Party' in Orbit"
- "Hey Siri, create an event 'Concert' on Saturday in Orbit"

### SearchEventsIntent

**Voice Command:** "Hey Siri, search for [query] events in Orbit"

**Parameters:**
- `query` (required): Search query (e.g., "concert", "music", "sports")
- `location` (optional): Location to search near

**Example:**
- "Hey Siri, search for music events in Orbit"
- "Hey Siri, find concerts near San Francisco in Orbit"

## Technical Details

### File Structure

```
ios/Orbit/
├── OrbitAppIntents.swift      # App Intent definitions
├── OrbitAuthService.swift     # Keychain token storage
└── OrbitAuthBridge.m          # React Native bridge
```

### Keychain Storage

Auth tokens are stored in iOS Keychain with:
- **Service:** `com.dovydmcnugget.orbit`
- **Account:** `auth_token`
- **Accessibility:** `kSecAttrAccessibleWhenUnlocked`

### API Integration

App Intents call your backend API:
- **Create Event:** `POST /api/events/create`
- **Search Events:** `POST /api/events/user-location`

### Error Handling

App Intents handle errors gracefully:
- Authentication required → "Please log in to Orbit app first"
- API errors → Descriptive error messages
- Network errors → "Failed to connect to Orbit"

## Troubleshooting

### Siri doesn't recognize commands

1. Ensure Siri is enabled for Orbit in Settings
2. Check that the app is installed on a physical device (not simulator)
3. Verify iOS version is 17.0 or later
4. Try rephrasing the command

### "Authentication required" error

1. User must be logged in to Orbit app
2. Token must be stored in Keychain (check login flow)
3. Token may have expired (user needs to log in again)

### App Intent not appearing in Settings

1. Build and install app on device
2. Open app at least once
3. Go to Settings → Siri & Search → Orbit
4. If still not there, check Xcode build logs for App Intent registration

## Testing

### Manual Testing

1. Install app on physical iOS device
2. Log in to Orbit
3. Enable Siri for Orbit in Settings
4. Test commands:
   ```
   "Hey Siri, create an event called 'Test' in Orbit"
   "Hey Siri, search for music events in Orbit"
   ```

### Automation

App Intents can be tested programmatically (requires Xcode testing setup).

## Future Enhancements

Potential additions:
- **Widget Intents:** Add widgets that can trigger events
- **Shortcuts App:** Create custom shortcuts in Shortcuts app
- **Location Intents:** "Find events near me"
- **Event Management:** "Show my events", "Join event [name]"

## Notes

- App Intents require iOS 17.0+ (previous versions won't support Siri integration)
- Users must explicitly enable Siri for your app in Settings
- App Intents work best with clear, specific commands
- Consider adding more App Intents for common actions

