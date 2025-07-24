import "dotenv/config";
import { ExpoConfig, ConfigContext } from "expo/config";

// Use Heroku URL in production, localhost for development
// const DEFAULT_BACKEND_URL =
//   "https://orbit-chat-backend-7c26e572956b.herokuapp.com";
const DEFAULT_BACKEND_URL =
  "https://orbit-chat-backend-old-9d2b903ab237.herokuapp.com";

export default ({ config }: ConfigContext): ExpoConfig => {
  const backendUrl = process.env.BACKEND_CHAT_URL || DEFAULT_BACKEND_URL;
  // console.log("Configuring app with backend URL:", backendUrl);
  // console.log("Environment:", process.env.NODE_ENV || "development");

  // Validate required environment variables
  if (!process.env.STREAM_API_KEY) {
    throw new Error("STREAM_API_KEY is required");
  }
  if (!process.env.STREAM_APP_ID) {
    throw new Error("STREAM_APP_ID is required");
  }

  return {
    ...config,
    name: "Orbit",
    slug: "orbit",
    scheme: "orbit",
    version: "1.0.0",
    orientation: "portrait",
    userInterfaceStyle: "automatic",
    extra: {
      supabaseUrl: process.env.SUPABASE_URL || "",
      supabaseAnonKey: process.env.SUPABASE_ANON_KEY || "",
      mapboxAccessToken: process.env.MAPBOX_ACCESS_TOKEN || "",
      streamApiKey: process.env.STREAM_API_KEY,
      streamAppId: process.env.STREAM_APP_ID,
      backendUrl,
      eas: {
        // projectId: "04abef5f-862b-4691-bded-b1014ac6dc90",
        projectId: "6b459c07-abd5-4900-bf95-9ac72753d335",
      },
    },
    plugins: [
      [
        "@rnmapbox/maps",
        {
          mapboxAccessToken: process.env.MAPBOX_ACCESS_TOKEN || "",
          androidStyle: "streets",
          iosStyle: "streets",
        },
      ],
    ],
    ios: {
      bundleIdentifier: "com.dovydmcnugget.orbit",
      buildNumber: "1.0.1",
      supportsTablet: true,
      config: {
        usesNonExemptEncryption: false,
      },
      infoPlist: {
        UIBackgroundModes: [
          "remote-notification"
        ],
        NSUserTrackingUsageDescription: "This identifier will be used to deliver personalized ads to you.",
        NSUserNotificationUsageDescription: "This app uses notifications to keep you informed."
      },
    },
    android: {
      package: "com.dovydmcnugget.orbit",
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#FFFFFF",
      },
      permissions: ["ACCESS_COARSE_LOCATION", "ACCESS_FINE_LOCATION"],
    },
    jsEngine: "hermes",
  };
};
