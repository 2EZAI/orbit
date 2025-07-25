import { useState, useEffect } from "react";
import { supabase } from "~/src/lib/supabase";
import { fetchTicketmasterEvents } from "~/src/lib/api/ticketmaster";
import { createHomeFeedSections } from "~/src/lib/utils/feedSections";
import {
  transformEvent,
  transformLocation,
} from "~/src/lib/utils/transformers";
import { imagePreloader } from "~/src/lib/imagePreloader";

export interface HomeFeedData {
  allContent: any[];
  featuredEvents: any[];
  sections: any[];
  flatListData: any[];
}

export function useHomeFeed() {
  const [data, setData] = useState<HomeFeedData>({
    allContent: [],
    featuredEvents: [],
    sections: [],
    flatListData: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHomeFeedData = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log("🔍 Fetching home feed data via RPC...");

      // Single RPC call to get all data
      const { data: rpcData, error: rpcError } = await supabase.rpc(
        "get_home_feed_data",
        {}
      );

      if (rpcError) {
        throw new Error(`RPC Error: ${rpcError.message}`);
      }

      // Check if RPC returned an error object
      if (rpcData?.error) {
        console.error("🔍 RPC returned error:", rpcData.error);
        throw new Error(`Database Error: ${rpcData.error}`);
      }

      console.log("🔍 RPC returned:", {
        events: rpcData?.events?.length || 0,
        locations: rpcData?.locations?.length || 0,
        topics: rpcData?.topics?.length || 0,
      });

      // Transform the data
      const events = (rpcData?.events || []).map(transformEvent);
      const locations = (rpcData?.locations || []).map(transformLocation);
      const topics = rpcData?.topics || [];

      // Fetch Ticketmaster events in parallel (this is external API)
      const ticketmasterEvents = await fetchTicketmasterEvents();
      console.log("🔍 Ticketmaster events:", ticketmasterEvents?.length || 0);

      // Combine all content
      const allEvents = [...events, ...ticketmasterEvents];
      const allContent = [...allEvents, ...locations];

      console.log("🔍 Total content items:", allContent.length);

      // Create featured events
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
        .slice(0, 5);

      // Create sections
      const sections = createHomeFeedSections(allContent, topics);

      // Create flat list data
      const flatListData = [];
      if (featuredEvents.length > 0) {
        flatListData.push({ type: "featured", data: featuredEvents });
      }
      sections.forEach((section: any) => {
        if (section.data.length > 0) {
          flatListData.push({ type: "section", data: section });
        }
      });

      console.log("🔍 Final sections:", sections.length);
      console.log("🔍 Final flat list data:", flatListData.length, "items");

      // AGGRESSIVE IMAGE PRELOADING - Start immediately
      console.log("🚀 Starting aggressive image preloading...");

      // Start preloading critical images IMMEDIATELY (don't wait)
      const criticalImages: string[] = [];

      // Priority 1: Featured events (story cards - most visible)
      featuredEvents.forEach((event: any) => {
        if (event.image_urls && event.image_urls.length > 0) {
          criticalImages.push(event.image_urls[0]);
        }
      });

      // Priority 2: First few locations (TikTok cards)
      locations.slice(0, 5).forEach((location: any) => {
        if (location.image_urls && location.image_urls.length > 0) {
          criticalImages.push(location.image_urls[0]);
        }
      });

      // Preload critical images immediately with highest priority
      if (criticalImages.length > 0) {
        console.log(
          `⚡ Immediately preloading ${criticalImages.length} critical images`
        );
        imagePreloader.preloadImages(criticalImages, {
          priority: "high",
          aggressive: true,
          cache: true,
        });
      }

      // Enhanced feed preloading with all data
      setTimeout(() => {
        imagePreloader.preloadFeedImages({
          events: allEvents,
          locations: locations,
          featuredEvents: featuredEvents,
        });
      }, 500); // Start after critical images

      // Log cache stats
      setTimeout(() => {
        const stats = imagePreloader.getCacheStats();
        console.log(
          `📊 Cache stats: ${stats.cachedImages} cached, ${stats.queueLength} in queue`
        );
      }, 2000);

      setData({
        allContent,
        featuredEvents,
        sections,
        flatListData,
      });
    } catch (err: any) {
      console.error("🔍 Error fetching home feed data:", err);
      setError(err?.message || "Error loading feed");
    } finally {
      setLoading(false);
    }
  };

  // Warm cache on app startup
  useEffect(() => {
    // Try to preload any previously queued images
    console.log("🔥 Warming image cache...");

    // Load cache stats to see what we have
    setTimeout(() => {
      const stats = imagePreloader.getCacheStats();
      console.log(
        `🏠 App startup cache: ${stats.cachedImages} images already cached`
      );
    }, 1000);

    fetchHomeFeedData();
  }, []);

  return {
    data,
    loading,
    error,
    refetch: fetchHomeFeedData,
    cacheStats: imagePreloader.getCacheStats(),
  };
}
