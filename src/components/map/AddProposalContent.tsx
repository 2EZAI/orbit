import DateTimePicker from "@react-native-community/datetimepicker";
import { ArrowLeft, Calendar, Clock } from "lucide-react-native";
import { useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Icon } from "react-native-elements";
import { useProposals } from "~/hooks/useProposals";
import { useTheme } from "../ThemeProvider";
import { Input } from "../ui/input";
import { UnifiedData } from "./UnifiedDetailsSheet";
interface IProps {
  onBack: () => void;
  data: UnifiedData | undefined;
}
const AddProposalContent: React.FC<IProps> = ({ onBack, data }) => {
  console.log("AddProposalContent data:", data);
  const { theme } = useTheme();
  const { loading, addProposal } = useProposals();
  const [title, setTitle] = useState<string>("");
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState<boolean>(false);
  const [showTimePicker, setShowTimePicker] = useState<boolean>(false);
  const validateCheck = () => {
    return !!title.trim();
  };
  const handleCreateProposal = async () => {
    if (!validateCheck() || !data) return;
    const newProposal = await addProposal({
      title: title.trim(),
      start_datetime: startDate.toISOString(),
      events_attached: [
        { id: data.id, name: data.name, type: data.type || "event" },
      ],
    });
    console.log("New Proposal Created:", newProposal);
    if (newProposal) {
      onBack();
    }
  };
  const onOpenDatePicker = () => {
    Keyboard.dismiss();
    setShowDatePicker(true);
  };
  const onOpenTimePicker = () => {
    Keyboard.dismiss();
    setShowTimePicker(true);
  };
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => onBack()} className="mr-3">
            <ArrowLeft size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text
            style={{
              fontSize: 20,
              fontWeight: "700",
              color: theme.colors.text,
            }}
          >
            Add Proposal
          </Text>
        </View>
        <View>
          <Text
            style={{
              fontSize: 16,
              fontWeight: "600",
              color: theme.colors.text,
              marginBottom: 8,
            }}
          >
            Title
          </Text>
          <View
            style={{
              backgroundColor: theme.colors.card,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: theme.colors.border,
            }}
          >
            <Input
              value={title}
              onChangeText={setTitle}
              placeholder="Enter title"
              style={{
                paddingHorizontal: 16,
                paddingVertical: 10,
                fontSize: 16,
                color: theme.colors.text,
                backgroundColor: "transparent",
                borderWidth: 0,
              }}
              placeholderTextColor={theme.colors.text + "60"}
            />
          </View>
        </View>
        <View>
          <View style={styles.dateContainer}>
            <Text
              style={{
                fontSize: 16,
                fontWeight: "600",
                color: theme.colors.text,
              }}
            >
              Start Time
            </Text>

            <View style={styles.clockIcon}>
              {Platform.OS === "ios" ? (
                <Clock size={18} color="#8B5CF6" />
              ) : (
                <Icon
                  name="clock-outline"
                  type="material-community"
                  size={18}
                  color="#8B5CF6"
                />
              )}
            </View>
          </View>

          <View style={{ gap: 12 }}>
            <TouchableOpacity
              onPress={() => onOpenDatePicker()}
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                padding: 12,
                borderRadius: 12,
                borderWidth: 1,
                backgroundColor: theme.dark
                  ? "rgba(255, 255, 255, 0.05)"
                  : "rgba(255, 255, 255, 0.7)",
                borderColor: theme.dark
                  ? "rgba(139, 92, 246, 0.2)"
                  : "rgba(139, 92, 246, 0.15)",
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                {Platform.OS === "ios" ? (
                  <Calendar
                    size={20}
                    color={theme.colors.text + "66"}
                    style={{ marginRight: 12 }}
                  />
                ) : (
                  <Icon
                    name="calendar-outline"
                    type="material-community"
                    size={20}
                    color={theme.colors.text + "66"}
                    style={{ marginRight: 12 }}
                  />
                )}
                <Text style={{ color: theme.colors.text }}>Date</Text>
              </View>
              <Text style={{ color: "#8B5CF6", fontWeight: "600" }}>
                {startDate?.toLocaleDateString()}
              </Text>
            </TouchableOpacity>
            {showDatePicker && (
              <DateTimePicker
                themeVariant="light"
                value={startDate}
                minimumDate={new Date()}
                mode={"date"}
                onChange={(event, date) => {
                  if (event.type === "dismissed") {
                    setShowDatePicker(false);
                  } else if (date) {
                    setShowDatePicker(Platform.OS === "ios");

                    setStartDate(date);
                  }
                }}
              />
            )}
            <TouchableOpacity
              onPress={() => onOpenTimePicker()}
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                padding: 12,
                borderRadius: 12,
                borderWidth: 1,
                backgroundColor: theme.dark
                  ? "rgba(255, 255, 255, 0.05)"
                  : "rgba(255, 255, 255, 0.7)",
                borderColor: theme.dark
                  ? "rgba(139, 92, 246, 0.2)"
                  : "rgba(139, 92, 246, 0.15)",
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                {Platform.OS === "ios" ? (
                  <Clock
                    size={20}
                    color={theme.colors.text + "66"}
                    style={{ marginRight: 12 }}
                  />
                ) : (
                  <Icon
                    name="clock-outline"
                    type="material-community"
                    size={20}
                    color={theme.colors.text + "66"}
                    style={{ marginRight: 12 }}
                  />
                )}
                <Text style={{ color: theme.colors.text }}>Time</Text>
              </View>
              <Text style={{ color: "#8B5CF6", fontWeight: "600" }}>
                {startDate.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </Text>
            </TouchableOpacity>
            {showTimePicker && (
              <DateTimePicker
                themeVariant="light"
                value={startDate}
                minimumDate={new Date()}
                mode={"time"}
                onChange={(event, date) => {
                  if (event.type === "dismissed") {
                    setShowTimePicker(false);
                  } else if (date) {
                    setShowTimePicker(Platform.OS === "ios");

                    setStartDate(date);
                  }
                }}
              />
            )}
          </View>
        </View>
      </View>
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          onPress={handleCreateProposal}
          disabled={loading || !validateCheck()}
          style={{
            flex: 1,
            height: 50,
            backgroundColor: validateCheck() ? "#8B5CF6" : "transparent",
            borderRadius: 16,
            borderWidth: 1,
            borderColor: validateCheck() ? "#8B5CF6" : theme.colors.text + "20",
            justifyContent: "center",
            alignItems: "center",
            shadowColor: "#8B5CF6",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 12,
            elevation: 8,
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? (
            <ActivityIndicator color="white" size="small" />
          ) : (
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "700",
                  color: validateCheck() ? "white" : theme.colors.text + "40",

                  marginRight: 8,
                }}
              >
                {"Create Proposal"}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};
export default AddProposalContent;
const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,

    paddingBottom: 20,
  },
  content: {
    flex: 1,
    gap: 20,
  },
  dateContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 5,
  },
  clockIcon: {
    justifyContent: "center",
    alignItems: "center",
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(139, 92, 246, 0.1)",
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 16,
  },
});
