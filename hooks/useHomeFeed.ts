import { useState, useEffect, useCallback } from "react";
import { supabase } from "~/src/lib/supabase";
// COMMENTED OUT: Old Ticketmaster API imports - now using unified User Location API
/*
import {
  fetchAllEvents,
  fetchAllEventsUnlimited,
} from "~/src/lib/api/ticketmaster";
*/
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

      // Check if user has location preferences set up
      const hasLocationSetup = () => {
        if (!user) return false;

        // If using orbit mode (event_location_preference === 1), check if location is set
        if (user.event_location_preference === 1) {
          return userlocation && userlocation.city && userlocation.state;
        }

        // For current location mode (event_location_preference === 0), location will be requested at runtime
        return true;
      };

      // Get location-filtered static locations from the same backend as the map
      let locations: any[] = [];
      let topics: any[] = [];

      // First, determine the correct location coordinates to use
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

      // Create location data for API call (same logic as map)
      // Priority: User orbit preference → GPS → fallback to GPS
      const locationData = {
        latitude:
          user?.event_location_preference === 1 &&
          userlocation?.latitude != null
            ? parseFloat(userlocation.latitude)
            : currentDeviceLocation?.latitude != null
            ? currentDeviceLocation.latitude
            : null,
        longitude:
          user?.event_location_preference === 1 &&
          userlocation?.longitude != null
            ? parseFloat(userlocation.longitude)
            : currentDeviceLocation?.longitude != null
            ? currentDeviceLocation.longitude
            : null,
        radius: 50000, // 50km radius like the map
      };

      try {
        // Use the same location-aware backend API as the map

        console.log("🔍 [HomeFeed] Location selection debug:", {
          userPreference: user?.event_location_preference,
          currentDeviceLocation,
          userLocationFromDB: userlocation
            ? {
                latitude: userlocation.latitude,
                longitude: userlocation.longitude,
                city: userlocation.city,
                state: userlocation.state,
              }
            : null,
          finalLocationData: locationData,
        });
        console.log("Using coordinates for locations:", locationData);

        if (locationData.latitude && locationData.longitude) {
          // COMMENTED OUT: Old locations API - now using unified User Location API
          /*
          // Fetch ALL location-filtered static locations from backend (no limit like the map)
          const session = await supabase.auth.getSession();

          if (session?.data?.session) {
            const responseLocations = await fetch(
              `${process.env.BACKEND_MAP_URL}/api/locations/all`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${session.data.session.access_token}`,
                },
                body: JSON.stringify({
                  ...locationData,
                  radius: 500000, // Expand radius to 500km to get thousands of locations like the map
                }),
              }
            );
          */

          // NEW: Use unified User Location API from APIEVENTS.md
          const session = await supabase.auth.getSession();

          if (session?.data?.session) {
            const responseUnified = await fetch(
              `${process.env.BACKEND_MAP_URL}/api/events/user-location`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${session.data.session.access_token}`,
                },
                body: JSON.stringify(locationData),
              }
            );

            if (responseUnified.ok) {
              const unifiedData = await responseUnified.json();
              console.log(
                `🔍 Unified API response - Events: ${
                  unifiedData.events?.length || 0
                }, Locations: ${unifiedData.locations?.length || 0}`
              );

              // Extract and validate location data from unified response
              const validLocations = (unifiedData.locations || []).filter(
                (location: any) => {
                  return (
                    location.location &&
                    typeof location.location.latitude === "number" &&
                    typeof location.location.longitude === "number" &&
                    !isNaN(location.location.latitude) &&
                    !isNaN(location.location.longitude) &&
                    Math.abs(location.location.latitude) <= 90 &&
                    Math.abs(location.location.longitude) <= 180
                  );
                }
              );

              locations = validLocations.map(transformLocation);
              console.log(
                "✅ Location-filtered static locations count:",
                locations.length
              );

              // Extract unique categories from locations for filtering
              const locationCategories = new Set<string>();
              validLocations.forEach((location: any) => {
                if (location.category?.name) {
                  locationCategories.add(location.category.name);
                }
                if (location.type) {
                  locationCategories.add(location.type);
                }
              });
              console.log(
                "🏷️ Location categories found:",
                Array.from(locationCategories)
              );
            }
          }
        }

        // Get topics from the database (topics don't need location filtering)
        const { data: topicsData } = await supabase.from("topics").select("*");
        topics = topicsData || [];
      } catch (error) {
        console.log("Error fetching location-filtered data:", error);
        // Fallback to unfiltered RPC call
        const { data: rpcData, error: rpcError } = await supabase.rpc(
          "get_home_feed_data",
          {}
        );
        if (!rpcError && rpcData) {
          locations = (rpcData?.locations || []).map(transformLocation);
          topics = rpcData?.topics || [];
        }
      }

      console.log("Final locations count:", locations.length);

      // Fetch ALL location-filtered events from the backend (no 1000 limit)
      // COMMENTED OUT: Old Ticketmaster API call - events now come from unified API
      /*
      // Pass the same location coordinates that we're using for locations
      console.log(
        "🎯 [HomeFeed] Calling fetchAllEventsUnlimited with coordinates:",
        {
          latitude: locationData.latitude,
          longitude: locationData.longitude,
          userPreference: user?.event_location_preference,
          source: user?.event_location_preference === 1 ? "orbit" : "gps",
        }
      );

      const allBackendEvents = await fetchAllEventsUnlimited({
        latitude: locationData.latitude,
        longitude: locationData.longitude,
      });
      console.log(
        "🎉 Location-filtered backend events count:",
        allBackendEvents.length
      );
      */

      // NEW: Events now come from the unified API response above
      // We need to access the unified data from the earlier API call
      let allBackendEvents: any[] = [];

      // Re-fetch for events if we haven't done unified call yet
      if (locationData.latitude && locationData.longitude) {
        const session = await supabase.auth.getSession();

        if (session?.data?.session) {
          const responseUnified = await fetch(
            `${process.env.BACKEND_MAP_URL}/api/events/user-location`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${session.data.session.access_token}`,
              },
              body: JSON.stringify(locationData),
            }
          );

          if (responseUnified.ok) {
            const unifiedData = await responseUnified.json();
            allBackendEvents = (unifiedData.events || []).map(transformEvent);
            console.log(
              "🎉 Unified API events count:",
              allBackendEvents.length
            );
          }
        }
      }

      // Debug logging for location setup
      console.log("🔍 [HomeFeed] Debug location setup:", {
        user: user ? `ID: ${user.id}` : "null",
        event_location_preference: user?.event_location_preference,
        userlocation: userlocation
          ? `${userlocation.city}, ${userlocation.state}`
          : "null",
        hasLocationSetup: hasLocationSetup(),
        allBackendEventsCount: allBackendEvents.length,
      });

      // Check if we got no events AND no locations - then show error
      if (allBackendEvents.length === 0 && locations.length === 0) {
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
      if (allBackendEvents.length === 0 && locations.length > 0) {
        console.log(
          "⚠️ [HomeFeed] No events found, but showing locations only"
        );
      }

      // Use only the location-filtered backend events
      const allEvents = allBackendEvents;
      const allContent = [...allEvents, ...locations];

      console.log("Total events after combining:", allEvents.length);
      console.log("Total content (events + locations):", allContent.length);
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
