import React, { useState, useEffect } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
  Dimensions,
} from "react-native";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import { useTheme } from "~/src/components/ThemeProvider";
import GlassPressable from "~/src/components/ui/GlassPressable";
import { FlagReason } from "~/hooks/useFlagging";
import Toast from "react-native-toast-message";
const { width, height } = Dimensions.get("window");

interface FlagContentModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (payload: {
    reason: FlagReason;
    explanation: string;
  }) => Promise<void> | void;
  loading?: boolean;

  contentTitle?: string;
  variant?: "center" | "sheet";
}
export interface Flags {
  label: string;
  value: FlagReason;
  description: string;
}
const REASON_OPTIONS: Flags[] = [
  {
    value: "inappropriate_content",
    label: "Inappropriate Content",
    description: "Content violates community guidelines",
  },
  {
    value: "spam",
    label: "Spam",
    description: "Spam or repetitive content",
  },
  {
    value: "misinformation",
    label: "Misinformation",
    description: "False or misleading information",
  },
  {
    value: "harassment",
    label: "Harassment",
    description: "Content promotes harassment",
  },
  {
    value: "fake_event",
    label: "Fake Event",
    description: "Event doesn't exist or is a scam",
  },
  {
    value: "wrong_location",
    label: "Wrong Location",
    description: "Location information is incorrect",
  },
  {
    value: "other",
    label: "Other",
    description: "Other reason (please explain)",
  },
];

