import React, { useState, useEffect } from "react";
import { View, ScrollView, Switch, TouchableOpacity } from "react-native";
import { Text } from "~/src/components/ui/text";
import { Input } from "~/src/components/ui/input";
import { useTheme } from "~/src/components/ThemeProvider";
import { User as AuthUser } from "@supabase/supabase-js";
import { X } from "lucide-react-native";

interface User extends AuthUser {
  first_name: string | null;
  last_name: string | null;
  username: string | null;
  avatar_url: string | null;
}

interface CreateCoCreatorSectionProps {
  isUserModelVisible: boolean;
  setIsUserModelVisible: (check: boolean) => void;
  selectedUsers: (selectedUsers: User[]) => void;
  onSelectedUsers: (users: User[]) => void;
}

export default function CreateCoCreatorSection({
  isUserModelVisible,
  setIsUserModelVisible,
  selectedUsers,
  onSelectedUsers,
}: CreateCoCreatorSectionProps) {
  const { theme } = useTheme();
  const [selectedUsersList, setSelectedUsersList] = useState<User[]>(
    selectedUsers ? selectedUsers : []
  );

  useEffect(() => {
    setSelectedUsersList(selectedUsers);
  }, [selectedUsers]);

  const toggleUserSelection = (user: User) => {
    let updatedUsers: User[];

    if (selectedUsersList.find((u) => u.id === user.id)) {
      updatedUsers = selectedUsersList.filter((u) => u.id !== user.id);
    } else {
      updatedUsers = [...selectedUsersList, user];
    }

    setSelectedUsersList(updatedUsers);
    onSelectedUsers(updatedUsers);
  };

  const getUserDisplayName = (user: User) => {
    const fullName = `${user.first_name || ""} ${user.last_name || ""}`.trim();
    return fullName || user.username || "Unknown User";
  };

  return (
    <View
      style={{
        backgroundColor: theme.dark
          ? "rgba(139, 92, 246, 0.1)"
          : "rgba(255, 255, 255, 0.8)",
        borderRadius: 32,
        padding: 42,
        borderWidth: 1,
        borderColor: theme.dark
          ? "rgba(139, 92, 246, 0.2)"
          : "rgba(139, 92, 246, 0.1)",
        shadowColor: "#8B5CF6",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: theme.dark ? 0.3 : 0.1,
        shadowRadius: 24,
        elevation: 12,
        marginBottom: 24,
      }}
    >
      <View style={{ marginBottom: 24 }}>
        <Text
          style={{
            fontSize: 22,
            fontWeight: "700",
            color: theme.colors.text,
            marginBottom: 8,
          }}
        >
          Co-creator
        </Text>
      </View>

      <TouchableOpacity
        onPress={() => setIsUserModelVisible(!isUserModelVisible)}
      >
        <Text
          style={{
            fontSize: 16,
            fontWeight: "600",
            color: theme.colors.text,
            marginBottom: 12,
          }}
        >
          Add +
        </Text>
      </TouchableOpacity>

      {/* Selected Users List */}
      <View className="flex-row flex-wrap gap-2">
        {selectedUsersList.map((user) => (
          <TouchableOpacity
            key={user.id}
            onPress={() => toggleUserSelection(user)}
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: `${theme.colors.primary}`,
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderRadius: 20,
              borderWidth: 1,
              borderColor: `${theme.colors.primary}30`,
            }}
          >
            <Text
              style={{
                color: theme.colors.text,
                fontWeight: "600",
                fontSize: 14,
                marginRight: 8,
              }}
            >
              {getUserDisplayName(user)}
            </Text>
            <X size={14} color={theme.colors.text} />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}
