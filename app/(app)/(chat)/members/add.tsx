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

export default function AddMembersScreen() {
  const router = useRouter();
  const { client } = useChat();
  const { channelId } = useLocalSearchParams();
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
              { id: { $autocomplete: searchQuery } },
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

  return (
    <View style={{ flex: 1, backgroundColor: "white" }}>
      <Stack.Screen
        options={{
          title: "Add Members",
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => router.back()}
              style={{ marginLeft: 16 }}
            >
              {Platform.OS == "ios" ? (
                <X size={24} color="#007AFF" />
              ) : (
                <Icon
                  name="close"
                  type="material-community"
                  size={24}
                  color="#239ED0"
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
              <Text style={{ color: "#007AFF", fontSize: 17 }}>Add</Text>
            </TouchableOpacity>
          ),
        }}
      />

      <View style={{ padding: 16 }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: "rgba(139, 92, 246, 0.1)",
            borderRadius: 10,
            padding: 8,
            marginBottom: 16,
          }}
        >
          {Platform.OS == "ios" ? (
            <Search size={20} color="#666" style={{ marginRight: 8 }} />
          ) : (
            <Icon
              name="Search"
              type="material-community"
              size={20}
              color="#239ED0"
            />
          )}
          <TextInput
            placeholder="Search users..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={{ flex: 1 }}
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
                borderBottomColor: "#f0f0f0",
              }}
            >
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 16 }}>{item.name || item.id}</Text>
              </View>
              {selectedUsers.has(item.id) && (
                <Check size={24} color="#007AFF" />
              )}
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}
