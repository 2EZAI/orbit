import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "pendingMapNavigation";

export interface PendingMapNavigation {
  eventId: string;
  lat: number;
  lng: number;
  data: any; // The full event/location data to show in card
  timestamp: number;
}

export const MapNavigationStorage = {
  async store(data: PendingMapNavigation): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      console.log("🗺️ [MapNavigationStorage] Stored navigation data:", data.eventId);
    } catch (error) {
      console.error("❌ [MapNavigationStorage] Error storing:", error);
    }
  },

  async get(): Promise<PendingMapNavigation | null> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEY);
      if (data) {
        return JSON.parse(data);
      }
      return null;
    } catch (error) {
      console.error("❌ [MapNavigationStorage] Error getting:", error);
      return null;
    }
  },

  async clear(): Promise<void> {
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
      console.log("🗺️ [MapNavigationStorage] Cleared navigation data");
    } catch (error) {
      console.error("❌ [MapNavigationStorage] Error clearing:", error);
    }
  },
};

