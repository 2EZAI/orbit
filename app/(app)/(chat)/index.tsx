import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import {
  SafeAreaView,
  View,
  TouchableOpacity,
  TextInput,
  Animated,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import {
  ChannelList,
  Channel as StreamChannel,
  ChannelAvatar,
  useTheme as useStreamTheme,
  ChannelPreviewMessenger,
} from "stream-chat-expo";
import { useChat } from "~/src/lib/chat";
import { useAuth } from "~/src/lib/auth";
import { useRouter, useFocusEffect } from "expo-router";
import Constants from "expo-constants";
import type {
  Channel,
  ChannelFilters,
  ChannelSort,
  DefaultGenerics,
} from "stream-chat";
import {
  Plus,
  Search,
  X,
  Bell,
  BellOff,
  Trash2,
  Users,
} from "lucide-react-native";
import { useTheme } from "~/src/components/ThemeProvider";
import { Text } from "~/src/components/ui/text";

import type { ChannelPreviewMessengerProps } from "stream-chat-expo";
import type { ChannelMemberResponse } from "stream-chat";

const BACKEND_URL = Constants.expoConfig?.extra?.backendUrl;
console.log("[ChatList] Configured Backend URL:", BACKEND_URL);

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

// Static FlatList props
const FLAT_LIST_PROPS = {
  initialNumToRender: 10,
  maxToRenderPerBatch: 3,
  windowSize: 10,
  removeClippedSubviews: true,
  updateCellsBatchingPeriod: 150,
};

const SearchInput = ({
  value,
  onChangeText,
  onClose,
}: {
  value: string;
  onChangeText: (text: string) => void;
  onClose: () => void;
}) => {
  const { theme } = useTheme();

  return (
    <View className="flex-row items-center px-4 py-2 space-x-2 bg-background">
      <View className="flex-row items-center px-3 py-2 space-x-2 rounded-lg bg-muted">
        <Search size={20} color={theme.colors.text} />
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder="Search conversations..."
          placeholderTextColor={theme.colors.text}
          className="flex-1 text-base text-foreground"
        />
      </View>
      {value.length > 0 && (
        <TouchableOpacity onPress={onClose}>
          <X size={24} color={theme.colors.text} />
        </TouchableOpacity>
      )}
    </View>
  );
};

// Enhanced channel preview component using Stream's UI components
const EnhancedChannelPreview = (
  props: ChannelPreviewMessengerProps<DefaultGenerics>
) => {
  const { channel, onSelect } = props;
  const { theme } = useTheme();

  console.log("[ChatList] Rendering channel preview:", {
    channelId: channel.id,
    hasOnSelect: !!onSelect,
  });

  // Use the default ChannelPreviewMessenger with our custom UI
  return (
    <ChannelPreviewMessenger
      {...props}
      PreviewAvatar={(avatarProps) => (
        <View className="relative">
          <ChannelAvatar {...avatarProps} size={48} />
          {channel.state.watcher_count > 0 && (
            <View className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full" />
          )}
        </View>
      )}
      PreviewTitle={(titleProps) => (
        <Text
          className="text-base font-semibold text-foreground"
          numberOfLines={1}
        >
          {channel.data?.name ||
            Object.values(channel.state.members)
              .filter(
                (member: ChannelMemberResponse<DefaultGenerics>) =>
                  member.user?.id !== channel._client.userID
              )
              .map(
                (member: ChannelMemberResponse<DefaultGenerics>) =>
                  member.user?.name || member.user?.id
              )
              .join(", ")}
        </Text>
      )}
      PreviewMessage={(messageProps) => {
        const lastMessage =
          channel.state.messages[channel.state.messages.length - 1];
        const isTyping = Object.keys(channel.state.typing || {}).length > 0;
        return (
          <Text className="text-sm text-muted-foreground" numberOfLines={1}>
            {isTyping
              ? "Someone is typing..."
              : lastMessage?.text || "No messages yet"}
          </Text>
        );
      }}
      PreviewStatus={(statusProps) => {
        const unreadCount = channel.countUnread();
        const isMuted = channel.muteStatus().muted;
        const lastMessage =
          channel.state.messages[channel.state.messages.length - 1];
        return (
          <View className="flex-row items-center space-x-2">
            {isMuted && <Bell size={16} className="text-muted-foreground" />}
            {unreadCount > 0 && (
              <View className="items-center justify-center w-6 h-6 rounded-full bg-primary">
                <Text className="text-xs font-medium text-primary-foreground">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </Text>
              </View>
            )}
            <Text className="text-xs text-muted-foreground">
              {lastMessage?.created_at &&
                new Date(lastMessage.created_at).toLocaleDateString()}
            </Text>
          </View>
        );
      }}
    />
  );
};

// Enhanced empty state component
const EnhancedEmptyState = ({
  handleNewChat,
}: {
  handleNewChat: () => void;
}) => (
  <View className="items-center justify-center flex-1 px-6 py-12">
    <Users size={48} className="mb-4 text-muted-foreground" />
    <Text className="mb-2 text-xl font-semibold text-foreground">
      No Conversations Yet
    </Text>
    <Text className="mb-8 text-center text-muted-foreground">
      Start chatting with friends or create a group chat to begin sharing
      messages, photos, and more.
    </Text>
    <TouchableOpacity
      onPress={handleNewChat}
      className="px-6 py-3 rounded-lg bg-primary"
    >
      <Text className="font-medium text-primary-foreground">
        Start a New Chat
      </Text>
    </TouchableOpacity>
  </View>
);

// Enhanced loading state component
const EnhancedLoadingState = () => (
  <View className="items-center justify-center flex-1 px-6">
    <ActivityIndicator size="large" className="mb-4" />
    <Text className="text-lg font-medium text-foreground">
      Loading Conversations
    </Text>
    <Text className="mt-2 text-center text-muted-foreground">
      Please wait while we fetch your chats...
    </Text>
  </View>
);

// Enhanced search component
const EnhancedSearch = ({
  value,
  onChangeText,
  onClose,
}: {
  value: string;
  onChangeText: (text: string) => void;
  onClose: () => void;
}) => {
  const { theme } = useTheme();

  return (
    <View className="px-4 py-3 border-b bg-background border-border">
      <View className="flex-row items-center px-4 py-2 space-x-3 rounded-lg bg-muted">
        <Search size={20} className="text-muted-foreground" />
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder="Search conversations..."
          placeholderTextColor={theme.colors.text}
          className="flex-1 text-base text-foreground"
          autoCapitalize="none"
          autoCorrect={false}
        />
        {value.length > 0 && (
          <TouchableOpacity onPress={() => onChangeText("")}>
            <X size={20} className="text-muted-foreground" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

export default function ChatListScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { client, isConnecting, connectionError, isConnected } = useChat();
  const { session } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [searchText, setSearchText] = useState("");
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const searchBarHeight = useRef(new Animated.Value(0)).current;
  const [isLoading, setIsLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const streamTheme = useStreamTheme();

  // Memoize filters
  const filters = useMemo<ChannelFilters>(() => {
    console.log("[ChatList] Creating filters:", {
      hasUserId: !!client?.userID,
      searchText: searchText || "none",
      userId: client?.userID,
    });
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
    router.push("/new");
  }, [client?.userID, router]);

  const handleChannelSelect = useCallback(
    (channel: Channel<DefaultGenerics>) => {
      if (!client?.userID) {
        console.log("[ChatList] Cannot open chat: No user ID");
        return;
      }

      // Detailed logging before navigation
      console.log("[ChatList] Channel select triggered:", {
        channelId: channel.id,
        channelType: channel.type,
        memberCount: channel.state.members?.length,
        channelData: channel.data,
      });

      const route = {
        pathname: "/channel/[id]",
        params: { id: channel.id },
      };

      console.log("[ChatList] Attempting navigation with route:", route);

      try {
        router.push(route);
        console.log("[ChatList] Navigation push completed");
      } catch (error) {
        console.error("[ChatList] Navigation error:", error);
      }
    },
    [client?.userID, router]
  );

  const showSearchBar = useCallback(() => {
    setIsSearchVisible(true);
    Animated.spring(searchBarHeight, {
      toValue: 56,
      useNativeDriver: false,
    }).start();
  }, [searchBarHeight]);

  const hideSearchBar = useCallback(() => {
    Animated.spring(searchBarHeight, {
      toValue: 0,
      useNativeDriver: false,
    }).start(() => setIsSearchVisible(false));
  }, [searchBarHeight]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    setRefreshKey((prev) => prev + 1);
    // Give visual feedback even if refresh is quick
    await new Promise((resolve) => setTimeout(resolve, 500));
    setIsRefreshing(false);
  }, []);

  const handleSearch = useCallback(() => {
    setIsSearching(true);
    showSearchBar();
  }, [showSearchBar]);

  const handleCloseSearch = useCallback(() => {
    setSearchText("");
    setIsSearching(false);
    hideSearchBar();
  }, [hideSearchBar]);

  // Refresh on focus
  useFocusEffect(
    useCallback(() => {
      console.log("[ChatList] Screen focused, refreshing channel list");
      setRefreshKey((prev) => prev + 1);
    }, [])
  );

  if (isLoading || isConnecting || !isConnected) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="items-center justify-center flex-1">
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text className="mt-4 text-foreground">
            {isConnecting ? "Connecting to chat..." : "Loading chats..."}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || connectionError) {
    const displayError = error || connectionError?.message;
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="items-center justify-center flex-1">
          <Text className="px-4 text-center text-red-500">
            Error: {displayError}
          </Text>
          <TouchableOpacity
            onPress={() => {
              setError(null);
              setIsLoading(true);
            }}
            className="p-2 mt-4 rounded bg-primary"
          >
            <Text className="text-white">Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!client?.userID) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="items-center justify-center flex-1">
          <Text className="text-foreground">Waiting for connection...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-1">
        <View className="flex-row items-center justify-between px-4 py-3 border-b border-border">
          <Text className="text-xl font-semibold text-foreground">
            Messages
          </Text>
          <View className="flex-row space-x-4">
            <TouchableOpacity onPress={handleSearch}>
              <Search size={24} className="text-foreground" />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleNewChat}>
              <Plus size={24} className="text-foreground" />
            </TouchableOpacity>
          </View>
        </View>

        {isSearchVisible && (
          <EnhancedSearch
            value={searchText}
            onChangeText={setSearchText}
            onClose={handleCloseSearch}
          />
        )}

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
          Preview={EnhancedChannelPreview}
          onSelect={handleChannelSelect}
          EmptyStateIndicator={() => (
            <EnhancedEmptyState handleNewChat={handleNewChat} />
          )}
          LoadingIndicator={EnhancedLoadingState}
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
          }}
        />
      </View>
    </SafeAreaView>
  );
}
