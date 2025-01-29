import { useState, useEffect } from "react";
import { SafeAreaView, View, FlatList, Alert } from "react-native";
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

interface DatabaseUser {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
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
        if (!client?.userID) {
          console.log("No client user ID, skipping fetch");
          return;
        }

        console.log("Fetching users for client ID:", client.userID);

        // Get users from the public view
        const { data: users, error } = await supabase
          .from("public_users")
          .select("*")
          .neq("id", client.userID)
          .order("first_name");

        if (error) {
          console.error("Error fetching users:", error);
          throw error;
        }

        console.log("Users:", users);

        // Format users for the UI
        const formattedUsers = (users || []).map((user) => ({
          id: user.id,
          email: user.email || "",
          first_name: user.first_name,
          last_name: user.last_name,
          username: null,
          avatar_url: user.avatar_url,
          aud: "authenticated",
          app_metadata: {},
          user_metadata: {},
          created_at: "",
          updated_at: "",
        }));

        console.log("Formatted users:", formattedUsers);
        setAllUsers(formattedUsers);
      } catch (error) {
        console.error("Error fetching users:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUsers();
  }, [client?.userID]);

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
    console.log("Starting createChat function");
    console.log("Checking prerequisites:", {
      hasClientId: Boolean(client?.userID),
      selectedUsersCount: selectedUsers.length,
    });

    if (!client?.userID || selectedUsers.length === 0) {
      console.log("Prerequisites not met, returning early");
      return;
    }

    try {
      // Get all member IDs including the current user
      const memberIds = [client.userID, ...selectedUsers.map((u) => u.id)];
      console.log("Member IDs:", memberIds);

      // Create the channel with members list (Stream will auto-generate channel ID)
      console.log("[NewChat] Creating Stream channel with config:", {
        members: memberIds,
        name: isGroupChat ? groupName : undefined,
      });
      const channel = client.channel("messaging", undefined, {
        members: memberIds,
        name: isGroupChat ? groupName : undefined,
      });

      // This both creates the channel and subscribes to it
      console.log("[NewChat] Watching channel...");
      await channel.watch();
      console.log("[NewChat] Channel created and watching:", {
        channelId: channel.id,
        channelType: channel.type,
        channelData: channel.data,
        memberCount: channel.state.members?.size,
      });

      // First create your own member record
      console.log("[NewChat] Creating chat channel in Supabase");
      const { data: chatChannel, error: channelError } = await supabase
        .from("chat_channels")
        .insert({
          stream_channel_id: channel.id,
          channel_type: "messaging",
          created_by: client.userID,
          name: isGroupChat ? groupName : null,
        })
        .select()
        .single();

      if (channelError) {
        console.error("Error creating chat channel:", channelError);
        throw channelError;
      }

      console.log("Chat channel created:", chatChannel);

      // Create your own member record first
      console.log("Creating own member record");
      const { error: ownMemberError } = await supabase
        .from("chat_channel_members")
        .insert({
          channel_id: chatChannel.id,
          user_id: client.userID,
          role: "admin",
        });

      if (ownMemberError) {
        console.error("Error creating own member record:", ownMemberError);
        throw ownMemberError;
      }

      // Then create other member records
      console.log("Creating other member records");
      const otherMembers = memberIds.filter((id) => id !== client.userID);
      for (const memberId of otherMembers) {
        const { error: memberError } = await supabase
          .from("chat_channel_members")
          .insert({
            channel_id: chatChannel.id,
            user_id: memberId,
            role: "member",
          });

        if (memberError) {
          console.error("Error creating member record:", {
            memberId,
            error: memberError,
          });
          throw memberError;
        }
      }

      console.log("All member records created successfully");

      console.log("Navigating to chat screen");
      // First close the new chat modal
      router.back();
      // Then navigate to the chat screen
      router.push({
        pathname: `/(app)/(chat)/${channel.id}`,
        params: {
          name: isGroupChat ? groupName : selectedUsers[0].first_name,
        },
      });
      console.log("Navigation triggered");
    } catch (error: any) {
      console.error("Final error in chat creation:", {
        name: error?.name,
        message: error?.message,
        code: error?.code,
        status: error?.status,
        details: error?.details || {},
      });

      // Show a more specific error message
      Alert.alert(
        "Error",
        error?.message || "Failed to create chat. Please try again."
      );
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
                    <Avatar
                      className="w-8 h-8 mr-3"
                      alt={`${user.email}'s avatar`}
                    >
                      <AvatarFallback>
                        <Users size={16} className="text-muted-foreground" />
                      </AvatarFallback>
                    </Avatar>
                    <Text className="text-secondary-foreground">
                      {user.first_name} {user.last_name}
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
