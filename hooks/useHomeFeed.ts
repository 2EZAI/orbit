import { useState, useEffect, useCallback } from "react";
import { supabase } from "~/src/lib/supabase";
import { feedService } from "~/src/services/feedService";
import { createHomeFeedSections } from "~/src/lib/utils/feedSections";
import {
  transformEvent,
  transformLocation,
} from "~/src/lib/utils/transformers";
import { imagePreloader } from "~/src/lib/imagePreloader";
import { useUser } from "~/src/lib/UserProvider";
import { getCurrentPositionAsync } from "expo-location";
import { debounce } from "lodash";

export interface HomeFeedData {
  allContent: any[];
  featuredEvents: any[];
  sections: any[];
  flatListData: any[];
  dynamicCategories: string[];
}

export function useHomeFeed() {
  const { user, userlocation } = useUser();
  const [data, setData] = useState<HomeFeedData>({
    allContent: [],
    featuredEvents: [],
    sections: [],
    flatListData: [],
    dynamicCategories: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastFetchTime, setLastFetchTime] = useState<number>(0);
  const [cacheKey, setCacheKey] = useState<string>("");

  const fetchHomeFeedData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Set auth token for feed service
      const session = await supabase.auth.getSession();
      if (session?.data?.session) {
        feedService.setAuthToken(session.data.session.access_token);
      }

      // Get current device location
      let currentDeviceLocation: {
        latitude: number;
        longitude: number;
      } | null = null;

      try {
        const location = await getCurrentPositionAsync({});
        currentDeviceLocation = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        };
        console.log("Got current device location:", currentDeviceLocation);
      } catch (locationError) {
        console.log("Could not get user location:", locationError);
      }

              // Fetch feed data from web backend
              const locationData = {
                latitude:
                  user?.event_location_preference === 1 &&
                  userlocation?.latitude != null
                    ? parseFloat(userlocation.latitude)
                    : currentDeviceLocation?.latitude != null
                    ? currentDeviceLocation.latitude
                    : 33.4484, // Fallback to SF
                longitude:
                  user?.event_location_preference === 1 &&
                  userlocation?.longitude != null
                    ? parseFloat(userlocation.longitude)
                    : currentDeviceLocation?.longitude != null
                    ? currentDeviceLocation.longitude
                    : -112.074, // Fallback to SF
                radius: 100000, // 100km radius (like web)
                limit: 10, // Results per section (like web)
              };

      console.log("🔍 [HomeFeed] Fetching from web backend with location:", locationData);

              // Fetch main feed data (events, locations, posts) from web backend
              const feedData = await feedService.getFeed(locationData);
              console.log(
                `🔍 Web backend feed response - Sections: ${feedData.sections.length}, Total Items: ${feedData.summary.totalItems}`
              );

              // Extract events, locations, and posts from sections
              const allEvents: any[] = [];
              const locations: any[] = [];
              const socialPosts: any[] = [];

              feedData.sections.forEach((section) => {
                section.items.forEach((item) => {
                  // Check if it's an event (has start_datetime)
                  if (item.start_datetime) {
                    allEvents.push(transformEvent(item));
                  }
                  // Check if it's a location (has location but no start_datetime)
                  else if (item.location && !item.start_datetime) {
                    locations.push(transformLocation(item));
                  }
                  // Check if it's a social post (has content)
                  else if (item.content) {
                    socialPosts.push(item);
                  }
                });
              });

              console.log(
                `🔍 Extracted - Events: ${allEvents.length}, Locations: ${locations.length}, Posts: ${socialPosts.length}`
              );

      // Get topics from the database (topics don't need location filtering)
      const { data: topicsData } = await supabase.from("topics").select("*");
      const topics = topicsData || [];

      console.log("Final data counts:", {
        locations: locations.length,
        events: allEvents.length,
        posts: socialPosts.length,
        topics: topics.length,
      });

      // Check if we got no events AND no locations - then show error
      if (allEvents.length === 0 && locations.length === 0) {
        const hasLocationSetup = () => {
          if (!user) return false;
          if (user.event_location_preference === 1) {
            return userlocation && userlocation.city && userlocation.state;
          }
          return true;
        };

        if (!hasLocationSetup()) {
          throw new Error(
            "Please set up your location preferences in Settings to see events in your area."
          );
        } else if (user?.event_location_preference === 1) {
          throw new Error(
            `No events found near ${userlocation?.city}, ${userlocation?.state}. Try expanding your search radius or choosing a different city.`
          );
        } else {
          throw new Error(
            "No events found in your current location. Make sure location permissions are enabled or try setting an Orbit location in Settings."
          );
        }
      }

      // If we have no events but have locations, show a message and continue
      if (allEvents.length === 0 && locations.length > 0) {
        console.log(
          "⚠️ [HomeFeed] No events found, but showing locations only"
        );
      }

      // Combine all content (events + locations + posts)
      const allContent = [...allEvents, ...locations, ...socialPosts];

      console.log("Total content (events + locations + posts):", allContent.length);
      console.log("🎯 Events count:", allEvents.length);
      console.log("🏢 Locations count:", locations.length);

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

      console.log("🌟 Featured events count:", featuredEvents.length);

      // Create sections (expandedSections would be passed from component)
      const feedSectionResult = createHomeFeedSections(allContent, topics);

      // Add social posts section if we have posts
      if (socialPosts.length > 0) {
        console.log("📱 [HomeFeed] Adding social posts section");
        feedSectionResult.sections.unshift({
          key: "social-posts",
          title: "What's Happening",
          subtitle: "Latest posts from the community",
          data: socialPosts.slice(0, 10),
          layout: "list",
          hasMoreData: socialPosts.length > 10,
        });
      }

      // If we have very few sections, add some basic location-only sections
      if (feedSectionResult.sections.length < 2 && locations.length > 0) {
        console.log("🔄 [HomeFeed] Adding fallback location-only sections");
        // Add a basic locations section
        feedSectionResult.sections.unshift({
          key: "nearby-places",
          title: "Places Near You",
          data: locations.slice(0, 20),
          layout: "grid",
          hasMoreData: locations.length > 20,
        });
      }

      // Create flat list data
      const flatListData = [];
      if (featuredEvents.length > 0) {
        flatListData.push({ type: "featured", data: featuredEvents });
      }
      feedSectionResult.sections.forEach((section: any) => {
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

      // Priority 3: First few social posts
      socialPosts.slice(0, 3).forEach((post: any) => {
        if (post.media_urls && post.media_urls.length > 0) {
          criticalImages.push(post.media_urls[0]);
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
          posts: socialPosts,
        });
      }, 2000); // Increased delay to 2 seconds

      // Log cache stats
      setTimeout(() => {
        const stats = imagePreloader.getCacheStats();
      }, 3000); // Increased delay

      setData({
        allContent,
        featuredEvents,
        sections: feedSectionResult.sections,
        flatListData,
        dynamicCategories: feedSectionResult.dynamicCategories,
      });
    } catch (err: any) {
      setError(err?.message || "Error loading feed");
    } finally {
      setLoading(false);
    }
  };

  // Add debounced refresh to prevent rapid successive calls
  const debouncedRefresh = useCallback(
    debounce(() => {
      if (user) {
        const newCacheKey = `${user.id}-${user.event_location_preference}-${
          userlocation?.city || "current"
        }-${userlocation?.state || "location"}`;

        // Check if we have cached data that's still fresh (5 minutes)
        const now = Date.now();
        const cacheExpiry = 5 * 60 * 1000; // 5 minutes
        const isCacheValid =
          cacheKey === newCacheKey &&
          now - lastFetchTime < cacheExpiry &&
          data.allContent.length > 0;

        if (isCacheValid) {
          console.log("📱 Using cached home feed data");
          setLoading(false);
          return;
        }

        console.log("🔄 Fetching fresh home feed data");
        setCacheKey(newCacheKey);
        setLastFetchTime(now);
        fetchHomeFeedData();
      }
    }, 500), // 500ms debounce
    [user, userlocation, cacheKey, lastFetchTime, data.allContent.length]
  );

  // Warm cache on app startup and fetch data when user is available
  useEffect(() => {
    debouncedRefresh();
  }, [user, userlocation]); // Re-fetch when user or location changes

  return {
    data,
    loading,
    error,
    refetch: fetchHomeFeedData,
    cacheStats: imagePreloader.getCacheStats(),
  };
}