export const FlagContentModal: React.FC<FlagContentModalProps> = ({
  visible,
  onClose,
  onSubmit,
  loading = false,

  contentTitle,
  variant = "center",
}) => {
  const { theme, isDarkMode } = useTheme();
  const isSmallDevice = width < 400;
  const [reason, setReason] = useState<FlagReason | "">("");
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [expandedReasons, setExpandedReasons] = useState(false);

  useEffect(() => {
    if (!visible) {
      setDetails("");
      setReason("");
      setExpandedReasons(false);
    }
  }, [visible]);

  const handleSubmit = async () => {
    if (!reason) return;
    const trimmedDetails = details.trim();
    if (reason === "other" && !trimmedDetails) {
      // Require details for "Other" reason
      return;
    }
    try {
      setSubmitting(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      await onSubmit({ reason, explanation: trimmedDetails });
      onClose();
    } catch (err) {
      console.error("Flag submit failed", err);
    } finally {
      setSubmitting(false);
    }
  };

  const backdrop = (
    <TouchableOpacity
      activeOpacity={1}
      onPress={onClose}
      style={styles.backdrop}
    />
  );

  return (
    <Modal
      animationType="fade"
      transparent
      visible={visible}
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        {backdrop}
        <View
          style={[
            styles.centerWrapper,
            variant === "sheet" && styles.sheetWrapper,
            { paddingHorizontal: isSmallDevice ? 14 : 20 },
          ]}
        >
          <GlassPressable
            borderRadius={24}
            baselineIntensity={30}
            pressIntensity={46}
            style={
              variant === "sheet"
                ? {
                    ...styles.modalOuter,
                    width: "100%",
                    borderRadius: 28,
                  }
                : {
                    ...styles.modalOuter,
                    width: isSmallDevice ? "86%" : "72%",
                    maxWidth: 520,
                  }
            }
          >
            <View
              style={[
                styles.modal,
                {
                  backgroundColor: isDarkMode
                    ? "rgba(20,20,22,0.85)"
                    : "rgba(255,255,255,0.85)",
                  // Sheet variant elevated shadow
                  ...(variant === "sheet"
                    ? {
                        borderTopLeftRadius: 32,
                        borderTopRightRadius: 32,
                        paddingBottom: 28,
                      }
                    : {}),
                },
              ]}
            >
              {/* Header */}
              <View style={styles.header}>
                <Text style={[styles.title, { color: theme.colors.text }]}>
                  Flag Content
                </Text>
                <TouchableOpacity
                  onPress={onClose}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                >
                  <Text style={{ color: theme.colors.text, fontSize: 16 }}>
                    ✕
                  </Text>
                </TouchableOpacity>
              </View>
              {contentTitle ? (
                <Text
                  style={[styles.subtitle, { color: theme.colors.text + "80" }]}
                  numberOfLines={2}
                >
                  Reporting: {contentTitle}
                </Text>
              ) : null}

              <ScrollView
                // Dynamic height: allow more space; sheet variant uses more vertical real estate
                style={{
                  maxHeight:
                    variant === "sheet"
                      ? Math.min(height * 0.65, 480)
                      : Math.min(height * 0.55, 380),
                }}
                contentContainerStyle={{ paddingBottom: 12 }}
              >
                {/* Reason selector */}
                <View>
                  <TouchableOpacity
                    style={[
                      styles.selector,
                      {
                        borderColor: isDarkMode
                          ? theme.colors.border + "80"
                          : theme.colors.border,
                        backgroundColor: isDarkMode
                          ? "rgba(255,255,255,0.06)"
                          : "rgba(0,0,0,0.04)",
                      },
                    ]}
                    onPress={() => setExpandedReasons(!expandedReasons)}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={{
                        color: reason
                          ? theme.colors.text
                          : theme.colors.text + "60",
                        fontWeight: "600",
                      }}
                    >
                      {REASON_OPTIONS.find((r) => r.value === reason)?.label ||
                        "Select a reason"}
                    </Text>
                    <Text
                      style={{ color: theme.colors.text + "60", fontSize: 12 }}
                    >
                      {expandedReasons ? "▲" : "▼"}
                    </Text>
                  </TouchableOpacity>
                  {expandedReasons && (
                    <View style={styles.reasonListWrapper}>
                      {REASON_OPTIONS.map((r) => {
                        const selected = r.value === reason;
                        return (
                          <TouchableOpacity
                            key={r.value}
                            style={[
                              styles.reasonItem,
                              {
                                backgroundColor: selected
                                  ? theme.colors.primary + "25"
                                  : "transparent",
                                borderColor: theme.colors.border,
                              },
                            ]}
                            activeOpacity={0.85}
                            onPress={() => {
                              setReason(r.value);
                              setExpandedReasons(false);
                              Haptics.selectionAsync().catch(() => {});
                            }}
                          >
                            <Text
                              style={{
                                color: theme.colors.text,
                                fontWeight: selected ? "600" : "500",
                              }}
                            >
                              {r.label}
                            </Text>
                            <Text
                              style={{
                                color: theme.colors.text + "60",
                                fontSize: 12,
                                marginTop: 2,
                              }}
                            >
                              {r.description}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )}
                </View>
                {/* Details */}
                <View style={{ marginTop: 14 }}>
                  <Text
                    style={{
                      color: theme.colors.text,
                      fontWeight: "600",
                      marginBottom: 6,
                    }}
                  >
                    Additional Details (Optional)
                  </Text>
                  <View
                    style={[
                      styles.textAreaWrapper,
                      {
                        borderColor: isDarkMode
                          ? theme.colors.border + "70"
                          : theme.colors.border,
                        backgroundColor: isDarkMode
                          ? "rgba(255,255,255,0.05)"
                          : "rgba(0,0,0,0.03)",
                      },
                    ]}
                  >
                    {isDarkMode && (
                      <BlurView
                        style={StyleSheet.absoluteFill}
                        intensity={28}
                        tint="dark"
                      />
                    )}
                    <TextInput
                      style={[styles.textArea, { color: theme.colors.text }]}
                      value={details}
                      onChangeText={setDetails}
                      placeholder="Please provide additional details..."
                      placeholderTextColor={theme.colors.text + "40"}
                      multiline
                      maxLength={800}
                    />
                    <Text
                      style={[
                        styles.counter,
                        { color: theme.colors.text + "50" },
                      ]}
                    >
                      {details.length}/800
                    </Text>
                  </View>
                </View>

                {/* Info Block */}
                <View
                  style={[
                    styles.infoBlock,
                    {
                      backgroundColor: isDarkMode
                        ? "rgba(255,255,255,0.08)"
                        : "rgba(0,0,0,0.05)",
                      borderColor: theme.colors.border,
                    },
                  ]}
                >
                  <Text
                    style={{
                      color: theme.colors.text,
                      fontWeight: "600",
                      marginBottom: 4,
                    }}
                  >
                    What happens next?
                  </Text>
                  <Text
                    style={{ color: theme.colors.text + "80", lineHeight: 18 }}
                  >
                    Your report will be reviewed by our moderation team. We take
                    all reports seriously and may take appropriate action if the
                    content violates our guidelines.
                  </Text>
                </View>
              </ScrollView>

              {/* Actions */}
              <View style={styles.actionsRow}>
                <TouchableOpacity
                  style={[
                    styles.button,
                    {
                      backgroundColor: isDarkMode
                        ? "rgba(255,255,255,0.1)"
                        : "rgba(0,0,0,0.06)",
                      borderColor: theme.colors.border,
                    },
                  ]}
                  onPress={onClose}
                  disabled={submitting}
                  accessibilityRole="button"
                  accessibilityLabel="Cancel flagging"
                >
                  <Text style={{ color: theme.colors.text, fontWeight: "600" }}>
                    Cancel
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.button,
                    {
                      backgroundColor: "#ff2d55",
                      borderColor: "#ff2d55",
                      opacity: submitting || loading ? 0.7 : 1,
                    },
                  ]}
                  onPress={handleSubmit}
                  disabled={submitting || loading}
                  accessibilityRole="button"
                  accessibilityLabel="Submit flag report"
                >
                  <Text style={{ color: "#fff", fontWeight: "600" }}>
                    {submitting || loading ? "Submitting…" : "Flag Content"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </GlassPressable>
        </View>
      </KeyboardAvoidingView>
      <Toast />
    </Modal>
  );
};

export default FlagContentModal;

const styles = StyleSheet.create({
  flex: { flex: 1 },
  backdrop: {
    ...StyleSheet.absoluteFillObject,

    backgroundColor: "rgba(0,0,0,0.45)",
  },
  centerWrapper: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "center",
    paddingVertical: 40,

    width: width,
  },
  sheetWrapper: {
    justifyContent: "flex-end",
    paddingVertical: 0,
    paddingBottom: 12,
    width: width + 40,
  },
  modalOuter: {
    width: "100%",
  },
  modal: {
    borderRadius: 24,
    paddingHorizontal: 22,
    paddingTop: 22,
    paddingBottom: 16,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
  },
  subtitle: {
    fontSize: 13,
    marginBottom: 12,
    fontWeight: "500",
  },
  selector: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
  },
  reasonListWrapper: {
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 10,
  },
  reasonItem: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  textAreaWrapper: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 12,
    minHeight: 140,
  },
  textArea: {
    minHeight: 90,
    fontSize: 14,
    textAlignVertical: "top",
  },
  counter: {
    position: "absolute",
    right: 12,
    bottom: 10,
    fontSize: 11,
  },
  infoBlock: {
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 18,
  },
  actionsRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
    marginTop: 8,
  },
  button: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
});
