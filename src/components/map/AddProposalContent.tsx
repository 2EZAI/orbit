import DateTimePicker from "@react-native-community/datetimepicker";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { ArrowLeft, Calendar, Clock, Plus } from "lucide-react-native";
import { MotiView } from "moti";
import { useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Keyboard,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useProposals } from "~/hooks/useProposals";
import { useTheme } from "../ThemeProvider";
import { Input } from "../ui/input";
import { UnifiedData } from "./UnifiedDetailsSheet";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
interface IProps {
  onBack: () => void;
  data: UnifiedData | undefined;
}
const AddProposalContent: React.FC<IProps> = ({ onBack, data }) => {
  const { theme, isDarkMode } = useTheme();
  const { loading, addProposal } = useProposals();
  const insets = useSafeAreaInsets();
  const [title, setTitle] = useState<string>("");
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState<boolean>(false);
  const [showTimePicker, setShowTimePicker] = useState<boolean>(false);
  const [isCreating, setIsCreating] = useState(false);

  const validateCheck = () => {
    return !!title.trim();
  };

  const handleBackPress = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onBack();
  };

  const handleCreateProposal = async () => {
    if (!validateCheck() || !data) return;

    setIsCreating(true);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const newProposal = await addProposal({
        title: title.trim(),
        start_datetime: startDate.toISOString(),
        events_attached: [
          { id: data.id, name: data.name, type: data.source || "database" },
        ],
      });

      if (newProposal) {
        await Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success
        );
        onBack();
      }
    } catch (error) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsCreating(false);
    }
  };

  const onOpenDatePicker = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Keyboard.dismiss();
    setShowDatePicker(true);
  };

  const onOpenTimePicker = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Keyboard.dismiss();
    setShowTimePicker(true);
  };
  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Premium Header */}
      <MotiView
        from={{ opacity: 0, translateY: -20 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: "timing", duration: 400 }}
        style={styles.headerContainer}
      >
        <LinearGradient
          colors={
            isDarkMode
              ? ["rgba(0,0,0,0.8)", "rgba(0,0,0,0.4)"]
              : ["rgba(255,255,255,0.9)", "rgba(255,255,255,0.6)"]
          }
          style={styles.headerGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
        >
          <BlurView intensity={20} style={styles.headerBlur}>
            <View style={styles.headerContent}>
              <MotiView
                from={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{
                  type: "spring",
                  damping: 15,
                  stiffness: 300,
                  delay: 100,
                }}
              >
                <TouchableOpacity
                  onPress={handleBackPress}
                  style={styles.backButton}
                  activeOpacity={0.7}
                >
                  <ArrowLeft size={24} color={theme.colors.text} />
                </TouchableOpacity>
              </MotiView>

              <MotiView
                from={{ opacity: 0, translateX: -10 }}
                animate={{ opacity: 1, translateX: 0 }}
                transition={{
                  type: "spring",
                  damping: 15,
                  stiffness: 300,
                  delay: 200,
                }}
              >
                <View style={styles.headerTextContainer}>
                  <Text
                    style={[styles.headerTitle, { color: theme.colors.text }]}
                  >
                    Create Proposal
                  </Text>
                  <Text
                    style={[
                      styles.headerSubtitle,
                      { color: theme.colors.text + "70" },
                    ]}
                  >
                    Plan your activity
                  </Text>
                </View>
              </MotiView>
            </View>
          </BlurView>
        </LinearGradient>
      </MotiView>

      {/* Content */}
      <View
        style={[styles.contentContainer, { paddingBottom: insets.bottom + 20 }]}
      >
        {/* Title Input */}
        <MotiView
          from={{ opacity: 0, translateY: 30 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: "timing", duration: 400, delay: 300 }}
          style={styles.inputContainer}
        >
          <Text style={[styles.inputLabel, { color: theme.colors.text }]}>
            Proposal Title
          </Text>
          <View
            style={[
              styles.inputWrapper,
              {
                backgroundColor: theme.colors.card,
                borderColor: theme.colors.border,
              },
            ]}
          >
            <Input
              value={title}
              onChangeText={setTitle}
              placeholder="Enter proposal title"
              style={[styles.input, { color: theme.colors.text }]}
              placeholderTextColor={theme.colors.text + "50"}
            />
          </View>
        </MotiView>

        {/* Date and Time Pickers */}
        <MotiView
          from={{ opacity: 0, translateY: 30 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: "timing", duration: 400, delay: 400 }}
          style={styles.pickerContainer}
        >
          <Text style={[styles.inputLabel, { color: theme.colors.text }]}>
            Date & Time
          </Text>

          <View style={styles.pickerRow}>
            {/* Date Picker */}
            <TouchableOpacity
              onPress={onOpenDatePicker}
              style={[
                styles.pickerButton,
                {
                  backgroundColor: theme.colors.card,
                  borderColor: theme.colors.border,
                },
              ]}
              activeOpacity={0.7}
            >
              <LinearGradient
                colors={["#8B5CF6", "#A855F7"]}
                style={styles.pickerIconContainer}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Calendar size={18} color="white" />
              </LinearGradient>
              <View style={styles.pickerTextContainer}>
                <Text
                  style={[
                    styles.pickerLabel,
                    { color: theme.colors.text + "70" },
                  ]}
                >
                  Date
                </Text>
                <Text
                  style={[styles.pickerValue, { color: theme.colors.text }]}
                >
                  {startDate.toLocaleDateString()}
                </Text>
              </View>
            </TouchableOpacity>

            {/* Time Picker */}
            <TouchableOpacity
              onPress={onOpenTimePicker}
              style={[
                styles.pickerButton,
                {
                  backgroundColor: theme.colors.card,
                  borderColor: theme.colors.border,
                },
              ]}
              activeOpacity={0.7}
            >
              <LinearGradient
                colors={["#10B981", "#059669"]}
                style={styles.pickerIconContainer}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Clock size={18} color="white" />
              </LinearGradient>
              <View style={styles.pickerTextContainer}>
                <Text
                  style={[
                    styles.pickerLabel,
                    { color: theme.colors.text + "70" },
                  ]}
                >
                  Time
                </Text>
                <Text
                  style={[styles.pickerValue, { color: theme.colors.text }]}
                >
                  {startDate.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </MotiView>

        {/* Create Button */}
        <MotiView
          from={{ opacity: 0, translateY: 30 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: "timing", duration: 400, delay: 500 }}
          style={styles.buttonContainer}
        >
          <TouchableOpacity
            onPress={handleCreateProposal}
            disabled={!validateCheck() || isCreating}
            activeOpacity={0.8}
            style={styles.createButton}
          >
            <MotiView
              animate={{
                scale: validateCheck() ? 1 : 0.95,
                opacity: validateCheck() ? 1 : 0.6,
              }}
              transition={{ type: "timing", duration: 200 }}
            >
              <LinearGradient
                colors={
                  validateCheck()
                    ? ["#8B5CF6", "#A855F7"]
                    : ["#6B7280", "#9CA3AF"]
                }
                style={styles.buttonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                {isCreating ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <View style={styles.buttonContent}>
                    <Plus size={20} color="white" />
                    <Text style={styles.buttonText}>Create Proposal</Text>
                  </View>
                )}
              </LinearGradient>
            </MotiView>
          </TouchableOpacity>
        </MotiView>

        {/* Date Picker Modal */}
        {showDatePicker && (
          <DateTimePicker
            value={startDate}
            mode="date"
            display={Platform.OS === "ios" ? "spinner" : "default"}
            onChange={(event, selectedDate) => {
              setShowDatePicker(false);
              if (selectedDate) {
                setStartDate(selectedDate);
              }
            }}
          />
        )}

        {/* Time Picker Modal */}
        {showTimePicker && (
          <DateTimePicker
            value={startDate}
            mode="time"
            display={Platform.OS === "ios" ? "spinner" : "default"}
            onChange={(event, selectedTime) => {
              setShowTimePicker(false);
              if (selectedTime) {
                setStartDate(selectedTime);
              }
            }}
          />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "transparent",
  },

  // Header Styles
  headerContainer: {
    position: "relative",
    zIndex: 1000,
  },
  headerGradient: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerBlur: {
    borderRadius: 0,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(139, 92, 246, 0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    fontWeight: "500",
  },

  // Content Styles
  contentContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
    gap: 24,
  },

  // Input Styles
  inputContainer: {
    marginBottom: 8,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
  },
  inputWrapper: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  input: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    fontSize: 16,
    backgroundColor: "transparent",
    borderWidth: 0,
  },

  // Picker Styles
  pickerContainer: {
    marginBottom: 8,
  },
  pickerRow: {
    flexDirection: "row",
    gap: 12,
  },
  pickerButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  },
  pickerIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  pickerTextContainer: {
    flex: 1,
  },
  pickerLabel: {
    fontSize: 12,
    fontWeight: "500",
    marginBottom: 4,
  },
  pickerValue: {
    fontSize: 16,
    fontWeight: "600",
  },

  // Button Styles
  buttonContainer: {
    marginTop: 20,
  },
  createButton: {
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#8B5CF6",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 12,
  },
  buttonGradient: {
    height: 56,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "white",
    letterSpacing: -0.2,
  },
});

export default AddProposalContent;
