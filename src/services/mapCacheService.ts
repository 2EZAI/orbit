import AsyncStorage from "@react-native-async-storage/async-storage";
import { MapEvent, MapLocation } from "~/hooks/useUnifiedMapData";

interface CachedMapData {
  events: MapEvent[];
  locations: MapLocation[];
  timestamp: number;
  center: [number, number]; // [longitude, latitude]
}

const CACHE_KEY = "mapDataCache";
const CACHE_EXPIRY_MS = 15 * 60 * 1000; // 15 minutes

export class MapCacheService {
  static async getCachedData(): Promise<CachedMapData | null> {
    try {
      const cachedDataString = await AsyncStorage.getItem(CACHE_KEY);
      if (cachedDataString) {
        const cachedData: CachedMapData = JSON.parse(cachedDataString);
        const cacheAge = Date.now() - cachedData.timestamp;
        if (cacheAge < CACHE_EXPIRY_MS) {
          console.log("[MapCacheService] ✅ Cache hit, data is fresh");
          return cachedData;
        } else {
          console.log("[MapCacheService] ⚠️ Cache expired");
          await AsyncStorage.removeItem(CACHE_KEY);
        }
      }
    } catch (error) {
      console.error("[MapCacheService] Error getting cached data:", error);
    }
    return null;
  }

  static async saveCachedData(
    events: MapEvent[],
    locations: MapLocation[],
    center: [number, number]
  ): Promise<void> {
    try {
      const dataToCache: CachedMapData = {
        events,
        locations,
        timestamp: Date.now(),
        center,
      };
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(dataToCache));
      console.log("[MapCacheService] ✅ Data cached successfully");
    } catch (error) {
      console.error("[MapCacheService] Error saving cached data:", error);
    }
  }

  static async clearCache(): Promise<void> {
    try {
      await AsyncStorage.removeItem(CACHE_KEY);
      console.log("[MapCacheService] ✅ Map cache cleared");
    } catch (error) {
      console.error("[MapCacheService] Error clearing map cache:", error);
    }
  }
}
