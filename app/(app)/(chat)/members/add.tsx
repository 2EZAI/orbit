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
import { supabase } from "~/src/lib/supabase";
import { useAuth } from "~/src/lib/auth";

interface DatabaseUser {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  username: string | null;
  avatar_url: string | null;
}

export default function AddMembersScreen() {
  const router = useRouter();
  const { client } = useChat();
  const { channelId } = useLocalSearchParams();
  const { theme } = useTheme();
  const { session } = useAuth();
  const [allUsers, setAllUsers] = useState<DatabaseUser[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<DatabaseUser[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Check if multiple users exist in Stream Chat (batch query with retry logic)
  const checkUsersExistInStream = async (userIds: string[]): Promise<Set<string>> => {
    if (!client || userIds.length === 0) return new Set();
    
    try {
      // Query multiple users at once to avoid rate limiting
      const response = await client.queryUsers({
        id: { $in: userIds }
      });
      
      // Return set of user IDs that exist in Stream Chat
      return new Set(response.users.map(user => user.id));
    } catch (error) {
      console.warn("Error checking users in Stream Chat:", error);
      
      // If rate limited, wait a bit and try with smaller batches
      if (error.message?.includes("Too many requests")) {
        console.log("Rate limited, trying smaller batches...");
        return await checkUsersInBatches(userIds);
      }
      
      // For other errors, return empty set (safer to exclude all than include invalid ones)
      return new Set();
    }
  };

  // Check users in smaller batches to avoid rate limiting
  const checkUsersInBatches = async (userIds: string[]): Promise<Set<string>> => {
    const batchSize = 10; // Smaller batches
    const validUserIds = new Set<string>();
    
    for (let i = 0; i < userIds.length; i += batchSize) {
      const batch = userIds.slice(i, i + batchSize);
      
      try {
        // Wait a bit between batches to avoid rate limiting
        if (i > 0) {
          await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
        }
        
        const response = await client.queryUsers({
          id: { $in: batch }
        });
        
        response.users.forEach(user => validUserIds.add(user.id));
        console.log(`Batch ${Math.floor(i/batchSize) + 1}: Found ${response.users.length} valid users`);
      } catch (error) {
        console.warn(`Batch ${Math.floor(i/batchSize) + 1} failed:`, error);
        // Continue with next batch even if one fails
      }
    }
    
    return validUserIds;
  };

  // Fetch all users from Supabase
  useEffect(() => {
    const loadUsers = async () => {
      try {
        if (!session?.user?.id) return;

        // Get existing channel members from Stream Chat
        let existingMemberIds: string[] = [];
        if (client && channelId) {
          try {
            const channel = client.channel("messaging", channelId as string);
            const members = await channel.queryMembers({});
            existingMemberIds = members.members
              .map((m) => m.user_id)
              .filter((id): id is string => id !== undefined);
          } catch (error) {
            console.warn("Could not fetch channel members:", error);
          }
        }

        // Fetch all users from Supabase
        const excludeEmails = ["orbit@gmail.com"];
        const formatted = `(${excludeEmails
          .map((email) => `"${email}"`)
          .join(",")})`;
        
        const { data: users, error } = await supabase
          .from("users")
          .select("id, email, first_name, last_name, username, avatar_url")
          .neq("id", session.user.id) // Exclude current user
          .not("email", "in", formatted) // Exclude specific emails
          .order("first_name");

        if (error) {
          console.error("Failed to fetch users:", error);
          return;
        }

        // Filter out users who are already in the channel
        const usersNotInChannel = users?.filter(
          (user) => !existingMemberIds.includes(user.id)
        ) || [];

        // Check which users exist in Stream Chat (batch query)
        console.log("Checking Stream Chat existence for", usersNotInChannel.length, "users...");
        const userIds = usersNotInChannel.map(user => user.id);
        const validUserIds = await checkUsersExistInStream(userIds);
        
        // Filter to only include users that exist in Stream Chat
        let validUsers = usersNotInChannel.filter(user => validUserIds.has(user.id));
        
        // If we got no valid users due to rate limiting, show a warning but still show some users
        if (validUsers.length === 0 && usersNotInChannel.length > 0) {
          console.warn("No users verified in Stream Chat due to rate limiting. Showing all users (may include some invalid ones).");
          // Show first 20 users as a fallback to avoid completely empty list
          validUsers = usersNotInChannel.slice(0, 20);
        }
        
        console.log(`Found ${validUsers.length} valid users out of ${usersNotInChannel.length} total users`);
        setAllUsers(validUsers);
        setFilteredUsers(validUsers);
      } catch (error) {
        console.error("Failed to load users:", error);
      } finally {
        setLoading(false);
      }
    };

    loadUsers();
  }, [session?.user?.id, client, channelId]);

  // Filter users based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredUsers(allUsers);
      return;
    }

    const searchTerm = searchQuery.toLowerCase();
    const filtered = allUsers.filter((user) => {
      const fullName = `${user.first_name || ""} ${
        user.last_name || ""
      }`.toLowerCase();
      const username = (user.username || "").toLowerCase();
      const email = (user.email || "").toLowerCase();

      return (
        fullName.includes(searchTerm) ||
        username.includes(searchTerm) ||
        email.includes(searchTerm)
      );
    });

    setFilteredUsers(filtered);
  }, [searchQuery, allUsers]);

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

  const getUserDisplayName = (user: DatabaseUser) => {
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

    // Fall back to email (without domain)
    if (user.email) {
      return user.email.split("@")[0];
    }

    // Last resort: use "User"
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
          data={filteredUsers}
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
          ListEmptyComponent={
            <View
              style={{
                flex: 1,
                justifyContent: "center",
                alignItems: "center",
                padding: 32,
              }}
            >
              <Text
                style={{
                  fontSize: 16,
                  color: theme.colors.text,
                  opacity: 0.7,
                  textAlign: "center",
                }}
              >
                {searchQuery.trim()
                  ? "No users found matching your search"
                  : "No users available to add"}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}
