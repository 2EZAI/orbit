import React, { useState, useEffect } from "react";
import {
  View,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { Text } from "~/src/components/ui/text";
import { Input } from "~/src/components/ui/input";
import { Sheet } from "~/src/components/ui/sheet";
import { useTheme } from "~/src/components/ThemeProvider";
import { useAuth } from "~/src/lib/auth";
import { useUser } from "~/hooks/useUserData";
import { supabase } from "~/src/lib/supabase";
import Constants from "expo-constants";
import Toast from "react-native-toast-message";
import { Map as MapIcon, X, MapPin } from "lucide-react-native";
import { debounce } from "lodash";

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

interface LocationDetails {
  address1: string;
  address2: string;
  city: string;
  state: string;
  zip: string;
  coordinates?: [number, number];
}

interface AddressModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AddressModal({ isOpen, onClose }: AddressModalProps) {
  const { theme } = useTheme();
  const { session } = useAuth();
  const { user, userlocation, updateUserLocations } = useUser();

  const [searchText, setSearchText] = useState("");
  const [searchResults, setSearchResults] = useState<MapboxFeature[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [locationDetails, setLocationDetails] = useState<LocationDetails>({
    address1: "",
    address2: "",
    city: "",
    state: "",
    zip: "",
    coordinates: [0, 0],
  });

  useEffect(() => {
    if (userlocation && isOpen) {
      setLocationDetails({
        address1: userlocation.address || "",
        address2: "",
        city: userlocation.city || "",
        state: userlocation.state || "",
        zip: userlocation.postal_code || "",
        coordinates: [
          parseFloat(userlocation.longitude || "0"),
          parseFloat(userlocation.latitude || "0"),
        ],
      });
      setSearchText(
        `${userlocation.city || ""}, ${userlocation.state || ""}`
          .trim()
          .replace(/^,\s*/, "")
      );
    }
  }, [userlocation, isOpen]);

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

  const handleAddressSelect = (feature: MapboxFeature) => {
    const contextMap = new Map<string, string>(
      feature.context?.map((item) => [item.id.split(".")[0], item.text]) || []
    );

    const newLocationDetails: LocationDetails = {
      address1: feature.text,
      address2: "",
      city: contextMap.get("place") || feature.text,
      state: contextMap.get("region") || "",
      zip: contextMap.get("postcode") || "",
      coordinates: feature.center,
    };

    setLocationDetails(newLocationDetails);
    setSearchText(`${newLocationDetails.city}, ${newLocationDetails.state}`);
    setShowResults(false);
  };

  const handleSave = async () => {
    if (!session?.user?.id || !locationDetails.city || !locationDetails.state) {
      Toast.show({
        type: "error",
        text1: "Please select a valid location",
      });
      return;
    }

    setSaving(true);
    try {
      await updateUserLocations({
        city: locationDetails.city,
        state: locationDetails.state,
        postal_code: locationDetails.zip,
        address: locationDetails.address1,
        latitude: locationDetails.coordinates?.[1]?.toString() || "0",
        longitude: locationDetails.coordinates?.[0]?.toString() || "0",
      });

      Toast.show({
        type: "success",
        text1: "Main location updated successfully!",
      });

      onClose();
    } catch (error) {
      console.error("Error updating location:", error);
      Toast.show({
        type: "error",
        text1: "Failed to update location",
        text2: "Please try again",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet isOpen={isOpen} onClose={onClose}>
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
              <MapIcon size={20} color={theme.colors.primary} />
            </View>
            <Text
              style={{
                fontSize: 20,
                fontWeight: "800",
                color: theme.colors.text,
              }}
            >
              Main Location
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

        {/* Current Location Display */}
        {locationDetails.city && (
          <View style={{ marginBottom: 20 }}>
            <Text
              style={{
                fontSize: 14,
                fontWeight: "500",
                color: theme.colors.text + "80",
                marginBottom: 4,
              }}
            >
              Current Main Location
            </Text>
            <Text
              style={{
                fontSize: 16,
                fontWeight: "600",
                color: theme.colors.text,
              }}
            >
              {locationDetails.city}, {locationDetails.state}
            </Text>
          </View>
        )}

        {/* Search Input */}
        <View style={{ marginBottom: 20 }}>
          <Text
            style={{
              fontSize: 16,
              fontWeight: "600",
              color: theme.colors.text,
              marginBottom: 8,
            }}
          >
            Search for City, State
          </Text>
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
              <MapPin size={20} color={theme.colors.text + "60"} />
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
              placeholder="e.g., New York, NY"
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
          <View style={{ marginBottom: 20, maxHeight: 200 }}>
            <ScrollView
              style={{
                backgroundColor: theme.colors.card,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: theme.colors.border,
              }}
            >
              {searchResults.slice(0, 10).map((result) => (
                <TouchableOpacity
                  key={result.id}
                  onPress={() => handleAddressSelect(result)}
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

        {/* Info */}
        <View style={{ marginBottom: 24 }}>
          <Text
            style={{
              fontSize: 12,
              color: theme.colors.text + "60",
              lineHeight: 16,
            }}
          >
            Your main location is used to discover events and connect with
            people in your area. This will be your default location for event
            discovery.
          </Text>
        </View>

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
            disabled={!locationDetails.city || !locationDetails.state || saving}
            style={{
              flex: 1,
              paddingVertical: 14,
              borderRadius: 12,
              backgroundColor:
                locationDetails.city && locationDetails.state
                  ? theme.colors.primary
                  : theme.colors.border,
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
                  color:
                    locationDetails.city && locationDetails.state
                      ? "white"
                      : theme.colors.text + "60",
                }}
              >
                Save Location
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Sheet>
  );
}
