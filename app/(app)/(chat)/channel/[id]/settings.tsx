import * as ImagePicker from "expo-image-picker";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import {
  ArrowLeft,
  Bell,
  BellOff,
  Camera,
  Edit3,
  Image as ImageIcon,
  LogOut,
  Trash2,
  UserMinus,
  UserPlus,
  Users,
} from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  Image,
  Modal,
  ScrollView,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useTheme } from "~/src/components/ThemeProvider";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "~/src/components/ui/avatar";
import { Button } from "~/src/components/ui/button";
import { Card, CardContent } from "~/src/components/ui/card";
import { Input } from "~/src/components/ui/input";
import { useChat } from "~/src/lib/chat";
import { ImagePickerService } from "~/src/lib/imagePicker";

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
  const [channelImage, setChannelImage] = useState<string | null>(null);

  const [channelInstance, setChannelInstance] = useState<any>(null);

  const loadChannelData = async () => {
    if (!client || !id) return;

    try {
      setLoading(true);
      // Get the channel instance and refresh its data
      const newChannelInstance = client.channel("messaging", id);

      // Watch the channel to get all data
      await newChannelInstance.watch();

      // Query fresh member data to get updated count
      const membersResponse = await newChannelInstance.queryMembers({});

      setChannelInstance(newChannelInstance);
      setChannel(newChannelInstance.data || {});
      setNewChannelName(newChannelInstance.data?.name || "");
      setChannelImage(
        newChannelInstance.data?.image
          ? String(newChannelInstance.data.image)
          : null
      );
      setIsMuted(newChannelInstance.muteStatus().muted);

      // Use fresh member data from the query
      setMembers(membersResponse.members);
    } catch (error) {
      console.error("Error loading channel data:", error);
      Alert.alert("Error", "Failed to load channel settings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadChannelData();
  }, [client, id]);

  // Refresh data when screen comes into focus (e.g., returning from add members)
  useFocusEffect(
    React.useCallback(() => {
      loadChannelData();
    }, [client, id])
  );

  const handleUpdateChannelName = async () => {
    if (!channelInstance || !newChannelName.trim()) return;

    try {
      // Get current image to preserve it
      const currentImage = channel?.image || channelInstance.data?.image;

      // Update the channel with both name and image to preserve image
      await channelInstance.update({
        name: newChannelName.trim(),
        ...(currentImage && { image: currentImage }),
      });

      // Update the UI immediately with the new data
      setChannel((prev: any) => ({
        ...prev,
        name: newChannelName.trim(),
      }));

      setShowNameModal(false);
      Alert.alert("Success", "Channel name updated successfully");
    } catch (error) {
      console.error("Error updating channel name:", error);
      Alert.alert("Error", "Failed to update channel name");
    }
  };

  const handleChangeChannelImage = async () => {
    if (!isCurrentUserAdmin()) {
      Alert.alert(
        "Permission Denied",
        "Only admins can change the group photo"
      );
      return;
    }

    if (!channelInstance) {
      Alert.alert("Error", "Channel not loaded");
      return;
    }

    try {
      const results = await ImagePickerService.pickImage({
        allowsMultipleSelection: false,
        quality: 0.8,
        allowsEditing: true,
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
      });

      if (results && results.length > 0) {
        const selectedImage = results[0];
        if (selectedImage.uri) {
          // Store image URL in both local state and channel update
          const imageUrl = selectedImage.uri;
          setChannelImage(imageUrl);

          // Get current name to preserve it
          const currentName = channel?.name || channelInstance.data?.name;

          // Update the channel with both image and name to preserve name
          await channelInstance.update({
            image: imageUrl,
            ...(currentName && { name: currentName }),
          });

          // Update local state - preserve all existing data
          setChannel((prev: any) => ({
            ...prev,
            image: imageUrl,
          }));

          Alert.alert("Success", "Group photo updated successfully");
        }
      }
    } catch (error) {
      console.error("Error changing channel image:", error);
      Alert.alert("Error", "Failed to update group photo");
    }
  };

  const handleToggleMute = async () => {
    if (!channelInstance) return;

    try {
      if (isMuted) {
        await channelInstance.unmute();
        setIsMuted(false);
      } else {
        await channelInstance.mute();
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
    if (!channelInstance) return;

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
              await channelInstance.removeMembers([memberId]);
              const membersResponse = await channelInstance.queryMembers({});
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
              if (!channelInstance || !client?.userID) return;

              await channelInstance.removeMembers([client.userID]);
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
    return (
      currentMember?.role === "admin" ||
      currentMember?.role === "owner" ||
      currentMember?.role === "moderator"
    );
  };

  return (
    <View
      style={{ flex: 1, backgroundColor: theme.colors.card, paddingTop: 16 }}
    >
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
              backgroundColor: theme.colors.card,
            }}
          >
            <CardContent style={{ padding: 16, paddingTop: 0 }}>
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

              {/* Channel Image - Only show for group chats */}
              {members.length > 2 && (
                <>
                  <View style={{ marginBottom: 16 }}>
                    <TouchableOpacity
                      onPress={() =>
                        isCurrentUserAdmin() && setShowNameModal(true)
                      }
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
                          {channel?.name || "Unnamed Chat"}
                        </Text>
                      </View>
                      {isCurrentUserAdmin() && (
                        <Edit3 size={20} color={theme.colors.text + "80"} />
                      )}
                    </TouchableOpacity>
                  </View>

                  <View style={{ marginBottom: 16 }}>
                    <TouchableOpacity
                      onPress={handleChangeChannelImage}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: 12,
                        backgroundColor: theme.colors.border,
                        borderRadius: 8,
                      }}
                    >
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          flex: 1,
                        }}
                      >
                        <View style={{ marginRight: 12 }}>
                          {channelImage || channel?.image ? (
                            <Image
                              source={{ uri: channelImage || channel?.image }}
                              style={{
                                width: 40,
                                height: 40,
                                borderRadius: 20,
                              }}
                            />
                          ) : (
                            <View
                              style={{
                                width: 40,
                                height: 40,
                                borderRadius: 20,
                                backgroundColor: theme.colors.primary,
                                justifyContent: "center",
                                alignItems: "center",
                              }}
                            >
                              <Camera size={20} color="white" />
                            </View>
                          )}
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text
                            style={{
                              fontSize: 14,
                              color: theme.colors.text + "80",
                              marginBottom: 4,
                            }}
                          >
                            Group Photo
                          </Text>
                          <Text
                            style={{
                              fontSize: 16,
                              color: theme.colors.text,
                              fontWeight: "500",
                            }}
                          >
                            {channelImage || channel?.image
                              ? "Tap to change"
                              : "Tap to add photo"}
                          </Text>
                        </View>
                      </View>
                      {isCurrentUserAdmin() && (
                        <Camera size={20} color={theme.colors.text + "80"} />
                      )}
                    </TouchableOpacity>
                  </View>
                </>
              )}

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
              backgroundColor: theme.colors.card,
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
              {isCurrentUserAdmin() && members.length > 2 && (
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
              {!isCurrentUserAdmin() && members.length > 2 && (
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

          <Card
            style={{
              marginBottom: 16,
              backgroundColor: theme.colors.card,
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
              {isCurrentUserAdmin() && members.length > 2 ? (
                <>
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
                </>
              ) : (
                <>
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
                </>
              )}
            </CardContent>
          </Card>
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
                style={{
                  flex: 1,
                  backgroundColor: theme.colors.card,
                }}
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
                <TouchableOpacity
                  onPress={() => {
                    if (item.user_id !== client?.userID) {
                      setShowMembersModal(false);
                      // Dismiss the modal and navigate to profile
                      router.push(`/profile/${item.user_id}`);
                    }
                  }}
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

                  {item.user_id !== client?.userID && members.length > 2 && (
                    <TouchableOpacity
                      onPress={() => handleRemoveMember(item.user_id)}
                      style={{ padding: 8 }}
                    >
                      <UserMinus size={20} color={theme.colors.notification} />
                    </TouchableOpacity>
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}
