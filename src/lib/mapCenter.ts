// Global state for current map center
let currentMapCenter: { latitude: number; longitude: number } | null = null;

export const setCurrentMapCenter = (center: { latitude: number; longitude: number }) => {
  currentMapCenter = center;
  console.log("🗺️ [MapCenter] Set current map center:", center);
};

export const getCurrentMapCenter = () => {
  console.log("🗺️ [MapCenter] Get current map center:", currentMapCenter);
  return currentMapCenter;
};

export const clearCurrentMapCenter = () => {
  currentMapCenter = null;
  console.log("🗺️ [MapCenter] Cleared current map center");
};
