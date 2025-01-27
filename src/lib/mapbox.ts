import Mapbox from "@rnmapbox/maps";
import Constants from "expo-constants";

// Initialize Mapbox with the access token from app config
Mapbox.setAccessToken(Constants.expoConfig?.extra?.mapboxAccessToken || "");

export { Mapbox };
