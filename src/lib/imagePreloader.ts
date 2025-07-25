import FastImage from "react-native-fast-image";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface PreloadOptions {
  priority?: "low" | "normal" | "high";
  cache?: boolean;
  aggressive?: boolean;
}

const CACHE_PREFIX = "orbit_image_cache_";
const PRELOAD_QUEUE_KEY = "orbit_preload_queue";

class ImagePreloader {
  private preloadedImages = new Set<string>();
  private preloadQueue: string[] = [];
  private isPreloading = false;
  private maxConcurrent = 8; // Increased for more aggressive preloading

  constructor() {
    this.initializeCache();
  }

  private async initializeCache() {
    try {
      // Load previously cached images into memory
      const keys = await AsyncStorage.getAllKeys();
      const cachedImageKeys = keys.filter((key) =>
        key.startsWith(CACHE_PREFIX)
      );
      cachedImageKeys.forEach((key) => {
        const imageUrl = key.replace(CACHE_PREFIX, "");
        this.preloadedImages.add(imageUrl);
      });

      console.log(
        `🚀 Loaded ${cachedImageKeys.length} cached images from storage`
      );

      // Clean old cache periodically
      this.cleanOldCache();
    } catch (error) {
      console.warn("Failed to initialize image cache:", error);
    }
  }

