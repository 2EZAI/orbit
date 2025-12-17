import { Flag, MoreHorizontal, Trash2, X } from "lucide-react-native";
import React, { useState } from "react";
import {
    StyleSheet,
    TouchableOpacity,
    View
} from "react-native";
import { useTheme } from "~/src/components/ThemeProvider";

interface PostMenuDropdownProps {
  postId: string;
  isOwner: boolean;
  onDelete?: (postId: string) => void;
  onReport?: (postId: string) => void;
}

export function PostMenuDropdown({
  postId,
  isOwner,
  onDelete,
  onReport,
}: PostMenuDropdownProps) {
  const { isDarkMode } = useTheme();
  const [showMenu, setShowMenu] = useState(false);

  const handleDelete = () => {
    setShowMenu(false);
    onDelete?.(postId);
  };

  const handleReport = () => {
    setShowMenu(false);
    onReport?.(postId);
  };

  // Don't show menu for owner's posts unless delete is available
  if (isOwner && !onDelete) {
    return null;
  }

  // Don't show menu for non-owner posts if report is not available
  if (!isOwner && !onReport) {
    return null;
  }

  if (showMenu) {
    return (
      <View style={styles.container}>
        {isOwner && onDelete && (
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={handleDelete}
            activeOpacity={0.7}
          >
            <Trash2 size={18} color="#ef4444" />
          </TouchableOpacity>
        )}
        {!isOwner && onReport && (
          <TouchableOpacity
            style={styles.reportButton}
            onPress={handleReport}
            activeOpacity={0.7}
          >
            <Flag size={18} color="#ef4444" />
          </TouchableOpacity>
        )}
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
  reportButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: "rgba(239, 68, 68, 0.1)",
  },
  closeButton: {
    padding: 8,
  },
});
