import {
  View,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from "react-native";
import { useState, useEffect, useCallback } from "react";
import { Stack, useRouter, useLocalSearchParams } from "expo-router";
import { useChat } from "~/src/lib/chat";
import { Text } from "~/src/components/ui/text";
import { Check, X, Search } from "lucide-react-native";
import { Icon } from "react-native-elements";
import { TextInput } from "react-native";
import type { UserResponse } from "stream-chat";
import { useTheme } from "~/src/components/ThemeProvider";

export default function AddMembersScreen() {
  const router = useRouter();
  const { client } = useChat();
  const { channelId } = useLocalSearchParams();
  const { theme } = useTheme();
  const [users, setUsers] = useState<UserResponse[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const loadUsers = async () => {
      try {
        if (!client) return;

        // Query users excluding those already in the channel
        const channel = client.channel("messaging", channelId as string);
        const members = await channel.queryMembers({});
        const existingMemberIds = members.members
          .map((m) => m.user_id)
          .filter((id): id is string => id !== undefined);

        const response = await client.queryUsers(
          {
            id: { $nin: existingMemberIds },
            $or: [
              { name: { $autocomplete: searchQuery } },
              { username: { $autocomplete: searchQuery } },
              { first_name: { $autocomplete: searchQuery } },
              { last_name: { $autocomplete: searchQuery } },
            ],
          },
          { id: 1 },
          { limit: 100 }
        );

        setUsers(response.users);
      } catch (error) {
        console.error("Failed to load users:", error);
      } finally {
        setLoading(false);
      }
    };

    loadUsers();
  }, [client, searchQuery, channelId]);

  const handleUserSelect = useCallback((userId: string) => {
    setSelectedUsers((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  }, []);

  const handleAddMembers = useCallback(async () => {
    try {
      if (!client || !channelId || selectedUsers.size === 0) return;

      const channel = client.channel("messaging", channelId as string);
      await channel.addMembers(Array.from(selectedUsers));
      router.back();
    } catch (error) {
      console.error("Failed to add members:", error);
    }
  }, [client, channelId, selectedUsers, router]);

  const getUserDisplayName = (user: any) => {
    // Try to build full name from first_name and last_name
    const firstName = user.first_name || "";
    const lastName = user.last_name || "";
    const fullName = `${firstName} ${lastName}`.trim();

    if (fullName) {
      return fullName;
    }

    // Fall back to username
    if (user.username) {
      return user.username;
    }

    // Fall back to name property
    if (user.name && user.name !== user.id) {
      return user.name;
    }

    // Last resort: use "User" instead of email/id
    return "Unknown User";
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.card }}>
      <Stack.Screen
        options={{
          title: "Add Members",
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => router.back()}
              style={{ marginLeft: 16 }}
            >
              {Platform.OS == "ios" ? (
                <X size={24} color={theme.colors.primary} />
              ) : (
                <Icon
                  name="close"
                  type="material-community"
                  size={24}
                  color={theme.colors.primary}
                />
              )}
            </TouchableOpacity>
          ),
          headerRight: () => (
            <TouchableOpacity
              onPress={handleAddMembers}
              disabled={selectedUsers.size === 0}
              style={{
                marginRight: 16,
                opacity: selectedUsers.size === 0 ? 0.5 : 1,
              }}
            >
              <Text style={{ color: theme.colors.primary, fontSize: 17 }}>
                Add
              </Text>
            </TouchableOpacity>
          ),
        }}
      />

      <View style={{ padding: 16 }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: theme.colors.border,
            borderRadius: 10,
            padding: 8,
            marginBottom: 16,
          }}
        >
          {Platform.OS == "ios" ? (
            <Search
              size={20}
              color={theme.colors.text + "80"}
              style={{ marginRight: 8 }}
            />
          ) : (
            <Icon
              name="Search"
              type="material-community"
              size={20}
              color={theme.colors.primary}
            />
          )}
          <TextInput
            placeholder="Search users..."
            placeholderTextColor={theme.colors.text + "60"}
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={{ flex: 1, color: theme.colors.text }}
          />
        </View>
      </View>

      {loading ? (
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <ActivityIndicator size="large" />
        </View>
      ) : (
        <FlatList
          data={users}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => handleUserSelect(item.id)}
              style={{
                flexDirection: "row",
                alignItems: "center",
                padding: 16,
                borderBottomWidth: 1,
                borderBottomColor: theme.colors.border,
              }}
            >
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 16, color: theme.colors.text }}>
                  {getUserDisplayName(item)}
                </Text>
                {item.username && (
                  <Text
                    style={{
                      fontSize: 14,
                      color: theme.colors.text + "80",
                      marginTop: 2,
                    }}
                  >
                    @{item.username}
                  </Text>
                )}
              </View>
              {selectedUsers.has(item.id) && (
                <Check size={24} color={theme.colors.primary} />
              )}
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}
