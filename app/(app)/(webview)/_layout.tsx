import { Stack } from "expo-router";
import {
  TouchableOpacity,
  Text,
  Platform,
  View,
  Modal,
  StyleSheet,
  DeviceEventEmitter,
} from "react-native";
import { ArrowLeft } from "lucide-react-native";
import { useRouter } from "expo-router";
import { Icon } from "react-native-elements";
import { Sheet } from "~/src/components/ui/sheet";
import { useState } from "react";
import { useUpdateEvents } from "~/hooks/useUpdateEvents";
import { useLocalSearchParams } from "expo-router";

export default function WebviewLayout() {
  const { eventSelected, external_url, title } = useLocalSearchParams();
  let event;
  if (eventSelected !== undefined) {
    event = JSON.parse(eventSelected);
  }

  // console.log("eventSelected>>", event);
  // console.log("external_url>>", external_url);

  const router = useRouter();
  const { UpdateEventStatus } = useUpdateEvents();

  const [showOverlay, setShowOverlay] = useState(false);

  const handleBackPress = () => {
    if (title !== "Privacy Policy" && title !== "Terms & Conditions") {
      setShowOverlay(true); // show full screen view
    } else {
      router.back();
    }
  };
  const hitUpdaeEventApi = async () => {
    setShowOverlay(false);
    router.back();
    let result = await UpdateEventStatus(event);

    setTimeout(() => {
      // router.back(); // user confirms navigation
      DeviceEventEmitter.emit("refreshEventDetail", true);
    }, 2000); // 2000ms = 2 seconds
  };

  const handleConfirmBack = () => {
    hitUpdaeEventApi();
  };

  const handleCancel = () => {
    setShowOverlay(false); // user cancels
    router.back();
  };

  return (
    <>
      <Stack>
        <Stack.Screen
          name="index"
          options={{
            headerShown: true,
            headerTitleAlign: "center",
            headerTitle: () => (
              <Text style={{ fontSize: 18, fontWeight: "bold" }}>
                {title !== undefined ? title : "Book Event"}
              </Text>
            ),
            headerLeft: () => (
              <TouchableOpacity
                style={{ marginLeft: 10 }}
                onPress={handleBackPress}
              >
                {/* You can use an icon here instead of text */}
                {Platform.OS === "ios" ? (
                  <ArrowLeft size={24} className="text-foreground" />
                ) : (
                  <Icon
                    name="arrow-back"
                    type="material"
                    size={24}
                    color="#239ED0"
                  />
                )}
              </TouchableOpacity>
            ),
          }}
        />
      </Stack>

      {/* Full-Screen Overlay View */}
      <Modal visible={showOverlay} transparent={true} animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.content}>
            <Text style={styles.message}>Have you joined the event ?</Text>
            <View style={styles.buttonRow}>
              <TouchableOpacity onPress={handleCancel}>
                <Text style={styles.buttonText}>No</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleConfirmBack}>
                <Text style={[styles.buttonText, { color: "#FF3B30" }]}>
                  Yes
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.85)",
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    backgroundColor: "white",
    padding: 24,
    borderRadius: 12,
    width: "80%",
    alignItems: "center",
  },
  message: {
    fontSize: 16,
    marginBottom: 20,
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "bold",
    marginHorizontal: 20,
    color: "#007AFF",
  },
});
