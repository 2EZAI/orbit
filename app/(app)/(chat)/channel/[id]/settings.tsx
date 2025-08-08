import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ScrollView,
  TextInput,
  Switch,
  Modal,
  FlatList,
  Image,
} from "react-native";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "~/src/components/ThemeProvider";
import { useChat } from "~/src/lib/chat";
import {
  ArrowLeft,
  Users,
  UserPlus,
  Edit3,
  Trash2,
  Image as ImageIcon,
  Bell,
  BellOff,
  Shield,
  UserMinus,
  LogOut,
  Ban,
  Volume2,
  VolumeX,
} from "lucide-react-native";
import { Button } from "~/src/components/ui/button";
import { Card, CardContent } from "~/src/components/ui/card";
import { Input } from "~/src/components/ui/input";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "~/src/components/ui/avatar";

export default function ChatSettingsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { client } = useChat();
  const { theme } = useTheme();

  const [channel, setChannel] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [showNameModal, setShowNameModal] = useState(false);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [newChannelName, setNewChannelName] = useState("");

  useEffect(() => {
    const loadChannelData = () => {
      if (!client || !id) return;

      try {
        // Get the channel instance WITHOUT calling watch() (no API call)
        const channelInstance = client.channel("messaging", id);

        // Use the channel data that's already loaded from the main chat screen
        setChannel(channelInstance);
        setNewChannelName(channelInstance.data?.name || "");
        setIsMuted(channelInstance.muteStatus().muted);

        // Use existing member data from channel state (no API call)
        const existingMembers = Object.values(
          channelInstance.state.members || {}
        );
        setMembers(existingMembers);
      } catch (error) {
        console.error("Error loading channel data:", error);
        Alert.alert("Error", "Failed to load channel settings");
      } finally {
        setLoading(false);
      }
    };

    loadChannelData();
  }, [client, id]);

  const handleUpdateChannelName = async () => {
    if (!channel || !newChannelName.trim()) return;

    try {
      await channel.update({ name: newChannelName.trim() });
      setShowNameModal(false);
      Alert.alert("Success", "Channel name updated successfully");
    } catch (error) {
      console.error("Error updating channel name:", error);
      Alert.alert("Error", "Failed to update channel name");
    }
  };

  const handleToggleMute = async () => {
    if (!channel) return;

    try {
      if (isMuted) {
        await channel.unmute();
        setIsMuted(false);
      } else {
        await channel.mute();
        setIsMuted(true);
      }
    } catch (error) {
      console.error("Error toggling mute:", error);
      Alert.alert("Error", "Failed to update notification settings");
    }
  };

  const handleClearHistory = () => {
    Alert.alert(
      "Clear Chat History",
      "Are you sure you want to clear all messages? This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: async () => {
            try {
              await channel?.truncate();
              Alert.alert("Success", "Chat history cleared");
            } catch (error) {
              console.error("Error clearing history:", error);
              Alert.alert("Error", "Failed to clear chat history");
            }
          },
        },
      ]
    );
  };

  const handleDeleteChat = () => {
    Alert.alert(
      "Delete Chat",
      "Are you sure you want to delete this chat? This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await channel?.delete();
              router.back();
              router.back(); // Go back to channel list
            } catch (error) {
              console.error("Error deleting channel:", error);
              Alert.alert("Error", "Failed to delete chat");
            }
          },
        },
      ]
    );
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!channel) return;

    Alert.alert(
      "Remove Member",
      "Are you sure you want to remove this member from the chat?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              await channel.removeMembers([memberId]);
              const membersResponse = await channel.queryMembers({});
              setMembers(membersResponse.members);
              Alert.alert("Success", "Member removed successfully");
            } catch (error) {
              console.error("Error removing member:", error);
              Alert.alert("Error", "Failed to remove member");
            }
          },
        },
      ]
    );
  };

  const handleLeaveChannel = () => {
    Alert.alert(
      "Leave Chat",
      "Are you sure you want to leave this chat? You won't be able to see new messages.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Leave",
          style: "destructive",
          onPress: async () => {
            try {
              if (!channel || !client?.userID) return;

              await channel.removeMembers([client.userID]);
              router.back();
              router.back(); // Go back to channel list
              Alert.alert("Success", "You have left the chat");
            } catch (error) {
              console.error("Error leaving channel:", error);
              Alert.alert("Error", "Failed to leave chat");
            }
          },
        },
      ]
    );
  };

  const handleBanMember = async (memberId: string) => {
    if (!channel) return;

    Alert.alert(
      "Ban Member",
      "Are you sure you want to ban this member from the chat?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Ban",
          style: "destructive",
          onPress: async () => {
            try {
              await channel.banUser(memberId, {
                reason: "Banned by admin",
                timeout: 60 * 60 * 24, // 24 hours
              });
              const membersResponse = await channel.queryMembers({});
              setMembers(membersResponse.members);
              Alert.alert("Success", "Member banned successfully");
            } catch (error) {
              console.error("Error banning member:", error);
              Alert.alert("Error", "Failed to ban member");
            }
          },
        },
      ]
    );
  };

  const getMemberDisplayName = (member: any) => {
    const user = member.user;
    if (user?.first_name || user?.last_name) {
      return `${user.first_name || ""} ${user.last_name || ""}`.trim();
    }
    if (user?.username) {
      return user.username;
    }
    if (user?.name && user.name !== user.id) {
      return user.name;
    }
    return "Unknown User";
  };

  const getMemberInitials = (member: any) => {
    const user = member.user;
    if (user?.first_name && user?.last_name) {
      return `${user.first_name[0]}${user.last_name[0]}`.toUpperCase();
    }
    if (user?.first_name) {
      return user.first_name[0].toUpperCase();
    }
    if (user?.username) {
      return user.username[0].toUpperCase();
    }
    return user?.name?.[0]?.toUpperCase() || "?";
  };

  const isCurrentUserAdmin = () => {
    if (!channel || !client?.userID) return false;
    const currentMember = members.find((m) => m.user_id === client.userID);
    return currentMember?.role === "admin" || currentMember?.role === "owner";
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.card }}>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />

      {/* Custom Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          padding: 16,
          paddingTop: 8,
          backgroundColor: theme.colors.card,
          borderBottomWidth: 1,
          borderBottomColor: theme.colors.border,
        }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ marginRight: 16 }}
        >
          <ArrowLeft size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text
          style={{
            fontSize: 18,
            fontWeight: "600",
            color: theme.colors.text,
          }}
        >
          Chat Settings
        </Text>
      </View>

      {loading ? (
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <Text style={{ color: theme.colors.text }}>Loading settings...</Text>
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1, padding: 16 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Chat Info Section */}
          <Card
            style={{
              marginBottom: 16,
              backgroundColor: theme.colors.background,
            }}
          >
            <CardContent style={{ padding: 16 }}>
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: "600",
                  color: theme.colors.text,
                  marginBottom: 16,
                }}
              >
                Chat Information
              </Text>

              {/* Channel Name */}
              <View style={{ marginBottom: 16 }}>
                <TouchableOpacity
                  onPress={() => isCurrentUserAdmin() && setShowNameModal(true)}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: 12,
                    backgroundColor: theme.colors.border,
                    borderRadius: 8,
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontSize: 14,
                        color: theme.colors.text + "80",
                        marginBottom: 4,
                      }}
                    >
                      Chat Name
                    </Text>
                    <Text
                      style={{
                        fontSize: 16,
                        color: theme.colors.text,
                        fontWeight: "500",
                      }}
                    >
                      {channel?.data?.name || "Unnamed Chat"}
                    </Text>
                  </View>
                  {isCurrentUserAdmin() && (
                    <Edit3 size={20} color={theme.colors.text + "80"} />
                  )}
                </TouchableOpacity>
              </View>

              {/* Members Count */}
              <TouchableOpacity
                onPress={() => setShowMembersModal(true)}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: 12,
                  backgroundColor: theme.colors.border,
                  borderRadius: 8,
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <Users
                    size={20}
                    color={theme.colors.text}
                    style={{ marginRight: 12 }}
                  />
                  <Text style={{ fontSize: 16, color: theme.colors.text }}>
                    {members.length}{" "}
                    {members.length === 1 ? "member" : "members"}
                  </Text>
                </View>
                <ArrowLeft
                  size={16}
                  color={theme.colors.text + "80"}
                  style={{ transform: [{ rotate: "180deg" }] }}
                />
              </TouchableOpacity>
            </CardContent>
          </Card>

          {/* Settings Section */}
          <Card
            style={{
              marginBottom: 16,
              backgroundColor: theme.colors.background,
            }}
          >
            <CardContent style={{ padding: 16 }}>
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: "600",
                  color: theme.colors.text,
                  marginBottom: 16,
                }}
              >
                Settings
              </Text>

              {/* Notifications */}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: 12,
                  backgroundColor: theme.colors.border,
                  borderRadius: 8,
                  marginBottom: 12,
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  {isMuted ? (
                    <BellOff
                      size={20}
                      color={theme.colors.text}
                      style={{ marginRight: 12 }}
                    />
                  ) : (
                    <Bell
                      size={20}
                      color={theme.colors.text}
                      style={{ marginRight: 12 }}
                    />
                  )}
                  <Text style={{ fontSize: 16, color: theme.colors.text }}>
                    Notifications
                  </Text>
                </View>
                <Switch
                  value={!isMuted}
                  onValueChange={handleToggleMute}
                  trackColor={{
                    false: theme.colors.border,
                    true: theme.colors.primary,
                  }}
                  thumbColor={"white"}
                />
              </View>

              {/* Add Members */}
              {isCurrentUserAdmin() && (
                <TouchableOpacity
                  onPress={() =>
                    router.push(`/(app)/(chat)/members/add?channelId=${id}`)
                  }
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    padding: 12,
                    backgroundColor: theme.colors.border,
                    borderRadius: 8,
                    marginBottom: 12,
                  }}
                >
                  <UserPlus
                    size={20}
                    color={theme.colors.text}
                    style={{ marginRight: 12 }}
                  />
                  <Text style={{ fontSize: 16, color: theme.colors.text }}>
                    Add Members
                  </Text>
                </TouchableOpacity>
              )}

              {/* View Media */}
              <TouchableOpacity
                onPress={() => router.push(`/(app)/(chat)/channel/${id}/media`)}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  padding: 12,
                  backgroundColor: theme.colors.border,
                  borderRadius: 8,
                  marginBottom: 12,
                }}
              >
                <ImageIcon
                  size={20}
                  color={theme.colors.text}
                  style={{ marginRight: 12 }}
                />
                <Text style={{ fontSize: 16, color: theme.colors.text }}>
                  View Media
                </Text>
              </TouchableOpacity>

              {/* Leave Channel */}
              {!isCurrentUserAdmin() && (
                <TouchableOpacity
                  onPress={handleLeaveChannel}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    padding: 12,
                    backgroundColor: theme.colors.notification + "20",
                    borderRadius: 8,
                  }}
                >
                  <LogOut
                    size={20}
                    color={theme.colors.notification}
                    style={{ marginRight: 12 }}
                  />
                  <Text
                    style={{ fontSize: 16, color: theme.colors.notification }}
                  >
                    Leave Chat
                  </Text>
                </TouchableOpacity>
              )}
            </CardContent>
          </Card>

          {/* Danger Zone */}
          {isCurrentUserAdmin() && (
            <Card
              style={{
                marginBottom: 16,
                backgroundColor: theme.colors.background,
              }}
            >
              <CardContent style={{ padding: 16 }}>
                <Text
                  style={{
                    fontSize: 18,
                    fontWeight: "600",
                    color: theme.colors.text,
                    marginBottom: 16,
                  }}
                >
                  Danger Zone
                </Text>

                <TouchableOpacity
                  onPress={handleClearHistory}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    padding: 12,
                    backgroundColor: theme.colors.notification + "20",
                    borderRadius: 8,
                    marginBottom: 12,
                  }}
                >
                  <Trash2
                    size={20}
                    color={theme.colors.notification}
                    style={{ marginRight: 12 }}
                  />
                  <Text
                    style={{ fontSize: 16, color: theme.colors.notification }}
                  >
                    Clear Chat History
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleDeleteChat}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    padding: 12,
                    backgroundColor: theme.colors.notification + "20",
                    borderRadius: 8,
                  }}
                >
                  <Trash2
                    size={20}
                    color={theme.colors.notification}
                    style={{ marginRight: 12 }}
                  />
                  <Text
                    style={{ fontSize: 16, color: theme.colors.notification }}
                  >
                    Delete Chat
                  </Text>
                </TouchableOpacity>
              </CardContent>
            </Card>
          )}
        </ScrollView>
      )}

      {/* Change Name Modal */}
      <Modal
        visible={showNameModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowNameModal(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: theme.colors.background + "80",
            justifyContent: "center",
            padding: 20,
          }}
        >
          <View
            style={{
              backgroundColor: theme.colors.card,
              borderRadius: 12,
              padding: 20,
            }}
          >
            <Text
              style={{
                fontSize: 18,
                fontWeight: "600",
                color: theme.colors.text,
                marginBottom: 16,
              }}
            >
              Change Chat Name
            </Text>

            <Input
              value={newChannelName}
              onChangeText={setNewChannelName}
              placeholder="Enter new chat name"
              style={{
                backgroundColor: theme.colors.border,
                borderColor: theme.colors.border,
                color: theme.colors.text,
                marginBottom: 16,
              }}
            />

            <View style={{ flexDirection: "row", gap: 12 }}>
              <Button
                onPress={() => setShowNameModal(false)}
                variant="outline"
                style={{ flex: 1 }}
              >
                <Text>Cancel</Text>
              </Button>
              <Button onPress={handleUpdateChannelName} style={{ flex: 1 }}>
                <Text>Save</Text>
              </Button>
            </View>
          </View>
        </View>
      </Modal>

      {/* Members Modal */}
      <Modal
        visible={showMembersModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowMembersModal(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: theme.colors.background + "80",
            justifyContent: "flex-end",
          }}
        >
          <View
            style={{
              backgroundColor: theme.colors.card,
              borderTopLeftRadius: 12,
              borderTopRightRadius: 12,
              maxHeight: "70%",
              padding: 20,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 16,
              }}
            >
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: "600",
                  color: theme.colors.text,
                }}
              >
                Chat Members
              </Text>
              <TouchableOpacity onPress={() => setShowMembersModal(false)}>
                <Text style={{ color: theme.colors.primary }}>Done</Text>
              </TouchableOpacity>
            </View>

            <FlatList
              data={members}
              keyExtractor={(item) => item.user_id}
              renderItem={({ item }) => (
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    padding: 12,
                    backgroundColor: theme.colors.border,
                    borderRadius: 8,
                    marginBottom: 8,
                  }}
                >
                  <Avatar
                    style={{ width: 40, height: 40, marginRight: 12 }}
                    alt={item.user?.name || ""}
                  >
                    {item.user?.image ? (
                      <AvatarImage source={{ uri: item.user.image }} />
                    ) : (
                      <AvatarFallback>
                        <Text
                          style={{
                            color: theme.colors.text,
                            fontSize: 14,
                            fontWeight: "600",
                          }}
                        >
                          {getMemberInitials(item)}
                        </Text>
                      </AvatarFallback>
                    )}
                  </Avatar>

                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontSize: 16,
                        fontWeight: "500",
                        color: theme.colors.text,
                      }}
                    >
                      {getMemberDisplayName(item)}
                    </Text>
                    <Text
                      style={{
                        fontSize: 14,
                        color: theme.colors.text + "80",
                      }}
                    >
                      {item.role === "admin" || item.role === "owner"
                        ? "Admin"
                        : "Member"}
                    </Text>
                  </View>

                  {isCurrentUserAdmin() && item.user_id !== client?.userID && (
                    <View style={{ flexDirection: "row", gap: 8 }}>
                      <TouchableOpacity
                        onPress={() => handleBanMember(item.user_id)}
                        style={{ padding: 8 }}
                      >
                        <Ban size={20} color={theme.colors.notification} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleRemoveMember(item.user_id)}
                        style={{ padding: 8 }}
                      >
                        <UserMinus
                          size={20}
                          color={theme.colors.notification}
                        />
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              )}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