  private async cleanOldCache() {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter((key) => key.startsWith(CACHE_PREFIX));
      const now = Date.now();
      const oneWeek = 7 * 24 * 60 * 60 * 1000;

      let cleanedCount = 0;
      for (const key of cacheKeys) {
        const timestamp = await AsyncStorage.getItem(key);
        if (timestamp && now - parseInt(timestamp) > oneWeek) {
          await AsyncStorage.removeItem(key);
          const imageUrl = key.replace(CACHE_PREFIX, "");
          this.preloadedImages.delete(imageUrl);
          cleanedCount++;
        }
      }

      if (cleanedCount > 0) {
        console.log(`🧹 Cleaned ${cleanedCount} old cached images`);
      }
    } catch (error) {
      console.warn("Failed to clean old cache:", error);
    }
  }

  async preloadImages(urls: string[], options: PreloadOptions = {}) {
    const { priority = "high", cache = true, aggressive = true } = options;

    // Filter out already preloaded images and invalid URLs
    const newUrls = urls.filter((url) => {
      if (!url || typeof url !== "string" || url.trim() === "") return false;
      if (url.includes("placehold.co") || url.includes("fpoimg.com"))
        return false;
      return !this.preloadedImages.has(url);
    });

    if (newUrls.length === 0) {
      console.log("🎯 All images already cached!");
      return;
    }

    console.log(`🚀 Preloading ${newUrls.length} new images...`);

    // Add to queue with priority handling
    if (priority === "high") {
      this.preloadQueue.unshift(...newUrls); // Add to front
    } else {
      this.preloadQueue.push(...newUrls); // Add to back
    }

    // Save queue to AsyncStorage for persistence
    await this.savePreloadQueue();

    if (!this.isPreloading) {
      this.processQueue(priority, cache, aggressive);
    }
  }

  private async savePreloadQueue() {
    try {
      await AsyncStorage.setItem(
        PRELOAD_QUEUE_KEY,
        JSON.stringify(this.preloadQueue)
      );
    } catch (error) {
      console.warn("Failed to save preload queue:", error);
    }
  }

  private async loadPreloadQueue() {
    try {
      const queueData = await AsyncStorage.getItem(PRELOAD_QUEUE_KEY);
      if (queueData) {
        const queue = JSON.parse(queueData);
        this.preloadQueue.push(...queue);
        await AsyncStorage.removeItem(PRELOAD_QUEUE_KEY);
      }
    } catch (error) {
      console.warn("Failed to load preload queue:", error);
    }
  }

  private async processQueue(
    priority: "low" | "normal" | "high",
    cache: boolean,
    aggressive: boolean
  ) {
    this.isPreloading = true;

    // Load any persisted queue items
    await this.loadPreloadQueue();

    const batchSize = aggressive ? this.maxConcurrent : 3;

    while (this.preloadQueue.length > 0) {
      const batch = this.preloadQueue.splice(0, batchSize);

      // Process batch in parallel for maximum speed
      await Promise.allSettled(
        batch.map((url) => this.preloadSingle(url, priority, cache))
      );

      // Small delay to prevent overwhelming the system
      if (!aggressive && this.preloadQueue.length > 0) {
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
    }

    this.isPreloading = false;
    console.log("✅ Image preloading completed!");
  }

  private async preloadSingle(
    url: string,
    priority: "low" | "normal" | "high",
    cache: boolean
  ): Promise<void> {
    try {
      if (this.preloadedImages.has(url)) return;

      const fastImagePriority = {
        low: FastImage.priority.low,
        normal: FastImage.priority.normal,
        high: FastImage.priority.high,
      }[priority];

      // Get optimized URL if it's a Supabase image
      const optimizedUrl = this.getOptimizedUrl(url);

      await FastImage.preload([
        {
          uri: optimizedUrl,
          priority: fastImagePriority,
          cache: cache
            ? FastImage.cacheControl.immutable
            : FastImage.cacheControl.web,
        },
      ]);

      // Mark as cached in both memory and storage
      this.preloadedImages.add(url);
      if (cache) {
        await AsyncStorage.setItem(
          `${CACHE_PREFIX}${url}`,
          Date.now().toString()
        );
      }

      console.log(`📸 Cached: ${url.substring(0, 50)}...`);
    } catch (error) {
      console.warn("Failed to preload image:", url, error);
    }
  }

  private getOptimizedUrl(url: string): string {
    // Apply same optimizations as OptimizedImage component
    if (url.includes("supabase.co")) {
      // Use medium quality for preloading to balance size and quality
      return `${url}?width=800&height=600&quality=75`;
    }

    if (url.includes("unsplash.com")) {
      return `${url}&w=800&h=600&q=75&fit=crop`;
    }

    return url;
  }

  // Enhanced feed preloading with smart prioritization
  preloadFeedImages(feedData: any) {
    const imageUrls: { url: string; priority: "high" | "normal" | "low" }[] =
      [];

    // High priority: Featured events (visible first)
    if (feedData.events && feedData.featuredEvents) {
      feedData.featuredEvents.forEach((event: any) => {
        if (event.image_urls && event.image_urls.length > 0) {
          imageUrls.push({ url: event.image_urls[0], priority: "high" });
          // Also preload additional images with lower priority
          if (event.image_urls.length > 1) {
            event.image_urls.slice(1, 3).forEach((url: string) => {
              imageUrls.push({ url, priority: "low" });
            });
          }
        }
      });
    }

    // Normal priority: Regular events
    if (feedData.events) {
      feedData.events.slice(0, 10).forEach((event: any) => {
        if (event.image_urls && event.image_urls.length > 0) {
          imageUrls.push({ url: event.image_urls[0], priority: "normal" });
        }
      });
    }

    // High priority: Locations (for TikTok cards)
    if (feedData.locations) {
      feedData.locations.slice(0, 8).forEach((location: any) => {
        if (location.image_urls && location.image_urls.length > 0) {
          imageUrls.push({ url: location.image_urls[0], priority: "high" });
        }
      });
    }

    // Group by priority and preload
    const highPriorityUrls = imageUrls
      .filter((item) => item.priority === "high")
      .map((item) => item.url);
    const normalPriorityUrls = imageUrls
      .filter((item) => item.priority === "normal")
      .map((item) => item.url);
    const lowPriorityUrls = imageUrls
      .filter((item) => item.priority === "low")
      .map((item) => item.url);

    console.log(
      `🎯 Preloading images: ${highPriorityUrls.length} high, ${normalPriorityUrls.length} normal, ${lowPriorityUrls.length} low priority`
    );

    // Preload in sequence: high -> normal -> low
    this.preloadImages(highPriorityUrls, {
      priority: "high",
      aggressive: true,
    });

    setTimeout(() => {
      this.preloadImages(normalPriorityUrls, {
        priority: "normal",
        aggressive: true,
      });
    }, 1000);

    setTimeout(() => {
      this.preloadImages(lowPriorityUrls, {
        priority: "low",
        aggressive: false,
      });
    }, 3000);
  }

  // Preload specific image immediately with highest priority
  async preloadImageNow(url: string): Promise<void> {
    if (!url || this.preloadedImages.has(url)) return;

    try {
      const optimizedUrl = this.getOptimizedUrl(url);

      await FastImage.preload([
        {
          uri: optimizedUrl,
          priority: FastImage.priority.high,
          cache: FastImage.cacheControl.immutable,
        },
      ]);

      this.preloadedImages.add(url);
      await AsyncStorage.setItem(
        `${CACHE_PREFIX}${url}`,
        Date.now().toString()
      );

      console.log(`⚡ Instantly cached: ${url.substring(0, 50)}...`);
    } catch (error) {
      console.warn("Failed to instantly preload image:", error);
    }
  }

  // Check if image is cached
  isCached(url: string): boolean {
    return this.preloadedImages.has(url);
  }

  // Get cache statistics
  getCacheStats() {
    return {
      cachedImages: this.preloadedImages.size,
      queueLength: this.preloadQueue.length,
      isPreloading: this.isPreloading,
    };
  }

  clearCache() {
    this.preloadedImages.clear();
    this.preloadQueue = [];
    // Clear AsyncStorage cache as well
    AsyncStorage.getAllKeys().then((keys) => {
      const cacheKeys = keys.filter((key) => key.startsWith(CACHE_PREFIX));
      if (cacheKeys.length > 0) {
        AsyncStorage.multiRemove(cacheKeys);
      }
    });
  }
}

export const imagePreloader = new ImagePreloader();
