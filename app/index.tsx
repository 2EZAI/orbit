import { useEffect } from "react";
import { Redirect } from "expo-router";
import { cacheWarmer } from "~/src/lib/cacheWarmer";
import { ImageCacheManager } from "~/src/components/ui/optimized-image";
import { cacheMonitor } from "~/src/lib/cacheMonitor";

export default function Index() {
  useEffect(() => {
    // Initialize aggressive image caching on app startup
    console.log("🚀 Initializing aggressive image caching system...");

    // Start periodic cache warming
    cacheWarmer.startPeriodicWarming();

    // Start cache performance monitoring
    cacheMonitor.startMonitoring();

    // Clean old cache entries
    ImageCacheManager.clearOldCache();

    console.log("💾 Image caching system fully initialized");
    console.log("📊 Cache monitoring active");
  }, []);

  return <Redirect href="/(auth)" />;
}
