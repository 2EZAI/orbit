import { useState, useEffect } from "react";
import { supabase } from "~/src/lib/supabase";
import { fetchAllEvents } from "~/src/lib/api/ticketmaster";
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
        throw new Error(`Database Error: ${rpcData.error}`);
      }

      // Transform the data
      const events = (rpcData?.events || []).map(transformEvent);
      const locations = (rpcData?.locations || []).map(transformLocation);
      const topics = rpcData?.topics || [];

      console.log("Database events count:", events.length);
      console.log("Database locations count:", locations.length);

      // Fetch all events (including Ticketmaster) from the backend
      const allBackendEvents = await fetchAllEvents();
      console.log("All backend events count:", allBackendEvents.length);

      // Combine all content - use backend events instead of separate database + ticketmaster
      const allEvents = allBackendEvents;
      const allContent = [...allEvents, ...locations];

      console.log("Total events after combining:", allEvents.length);
      console.log("Total content (events + locations):", allContent.length);

      // Create featured events
      const featuredEvents = allEvents
        .sort((a: any, b: any) => {
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

      // AGGRESSIVE IMAGE PRELOADING - Start immediately
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
        imagePreloader.preloadImages(criticalImages, {
          priority: "high",
          aggressive: false, // Reduced aggressiveness
          cache: true,
        });
      }

      // Enhanced feed preloading with all data - delayed and less aggressive
      setTimeout(() => {
        imagePreloader.preloadFeedImages({
          events: allEvents,
          locations: locations,
          featuredEvents: featuredEvents,
        });
      }, 2000); // Increased delay to 2 seconds

      // Log cache stats
      setTimeout(() => {
        const stats = imagePreloader.getCacheStats();
      }, 3000); // Increased delay

      setData({
        allContent,
        featuredEvents,
        sections,
        flatListData,
      });
    } catch (err: any) {
      setError(err?.message || "Error loading feed");
    } finally {
      setLoading(false);
    }
  };

  // Warm cache on app startup
  useEffect(() => {
    // Try to preload any previously queued images

    // Load cache stats to see what we have
    setTimeout(() => {
      const stats = imagePreloader.getCacheStats();
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
