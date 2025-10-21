import React from "react";
import {
  Modal,
  View,
  TouchableOpacity,
  Dimensions,
  Alert,
} from "react-native";
import { MapPin, Navigation, X } from "lucide-react-native";
import { Text } from "~/src/components/ui/text";
import { useTheme } from "~/src/components/ThemeProvider";
import { haptics } from "~/src/lib/haptics";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface LocationChangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  eventLocation: {
    latitude: number;
    longitude: number;
    name?: string;
    address?: string;
  };
  currentCenter: {
    latitude: number;
    longitude: number;
  };
  distance: number; // Distance in kilometers
}

export function LocationChangeModal({
  isOpen,
  onClose,
  onConfirm,
  eventLocation,
  currentCenter,
  distance,
}: LocationChangeModalProps) {
  const { theme, isDarkMode } = useTheme();

  const handleConfirm = () => {
    haptics.impact();
    onConfirm();
    onClose();
  };

  const handleCancel = () => {
    haptics.light();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <Modal
      visible={isOpen}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent={true}
      presentationStyle="overFullScreen"
    >
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.5)",
          justifyContent: "center",
          alignItems: "center",
          paddingHorizontal: 20,
        }}
      >
        <View
          style={{
            backgroundColor: theme.colors.card,
            borderRadius: 20,
            padding: 24,
            width: SCREEN_WIDTH - 40,
            maxWidth: 400,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.25,
            shadowRadius: 12,
            elevation: 8,
          }}
        >
          {/* Header */}
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 16 }}>
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: theme.colors.primary + "20",
                justifyContent: "center",
                alignItems: "center",
                marginRight: 12,
              }}
            >
              <Navigation size={20} color={theme.colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: "700",
                  color: theme.colors.text,
                  marginBottom: 2,
                }}
              >
                Change Map Location
              </Text>
              <Text
                style={{
                  fontSize: 14,
                  color: theme.colors.text + "80",
                }}
              >
                Load data for this area
              </Text>
            </View>
            <TouchableOpacity
              onPress={handleCancel}
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: theme.colors.border,
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <X size={16} color={theme.colors.text} />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <View style={{ marginBottom: 24 }}>
            <Text
              style={{
                fontSize: 16,
                color: theme.colors.text,
                marginBottom: 12,
                lineHeight: 22,
              }}
            >
              The activity you created is{" "}
              <Text style={{ fontWeight: "600", color: theme.colors.primary }}>
                {distance.toFixed(1)} km
              </Text>{" "}
              away from your current map view.
            </Text>

            <View
              style={{
                backgroundColor: theme.colors.border + "40",
                borderRadius: 12,
                padding: 16,
                marginBottom: 16,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
                <MapPin size={16} color={theme.colors.primary} />
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: "600",
                    color: theme.colors.text,
                    marginLeft: 8,
                  }}
                >
                  Activity Location
                </Text>
              </View>
              <Text
                style={{
                  fontSize: 14,
                  color: theme.colors.text + "80",
                  marginLeft: 24,
                }}
              >
                {eventLocation.name || "New Activity"}
              </Text>
              {eventLocation.address && (
                <Text
                  style={{
                    fontSize: 12,
                    color: theme.colors.text + "60",
                    marginLeft: 24,
                    marginTop: 2,
                  }}
                >
                  {eventLocation.address}
                </Text>
              )}
            </View>

            <Text
              style={{
                fontSize: 14,
                color: theme.colors.text + "80",
                lineHeight: 20,
              }}
            >
              Would you like to load events and locations for this area instead?
            </Text>
          </View>

          {/* Actions */}
          <View style={{ flexDirection: "row", gap: 12 }}>
            <TouchableOpacity
              onPress={handleCancel}
              style={{
                flex: 1,
                paddingVertical: 14,
                paddingHorizontal: 20,
                borderRadius: 12,
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
              onPress={handleConfirm}
              style={{
                flex: 1,
                paddingVertical: 14,
                paddingHorizontal: 20,
                borderRadius: 12,
                backgroundColor: theme.colors.primary,
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "600",
                  color: "white",
                }}
              >
                Load Data
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
