import { useCallback, useEffect, useState, useMemo } from "react";
import {
  SafeAreaView,
  View,
  FlatList,
  Alert,
  Platform,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useChat } from "~/src/lib/chat";
import { useRouter } from "expo-router";
import { supabase } from "~/src/lib/supabase";
import { User as AuthUser } from "@supabase/supabase-js";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import BottomSheet, { BottomSheetScrollView } from "@gorhom/bottom-sheet";

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
interface SelectCoCreatorsSheetProps {
  eventId: string;
  isOpen: boolean;
  onClose: () => void;
  goToMap: () => void;
  onDone: (selectedUsers: User[]) =>void;
}

export default function SelectCoCreators({
  eventId,
  isOpen,
  onClose,
  goToMap,
  onDone,
}: SelectCoCreatorsSheetProps) {
  console.log("eventId>", eventId);
  const router = useRouter();
  const { client } = useChat();
  const { theme } = useTheme();
  const [searchText, setSearchText] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const insets = useSafeAreaInsets();
  const [isLoading, setIsLoading] = useState(false);
  const { session } = useAuth();

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

  const filteredUsers = allUsers.filter((user) => {
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

  return (
    <Modal
      visible={isOpen}
      transparent={true}
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent={true}
      presentationStyle="overFullScreen"
    >
      <GestureHandlerRootView style={{ flex: 1 }}>
        <BottomSheet
          snapPoints={["75%", "95%"]}
          handleIndicatorStyle={{
            backgroundColor: theme.colors.border,
            width: 40,
          }}
          backgroundStyle={{
            backgroundColor: theme.colors.card,
            borderRadius: 20,
          }}
          enablePanDownToClose
          onClose={onClose}
          style={{ zIndex: 99999, elevation: 99999 }}
          containerStyle={{ zIndex: 99999, elevation: 99999 }}
        >
          <SafeAreaView style={{ flex: 1, marginTop: 20 }}>
            <BottomSheetScrollView
              contentContainerStyle={{ paddingBottom: 120 + insets.bottom }}
              showsVerticalScrollIndicator={false}
            >
              <View
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
                      <TouchableOpacity
                        onPress={() => router.back()}
                        className="mr-3"
                      >
                        <View style={{ width: 80 }} />
                      </TouchableOpacity>
                      <Text
                        style={{
                          fontSize: 22,
                          fontWeight: "700",
                          color: theme.colors.text,
                        }}
                      >
                        Select Co-Creators
                      </Text>
                    </View>
                    {selectedUsers.length > 0 && (
                      <TouchableOpacity
                        onPress={() => onDone(selectedUsers)}
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
                          Done
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
                          {"Selected User"}
                        </Text>

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
                                  <AvatarImage
                                    source={{ uri: user.avatar_url }}
                                  />
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
                      {isLoading ? (
                        <View className="flex-1 justify-center items-center py-8">
                          <ActivityIndicator
                            size="large"
                            color={theme.colors.card}
                          />
                          <Text
                            style={{
                              marginTop: 16,
                              color: theme.colors.text,
                            }}
                          >
                            Loading users...
                          </Text>
                        </View>
                      ) : (
                        <FlatList
                          data={filteredUsers}
                          keyExtractor={(item) => item.id}
                          showsVerticalScrollIndicator={false}
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
                                  <AvatarImage
                                    source={{ uri: item.avatar_url }}
                                  />
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
                                  <Text
                                    style={{ color: "white", fontSize: 12 }}
                                  >
                                    ✓
                                  </Text>
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
                                <Users size={24} color={theme.colors.text} />
                              </View>
                              <Text
                                style={{
                                  color: theme.colors.text,
                                  opacity: 0.7,
                                  textAlign: "center",
                                }}
                              >
                                {searchText.trim()
                                  ? `No user found matching your search`
                                  : "No people available to invite"}
                              </Text>
                            </View>
                          }
                        />
                      )}
                    </View>
                  </View>
                </View>
              </View>
            </BottomSheetScrollView>
          </SafeAreaView>
        </BottomSheet>
      </GestureHandlerRootView>
    </Modal>
  );
}
