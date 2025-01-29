import { useState, useEffect } from "react";
import { SafeAreaView, View, FlatList } from "react-native";
import { useChat } from "~/src/lib/chat";
import { useRouter } from "expo-router";
import { supabase } from "~/src/lib/supabase";
import { User as AuthUser } from "@supabase/supabase-js";
import { Users, Search, X } from "lucide-react-native";
import { Input } from "~/src/components/ui/input";
import { Button } from "~/src/components/ui/button";
import { Text } from "~/src/components/ui/text";
import { Card, CardContent } from "~/src/components/ui/card";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "~/src/components/ui/avatar";

interface User extends AuthUser {
  first_name: string | null;
  last_name: string | null;
  username: string | null;
  avatar_url: string | null;
}

export default function NewChatScreen() {
  const router = useRouter();
  const { client } = useChat();
  const [searchText, setSearchText] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [groupName, setGroupName] = useState("");
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const isGroupChat = selectedUsers.length > 1;

  // Fetch all users initially
  useEffect(() => {
    const fetchUsers = async () => {
      setIsLoading(true);
      try {
        if (!client?.userID) return;

        const { data: users, error } = await supabase
          .from("users")
          .select("*")
          .neq("id", client.userID) // Exclude current user
          .order("email")
          .limit(50); // Limit to prevent loading too many users at once

        if (error) throw error;
        setAllUsers(users || []);
      } catch (error) {
        console.error("Error fetching users:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUsers();
  }, [client?.userID]); // Re-run when client.userID changes

  // Filter users based on search text
  const filteredUsers = searchText.trim()
    ? allUsers.filter(
        (user) =>
          user.email?.toLowerCase().includes(searchText.toLowerCase()) ||
          user.first_name?.toLowerCase().includes(searchText.toLowerCase()) ||
          user.last_name?.toLowerCase().includes(searchText.toLowerCase())
      )
    : allUsers;

  const toggleUserSelection = (user: User) => {
    if (selectedUsers.find((u) => u.id === user.id)) {
      setSelectedUsers(selectedUsers.filter((u) => u.id !== user.id));
    } else {
      setSelectedUsers([...selectedUsers, user]);
    }
  };

  const createChat = async () => {
    if (!client || selectedUsers.length === 0) return;

    try {
      // Create the Stream chat channel
      const channelId = `${client.userID}-${selectedUsers
        .map((u) => u.id)
        .join("-")}`;
      const members = [client.userID, ...selectedUsers.map((u) => u.id)].filter(
        (id): id is string => id !== undefined
      );
      const channelData = {
        members,
        name: isGroupChat ? groupName : undefined,
      };

      const channel = client.channel("messaging", channelId, channelData);
      await channel.create();

      // Create record in chat_channels table
      const { data: chatChannel, error: channelError } = await supabase
        .from("chat_channels")
        .insert({
          stream_channel_id: channelId,
          channel_type: "messaging",
          created_by: client.userID,
          name: isGroupChat ? groupName : null,
        })
        .select()
        .single();

      if (channelError) throw channelError;

      // Create records in chat_channel_members table
      const memberRecords = members.map((userId) => ({
        channel_id: chatChannel.id,
        user_id: userId,
        role: userId === client.userID ? "admin" : "member",
      }));

      const { error: membersError } = await supabase
        .from("chat_channel_members")
        .insert(memberRecords);

      if (membersError) throw membersError;

      router.push(`/(app)/(chat)/${channel.id}`);
    } catch (error) {
      console.error("Error creating chat:", error);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-1 p-4">
        <Card className="mb-4">
          <CardContent className="py-4">
            <View className="flex-row items-center space-x-2">
              <View className="flex-1">
                <Input
                  value={searchText}
                  onChangeText={setSearchText}
                  placeholder="Search users..."
                  className="flex-1"
                  placeholderTextColor="#666"
                />
              </View>
              {searchText ? (
                <Button
                  variant="ghost"
                  size="icon"
                  onPress={() => setSearchText("")}
                >
                  <X size={20} className="text-muted-foreground" />
                </Button>
              ) : (
                <Search size={20} className="text-muted-foreground" />
              )}
            </View>
          </CardContent>
        </Card>

        {selectedUsers.length > 0 && (
          <Card className="mb-4">
            <CardContent className="py-4">
              {isGroupChat && (
                <Input
                  value={groupName}
                  onChangeText={setGroupName}
                  placeholder="Enter group name..."
                  className="mb-4"
                  placeholderTextColor="#666"
                />
              )}
              <Text className="mb-2 text-sm font-medium text-foreground">
                {isGroupChat ? "Group Members:" : "Selected User:"}
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {selectedUsers.map((user) => (
                  <Button
                    key={user.id}
                    variant="secondary"
                    onPress={() => toggleUserSelection(user)}
                    className="flex-row items-center space-x-2"
                  >
                    <Text className="text-secondary-foreground">
                      {user.email}
                    </Text>
                    <X size={16} className="text-secondary-foreground" />
                  </Button>
                ))}
              </View>
            </CardContent>
          </Card>
        )}

        <Card className="flex-1">
          <CardContent className="py-4">
            {isLoading ? (
              <View className="items-center justify-center flex-1 py-8">
                <Text className="text-muted-foreground">Loading users...</Text>
              </View>
            ) : (
              <FlatList
                data={filteredUsers}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <Button
                    variant="ghost"
                    onPress={() => toggleUserSelection(item)}
                    className="flex-row items-center justify-between py-3 mb-2"
                  >
                    <View className="flex-row items-center flex-1">
                      <Avatar
                        className="w-8 h-8 mr-3"
                        alt={`${item.email}'s avatar`}
                      >
                        <AvatarFallback>
                          <Users size={16} className="text-muted-foreground" />
                        </AvatarFallback>
                      </Avatar>
                      <Text className="flex-1 text-foreground">
                        {item.email}
                      </Text>
                    </View>
                    {selectedUsers.find((u) => u.id === item.id) && (
                      <View className="w-3 h-3 rounded-full bg-primary" />
                    )}
                  </Button>
                )}
                ListEmptyComponent={
                  <Text className="p-4 text-center text-muted-foreground">
                    {searchText.trim()
                      ? "No users found"
                      : "No users available"}
                  </Text>
                }
              />
            )}
          </CardContent>
        </Card>

        <Button
          onPress={createChat}
          disabled={
            selectedUsers.length === 0 || (isGroupChat && !groupName.trim())
          }
          className="mt-4"
        >
          <Text className="text-primary-foreground">
            Create {isGroupChat ? "Group" : "Chat"}
          </Text>
        </Button>
      </View>
    </SafeAreaView>
  );
}
