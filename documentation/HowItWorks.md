# How Siri & AI Integration Works - Complete Explanation

## 📖 What Was Implemented

I've added two features to your Orbit app:

### 1. **Siri Integration** ("Hey Siri, create an event")
   - Users can create events using voice commands
   - Users can search for events using Siri
   - Works only on iOS devices (iOS 17+)

### 2. **AI Agent API** (ChatGPT/Claude access)
   - AI services like ChatGPT can query Orbit data
   - Users can ask ChatGPT "Find events near me" and it will use Orbit API
   - Works with any AI service that supports function calling

---

## 🔧 How It Works - Technical Details

### Part 1: Siri Integration Flow

```
User says "Hey Siri, create an event called 'Birthday Party' in Orbit"
    ↓
Siri recognizes the command and finds Orbit's App Intent
    ↓
App Intent retrieves auth token from iOS Keychain
    ↓
App Intent calls your backend API to create the event
    ↓
API creates event in database
    ↓
Siri confirms "Event created successfully"
```

#### The Components:

1. **OrbitAppIntents.swift** - Defines what Siri can do:
   - "Create event" command
   - "Search events" command
   - What parameters to ask the user (name, description, location, date)

2. **OrbitAuthService.swift** - Stores/retrieves auth token:
   - When user logs in → store token in iOS Keychain
   - When Siri needs it → retrieve from Keychain
   - iOS Keychain is secure storage that only your app can access

3. **OrbitAuthBridge.m** - Connects React Native to Swift:
   - Allows your React Native code to call Swift functions
   - "Store this token" → Swift stores it in Keychain
   - "Get this token" → Swift retrieves it from Keychain

### Part 2: AI Agent Integration Flow

```
User asks ChatGPT: "Find music events in San Francisco"
    ↓
ChatGPT recognizes it needs Orbit API data
    ↓
ChatGPT calls Orbit API endpoint: POST /events/user-location
    ↓
API returns events matching the query
    ↓
ChatGPT formats the response: "I found 5 music events in San Francisco..."
```

#### The Components:

1. **AIAgentAPI.md** - Documentation for AI services:
   - How to call Orbit API endpoints
   - What parameters to use
   - What data format to expect

2. **Your Backend API** - Already exists, just needs to be exposed:
   - `/api/events/user-location` - Search events by location
   - `/api/events/create` - Create new events
   - These endpoints are documented for AI services to use

---

## 📝 Step-by-Step: What You Need to Do

### Step 1: Store Auth Token for Siri (Required)

**Location:** `src/lib/auth.tsx` or wherever login happens

When a user successfully logs in, we need to store their auth token in iOS Keychain so Siri can use it later.

**Add this code to your login flow:**

```typescript
// In src/lib/auth.tsx - modify the AuthProvider component
import { NativeModules, Platform } from 'react-native';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // Get the native module for token storage
  const OrbitAuthService = NativeModules.OrbitAuthService;

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log("Initial session check:", !!session);
      setSession(session);
      setLoading(false);
      
      // ✅ ADD THIS: Store token for Siri when session is available
      if (session?.access_token && Platform.OS === 'ios') {
        OrbitAuthService.storeToken(session.access_token)
          .then(() => console.log('✅ Token stored for Siri'))
          .catch((err: any) => console.error('❌ Failed to store token:', err));
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("Auth state change:", event, "Session:", !!session);
      setSession(session);
      
      // ✅ ADD THIS: Store token when user logs in
      if (event === 'SIGNED_IN' && session?.access_token && Platform.OS === 'ios') {
        OrbitAuthService.storeToken(session.access_token)
          .then(() => console.log('✅ Token stored for Siri'))
          .catch((err: any) => console.error('❌ Failed to store token:', err));
      }
      
      // ✅ ADD THIS: Delete token when user logs out
      if (event === 'SIGNED_OUT' && Platform.OS === 'ios') {
        OrbitAuthService.deleteToken()
          .then(() => console.log('✅ Token deleted'))
          .catch((err: any) => console.error('❌ Failed to delete token:', err));
      }
      
      // ... rest of your code
    });

    return () => subscription.unsubscribe();
  }, []);

  // ... rest of your component
}
```

**Or, if you prefer to add it to your sign-in component:**

```typescript
// In app/(auth)/sign-in.tsx - add after successful login
import { NativeModules, Platform } from 'react-native';

const { OrbitAuthService } = NativeModules;

async function signIn(): Promise<void> {
  // ... your existing login code ...
  
  try {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      // ... handle error ...
      return;
    }

    // ✅ ADD THIS: Store token for Siri after successful login
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token && Platform.OS === 'ios') {
      try {
        await OrbitAuthService.storeToken(session.access_token);
        console.log('✅ Token stored for Siri');
      } catch (err) {
        console.error('❌ Failed to store token:', err);
      }
    }

    // ... rest of your code ...
  } catch (error) {
    // ... handle error ...
  }
}
```

### Step 2: Build iOS App

