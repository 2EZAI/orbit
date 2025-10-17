import React, { useState } from "react";
import {
  View,
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
  Modal,
  TextInput,
  Button,
  TouchableWithoutFeedback,
  Keyboard,
} from "react-native";
import { Text } from "../ui/text";
import { Sheet } from "../ui/sheet";
import { MapEvent, MapLocation } from "~/hooks/useUnifiedMapData";
import { formatTime, formatDate } from "~/src/lib/date";
import { MapPin, Calendar, X, Users } from "lucide-react-native";
import { useTheme } from "~/src/components/ThemeProvider";

interface TicketDialogProps {
  visible: boolean;
  onConfirm: (event: MapEvent | MapLocation) => void;
  onClose: () => void;
}

export function TicketDialog({
  visible,
  onConfirm,
  onClose,
}: TicketDialogProps) {
  const { theme } = useTheme();
  const [ticketCount, setTicketCount] = useState("");

  const handleConfirm = () => {
    const count = parseInt(ticketCount, 10);
    if (!isNaN(count) && count > 0) {
      onConfirm(count);
      setTicketCount("");
    } else {
      alert("Please enter a valid number");
    }
  };

  return (
    <Modal transparent visible={visible} animationType="fade">
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.overlay}>
          <View style={styles.dialog}>
            <Text style={styles.title}>Enter Number of Tickets</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 3"
              keyboardType="numeric"
              value={ticketCount}
              onChangeText={setTicketCount}
            />
            <View style={styles.buttonRow}>
              <Button title="Cancel" onPress={onClose} color="gray" />
              <Button title="Confirm" onPress={handleConfirm} />
            </View>
          </View>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    padding: 20,
  },
  dialog: {
    backgroundColor: "white",
    borderRadius: 8,
    padding: 20,
    elevation: 5,
  },
  title: {
    fontSize: 18,
    marginBottom: 12,
    fontWeight: "bold",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 6,
    padding: 10,
    marginBottom: 15,
    fontSize: 16,
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
});
