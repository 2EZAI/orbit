import Constants from "expo-constants";
import { useFocusEffect, useRouter } from "expo-router";
import { BellOff, MessageCircle, Plus, Search, X } from "lucide-react-native";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type {
  Channel,
  ChannelFilters,
  ChannelSort,
  DefaultGenerics,
} from "stream-chat";
import { ChannelAvatar, ChannelList } from "stream-chat-expo";
import { useTheme } from "~/src/components/ThemeProvider";
import { Button } from "~/src/components/ui/button";
import { Card, CardContent } from "~/src/components/ui/card";
import { Text } from "~/src/components/ui/text";
import { useAuth } from "~/src/lib/auth";
import { useChat } from "~/src/lib/chat";

import type { ChannelMemberResponse } from "stream-chat";
import type { ChannelPreviewMessengerProps } from "stream-chat-expo";
import GlassPressable from "~/src/components/ui/GlassPressable";

const BACKEND_URL = Constants.expoConfig?.extra?.backendUrl;
// console.log("[ChatList] Configured Backend URL:", BACKEND_URL);

if (!BACKEND_URL) {
  console.error("[ChatList] Backend URL is not configured in Constants!");
}

// Static options for ChannelList
const CHANNEL_LIST_OPTIONS = {
  state: true,
  watch: true,
  presence: false,
  limit: 30,
  messages_limit: 10,
  member_limit: 30,
};

// Static sort for ChannelList
const CHANNEL_SORT: ChannelSort = [{ last_message_at: -1 as const }];

