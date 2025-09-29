import { useState, useEffect, useCallback } from "react";
import { supabase } from "~/src/lib/supabase";
import { feedService } from "~/src/services/feedService";
import { mapFeedCategoriesFromAPI } from "~/src/lib/utils/homeFeedSectionMapper";
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
  const { user, userlocation, loading: userLoading } = useUser();
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
      } catch (locationError) {
        console.log("Could not get user location:", locationError);
      }

      // Create location data for API call
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

      // Set auth token for feed service
      const session = await supabase.auth.getSession();
      if (session?.data?.session) {
        feedService.setAuthToken(session.data.session.access_token);
      }

      // Fetch main feed data from web backend
      const feedData = await feedService.getFeed(locationData);
      console.log("✅ Home feed data loaded");
      // Get topics from the database (for dynamic categories)
      const { data: topicsData } = await supabase.from("topics").select("*");
      const topics = topicsData || [];

      // Map web API sections directly to mobile UI sections
      const mobileFeedData = mapFeedCategoriesFromAPI(
        feedData.sections,
        topics
      );

      // Check if we got no content - then show error
      if (mobileFeedData.allContent.length === 0) {
        const hasLocationSetup = () => {
          if (!user) return true; // Anonymous users can use device location
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

      // AGGRESSIVE IMAGE PRELOADING - Start immediately
      const criticalImages: string[] = [];

      // Priority 1: Featured events (story cards - most visible)
      mobileFeedData.featuredEvents.forEach((event: any) => {
        if (event.image_urls && event.image_urls.length > 0) {
          criticalImages.push(event.image_urls[0]);
        }
      });

      // Priority 2: First few items from each section
      mobileFeedData.sections.slice(0, 3).forEach((section: any) => {
        section.data.slice(0, 2).forEach((item: any) => {
          if (item.image_urls && item.image_urls.length > 0) {
            criticalImages.push(item.image_urls[0]);
          }
        });
      });

      // Preload critical images immediately with highest priority
      if (criticalImages.length > 0) {
        imagePreloader.preloadImages(criticalImages, {
          priority: "high",
          aggressive: false,
          cache: true,
        });
      }

      // Enhanced feed preloading with all data - delayed and less aggressive
      setTimeout(() => {
        imagePreloader.preloadFeedImages({
          events: mobileFeedData.allContent.filter((item) => !item.isLocation),
          locations: mobileFeedData.allContent.filter(
            (item) => item.isLocation
          ),
          featuredEvents: mobileFeedData.featuredEvents,
          posts: mobileFeedData.allContent.filter((item) => item.content),
        });
      }, 2000);

      // Log cache stats
      setTimeout(() => {
        const stats = imagePreloader.getCacheStats();
      }, 3000);

      setData({
        allContent: mobileFeedData.allContent,
        featuredEvents: mobileFeedData.featuredEvents,
        sections: mobileFeedData.sections,
        flatListData: mobileFeedData.flatListData,
        dynamicCategories: mobileFeedData.dynamicCategories,
      });
    } catch (err: any) {
      console.error("❌ Error loading home feed:", err);
      setError(err?.message || "Error loading feed");
    } finally {
      setLoading(false);
    }
  };

  // Add debounced refresh to prevent rapid successive calls
  const debouncedRefresh = useCallback(
    debounce(() => {
      // Create cache key based on user data (or default if no user)
      const userId = user?.id || "anonymous";
      const locationPreference = user?.event_location_preference || 0;
      const newCacheKey = `${userId}-${locationPreference}-${
        userlocation?.city || "current"
      }-${userlocation?.state || "location"}`;

      // Check if we have cached data that's still fresh (5 minutes)
      const now = Date.now();
      const cacheExpiry = 5 * 60 * 1000; // 5 minutes
      const isCacheValid =
        cacheKey === newCacheKey &&
        now - lastFetchTime < cacheExpiry &&
        data.allContent.length > 0;

      // Log cache key change for debugging (only for authenticated users)
      if (user && cacheKey !== newCacheKey) {
        console.log("🔄 Cache key changed for user:", userId);
      }

      if (isCacheValid) {
        console.log("📱 Using cached home feed data");
        setLoading(false);
        return;
      }

      if (user) {
        console.log("🔄 Loading fresh home feed data for authenticated user");
      } else {
        console.log("🔄 Loading fresh home feed data for anonymous user");
      }
      setCacheKey(newCacheKey);
      setLastFetchTime(now);
      fetchHomeFeedData();
    }, 500), // 500ms debounce
    [user, userlocation, userLoading, cacheKey, lastFetchTime, data.allContent.length]
  );

  // Warm cache on app startup and fetch data when user or location changes
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