Since App Intents require native iOS code, you need to rebuild your app:

```bash
# Build for iOS
eas build --platform ios --profile production

# Or for development
eas build --platform ios --profile development
```

**Important:** App Intents only work on **physical iOS devices**, not simulators. You must test on a real iPhone.

### Step 3: Test Siri Integration

1. **Install the new build** on your iPhone (iOS 17+ required)

2. **Enable Siri for Orbit:**
   - Go to Settings → Siri & Search
   - Find "Orbit" in the list
   - Enable it

3. **Test commands:**
   - Say: "Hey Siri, create an event called 'Test Event' in Orbit"
   - Or: "Hey Siri, search for music events in Orbit"

4. **First time setup:**
   - When you first use it, iOS will ask for permission
   - Grant permission for Orbit to access your data
   - Siri will confirm the action

### Step 4: Test AI Agent Integration

**For ChatGPT:**
1. Register your Orbit API with OpenAI Function Calling
2. Users can then ask ChatGPT: "Find music events in San Francisco"
3. ChatGPT will call your API and return results

**For Claude:**
1. Register your Orbit API with Anthropic Tools
2. Users can then ask Claude: "What events are happening near me?"
3. Claude will query your API and format the response

**Note:** AI Agent integration requires backend API configuration - this is for future integration with ChatGPT/Claude directly.

---

## 🔍 How to Verify It's Working

### Siri Integration:

1. **Check token storage:**
   - After logging in, check console logs
   - Should see: "✅ Token stored for Siri"
   - If you see error, check iOS Keychain permissions

2. **Test Siri commands:**
   - Open Settings → Siri & Search → Orbit
   - Try: "Hey Siri, create an event called 'Test' in Orbit"
   - Siri should respond with confirmation

3. **Check Xcode logs:**
   - Connect iPhone to Mac
   - Open Xcode → Window → Devices and Simulators
   - Select your device → View Device Logs
   - Look for App Intent execution logs

### AI Agent Integration:

1. **Test API directly:**
   ```bash
   curl -X POST https://orbit-map-backend-c2b17aebdb75.herokuapp.com/api/events/user-location \
     -H "Content-Type: application/json" \
     -d '{"latitude": 37.7749, "longitude": -122.4194}'
   ```

2. **Verify endpoints are accessible:**
   - Check your backend API is responding
   - Ensure CORS is configured for AI service calls

---

## ❓ Troubleshooting

### "Siri doesn't recognize the command"
- **Check:** iOS version (must be 17.0+)
- **Check:** Is Siri enabled for Orbit in Settings?
- **Check:** Are you testing on a physical device? (Simulators don't support App Intents)
- **Try:** Rebuilding the app and reinstalling

### "Authentication required" error
- **Check:** Did you add token storage code?
- **Check:** Is user logged in?
- **Check:** Are there any console errors about token storage?
- **Try:** Logging out and back in

### "Token storage failed"
- **Check:** iOS Keychain permissions in Info.plist
- **Check:** Is the app signed correctly?
- **Check:** Are there any Xcode build errors?

### AI Agent not working
- **Check:** Backend API is accessible
- **Check:** API endpoints match documentation
- **Check:** CORS is configured correctly
- **Check:** Rate limits aren't exceeded

---

## 📁 Files Created/Modified

### New Files:
- `ios/Orbit/OrbitAppIntents.swift` - Siri App Intent definitions
- `ios/Orbit/OrbitAuthService.swift` - Keychain token storage
- `ios/Orbit/OrbitAuthBridge.m` - React Native bridge
- `documentation/AIAgentAPI.md` - AI Agent API documentation
- `documentation/SiriIntegration.md` - Siri setup guide
- `documentation/HowItWorks.md` - This file

### Files to Modify:
- `src/lib/auth.tsx` - Add token storage on login/logout
- (Optional) `app/(auth)/sign-in.tsx` - Add token storage after login

---

## 🎯 Summary

**What you need to do:**
1. ✅ Add token storage code to your login flow (5 minutes)
2. ✅ Rebuild iOS app with `eas build` (10-20 minutes)
3. ✅ Install on physical iPhone (iOS 17+)
4. ✅ Test Siri commands
5. ✅ (Optional) Configure AI Agent API for ChatGPT/Claude

**What works automatically:**
- App Intents are registered when app installs
- Siri recognizes commands after first use
- API endpoints are already available (just need documentation)

**Time to implement:**
- Token storage code: 5 minutes
- Build & test: 20-30 minutes
- Total: ~30 minutes

---

## 💡 Next Steps

1. **Add token storage** to your login flow (code provided above)
2. **Build iOS app** using EAS Build
3. **Test on physical device** (iOS 17+)
4. **Enable Siri for Orbit** in Settings
5. **Test voice commands**

Once working, you can:
- Add more App Intents (e.g., "Show my events")
- Integrate with ChatGPT/Claude for AI queries
- Expand AI Agent API with more endpoints

