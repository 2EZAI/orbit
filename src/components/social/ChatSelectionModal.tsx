import React, { useState, useEffect } from "react";
import {
  View,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Modal,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Text } from "~/src/components/ui/text";
import { useTheme } from "~/src/components/ThemeProvider";
import { useChat } from "~/src/lib/chat";
import { useAuth } from "~/src/lib/auth";
import { X, Search, Users, MessageCircle } from "lucide-react-native";
import { UserAvatar } from "~/src/components/ui/user-avatar";
import type { Channel } from "stream-chat";

interface ChatSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectChat: (channel: Channel) => void;
}

export function ChatSelectionModal({
  isOpen,
  onClose,
  onSelectChat,
}: ChatSelectionModalProps) {
  const { theme, isDarkMode } = useTheme();
  const { client } = useChat();
  const { session } = useAuth();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState("");

  useEffect(() => {
    if (isOpen && client) {
      loadChannels();
    }
  }, [isOpen, client]);

  const loadChannels = async () => {
    if (!client?.userID) return;

    try {
      setLoading(true);

      // Query channels where the user is a member
      const response = await client.queryChannels(
        {
          type: "messaging",
          members: { $in: [client.userID] },
        },
        {
          last_message_at: -1,
        },
        {
          limit: 50,
        }
      );

      setChannels(response);
    } catch (error) {
      console.error("Error loading channels:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredChannels = channels.filter((channel) => {
    const channelName = channel.data?.name || "";
    const memberNames = Object.values(channel.state.members || {})
      .map((member: any) => member.user?.name || member.user?.username || "")
      .join(" ");

    const searchLower = searchText.toLowerCase();
    return (
      channelName.toLowerCase().includes(searchLower) ||
      memberNames.toLowerCase().includes(searchLower)
    );
  });

  const getChannelDisplayName = (channel: Channel) => {
    if (channel.data?.name) {
      return channel.data.name;
    }

    // For direct messages, show the other person's name
    const members = Object.values(channel.state.members || {});
    const otherMembers = members.filter(
      (member: any) => member.user?.id !== client?.userID
    );

    if (otherMembers.length === 1) {
      const otherMember = otherMembers[0];
      return otherMember.user?.name || otherMember.user?.username || "Unknown";
    }

    return "Group Chat";
  };

  const getChannelAvatar = (channel: Channel) => {
    if (channel.data?.image) {
      return channel.data.image;
    }

    // For direct messages, show the other person's avatar
    const members = Object.values(channel.state.members || {});
    const otherMembers = members.filter(
      (member: any) => member.user?.id !== client?.userID
    );

    if (otherMembers.length === 1) {
      const otherMember = otherMembers[0];
      return otherMember.user?.image;
    }

    return null;
  };

  const handleSelectChat = (channel: Channel) => {
    onSelectChat(channel);
    onClose();
  };

  const renderChannel = ({ item: channel }: { item: Channel }) => {
    const displayName = getChannelDisplayName(channel);
    const avatar = getChannelAvatar(channel);
    const lastMessage =
      channel.state.messages?.[channel.state.messages.length - 1];
    const unreadCount = channel.state.unreadCount || 0;

    return (
      <TouchableOpacity
        onPress={() => handleSelectChat(channel)}
        className="flex-row items-center p-4 border-b"
        style={{ borderBottomColor: theme.colors.border }}
      >
        <UserAvatar
          size={48}
          user={{
            id: channel.id,
            name: displayName,
            image: avatar,
          }}
        />

        <View className="flex-1 ml-3">
          <View className="flex-row items-center justify-between">
            <Text
              className="text-base font-semibold"
              style={{ color: theme.colors.text }}
              numberOfLines={1}
            >
              {displayName}
            </Text>
            {unreadCount > 0 && (
              <View
                className="px-2 py-1 rounded-full"
                style={{ backgroundColor: theme.colors.primary }}
              >
                <Text className="text-xs font-bold text-white">
                  {unreadCount}
                </Text>
              </View>
            )}
          </View>

          {lastMessage && (
            <Text
              className="text-sm mt-1"
              style={{ color: isDarkMode ? "#9CA3AF" : "#6B7280" }}
              numberOfLines={1}
            >
              {lastMessage.text || "Media message"}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={isOpen}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView
        className="flex-1"
        style={{ backgroundColor: theme.colors.background }}
      >
        {/* Header */}
        <View
          className="flex-row items-center justify-between px-4 py-3 border-b"
          style={{ borderBottomColor: theme.colors.border }}
        >
          <Text
            className="text-lg font-semibold"
            style={{ color: theme.colors.text }}
          >
            Share Post
          </Text>
          <TouchableOpacity onPress={onClose}>
            <X size={24} color={theme.colors.text} />
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View className="px-4 py-3">
          <View
            className="flex-row items-center px-3 py-2 rounded-lg border"
            style={{
              borderColor: theme.colors.border,
              backgroundColor: theme.colors.card,
            }}
          >
            <Search size={20} color={isDarkMode ? "#9CA3AF" : "#6B7280"} />
            <TextInput
              value={searchText}
              onChangeText={setSearchText}
              placeholder="Search chats..."
              placeholderTextColor={isDarkMode ? "#9CA3AF" : "#6B7280"}
              className="flex-1 ml-2 text-base"
              style={{ color: theme.colors.text }}
            />
          </View>
        </View>

        {/* Channels List */}
        {loading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text
              className="mt-4 text-base"
              style={{ color: theme.colors.text }}
            >
              Loading chats...
            </Text>
          </View>
        ) : filteredChannels.length === 0 ? (
          <View className="flex-1 items-center justify-center px-4">
            <MessageCircle
              size={48}
              color={isDarkMode ? "#9CA3AF" : "#6B7280"}
            />
            <Text
              className="mt-4 text-lg font-semibold text-center"
              style={{ color: theme.colors.text }}
            >
              No chats found
            </Text>
            <Text
              className="mt-2 text-center"
              style={{ color: isDarkMode ? "#9CA3AF" : "#6B7280" }}
            >
              {searchText
                ? "Try a different search term"
                : "Start a conversation to share posts"}
            </Text>
          </View>
        ) : (
          <FlatList
            data={filteredChannels}
            renderItem={renderChannel}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            className="flex-1"
          />
        )}
      </SafeAreaView>
    </Modal>
  );
}
