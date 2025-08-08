import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from "react-native";
import { useTheme } from "~/src/components/ThemeProvider";
import { Avatar } from "~/src/components/ui/avatar";
import { Phone, PhoneOff, Video } from "lucide-react-native";

interface IncomingCallNotificationProps {
  callerName: string;
  callerImage?: string;
  callType: "audio" | "video";
  onAccept: () => void;
  onDecline: () => void;
}

const { width } = Dimensions.get("window");

export default function IncomingCallNotification({
  callerName,
  callerImage,
  callType,
  onAccept,
  onDecline,
}: IncomingCallNotificationProps) {
  const { theme } = useTheme();

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <View style={[styles.content, { backgroundColor: theme.colors.card }]}>
        {/* Caller Info */}
        <View style={styles.callerInfo}>
          <Avatar alt={callerName} className="w-20 h-20 mb-4" />
          <Text style={[styles.callerName, { color: theme.colors.text }]}>
            {callerName}
          </Text>
          <Text style={[styles.callType, { color: theme.colors.text + "80" }]}>
            Incoming {callType} call
          </Text>
        </View>

        {/* Call Actions */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionButton, styles.declineButton]}
            onPress={onDecline}
          >
            <PhoneOff size={24} color="white" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.acceptButton]}
            onPress={onAccept}
          >
            {callType === "video" ? (
              <Video size={24} color="white" />
            ) : (
              <Phone size={24} color="white" />
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },
  content: {
    width: width * 0.85,
    borderRadius: 20,
    padding: 32,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 20,
  },
  callerInfo: {
    alignItems: "center",
    marginBottom: 40,
  },
  callerName: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 8,
    textAlign: "center",
  },
  callType: {
    fontSize: 16,
    textAlign: "center",
  },
  actions: {
    flexDirection: "row",
    gap: 60,
  },
  actionButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  declineButton: {
    backgroundColor: "#FF3B30",
  },
  acceptButton: {
    backgroundColor: "#34C759",
  },
});
