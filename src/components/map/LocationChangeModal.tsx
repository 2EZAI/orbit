import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Dimensions,
} from "react-native";
import { useTheme } from "~/src/components/ThemeProvider";
import { MapPin, Navigation } from "lucide-react-native";

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
  distance: number;
}

export function LocationChangeModal({
  isOpen,
  onClose,
  onConfirm,
  eventLocation,
  currentCenter,
  distance,
}: LocationChangeModalProps) {
  const { theme } = useTheme();

  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View
          style={[
            styles.modal,
            {
              backgroundColor: theme.colors.background,
              borderColor: theme.colors.border,
            },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <MapPin size={24} color={theme.colors.primary} />
            <Text
              style={[
                styles.title,
                {
                  color: theme.colors.text,
                },
              ]}
            >
              Event in Different Area
            </Text>
          </View>

          {/* Content */}
          <View style={styles.content}>
            <Text
              style={[
                styles.description,
                {
                  color: theme.colors.text,
                },
              ]}
            >
              This event is {distance} km away from your current location. Would you like to change the map view to load data for this area?
            </Text>

            {/* Event Details */}
            <View
              style={[
                styles.eventDetails,
                {
                  backgroundColor: theme.colors.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.eventName,
                  {
                    color: theme.colors.text,
                  },
                ]}
              >
                {eventLocation.name || "Event"}
              </Text>
              {eventLocation.address && (
                <Text
                  style={[
                    styles.eventAddress,
                    {
                      color: theme.colors.text + "80",
                    },
                  ]}
                >
                  {eventLocation.address}
                </Text>
              )}
            </View>
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={[
                styles.button,
                styles.cancelButton,
                {
                  borderColor: theme.colors.border,
                },
              ]}
              onPress={onClose}
            >
              <Text
                style={[
                  styles.buttonText,
                  {
                    color: theme.colors.text,
                  },
                ]}
              >
                Stay Here
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.button,
                styles.confirmButton,
                {
                  backgroundColor: theme.colors.primary,
                },
              ]}
              onPress={onConfirm}
            >
              <Navigation size={16} color="white" />
              <Text
                style={[
                  styles.buttonText,
                  styles.confirmButtonText,
                ]}
              >
                Go to Event
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modal: {
    width: "100%",
    maxWidth: 400,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0, 0, 0, 0.1)",
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    marginLeft: 12,
  },
  content: {
    padding: 20,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 16,
  },
  eventDetails: {
    padding: 16,
    borderRadius: 12,
  },
  eventName: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  eventAddress: {
    fontSize: 14,
  },
  actions: {
    flexDirection: "row",
    padding: 20,
    paddingTop: 16,
    gap: 12,
  },
  button: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  cancelButton: {
    backgroundColor: "transparent",
  },
  confirmButton: {
    borderWidth: 0,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  confirmButtonText: {
    color: "white",
    marginLeft: 8,
  },
});
