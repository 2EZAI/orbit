import { useState, useEffect, useMemo } from "react";
import { SafeAreaView, View, FlatList, Alert, Platform } from "react-native";
import { useChat } from "~/src/lib/chat";
import { useRouter } from "expo-router";
import { supabase } from "~/src/lib/supabase";
import { User as AuthUser } from "@supabase/supabase-js";
import { Users, Search, X } from "lucide-react-native";
import { Input } from "~/src/components/ui/input";
import { Button } from "~/src/components/ui/button";
import { Text } from "~/src/components/ui/text";
import { Card, CardContent } from "~/src/components/ui/card";
import { useAuth } from "~/src/lib/auth";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "~/src/components/ui/avatar";
import { Icon } from "react-native-elements";

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
  const [chatName, setChatName] = useState("");
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { session } = useAuth();

  const isGroupChat = selectedUsers.length > 1;

  // Generate default chat name based on selected users
  const defaultChatName = useMemo(() => {
    if (selectedUsers.length === 0) return "";
    if (selectedUsers.length === 1) {
      return `${selectedUsers[0].first_name} ${selectedUsers[0].last_name}`.trim();
    }
    if (selectedUsers.length <= 3) {
      return selectedUsers
        .map((user) => `${user.first_name}`)
        .join(", ")
        .trim();
    }
    return "Group Chat";
  }, [selectedUsers]);

  // Update chat name when users are selected/deselected
  useEffect(() => {
    setChatName(defaultChatName);
  }, [defaultChatName]);

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

        const excludeEmails = ["orbit@gmail.com"];
        const formatted = `(${excludeEmails
          .map((email) => `"${email}"`)
          .join(",")})`;
        // Get users from the public view
        const { data: users, error } = await supabase
          .from("public_users")
          .select("*")
          .neq("id", client.userID)
          .not("email", "in", formatted)
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

      // Generate a unique channel ID using timestamp and random string
      const timestamp = Date.now();
      const randomStr = Math.random().toString(36).substring(7);
      const uniqueChannelId = `${timestamp}-${randomStr}`;

      // Create the channel with members list and name
      console.log("[NewChat] Creating Stream channel with config:", {
        members: memberIds,
        name: chatName,
      });
      const channel = client.channel("messaging", uniqueChannelId, {
        members: memberIds,
        name: chatName,
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

      // Create channel record in Supabase
      console.log("[NewChat] Creating chat channel in Supabase");
      const { data: chatChannel, error: channelError } = await supabase
        .from("chat_channels")
        .insert({
          stream_channel_id: channel.id,
          channel_type: "messaging",
          created_by: client.userID,
          name: chatName,
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
      if (selectedUsers.length > 0) {
        console.log("selectedUsers");
        if (selectedUsers.length === 1) {
          console.log("selectedUsers1");
          hitNoificationApi("new_chat", chatChannel.id);
        } else {
          console.log("selectedUserselse");
          hitNoificationApi("new_group_chat", chatChannel.id);
          // selectedUsers.forEach((user) => {
          //   hitNoificationApi('addedToChatGroup', user?.id);
          // });
        }
      }

      console.log("Navigating to chat screen");
      // First dismiss the modal
      router.back();
      // Wait a brief moment for the modal to close
      setTimeout(() => {
        router.push({
          pathname: "/(app)/(chat)/channel/[id]",
          params: {
            id: channel.id,
            name: chatName,
          },
        });
      }, 300);
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

  const hitNoificationApi = async (typee: string, chatId: string) => {
    if (!session) return;
    try {

      const reuestData = {
        senderId: session.user.id,
        type: typee,
        data: {
              chat_id: chatId,
              group_name: chatName,
            },
      };
      ///send notification
      const response = await fetch(
        `${process.env.BACKEND_MAP_URL}/api/notifications/send`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.user.id}`,
          },
          body: JSON.stringify(reuestData),
        }
      );
      console.log("requestData", reuestData);

      if (!response.ok) {
        console.log("error>", response);
        throw new Error(await response.text());
      }

      const data_ = await response.json();
      console.log("response>", data_);
    } catch (e) {
      console.log("error_catch>", e);
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
                  {Platform.OS === "ios" ? (
                    <X size={20} className="text-muted-foreground" />
                  ) : (
                    <Icon
                      name="close"
                      type="material-community"
                      size={20}
                      color="#239ED0"
                    />
                  )}
                </Button>
              ) : Platform.OS === "ios" ? (
                <Search size={20} className="text-muted-foreground" />
              ) : (
                <Icon
                  name="magnify"
                  type="material-community"
                  size={20}
                  color="#239ED0"
                />
              )}
            </View>
          </CardContent>
        </Card>

        {selectedUsers.length > 0 && (
          <Card className="mb-4">
            <CardContent className="py-4">
              <Input
                value={chatName}
                onChangeText={setChatName}
                placeholder={`Chat name (default: ${defaultChatName})`}
                className="mb-4"
                placeholderTextColor="#666"
              />
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
                        {Platform.OS === "ios" ? (
                          <Users size={16} className="text-muted-foreground" />
                        ) : (
                          <Icon
                            name="account-multiple"
                            type="material-community"
                            size={16}
                            color="#239ED0"
                          />
                        )}
                      </AvatarFallback>
                    </Avatar>
                    <Text className="text-secondary-foreground">
                      {user.first_name} {user.last_name}
                    </Text>
                    {Platform.OS == "ios" ? (
                      <X size={16} className="text-secondary-foreground" />
                    ) : (
                      <Icon
                        name="close"
                        type="material-community"
                        size={16}
                        color="#239ED0"
                      />
                    )}
                  </Button>
                ))}
              </View>
            </CardContent>
          </Card>
        )}

        <Card
          className={`flex-1 ${
            Platform.OS === "android" ? "mb-[34%]" : "mb-[24%]"
          }`}
        >
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
                          {Platform.OS == "ios" ? (
                            <Users
                              size={16}
                              className="text-muted-foreground"
                            />
                          ) : (
                            <Icon
                              name="account-multiple"
                              type="material-community"
                              size={16}
                              color="#239ED0"
                            />
                          )}
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
          disabled={selectedUsers.length === 0}
          className={`${
            Platform.OS === "android"
              ? "absolute  bottom-0 left-0 right-0  mb-[12%] mr-[4%] ml-[4%]"
              : " absolute  bottom-0 left-0 right-0  mb-[8%] mr-[4%] ml-[4%]"
          }`}
        >
          <Text className="text-primary-foreground">
            Create {isGroupChat ? "Group" : "Chat"}
          </Text>
        </Button>
      </View>
    </SafeAreaView>
  );
}
