import { imagePreloader } from "./imagePreloader";
import { supabase } from "./supabase";
import { fetchTicketmasterEvents } from "./api/ticketmaster";
import { transformEvent, transformLocation } from "./utils/transformers";

class CacheWarmer {
  private isWarming = false;
  private lastWarmTime = 0;
  private warmInterval = 30 * 60 * 1000; // 30 minutes

  // Proactively warm cache with fresh data
  async warmCache() {
    if (this.isWarming) {
      console.log("🔥 Cache warming already in progress...");
      return;
    }

    const now = Date.now();
    if (now - this.lastWarmTime < this.warmInterval) {
      console.log("🔥 Cache warmed recently, skipping...");
      return;
    }

    console.log("🔥 Starting background cache warming...");
    this.isWarming = true;
    this.lastWarmTime = now;

    try {
      // Fetch fresh data quietly in background
      const { data: rpcData } = await supabase.rpc("get_home_feed_data", {});

      if (rpcData && !rpcData.error) {
        const events = (rpcData.events || []).map(transformEvent);
        const locations = (rpcData.locations || []).map(transformLocation);

        // Get external events too
        const ticketmasterEvents = await fetchTicketmasterEvents();
        const allEvents = [...events, ...ticketmasterEvents];

        // Extract images to preload
        const imagesToWarm: string[] = [];

        // High priority: Featured content
        const featuredEvents = allEvents
          .sort((a, b) => {
            const aAttendees = a.attendees || 0;
            const bAttendees = b.attendees || 0;
            if (aAttendees !== bAttendees) return bAttendees - aAttendees;
            return (
              new Date(a.start_datetime).getTime() -
              new Date(b.start_datetime).getTime()
            );
          })
          .slice(0, 8);

        featuredEvents.forEach((event) => {
          if (event.image_urls && event.image_urls.length > 0) {
            imagesToWarm.push(...event.image_urls.slice(0, 2)); // First 2 images
          }
        });

        // Popular locations
        locations.slice(0, 10).forEach((location: any) => {
          if (location.image_urls && location.image_urls.length > 0) {
            imagesToWarm.push(location.image_urls[0]);
          }
        });

        // Recent events
        allEvents.slice(0, 15).forEach((event) => {
          if (event.image_urls && event.image_urls.length > 0) {
            imagesToWarm.push(event.image_urls[0]);
          }
        });

        // Start warming with low priority to not interfere with user actions
        if (imagesToWarm.length > 0) {
          console.log(`🔥 Warming ${imagesToWarm.length} images in background`);
          imagePreloader.preloadImages(imagesToWarm, {
            priority: "low",
            aggressive: false,
            cache: true,
          });
        }

        // Log cache status
        const stats = imagePreloader.getCacheStats();
        console.log(
          `🔥 Cache warming complete. ${stats.cachedImages} images cached.`
        );
      }
    } catch (error) {
      console.warn("🔥 Cache warming failed:", error);
    } finally {
      this.isWarming = false;
    }
  }

  // Start periodic cache warming
  startPeriodicWarming() {
    // Initial warm after app startup
    setTimeout(() => this.warmCache(), 5000); // 5 seconds after startup

    // Periodic warming every 30 minutes
    setInterval(() => {
      this.warmCache();
    }, this.warmInterval);

    console.log("🔥 Periodic cache warming started");
  }

  // Preload specific content when user shows interest
  async preloadUserInterest(contentType: "event" | "location", itemId: string) {
    try {
      let imageUrls: string[] = [];

      if (contentType === "event") {
        const { data } = await supabase
          .from("events")
          .select("image_urls")
          .eq("id", itemId)
          .single();

        if (data?.image_urls) {
          imageUrls = data.image_urls;
        }
      } else if (contentType === "location") {
        const { data } = await supabase
          .from("static_locations")
          .select("image_urls")
          .eq("id", itemId)
          .single();

        if (data?.image_urls) {
          imageUrls = data.image_urls;
        }
      }

      if (imageUrls.length > 0) {
        console.log(
          `🎯 Preloading ${imageUrls.length} images for user interest`
        );

        // Preload immediately with high priority
        await Promise.all(
          imageUrls
            .slice(0, 3)
            .map((url) => imagePreloader.preloadImageNow(url))
        );
      }
    } catch (error) {
      console.warn("Failed to preload user interest:", error);
    }
  }

  // Get cache status for debugging
  getCacheStatus() {
    return {
      ...imagePreloader.getCacheStats(),
      isWarming: this.isWarming,
      lastWarmTime: this.lastWarmTime,
      nextWarmTime: this.lastWarmTime + this.warmInterval,
    };
  }
}

export const cacheWarmer = new CacheWarmer();
