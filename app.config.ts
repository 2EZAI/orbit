import "dotenv/config";

export default {
  expo: {
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
      streamApiKey: process.env.STREAM_API_KEY || "",
      streamApiSecret: process.env.STREAM_API_SECRET || "",
      streamAppId: process.env.STREAM_APP_ID || "",
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
      supportsTablet: true,
      config: {
        usesNonExemptEncryption: false,
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
  },
};
