import { useState, useEffect, useMemo } from "react";
import {
  SafeAreaView,
  View,
  FlatList,
  Alert,
  Platform,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useChat } from "~/src/lib/chat";
import { useRouter } from "expo-router";
import { supabase } from "~/src/lib/supabase";
import { User as AuthUser } from "@supabase/supabase-js";
import {
  Users,
  Search,
  X,
  ArrowLeft,
  UserPlus,
  UserCheck,
} from "lucide-react-native";
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
import { useTheme } from "~/src/components/ThemeProvider";
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
  const { theme } = useTheme();
  const [searchText, setSearchText] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [chatName, setChatName] = useState("");
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [followers, setFollowers] = useState<User[]>([]);
  const [following, setFollowing] = useState<User[]>([]);
  const [activeTab, setActiveTab] = useState<
    "followers" | "following" | "people"
  >("people");
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingFollows, setIsLoadingFollows] = useState(false);
  const { session } = useAuth();

  const isGroupChat = selectedUsers.length > 1;

  // Generate default chat name based on selected users
  const defaultChatName = useMemo(() => {
    if (selectedUsers.length === 0) return "";
    if (selectedUsers.length === 1) {
      const user = selectedUsers[0];
      const fullName = `${user.first_name || ""} ${
        user.last_name || ""
      }`.trim();
      return fullName || user.username || "Chat";
    }
    if (selectedUsers.length <= 3) {
      return selectedUsers
        .map((user) => user.first_name || user.username || "User")
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

        // console.log("Fetching users for client ID:", client.userID);

        const excludeEmails = ["orbit@gmail.com"];
        const formatted = `(${excludeEmails
          .map((email) => `"${email}"`)
          .join(",")})`;
        // Get users from the users table (not public_users) to access username
        const { data: users, error } = await supabase
          .from("users")
          .select("id, email, first_name, last_name, username, avatar_url")
          .neq("id", client.userID)
          .not("email", "in", formatted)
          .order("first_name");

        if (error) {
          console.error("Error fetching users:", error);
          throw error;
        }

        // console.log("Users:", users);

        // Format users for the UI
        const formattedUsers = (users || []).map((user) => ({
          id: user.id,
          email: user.email || "",
          first_name: user.first_name,
          last_name: user.last_name,
          username: user.username,
          avatar_url: user.avatar_url,
          aud: "authenticated",
          app_metadata: {},
          user_metadata: {},
          created_at: "",
          updated_at: "",
        }));

        // console.log("Formatted users:", formattedUsers);
        setAllUsers(formattedUsers);
      } catch (error) {
        console.error("Error fetching users:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUsers();
  }, [client?.userID]);

  // Fetch followers and following
  useEffect(() => {
    const fetchFollows = async () => {
      if (!client?.userID) return;

      setIsLoadingFollows(true);
      try {
        // Fetch followers (users who follow the current user)
        const { data: followersData, error: followersError } = await supabase
          .from("follows")
          .select(
            `
            follower_id,
            users!follows_follower_id_fkey(
              id, email, first_name, last_name, username, avatar_url
            )
          `
          )
          .eq("following_id", client.userID);

        if (followersError) {
          console.error("Error fetching followers:", followersError);
        } else {
          const formattedFollowers = (followersData || []).map((item: any) => ({
            id: item.users.id,
            email: item.users.email || "",
            first_name: item.users.first_name,
            last_name: item.users.last_name,
            username: item.users.username,
            avatar_url: item.users.avatar_url,
            aud: "authenticated",
            app_metadata: {},
            user_metadata: {},
            created_at: "",
            updated_at: "",
          }));
          setFollowers(formattedFollowers);
        }

        // Fetch following (users the current user follows)
        const { data: followingData, error: followingError } = await supabase
          .from("follows")
          .select(
            `
            following_id,
            users!follows_following_id_fkey(
              id, email, first_name, last_name, username, avatar_url
            )
          `
          )
          .eq("follower_id", client.userID);

        if (followingError) {
          console.error("Error fetching following:", followingError);
        } else {
          const formattedFollowing = (followingData || []).map((item: any) => ({
            id: item.users.id,
            email: item.users.email || "",
            first_name: item.users.first_name,
            last_name: item.users.last_name,
            username: item.users.username,
            avatar_url: item.users.avatar_url,
            aud: "authenticated",
            app_metadata: {},
            user_metadata: {},
            created_at: "",
            updated_at: "",
          }));
          setFollowing(formattedFollowing);
        }
      } catch (error) {
        console.error("Error fetching follows:", error);
      } finally {
        setIsLoadingFollows(false);
      }
    };

    fetchFollows();
  }, [client?.userID]);

  // Get current tab's user list
  const getCurrentUserList = () => {
    switch (activeTab) {
      case "followers":
        return followers;
      case "following":
        return following;
      case "people":
        return allUsers;
      default:
        return allUsers;
    }
  };

  // Filter users based on search text and current tab
  const filteredUsers = getCurrentUserList().filter((user) => {
    const searchTerm = searchText.toLowerCase();
    const fullName = `${user.first_name || ""} ${
      user.last_name || ""
    }`.toLowerCase();
    const username = (user.username || "").toLowerCase();

    return fullName.includes(searchTerm) || username.includes(searchTerm);
  });

  const toggleUserSelection = (user: User) => {
    if (selectedUsers.find((u) => u.id === user.id)) {
      setSelectedUsers(selectedUsers.filter((u) => u.id !== user.id));
    } else {
      setSelectedUsers([...selectedUsers, user]);
    }
  };

  const getUserDisplayName = (user: User) => {
    const fullName = `${user.first_name || ""} ${user.last_name || ""}`.trim();
    return fullName || user.username || "Unknown User";
  };

  const getUserInitials = (user: User) => {
    if (user.first_name && user.last_name) {
      return `${user.first_name[0]}${user.last_name[0]}`.toUpperCase();
    }
    if (user.first_name) {
      return user.first_name[0].toUpperCase();
    }
    if (user.last_name) {
      return user.last_name[0].toUpperCase();
    }
    if (user.username) {
      return user.username[0].toUpperCase();
    }
    return "?";
  };

  const createChat = async () => {
    console.log("Starting createChat function");
    // console.log("Checking prerequisites:", {
    //   hasClientId: Boolean(client?.userID),
    //   selectedUsersCount: selectedUsers.length,
    // });

    if (!client?.userID || selectedUsers.length === 0) {
      console.log("Prerequisites not met, returning early");
      return;
    }

    try {
      // Get all member IDs including the current user
      const memberIds = [client.userID, ...selectedUsers.map((u) => u.id)];
      // console.log("Member IDs:", memberIds);

      // Generate a unique channel ID using timestamp and random string
      const timestamp = Date.now();
      const randomStr = Math.random().toString(36).substring(7);
      const uniqueChannelId = `${timestamp}-${randomStr}`;

      // Create the channel with members list and name
      // console.log("[NewChat] Creating Stream channel with config:", {
      //   members: memberIds,
      //   name: chatName,
      // });
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
        memberCount: Object.keys(channel.state.members || {}).length,
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

      // console.log("Chat channel created:", chatChannel);

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
      // console.log("requestData", reuestData);

      if (!response.ok) {
        // console.log("error>", response);
        throw new Error(await response.text());
      }

      const data_ = await response.json();
      // console.log("response>", data_);
    } catch (e) {
      console.log("error_catch>", e);
    }
  };

  return (
    <SafeAreaView
      style={{
        flex: 1,
        backgroundColor: theme.colors.card,
      }}
    >
      {/* Modern Header */}
      <View
        style={{
          backgroundColor: theme.colors.card,
          borderBottomWidth: 1,
          borderBottomColor: theme.colors.border,
          paddingHorizontal: 16,
          paddingVertical: 12,
          shadowColor: theme.colors.border,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 3,
        }}
      >
        <View className="flex-row justify-between items-center">
          <View className="flex-row items-center">
            <TouchableOpacity onPress={() => router.back()} className="mr-3">
              <ArrowLeft size={24} color={theme.colors.text} />
            </TouchableOpacity>
            <Text
              style={{
                fontSize: 20,
                fontWeight: "700",
                color: theme.colors.text,
              }}
            >
              New Message
            </Text>
          </View>
          {selectedUsers.length > 0 && (
            <TouchableOpacity
              onPress={createChat}
              style={{
                backgroundColor: theme.colors.primary,
                paddingHorizontal: 16,
                paddingVertical: 8,
                borderRadius: 20,
              }}
            >
              <Text
                style={{
                  color: "white",
                  fontWeight: "600",
                }}
              >
                Create
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={{ flex: 1, padding: 16 }}>
        {/* Search Input */}
        <View
          style={{
            backgroundColor: theme.colors.card,
            borderRadius: 16,
            marginBottom: 16,
            shadowColor: theme.colors.border,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 3,
          }}
        >
          <View style={{ padding: 16 }}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: theme.colors.border,
                borderRadius: 12,
                paddingHorizontal: 16,
                paddingVertical: 12,
              }}
            >
              <Search size={20} color={theme.colors.text} />
              <Input
                value={searchText}
                onChangeText={setSearchText}
                placeholder="Search people..."
                style={{
                  flex: 1,
                  marginLeft: 12,
                  backgroundColor: theme.colors.border,
                  padding: 0,
                  color: theme.colors.text,
                }}
                placeholderTextColor={theme.colors.text}
              />
              {searchText ? (
                <TouchableOpacity onPress={() => setSearchText("")}>
                  <X size={20} color={theme.colors.text} />
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        </View>

        {/* Selected Users */}
        {selectedUsers.length > 0 && (
          <View
            style={{
              backgroundColor: theme.colors.border,
              borderRadius: 16,
              marginBottom: 16,
              shadowColor: theme.colors.border,
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 4,
              elevation: 3,
            }}
          >
            <View style={{ padding: 16 }}>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "600",
                  color: theme.colors.text,
                  marginBottom: 12,
                }}
              >
                {isGroupChat ? "Group Members" : "Selected User"}
              </Text>

              {/* Chat Name Input for Groups */}
              {isGroupChat && (
                <View style={{ marginBottom: 16 }}>
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: "600",
                      color: theme.colors.text,
                      marginBottom: 8,
                    }}
                  >
                    Group Name
                  </Text>
                  <Input
                    value={chatName}
                    onChangeText={setChatName}
                    placeholder={defaultChatName}
                    style={{
                      backgroundColor: theme.colors.card,
                      borderColor: theme.colors.border,
                      color: theme.colors.text,
                    }}
                    placeholderTextColor={theme.colors.text}
                  />
                </View>
              )}

              {/* Selected Users List */}
              <View className="flex-row flex-wrap gap-2">
                {selectedUsers.map((user) => (
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
                    <Avatar
                      className="mr-2 w-6 h-6"
                      alt={getUserDisplayName(user)}
                    >
                      {user.avatar_url ? (
                        <AvatarImage source={{ uri: user.avatar_url }} />
                      ) : (
                        <AvatarFallback>
                          <Text
                            style={{
                              fontSize: 12,
                              fontWeight: "600",
                              color: theme.colors.text,
                            }}
                          >
                            {getUserInitials(user)}
                          </Text>
                        </AvatarFallback>
                      )}
                    </Avatar>
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
                    <X size={14} color={theme.colors.primary} />
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        )}

        {/* Tabs */}
        <View
          style={{
            backgroundColor: theme.colors.card,
            borderRadius: 16,
            marginBottom: 16,
            shadowColor: theme.colors.border,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 3,
          }}
        >
          <View style={{ padding: 16 }}>
            <View
              style={{
                flexDirection: "row",
                backgroundColor: theme.colors.border,
                borderRadius: 12,
                padding: 4,
              }}
            >
              {/* Followers Tab */}
              <TouchableOpacity
                onPress={() => setActiveTab("followers")}
                style={{
                  flex: 1,
                  paddingVertical: 8,
                  paddingHorizontal: 4,
                  borderRadius: 8,
                  backgroundColor:
                    activeTab === "followers"
                      ? theme.colors.primary
                      : "transparent",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <UserPlus
                  size={14}
                  color={
                    activeTab === "followers" ? "white" : theme.colors.text
                  }
                />
                <Text
                  style={{
                    marginTop: 2,
                    fontSize: 11,
                    fontWeight: "600",
                    color:
                      activeTab === "followers" ? "white" : theme.colors.text,
                    textAlign: "center",
                  }}
                  numberOfLines={1}
                >
                  Followers
                </Text>
              </TouchableOpacity>

              {/* Following Tab */}
              <TouchableOpacity
                onPress={() => setActiveTab("following")}
                style={{
                  flex: 1,
                  paddingVertical: 8,
                  paddingHorizontal: 4,
                  borderRadius: 8,
                  backgroundColor:
                    activeTab === "following"
                      ? theme.colors.primary
                      : "transparent",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <UserCheck
                  size={14}
                  color={
                    activeTab === "following" ? "white" : theme.colors.text
                  }
                />
                <Text
                  style={{
                    marginTop: 2,
                    fontSize: 11,
                    fontWeight: "600",
                    color:
                      activeTab === "following" ? "white" : theme.colors.text,
                    textAlign: "center",
                  }}
                  numberOfLines={1}
                >
                  Following
                </Text>
              </TouchableOpacity>

              {/* People Tab */}
              <TouchableOpacity
                onPress={() => setActiveTab("people")}
                style={{
                  flex: 1,
                  paddingVertical: 8,
                  paddingHorizontal: 4,
                  borderRadius: 8,
                  backgroundColor:
                    activeTab === "people"
                      ? theme.colors.primary
                      : "transparent",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Users
                  size={14}
                  color={activeTab === "people" ? "white" : theme.colors.text}
                />
                <Text
                  style={{
                    marginTop: 2,
                    fontSize: 11,
                    fontWeight: "600",
                    color: activeTab === "people" ? "white" : theme.colors.text,
                    textAlign: "center",
                  }}
                  numberOfLines={1}
                >
                  People
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Users List */}
        <View
          style={{
            flex: 1,
            backgroundColor: theme.colors.card,
            borderRadius: 16,
            shadowColor: theme.colors.border,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 3,
          }}
        >
          <View style={{ padding: 16, flex: 1 }}>
            <Text
              style={{
                fontSize: 14,
                fontWeight: "600",
                color: theme.colors.text,
                marginBottom: 12,
              }}
            >
              {activeTab === "followers"
                ? "Your Followers"
                : activeTab === "following"
                ? "People You Follow"
                : "All People"}
            </Text>
            {isLoading || isLoadingFollows ? (
              <View className="flex-1 justify-center items-center py-8">
                <ActivityIndicator size="large" color={theme.colors.card} />
                <Text
                  style={{
                    marginTop: 16,
                    color: theme.colors.text,
                  }}
                >
                  Loading {activeTab}...
                </Text>
              </View>
            ) : (
              <FlatList
                data={filteredUsers}
                keyExtractor={(item) => item.id}
                showsVerticalScrollIndicator={false}
                style={{ flex: 1 }}
                contentContainerStyle={{ paddingBottom: 20 }}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    onPress={() => toggleUserSelection(item)}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      paddingVertical: 12,
                      paddingHorizontal: 12,
                      borderRadius: 12,
                      backgroundColor: theme.colors.border,
                      gap: 12,
                      marginBottom: 8,
                    }}
                  >
                    <Avatar
                      className="mr-3 w-12 h-12"
                      alt={getUserDisplayName(item)}
                    >
                      {item.avatar_url ? (
                        <AvatarImage source={{ uri: item.avatar_url }} />
                      ) : (
                        <AvatarFallback>
                          <Text
                            style={{
                              fontSize: 14,
                              fontWeight: "600",
                              color: theme.colors.text,
                            }}
                          >
                            {getUserInitials(item)}
                          </Text>
                        </AvatarFallback>
                      )}
                    </Avatar>

                    <View className="flex-1 ml-3">
                      <Text
                        className="text-base font-medium"
                        style={{ color: theme.colors.text }}
                      >
                        {getUserDisplayName(item)}
                      </Text>
                      <Text
                        className="text-sm"
                        style={{ color: theme.colors.text + "80" }}
                      >
                        @{item.username || "user"}
                      </Text>
                    </View>

                    {selectedUsers.find((u) => u.id === item.id) ? (
                      <View
                        style={{
                          backgroundColor: theme.colors.border,
                          width: 24,
                          height: 24,
                          borderRadius: 12,
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Text style={{ color: "white", fontSize: 12 }}>✓</Text>
                      </View>
                    ) : (
                      <View
                        style={{
                          borderColor: theme.colors.border,
                          borderWidth: 2,
                          width: 24,
                          height: 24,
                          borderRadius: 12,
                        }}
                      />
                    )}
                  </TouchableOpacity>
                )}
                ListEmptyComponent={
                  <View className="justify-center items-center py-8">
                    <View
                      style={{
                        width: 64,
                        height: 64,
                        backgroundColor: theme.colors.border,
                        borderRadius: 32,
                        alignItems: "center",
                        justifyContent: "center",
                        marginBottom: 16,
                      }}
                    >
                      {activeTab === "followers" ? (
                        <UserPlus size={24} color={theme.colors.text} />
                      ) : activeTab === "following" ? (
                        <UserCheck size={24} color={theme.colors.text} />
                      ) : (
                        <Users size={24} color={theme.colors.text} />
                      )}
                    </View>
                    <Text
                      style={{
                        color: theme.colors.text,
                        opacity: 0.7,
                        textAlign: "center",
                      }}
                    >
                      {searchText.trim()
                        ? `No ${activeTab} found matching your search`
                        : activeTab === "followers"
                        ? "No followers yet"
                        : activeTab === "following"
                        ? "You're not following anyone yet"
                        : "No people available to chat with"}
                    </Text>
                  </View>
                }
              />
            )}
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}
