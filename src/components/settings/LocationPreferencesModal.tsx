import React, { useState, useEffect } from "react";
import {
  View,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  DeviceEventEmitter,
  Dimensions,
} from "react-native";
import { Text } from "~/src/components/ui/text";
import { Input } from "~/src/components/ui/input";
import { KeyboardAwareSheet } from "./KeyboardAwareSheet";
import { useTheme } from "~/src/components/ThemeProvider";
import { useAuth } from "~/src/lib/auth";
import { useUser } from "~/src/lib/UserProvider";
import { supabase } from "~/src/lib/supabase";
import Constants from "expo-constants";
import Toast from "react-native-toast-message";
import { MapPin, X, Navigation, Globe, Search } from "lucide-react-native";
import { debounce } from "lodash";
import MapboxGL from "@rnmapbox/maps";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const MAPBOX_ACCESS_TOKEN = Constants.expoConfig?.extra?.mapboxAccessToken;

interface MapboxFeature {
  id: string;
  text: string;
  place_name: string;
  center: [number, number];
  context?: Array<{ id: string; text: string }>;
  properties: {
    address?: string;
  };
}

interface OrbitLocation {
  city: string;
  state: string;
  coordinates: [number, number];
}

interface LocationPreferencesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function LocationPreferencesModal({
  isOpen,
  onClose,
}: LocationPreferencesModalProps) {
  const { theme, isDarkMode } = useTheme();
  const { session } = useAuth();
  const {
    user,
    updateUser,
    updateUserLocations,
    userlocation,
    fetchUserLocation,
  } = useUser();

  const [selectedMode, setSelectedMode] = useState<"current" | "orbit">(
    "current"
  );
  const [saving, setSaving] = useState(false);

  // Orbit mode states
  const [searchText, setSearchText] = useState("");
  const [searchResults, setSearchResults] = useState<MapboxFeature[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [loading, setLoading] = useState(false);
  const [orbitLocation, setOrbitLocation] = useState<OrbitLocation | null>(
    null
  );

  // Load user data - only when modal first opens
  useEffect(() => {
    // Only run when modal is first opened, not on every user/location change
    if (user && isOpen && !orbitLocation) {
      console.log("🔧 [LocationModal] Initial load - Loading user data");
      console.log(
        "🔧 [LocationModal] User preference:",
        user.event_location_preference
      );

      setSelectedMode(
        user.event_location_preference === 1 ? "orbit" : "current"
      );

      // If user is in orbit mode and has location data, load it
      if (user.event_location_preference === 1 && userlocation) {
        const existingOrbitLocation: OrbitLocation = {
          city: userlocation.city || "",
          state: userlocation.state || "",
          coordinates: [
            parseFloat(userlocation.longitude || "0"),
            parseFloat(userlocation.latitude || "0"),
          ],
        };
        console.log(
          "🔧 [LocationModal] Loading existing orbit location:",
          existingOrbitLocation
        );

        setOrbitLocation(existingOrbitLocation);
        setSearchText(
          `${existingOrbitLocation.city}, ${existingOrbitLocation.state}`
        );
      }
    }

    // Reset state when modal closes
    if (!isOpen) {
      console.log("🔧 [LocationModal] Modal closed, resetting state");
      setSearchResults([]);
      setShowResults(false);
      setLoading(false);
      // Don't reset orbitLocation here to preserve user's selection
    }
  }, [user?.event_location_preference, isOpen]); // Only depend on essential changes

  const searchAddress = async (query: string) => {
    if (!query.trim() || !MAPBOX_ACCESS_TOKEN) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
          query
        )}.json?access_token=${MAPBOX_ACCESS_TOKEN}&country=US&types=place,region,locality`
      );
      const data = await response.json();
      setSearchResults(data.features || []);
      setShowResults(true);
    } catch (error) {
      console.error("Error searching address:", error);
      Toast.show({
        type: "error",
        text1: "Search failed",
        text2: "Please try again",
      });
    } finally {
      setLoading(false);
    }
  };

  const debouncedSearch = debounce(searchAddress, 300);

  const handleLocationSelect = (feature: MapboxFeature) => {
    console.log(
      "🔧 [LocationModal] handleLocationSelect called with feature:",
      feature
    );

    const contextMap = new Map<string, string>(
      feature.context?.map((item) => [item.id.split(".")[0], item.text]) || []
    );
    console.log(
      "🔧 [LocationModal] Context map:",
      Array.from(contextMap.entries())
    );

    const newOrbitLocation: OrbitLocation = {
      city: contextMap.get("place") || feature.text,
      state: contextMap.get("region") || "",
      coordinates: feature.center,
    };

    console.log(
      "🔧 [LocationModal] Created new orbit location:",
      newOrbitLocation
    );
    console.log(
      "🔧 [LocationModal] Setting search text to:",
      `${newOrbitLocation.city}, ${newOrbitLocation.state}`
    );

    setOrbitLocation(newOrbitLocation);
    setSearchText(`${newOrbitLocation.city}, ${newOrbitLocation.state}`);
    setShowResults(false);

    console.log("🔧 [LocationModal] Location selection complete");
  };

  const handleSave = async () => {
    console.log("🔧 [LocationModal] handleSave called");
    console.log(
      "🔧 [LocationModal] Current session user ID:",
      session?.user?.id
    );
    console.log("🔧 [LocationModal] Selected mode:", selectedMode);
    console.log("🔧 [LocationModal] Current orbitLocation:", orbitLocation);
    console.log("🔧 [LocationModal] Current searchText:", searchText);

    if (!session?.user?.id) return;

    // Validate orbit mode selection
    if (selectedMode === "orbit" && !orbitLocation) {
      console.log(
        "❌ [LocationModal] Validation failed: No orbit location selected"
      );
      Toast.show({
        type: "error",
        text1: "Please select a location",
        text2: "Choose a city and state for Orbit Mode",
      });
      return;
    }

    setSaving(true);
    try {
      console.log(
        "🔧 [LocationModal] About to update user preference to:",
        selectedMode === "orbit" ? 1 : 0
      );

      // Update user preference with timeout protection
      const userUpdatePromise = updateUser({
        event_location_preference: selectedMode === "orbit" ? 1 : 0,
      });

      const userUpdateResult = await Promise.race([
        userUpdatePromise,
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("User update timeout")), 10000)
        ),
      ]);

      console.log(
        "🔧 [LocationModal] User preference update result:",
        userUpdateResult
      );

      // If orbit mode, save the orbit location to user_locations table
      if (selectedMode === "orbit" && orbitLocation) {
        const locationData = {
          city: orbitLocation.city,
          state: orbitLocation.state,
          latitude: orbitLocation.coordinates[1].toString(),
          longitude: orbitLocation.coordinates[0].toString(),
          // Removed 'location' field to avoid geography column conflicts
        };
        console.log(
          "🔧 [LocationModal] About to save location data:",
          locationData
        );

        // Add timeout protection for location update
        const locationUpdatePromise = updateUserLocations(locationData);
        const locationUpdateResult = await Promise.race([
          locationUpdatePromise,
          new Promise((_, reject) =>
            setTimeout(
              () => reject(new Error("Location update timeout")),
              10000
            )
          ),
        ]);

        console.log(
          "🔧 [LocationModal] Location update result:",
          locationUpdateResult
        );
        console.log("🔧 [LocationModal] Orbit location saved:", orbitLocation);
      }

      Toast.show({
        type: "success",
        text1: "Location preferences updated!",
        text2:
          selectedMode === "current"
            ? "You'll see events based on your current GPS location"
            : `Map location set to ${orbitLocation?.city}, ${orbitLocation?.state}`,
      });

      // Notify app to update map/feed immediately
      try {
        const eventPayload = {
          mode: selectedMode,
          latitude:
            selectedMode === "orbit" && orbitLocation
              ? orbitLocation.coordinates[1]
              : null,
          longitude:
            selectedMode === "orbit" && orbitLocation
              ? orbitLocation.coordinates[0]
              : null,
        };
        console.log(
          "📍 Emitting locationPreferenceUpdated event:",
          eventPayload
        );

        // Force immediate user location refresh with timeout
        console.log("📍 Forcing immediate user location refresh for sync");
        const fetchPromise = fetchUserLocation();
        await Promise.race([
          fetchPromise,
          new Promise((_, reject) =>
            setTimeout(
              () => reject(new Error("Fetch user location timeout")),
              5000
            )
          ),
        ]);
        console.log("📍 User location state refreshed!");

        // Emit event immediately
        console.log("📍 🚀 Emitting event with payload:", eventPayload);
        DeviceEventEmitter.emit("locationPreferenceUpdated", eventPayload);
      } catch (e) {
        console.error("Error emitting location preference update:", e);
        // Still emit the event even if fetch fails
        const eventPayload = {
          mode: selectedMode,
          latitude:
            selectedMode === "orbit" && orbitLocation
              ? orbitLocation.coordinates[1]
              : null,
          longitude:
            selectedMode === "orbit" && orbitLocation
              ? orbitLocation.coordinates[0]
              : null,
        };
        DeviceEventEmitter.emit("locationPreferenceUpdated", eventPayload);
      }

      // ALWAYS close the modal, even if there are errors
      console.log("🔧 [LocationModal] Closing modal...");
      onClose();
    } catch (error) {
      console.error("Error updating location preferences:", error);
      Toast.show({
        type: "error",
        text1: "Failed to update preferences",
        text2: "Please try again",
      });

      // Close modal even on error to prevent it from getting stuck
      console.log("🔧 [LocationModal] Closing modal due to error...");
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const LocationOption = ({
    mode,
    icon,
    title,
    description,
    isSelected,
  }: {
    mode: "current" | "orbit";
    icon: React.ReactNode;
    title: string;
    description: string;
    isSelected: boolean;
  }) => (
    <TouchableOpacity
      onPress={() => setSelectedMode(mode)}
      style={{
        flexDirection: "row",
        alignItems: "center",
        padding: 16,
        borderRadius: 12,
        backgroundColor: isSelected
          ? theme.colors.primary + "20"
          : theme.colors.card,
        borderWidth: isSelected ? 2 : 1,
        borderColor: isSelected ? theme.colors.primary : theme.colors.border,
        marginBottom: 12,
      }}
    >
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: isSelected
            ? theme.colors.primary
            : theme.colors.primary + "40",
          alignItems: "center",
          justifyContent: "center",
          marginRight: 16,
        }}
      >
        {icon}
      </View>

      <View style={{ flex: 1 }}>
        <Text
          style={{
            fontSize: 16,
            fontWeight: "700",
            color: theme.colors.text,
            marginBottom: 4,
          }}
        >
          {title}
        </Text>
        <Text
          style={{
            fontSize: 14,
            color: theme.colors.text + "80",
            lineHeight: 18,
          }}
        >
          {description}
        </Text>
      </View>

      <View
        style={{
          width: 20,
          height: 20,
          borderRadius: 10,
          borderWidth: 2,
          borderColor: isSelected ? theme.colors.primary : theme.colors.border,
          backgroundColor: isSelected ? theme.colors.primary : "transparent",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {isSelected && (
          <View
            style={{
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: "white",
            }}
          />
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <KeyboardAwareSheet isOpen={isOpen} onClose={onClose}>
      <View style={{ padding: 20 }}>
        {/* Header */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 24,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: theme.colors.primary + "20",
                alignItems: "center",
                justifyContent: "center",
                marginRight: 12,
              }}
            >
              <MapPin size={20} color={theme.colors.primary} />
            </View>
            <Text
              style={{
                fontSize: 20,
                fontWeight: "800",
                color: theme.colors.text,
                lineHeight: 25,
                paddingVertical: 2,
              }}
            >
              Location Preferences
            </Text>
          </View>

          <TouchableOpacity
            onPress={onClose}
            style={{
              width: 32,
              height: 32,
              borderRadius: 16,
              backgroundColor: theme.colors.card,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <X size={18} color={theme.colors.text} />
          </TouchableOpacity>
        </View>

        {/* Info */}
        <View style={{ marginBottom: 24 }}>
          <Text
            style={{
              fontSize: 14,
              color: theme.colors.text + "80",
              lineHeight: 20,
            }}
          >
            Choose between showing your real GPS location or selecting any city
            to appear from. This affects where you appear on the map and which
            events you see.
          </Text>
        </View>

        {/* Location Options */}
        <View style={{ marginBottom: 24 }}>
          <LocationOption
            mode="current"
            icon={
              <Navigation
                size={20}
                color={
                  selectedMode === "current" ? "white" : theme.colors.primary
                }
              />
            }
            title="Use Current Location"
            description="Shows your actual GPS location on the map. Events and connections are based on where you really are."
            isSelected={selectedMode === "current"}
          />

          <LocationOption
            mode="orbit"
            icon={
              <Globe
                size={20}
                color={
                  selectedMode === "orbit" ? "white" : theme.colors.primary
                }
              />
            }
            title="Orbit Mode"
            description="Choose any city to display as your map location. Events and connections will be based on your chosen city instead of your real location."
            isSelected={selectedMode === "orbit"}
          />
        </View>

        {/* Orbit Location Search */}
        {selectedMode === "orbit" && (
          <View style={{ marginBottom: 24 }}>
            <Text
              style={{
                fontSize: 16,
                fontWeight: "700",
                color: theme.colors.text,
                marginBottom: 12,
              }}
            >
              Choose Your Orbit Location
            </Text>

            {/* Current Orbit Location */}
            {orbitLocation && (
              <View style={{ marginBottom: 16 }}>
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: "500",
                    color: theme.colors.text + "80",
                    marginBottom: 4,
                  }}
                >
                  Selected Location
                </Text>
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: "600",
                    color: theme.colors.primary,
                  }}
                >
                  {orbitLocation.city}, {orbitLocation.state}
                </Text>
              </View>
            )}

            {/* Search Input */}
            <View style={{ marginBottom: 16 }}>
              <View
                style={{
                  backgroundColor: theme.colors.card,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                  flexDirection: "row",
                  alignItems: "center",
                }}
              >
                <View style={{ marginLeft: 16 }}>
                  <Search size={20} color={theme.colors.text + "60"} />
                </View>
                <Input
                  value={searchText}
                  onChangeText={(text) => {
                    setSearchText(text);
                    if (text.trim()) {
                      debouncedSearch(text);
                    } else {
                      setSearchResults([]);
                      setShowResults(false);
                    }
                  }}
                  placeholder="Search for a city..."
                  style={{
                    flex: 1,
                    paddingHorizontal: 12,
                    paddingVertical: 14,
                    fontSize: 16,
                    color: theme.colors.text,
                    backgroundColor: "transparent",
                    borderWidth: 0,
                  }}
                  placeholderTextColor={theme.colors.text + "60"}
                />
                {loading && (
                  <ActivityIndicator
                    size="small"
                    color={theme.colors.primary}
                    style={{ marginRight: 16 }}
                  />
                )}
              </View>
            </View>

            {/* Search Results */}
            {showResults && searchResults.length > 0 && (
              <View style={{ maxHeight: 200 }}>
                <ScrollView
                  style={{
                    backgroundColor: theme.colors.card,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: theme.colors.border,
                  }}
                >
                  {searchResults.slice(0, 8).map((result) => (
                    <TouchableOpacity
                      key={result.id}
                      onPress={() => handleLocationSelect(result)}
                      style={{
                        padding: 16,
                        borderBottomWidth: 1,
                        borderBottomColor: theme.colors.border,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 16,
                          fontWeight: "600",
                          color: theme.colors.text,
                          marginBottom: 4,
                        }}
                      >
                        {result.text}
                      </Text>
                      <Text
                        style={{
                          fontSize: 14,
                          color: theme.colors.text + "80",
                        }}
                      >
                        {result.place_name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>
        )}

        {/* Actions */}
        <View
          style={{
            flexDirection: "row",
            gap: 12,
          }}
        >
          <TouchableOpacity
            onPress={onClose}
            style={{
              flex: 1,
              paddingVertical: 14,
              borderRadius: 12,
              backgroundColor: theme.colors.card,
              borderWidth: 1,
              borderColor: theme.colors.border,
              alignItems: "center",
            }}
          >
            <Text
              style={{
                fontSize: 16,
                fontWeight: "600",
                color: theme.colors.text,
              }}
            >
              Cancel
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleSave}
            disabled={saving}
            style={{
              flex: 1,
              paddingVertical: 14,
              borderRadius: 12,
              backgroundColor: theme.colors.primary,
              alignItems: "center",
              opacity: saving ? 0.7 : 1,
            }}
          >
            {saving ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "600",
                  color: "white",
                }}
              >
                Save Preferences
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAwareSheet>
  );
}
