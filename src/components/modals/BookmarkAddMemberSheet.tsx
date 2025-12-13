import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  TouchableOpacity,
  View,
} from "react-native";
import { Search } from "lucide-react-native";
import { useUserSearch, UserListItem } from "~/hooks/useUserList";
import { UserAvatar } from "../ui/user-avatar";
import { Text } from "../ui/text";
import { useTheme } from "../ThemeProvider";
import { Sheet } from "../ui/sheet";
import { Input } from "../ui/input";

interface BookmarkAddMemberSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm?: (user: UserListItem) => void | Promise<void>;
  confirmLabel?: string;
}

const BookmarkAddMemberSheet: React.FC<BookmarkAddMemberSheetProps> = ({
  isOpen,
  onClose,
  onConfirm,
  confirmLabel = "Add to collection",
}) => {
  const { theme } = useTheme();
  const [searchQuery, setSearchQuery] = useState(" ");
  const [searchInput, setSearchInput] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserListItem | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(searchInput.trim() || " ");
    }, 300);

    return () => clearTimeout(timer);
  }, [searchInput]);

  const {
    users,
    loading: isSearching,
    total,
  } = useUserSearch({
    q: searchQuery,
    limit: 50,
  });

  const getDisplayName = (user: UserListItem) => {
    if (user.first_name || user.last_name) {
      return `${user.first_name || ""} ${user.last_name || ""}`.trim();
    }
    return user.username || "Anonymous";
  };

  const getSubtitle = (user: UserListItem) => {
    return user.username || user.email || "";
  };

  const handleSelectUser = (user: UserListItem) => {
    setSelectedUser(user);
  };

  const handleConfirm = async () => {
    if (!selectedUser || !onConfirm) return;
    await onConfirm(selectedUser);
    setSelectedUser(null);
    onClose();
  };

  const renderUserItem = ({ item }: { item: UserListItem }) => {
    const isSelected = selectedUser?.id === item.id;

    return (
      <TouchableOpacity
        onPress={() => handleSelectUser(item)}
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingVertical: 12,
          paddingHorizontal: 12,
          backgroundColor: theme.colors.card,
          borderRadius: 12,
          marginBottom: 10,
          borderWidth: isSelected ? 2 : 1,
          borderColor: isSelected ? theme.colors.primary : theme.colors.border,
        }}
      >
        <UserAvatar
          size={48}
          user={{
            id: item.id,
            name: getDisplayName(item),
            image: item.avatar_url,
          }}
        />
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text
            style={{
              fontSize: 16,
              fontWeight: "600",
              color: theme.colors.text,
              marginBottom: 2,
            }}
          >
            {getDisplayName(item)}
          </Text>
          {getSubtitle(item) ? (
            <Text
              style={{
                fontSize: 13,
                color: theme.colors.text + "80",
              }}
              numberOfLines={1}
            >
              {getSubtitle(item)}
            </Text>
          ) : null}
        </View>

        {/* Selection indicator */}
        <View
          style={{
            width: 20,
            height: 20,
            borderRadius: 10,
            borderWidth: isSelected ? 0 : 2,
            borderColor: theme.colors.border,
            backgroundColor: isSelected ? theme.colors.primary : "transparent",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {isSelected && (
            <Text
              style={{
                color: "white",
                fontSize: 12,
                fontWeight: "700",
              }}
            >
              ✓
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const availableCount = users.length;

  return (
    <Sheet isOpen={isOpen} onClose={onClose} expanded isScrollable={false}>
      {/* Search field */}
      <View
        style={{
          paddingHorizontal: 16,
          paddingTop: 4,
          paddingBottom: 12,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            borderRadius: 999,
            paddingHorizontal: 14,
            paddingVertical: 10,
            backgroundColor: theme.colors.border + "40",
          }}
        >
          <Search size={18} color={theme.colors.text + "70"} />
          <Input
            value={searchInput}
            onChangeText={setSearchInput}
            placeholder="Search by name or username"
            placeholderTextColor={theme.colors.text + "50"}
            style={{
              flex: 1,
              marginLeft: 8,
              borderWidth: 0,
              backgroundColor: "transparent",
              color: theme.colors.text,
            }}
          />
        </View>
      </View>

      {/* Header row: Available People + count */}
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          paddingHorizontal: 16,
          marginBottom: 8,
        }}
      >
        <Text
          style={{
            fontSize: 15,
            fontWeight: "600",
            color: theme.colors.text,
          }}
        >
          Available People
        </Text>
        <Text
          style={{
            fontSize: 13,
            color: theme.colors.text + "80",
          }}
        >
          {availableCount} {availableCount === 1 ? "person" : "people"}
        </Text>
      </View>

      {/* List / Empty state */}
      <View style={{ flex: 1, paddingHorizontal: 16, paddingBottom: 16 }}>
        {isSearching ? (
          <View
            style={{
              alignItems: "center",
              justifyContent: "center",
              paddingVertical: 32,
            }}
          >
            <ActivityIndicator size="small" color={theme.colors.primary} />
            <Text
              style={{
                marginTop: 8,
                color: theme.colors.text + "70",
                fontSize: 13,
              }}
            >
              Searching people...
            </Text>
          </View>
        ) : availableCount === 0 ? (
          <View
            style={{
              flex: 1,
              alignItems: "center",
              justifyContent: "center",
              paddingVertical: 40,
            }}
          >
            <Text
              style={{
                color: theme.colors.text + "70",
                fontSize: 14,
              }}
            >
              No users available
            </Text>
          </View>
        ) : (
          <FlatList
            data={users}
            keyExtractor={(item) => item.id}
            renderItem={renderUserItem}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 8 }}
          />
        )}
      </View>

      {/* Footer buttons */}
      <View
        style={{
          paddingHorizontal: 16,
          paddingBottom: 16,
          gap: 8,
        }}
      >
        <TouchableOpacity
          disabled={!selectedUser}
          onPress={handleConfirm}
          style={{
            borderRadius: 999,
            paddingVertical: 12,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: selectedUser
              ? theme.colors.primary
              : theme.colors.primary + "50",
          }}
        >
          <Text
            style={{
              color: "white",
              fontWeight: "600",
              fontSize: 15,
            }}
          >
            {confirmLabel}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={onClose}
          style={{
            borderRadius: 999,
            paddingVertical: 12,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: theme.colors.card,
            borderWidth: 1,
            borderColor: theme.colors.border,
          }}
        >
          <Text
            style={{
              color: theme.colors.text,
              fontWeight: "600",
              fontSize: 15,
            }}
          >
            Cancel
          </Text>
        </TouchableOpacity>
      </View>
    </Sheet>
  );
};

export default BookmarkAddMemberSheet;