// Modern search component
const ModernSearchInput = ({
  value,
  onChangeText,
  onClose,
  isVisible,
}: {
  value: string;
  onChangeText: (text: string) => void;
  onClose: () => void;
  isVisible: boolean;
}) => {
  const { theme, isDarkMode } = useTheme();

  if (!isVisible) return null;

  return (
    <View
      style={{
        paddingHorizontal: 16,
        paddingVertical: 8,
        backgroundColor: theme.colors.card,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",

          backgroundColor: isDarkMode
            ? "rgba(255, 255, 255, 0.08)"
            : "rgba(255, 255, 255, 0.9)",
          borderRadius: 12,
          paddingHorizontal: 12,
          paddingVertical: 8,
          marginBottom: 8,
        }}
      >
        <Search size={16} color={theme.colors.text + "60"} />
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder="Search conversations..."
          placeholderTextColor={theme.colors.text + "60"}
          style={{
            flex: 1,
            fontSize: 16,
            color: theme.colors.text,
            marginLeft: 8,
            marginRight: 8,
          }}
          autoCapitalize="none"
          autoCorrect={false}
          autoFocus={true}
        />
        {value.length > 0 && (
          <TouchableOpacity onPress={() => onChangeText("")}>
            <X size={16} color={theme.colors.text + "60"} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

// Enhanced channel preview component
const ModernChannelPreview = (
  props: ChannelPreviewMessengerProps<DefaultGenerics>
) => {
  const { channel, onSelect } = props;
  const { theme, isDarkMode } = useTheme();
  const { session } = useAuth();
  const getChannelName = () => {
    const members = Object.values(channel.state.members);

    if (members.length === 2) {
      return (
        members.find((m) => m.user?.id !== session?.user.id)?.user?.name ||
        "Chat"
      );
    } else if (channel.data?.name) {
      return channel.data.name;
    }

    // Get other members (excluding current user)
    const otherMembers = Object.values(channel.state.members).filter(
      (member: ChannelMemberResponse<DefaultGenerics>) =>
        member.user?.id !== channel._client.userID
    );

    if (otherMembers.length === 0) {
      return "Chat";
    }

    // For 1-on-1 chats, show the other person's name
    if (otherMembers.length === 1) {
      const member = otherMembers[0];
      const firstName = member.user?.first_name || "";
      const lastName = member.user?.last_name || "";
      const username = member.user?.username;

      if (firstName || lastName) {
        return `${firstName} ${lastName}`.trim();
      }
      return username || "Unknown User";
    }

    // For group chats, show first few names
    return otherMembers
      .slice(0, 3)
      .map((member: ChannelMemberResponse<DefaultGenerics>) => {
        const firstName = member.user?.first_name;
        const username = member.user?.username;
        return firstName || username || "Unknown";
      })
      .join(", ");
  };

  const getLastMessagePreview = () => {
    const lastMessage =
      channel.state.messages[channel.state.messages.length - 1];
    const typingUsers = Object.keys(channel.state.typing || {});

    if (typingUsers.length > 0) {
      // Get typing user names (avoid emails)
      const typingNames = typingUsers
        .map((userId) => {
          const member = channel.state.members[userId];
          const user = member?.user;
          if (user?.first_name || user?.last_name) {
            return `${user.first_name || ""} ${user.last_name || ""}`.trim();
          }
          return user?.username || "Someone";
        })
        .filter((name) => name !== "Someone");

      if (typingNames.length === 1) {
        return `${typingNames[0]} is typing...`;
      } else if (typingNames.length > 1) {
        return `${typingNames.join(", ")} are typing...`;
      }
      return "Someone is typing...";
    }

    if (lastMessage?.text) {
      return lastMessage.text;
    }

    if (
      lastMessage?.attachments?.length &&
      lastMessage.attachments.length > 0
    ) {
      const attachment = lastMessage.attachments[0];
      if (attachment.type === "image") return "📷 Photo";
      if (attachment.type === "video") return "🎥 Video";
      if (attachment.type === "file") return "📄 File";
      return "📎 Attachment";
    }

    return "No messages yet";
  };

  const getLastMessageTime = () => {
    const lastMessage =
      channel.state.messages[channel.state.messages.length - 1];
    if (!lastMessage?.created_at) return "";

    const messageDate = new Date(lastMessage.created_at);
    const now = new Date();
    const diffInHours =
      (now.getTime() - messageDate.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return messageDate.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    } else if (diffInHours < 168) {
      // Less than a week
      return messageDate.toLocaleDateString([], { weekday: "short" });
    } else {
      return messageDate.toLocaleDateString([], {
        month: "short",
        day: "numeric",
      });
    }
  };

  const unreadCount = channel.countUnread();
  const isMuted = channel.muteStatus().muted;

  return (
    <GlassPressable
      onPress={() => onSelect?.(channel)}
      baselineIntensity={28}
      pressIntensity={44}
      style={{ marginHorizontal: 5, marginBottom: 10 }}
    >
      <Card
        style={{
          overflow: "hidden",
          // Translucent to allow glass blur to show underlying content
          backgroundColor: isDarkMode
            ? "rgba(28,28,30,0.55)"
            : "rgba(255,255,255,0.40)",
          borderColor: isDarkMode
            ? theme.colors.border + "60"
            : theme.colors.border + "80",
          shadowColor: theme.colors.border,
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.08,
          shadowRadius: 4,
          elevation: 2,
        }}
      >
        <CardContent className="p-4">
          <View className="flex-row items-center space-x-8">
            {/* Avatar */}
            <View className="relative">
              <ChannelAvatar channel={channel} size={52} />
              {/* Online indicator for 1-on-1 chats */}
              {Object.keys(channel.state.members).length === 2 &&
                (() => {
                  // Get the other member (not current user)
                  const otherMembers = Object.values(
                    channel.state.members
                  ).filter(
                    (member: any) => member.user?.id !== channel._client.userID
                  );
                  const otherMember = otherMembers[0];
                  const isOnline = otherMember?.user?.online;

                  return isOnline ? (
                    <View className="absolute right-0 bottom-0 w-4 h-4 bg-green-500 rounded-full border-2 border-white" />
                  ) : null;
                })()}
            </View>

            {/* Content */}
            <View className="flex-1 ml-4 min-w-0">
              <View className="flex-row justify-between items-center mb-1">
                <Text
                  className="text-base font-semibold text-foreground"
                  numberOfLines={1}
                >
                  {getChannelName()}
                </Text>
                <View className="flex-row items-center space-x-2">
                  {isMuted && <BellOff size={16} color={theme.colors.text} />}
                  <Text className="text-xs text-muted-foreground">
                    {getLastMessageTime()}
                  </Text>
                </View>
              </View>

              <View className="flex-row justify-between items-center">
                <Text
                  className="flex-1 text-sm text-muted-foreground"
                  numberOfLines={1}
                >
                  {getLastMessagePreview()}
                </Text>
                {!!(unreadCount > 0) && (
                  <View
                    style={{
                      marginLeft: 8,
                      backgroundColor: theme.colors.notification,
                      borderRadius: 12,
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                      minWidth: 24,
                      alignItems: "center",
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: "bold",
                        color: theme.colors.background,
                      }}
                    >
                      {unreadCount > 99 ? "99+" : String(unreadCount)}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        </CardContent>
      </Card>
    </GlassPressable>
  );
};

// Modern empty state component
const ModernEmptyState = ({ handleNewChat }: { handleNewChat: () => void }) => {
  const { theme } = useTheme();
  return (
    <View className="flex-1 justify-center items-center px-8 py-16">
      <View className="justify-center items-center mb-6 w-20 h-20 rounded-full bg-muted">
        <MessageCircle size={32} color={theme.colors.text} />
      </View>
      <Text className="mb-2 text-xl font-semibold text-foreground">
        No conversations yet
      </Text>
      <Text className="mb-8 leading-6 text-center text-muted-foreground">
        Start chatting with friends or create a group chat to begin sharing
        messages, photos, and more.
      </Text>
      <Button onPress={handleNewChat} className="px-8 py-3">
        <Text className="font-medium text-primary-foreground">
          Start Your First Chat
        </Text>
      </Button>
    </View>
  );
};

// Modern loading state component
const ModernLoadingState = () => {
  const { theme } = useTheme();
  return (
    <View className="flex-1 justify-center items-center px-6">
      <ActivityIndicator
        size="large"
        color={theme.colors.text}
        className="mb-4"
      />
      <Text className="text-lg font-medium text-foreground">
        Loading Messages
      </Text>
      <Text className="mt-2 text-center text-muted-foreground">
        Please wait while we fetch your conversations...
      </Text>
    </View>
  );
};

export default function ChatListScreen() {
  const router = useRouter();
  const { client, isConnecting, connectionError, isConnected } = useChat();
  const { session } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [searchText, setSearchText] = useState("");
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { theme, isDarkMode } = useTheme();

  // Real-time channel updates: refresh when membership or channel changes
  useEffect(() => {
    if (!client?.userID) return;
    const reload = () => setRefreshKey((prev: number) => prev + 1);

    const subs = [
      client.on("channel.created", reload),
      client.on("channel.updated", reload),
      client.on("notification.added_to_channel", reload),
      client.on("member.added", reload),
      client.on("member.removed", reload),
    ];

    return () => {
      subs.forEach((sub) => sub?.unsubscribe?.());
    };
  }, [client?.userID]);

  // Memoize filters
  const filters = useMemo<ChannelFilters>(() => {
    // console.log("[ChatList] Creating filters:", {
    //   hasUserId: !!client?.userID,
    //   searchText: searchText || "none",
    //   userId: client?.userID,
    // });
    if (!client?.userID) return { type: "messaging" };
    return {
      type: "messaging",
      members: { $in: [client.userID] },
      ...(searchText
        ? {
            name: { $autocomplete: searchText },
          }
        : {}),
    };
  }, [client?.userID, searchText]);

  // Handle initial loading state
  useEffect(() => {
    if (!client?.userID || !isConnected) {
      setIsLoading(true);
      return;
    }
    setIsLoading(false);
  }, [client?.userID, isConnected]);

  const handleNewChat = useCallback(() => {
    if (!client?.userID) {
      console.log("[ChatList] Cannot create chat: No user ID");
      return;
    }
    console.log("[ChatList] Navigating to new chat screen");
    router.push("/(app)/(chat)/new");
  }, [client?.userID, router]);

  const handleVideoCalls = useCallback(() => {
    console.log("[ChatList] Navigating to video calls");
    router.push("/(app)/(chat)/video");
  }, [router]);

  const handleChannelSelect = useCallback(
    (channel: Channel<DefaultGenerics>) => {
      if (!client?.userID) {
        console.log("[ChatList] Cannot open chat: No user ID");
        return;
      }

      // Ensure current user is a member (DMs may be reused after both left)
      (async () => {
        try {
          await channel.watch();
          const members = Object.values(channel.state.members || {});
          const currentMemberIds = members.map((m: any) => m.user?.id);
          const myId = client.userID as string;
          if (myId && !currentMemberIds.includes(myId)) {
            await channel.addMembers([myId]);
          }
        } catch (e) {
          console.log(
            "[ChatList] Membership ensure failed (safe to ignore):",
            e
          );
        }
      })();

      const route = {
        pathname: "/(app)/(chat)/channel/[id]",
        params: { id: channel.id },
      };

      // console.log("[ChatList] Attempting navigation with route:", route);

      try {
        router.push(route);
        console.log("[ChatList] Navigation push completed");
      } catch (error) {
        console.error("[ChatList] Navigation error:", error);
      }
    },
    [client?.userID, router]
  );

  const handleSearch = useCallback(() => {
    setIsSearchVisible(true);
  }, []);

  const handleCloseSearch = useCallback(() => {
    setSearchText("");
    setIsSearchVisible(false);
  }, []);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    setRefreshKey((prev) => prev + 1);
    // Give visual feedback even if refresh is quick
    await new Promise((resolve) => setTimeout(resolve, 500));
    setIsRefreshing(false);
  }, []);

  // Refresh on focus
  useFocusEffect(
    useCallback(() => {
      console.log("[ChatList] Screen focused, refreshing channel list");
      setRefreshKey((prev) => prev + 1);
    }, [])
  );

  if (isLoading || isConnecting || !isConnected) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.card }}>
        <ModernLoadingState />
      </SafeAreaView>
    );
  }

  if (error || connectionError) {
    const displayError = error || connectionError?.message;
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.card }}>
        <View className="flex-1 justify-center items-center px-6">
          <View
            style={{
              justifyContent: "center",
              alignItems: "center",
              marginBottom: 16,
              width: 64,
              height: 64,
              borderRadius: 32,
              backgroundColor: theme.colors.notification + "20",
            }}
          >
            <X size={24} color={theme.colors.notification} />
          </View>
          <Text
            style={{
              marginBottom: 8,
              fontSize: 18,
              fontWeight: "600",
              color: theme.colors.text,
            }}
          >
            Connection Error
          </Text>
          <Text
            style={{
              marginBottom: 24,
              textAlign: "center",
              color: theme.colors.text + "80",
            }}
          >
            {displayError}
          </Text>
          <Button
            onPress={() => {
              setError(null);
              setIsLoading(true);
            }}
            variant="outline"
          >
            <Text>Try Again</Text>
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  if (!client?.userID) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.card }}>
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color={theme.colors.text} />
          <Text
            style={{
              marginTop: 16,
              color: theme.colors.text + "80",
            }}
          >
            Establishing connection...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.card }}>
      <View style={{ flex: 1, backgroundColor: theme.colors.card }}>
        {/* iOS Messages Style Header */}
        <View
          style={{
            paddingHorizontal: 16,
            paddingTop: 0,
            paddingBottom: 10,
            backgroundColor: theme.colors.card,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            {/* Large Title - Left aligned like iOS Messages */}
            <Text
              style={{
                fontSize: 34,
                fontWeight: "bold",
                color: theme.colors.text,
                letterSpacing: -0.5,
                lineHeight: 40,
              }}
            >
              Messages
            </Text>

            {/* Action Buttons - Right side */}
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 12 }}
            >
              {/* Video Calls Button - HIDDEN during development */}
              {/* 
              <TouchableOpacity
                onPress={handleVideoCalls}
                style={{
                  justifyContent: "center",
                  alignItems: "center",
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: theme.colors.primary,
                }}
              >
                <Video size={18} color={theme.colors.text} strokeWidth={2.5} />
              </TouchableOpacity>
              */}
              <TouchableOpacity
                onPress={handleSearch}
                style={{
                  justifyContent: "center",
                  alignItems: "center",
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: theme.colors.primary,
                }}
              >
                <Search size={18} color={theme.colors.card} strokeWidth={2.5} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleNewChat}
                style={{
                  justifyContent: "center",
                  alignItems: "center",
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: theme.colors.primary,
                }}
              >
                <Plus size={18} color={theme.colors.card} strokeWidth={2.5} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Search Input */}
        <ModernSearchInput
          value={searchText}
          onChangeText={setSearchText}
          onClose={handleCloseSearch}
          isVisible={isSearchVisible}
        />

        {/* Channel List */}
        <View style={{ flex: 1, backgroundColor: theme.colors.card }}>
          <ChannelList
            key={refreshKey}
            filters={filters}
            sort={CHANNEL_SORT}
            options={{
              state: true,
              watch: true,
              presence: true,
              limit: 30,
              message_limit: 10,
              member_limit: 30,
            }}
            Preview={(previewProps) => (
              <ModernChannelPreview
                {...previewProps}
                onSelect={handleChannelSelect}
              />
            )}
            onSelect={handleChannelSelect}
            EmptyStateIndicator={() => (
              <ModernEmptyState handleNewChat={handleNewChat} />
            )}
            LoadingIndicator={ModernLoadingState}
            additionalFlatListProps={{
              refreshControl: (
                <RefreshControl
                  refreshing={isRefreshing}
                  onRefresh={handleRefresh}
                  tintColor={theme.colors.primary}
                  colors={[theme.colors.primary]}
                />
              ),
              onEndReachedThreshold: 0.5,
              maxToRenderPerBatch: 10,
              initialNumToRender: 15,
              contentContainerStyle: {
                paddingVertical: 16,
                backgroundColor: theme.colors.card,
              },
              style: {
                backgroundColor: theme.colors.card,
              },
              showsVerticalScrollIndicator: false,
            }}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}
