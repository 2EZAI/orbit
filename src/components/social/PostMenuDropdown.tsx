import { MoreHorizontal, Trash2, X } from "lucide-react-native";
import React, { useState } from "react";
import {
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { useTheme } from "~/src/components/ThemeProvider";
import { Text } from "~/src/components/ui/text";

interface PostMenuDropdownProps {
  postId: string;
  isOwner: boolean;
  onDelete: (postId: string) => void;
}

export function PostMenuDropdown({
  postId,
  isOwner,
  onDelete,
}: PostMenuDropdownProps) {
  const { theme, isDarkMode } = useTheme();
  const [showMenu, setShowMenu] = useState(false);

  const handleDelete = () => {
    setShowMenu(false);
    onDelete(postId);
  };

  if (!isOwner) {
    return null;
  }

  if (showMenu) {
    return (
      <View style={styles.container}>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={handleDelete}
          activeOpacity={0.7}
        >
          <Trash2 size={18} color="#ef4444" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={() => setShowMenu(false)}
          activeOpacity={0.7}
        >
          <X size={18} color={isDarkMode ? "#9CA3AF" : "#6B7280"} />
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <TouchableOpacity
      onPress={() => setShowMenu(true)}
      style={styles.menuButton}
      activeOpacity={0.7}
    >
      <MoreHorizontal
        size={20}
        color={isDarkMode ? "#9CA3AF" : "#6B7280"}
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  menuButton: {
    padding: 8,
  },
  deleteButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: "rgba(239, 68, 68, 0.1)",
  },
  closeButton: {
    padding: 8,
  },
});
