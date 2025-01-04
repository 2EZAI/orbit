import "dotenv/config";

export default {
  expo: {
    name: "Orbit",
    slug: "orbit",
    extra: {
      supabaseUrl: process.env.SUPABASE_URL,
      supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
    },
    android: {
      package: "com.dovydmcnugget.orbit",
    },
  },
};
