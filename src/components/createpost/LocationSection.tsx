import { MapPin } from "lucide-react-native";
import React from "react";
import { TouchableOpacity, View } from "react-native";
import { useTheme } from "~/src/components/ThemeProvider";
import { Input } from "~/src/components/ui/input";
import { Text } from "~/src/components/ui/text";

interface MapboxFeature {
  id: string;
  place_name: string;
  text: string;
  context: Array<{
    id: string;
    text: string;
  }>;
  properties: {
    address?: string;
  };
  address?: string;
  center: [number, number];
}

interface LocationDetails {
  address1: string;
  address2: string;
  city: string;
  state: string;
  zip: string;
  coordinates: [number, number];
}

interface LocationSectionProps {
  locationType: string | undefined;
  address1: string;
  setAddress1: (address: string) => void;
  address2: string;
  setAddress2: (address: string) => void;
  locationDetails: LocationDetails;
  searchResults: MapboxFeature[];
  showResults: boolean;
  onSearchAddress: (query: string) => void;
  onAddressSelect: (feature: MapboxFeature) => void;
}

export default function LocationSection({
  locationType,
  address1,
  setAddress1,
  address2,
  setAddress2,
  locationDetails,
  searchResults,
  showResults,
  onSearchAddress,
  onAddressSelect,
}: LocationSectionProps) {
  const { theme } = useTheme();

  if (locationType !== undefined) {
    return null;
  }

  return (
    <View
      style={{
        backgroundColor: theme.dark
          ? "rgba(139, 92, 246, 0.1)"
          : "rgba(255, 255, 255, 0.8)",
        borderRadius: 32,
        padding: 20,
        borderWidth: 1,
        borderColor: theme.dark
          ? "rgba(139, 92, 246, 0.2)"
          : "rgba(139, 92, 246, 0.1)",
        shadowColor: "#8B5CF6",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: theme.dark ? 0.3 : 0.1,
        shadowRadius: 24,
        elevation: 12,
        marginBottom: 24,
      }}
    >
      <View style={{ marginBottom: 24 }}>
        <Text
          style={{
            fontSize: 22,
            fontWeight: "700",
            color: theme.colors.text,
            marginBottom: 8,
          }}
        >
          Location
        </Text>
        <Text
          style={{
            fontSize: 16,
            color: theme.colors.text + "CC",
            lineHeight: 22,
          }}
        >
          Where will your event take place?
        </Text>
      </View>

      <View style={{ gap: 16 }}>
        <View>
          <Text
            style={{
              fontSize: 16,
              fontWeight: "600",
              color: theme.colors.text,
              marginBottom: 12,
            }}
          >
            Address *
          </Text>
          <View
            style={{
              height: 56,
              backgroundColor: theme.dark
                ? "rgba(255, 255, 255, 0.05)"
                : "rgba(255, 255, 255, 0.7)",
              borderRadius: 16,
              borderWidth: 1,
              borderColor: theme.dark
                ? "rgba(139, 92, 246, 0.2)"
                : "rgba(139, 92, 246, 0.15)",
              paddingHorizontal: 16,
            }}
          >
            <Input
              value={address1}
              onChangeText={(text) => {
                setAddress1(text);
                onSearchAddress(text);
              }}
              placeholder="Search address..."
              placeholderTextColor={theme.colors.text + "66"}
              style={{
                flex: 1,
                backgroundColor: "transparent",
                borderWidth: 0,
                height: 56,
                fontSize: 16,
                color: theme.colors.text,
              }}
            />
          </View>
        </View>

        {showResults && searchResults.length > 0 && (
          <View
            style={{
              borderRadius: 16,
              borderWidth: 1,
              borderColor: theme.dark
                ? "rgba(139, 92, 246, 0.2)"
                : "rgba(139, 92, 246, 0.15)",
              backgroundColor: theme.dark
                ? "rgba(255, 255, 255, 0.05)"
                : "rgba(255, 255, 255, 0.7)",
            }}
          >
            {searchResults.slice(0, 5).map((result) => (
              <TouchableOpacity
                key={result.id}
                onPress={() => onAddressSelect(result)}
                style={{
                  padding: 12,
                  borderBottomWidth: 1,
                  borderBottomColor: theme.dark
                    ? "rgba(139, 92, 246, 0.1)"
                    : "rgba(139, 92, 246, 0.05)",
                }}
              >
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: "600",
                    color: theme.colors.text,
                  }}
                >
                  {result.text}
                </Text>
                <Text
                  style={{
                    fontSize: 12,
                    color: theme.colors.text + "CC",
                  }}
                >
                  {result.place_name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View>
          <Text
            style={{
              fontSize: 16,
              fontWeight: "600",
              color: theme.colors.text,
              marginBottom: 12,
            }}
          >
            Address Line 2
          </Text>
          <View
            style={{
              height: 56,
              backgroundColor: theme.dark
                ? "rgba(255, 255, 255, 0.05)"
                : "rgba(255, 255, 255, 0.7)",
              borderRadius: 16,
              borderWidth: 1,
              borderColor: theme.dark
                ? "rgba(139, 92, 246, 0.2)"
                : "rgba(139, 92, 246, 0.15)",
              paddingHorizontal: 16,
            }}
          >
            <Input
              value={address2}
              onChangeText={setAddress2}
              placeholder="Apt, Suite, etc. (optional)"
              placeholderTextColor={theme.colors.text + "66"}
              style={{
                flex: 1,
                backgroundColor: "transparent",
                borderWidth: 0,
                height: 56,
                fontSize: 16,
                color: theme.colors.text,
              }}
            />
          </View>
        </View>

        {locationDetails.city && (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              padding: 12,
              marginTop: 8,
              borderRadius: 16,
              backgroundColor: theme.dark
                ? "rgba(255, 255, 255, 0.05)"
                : "rgba(255, 255, 255, 0.3)",
            }}
          >
            <MapPin size={16} color={theme.colors.text + "66"} />
            <Text
              style={{
                marginLeft: 8,
                fontSize: 14,
                color: theme.colors.text + "CC",
              }}
            >
              {locationDetails.city}, {locationDetails.state}{" "}
              {locationDetails.zip}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}
