import React from "react";
import { Modal, StyleSheet, TouchableOpacity, View } from "react-native";
import { useTheme } from "~/src/components/ThemeProvider";
import { Text } from "~/src/components/ui/text";

interface CommentActionSheetProps {
  visible: boolean;
  onClose: () => void;
  onReport: () => void;
}

export function CommentActionSheet({
  visible,
  onClose,
  onReport,
}: CommentActionSheetProps) {
  const { theme, isDarkMode } = useTheme();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <View
          style={[
            styles.container,
            {
              backgroundColor: isDarkMode
                ? "rgba(20, 20, 22, 0.98)"
                : "rgba(255, 255, 255, 0.98)",
            },
          ]}
        >
          <TouchableOpacity
            style={[
              styles.actionItem,
              {
                borderBottomWidth: StyleSheet.hairlineWidth,
                borderBottomColor: theme.colors.border,
              },
            ]}
            onPress={() => {
              onClose();
              onReport();
            }}
          >
            <Text
              style={[
                styles.actionText,
                { color: "#ff2d55", fontWeight: "600" },
              ]}
            >
              Report
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionItem} onPress={onClose}>
            <Text style={[styles.actionText, { color: theme.colors.text }]}>
              Cancel
            </Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  container: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 40,
    paddingTop: 8,
  },
  actionItem: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: "center",
  },
  actionText: {
    fontSize: 18,
  },
});


