import {
  useEffect,
  useState,
  useRef,
  useCallback,
  useMemo,
  Component,
} from "react";
import {
  SafeAreaView,
  Text,
  View,
  TouchableOpacity,
  TextInput,
  Animated,
  ActivityIndicator,
} from "react-native";
import {
  Chat,
  ChannelList,
  ChannelPreview,
  ChannelAvatar,
  DefaultStreamChatGenerics,
  OverlayProvider,
  Channel as StreamChannel,
} from "stream-chat-expo";
import { useChat } from "~/src/lib/chat";
import { useAuth } from "~/src/lib/auth";
import { useRouter, useFocusEffect } from "expo-router";
import Constants from "expo-constants";
import type { ChannelFilters, ChannelSort, Channel } from "stream-chat";
import { Plus } from "lucide-react-native";
import { useTheme } from "~/src/components/ThemeProvider";

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
const CHANNEL_SORT: ChannelSort<DefaultStreamChatGenerics> = [
  { last_message_at: -1 as const },
];

// Static FlatList props
const FLAT_LIST_PROPS = {
  initialNumToRender: 10,
  maxToRenderPerBatch: 3,
  windowSize: 10,
  removeClippedSubviews: true,
  updateCellsBatchingPeriod: 150,
};

// Error boundary component
class ChannelListErrorBoundary extends Component<
  { children: React.ReactNode; onError: (error: Error) => void },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: {
    children: React.ReactNode;
    onError: (error: Error) => void;
  }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("[ChatList] Error boundary caught error:", error, errorInfo);
    this.props.onError(error);
  }

  render() {
    if (this.state.hasError && this.state.error) {
      return (
        <View className="items-center justify-center flex-1">
          <Text className="px-4 text-center text-red-500">
            Error loading channels: {this.state.error.message}
          </Text>
        </View>
      );
    }

    return this.props.children;
  }
}

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
  const renderCount = useRef(0);
  const [refreshKey, setRefreshKey] = useState(0);

  // Log component lifecycle
  useEffect(() => {
    renderCount.current++;
    console.log("[ChatList] Component mounted:", {
      renderCount: renderCount.current,
      hasClient: !!client,
      clientState: client?.state,
      wsConnection: client?.wsConnection?.isHealthy,
      isConnecting,
      isConnected,
    });

    return () => {
      console.log("[ChatList] Component unmounting");
    };
  }, []);

  // Log state changes
  useEffect(() => {
    console.log("[ChatList] Connection state changed:", {
      hasClient: !!client,
      clientState: client?.state,
      wsConnection: client?.wsConnection?.isHealthy,
      isConnecting,
      isConnected,
    });
  }, [client, isConnecting, isConnected]);

  // Memoize filters with logging
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

  // Add channel state tracking
  const [manualChannels, setManualChannels] = useState<Channel[]>([]);

  // Handle initial loading state with timeout and logging
  useEffect(() => {
    let mounted = true;
    let timeoutId: NodeJS.Timeout;

    const initializeScreen = async () => {
      console.log("[ChatList] Initializing screen:", {
        hasUserId: !!client?.userID,
        isConnected,
        isLoading,
        activeChannels: client?.activeChannels
          ? Object.keys(client.activeChannels).length
          : 0,
      });

      if (!client?.userID || !isConnected) {
        console.log("[ChatList] Waiting for client/connection");
        if (mounted) setIsLoading(true);
        return;
      }

      try {
        console.log("[ChatList] Starting initialization");
        // Set a maximum timeout for initialization
        timeoutId = setTimeout(() => {
          if (mounted) {
            console.log("[ChatList] Initialization timeout");
            setError("Loading took too long. Please try again.");
            setIsLoading(false);
          }
        }, 10000);

        // Try to query channels directly to verify connection
        const channels = await client.queryChannels(
          filters,
          CHANNEL_SORT,
          CHANNEL_LIST_OPTIONS
        );

        console.log("[ChatList] Initial channel query result:", {
          channelCount: channels.length,
          channelIds: channels.map((c) => c.id),
          channelData: channels.map((c) => ({
            id: c.id,
            type: c.type,
            memberCount: Object.keys(c.state.members || {}).length,
            members: Object.keys(c.state.members || {}),
          })),
          filters,
        });

        if (mounted) {
          setManualChannels(channels);
          console.log("[ChatList] Initialization complete");
          setIsLoading(false);
          clearTimeout(timeoutId);
        }
      } catch (err) {
        console.error("[ChatList] Initialization error:", err);
        if (mounted) {
          setError(err instanceof Error ? err.message : "Failed to load chats");
          setIsLoading(false);
        }
      }
    };

    initializeScreen();

    return () => {
      console.log("[ChatList] Cleaning up initialization");
      mounted = false;
      clearTimeout(timeoutId);
    };
  }, [client?.userID, isConnected, filters]);

  const handleNewChat = useCallback(() => {
    if (!client?.userID) {
      console.log("[ChatList] Cannot create chat: No user ID");
      return;
    }
    console.log("[ChatList] Navigating to new chat screen");
    router.push("/(app)/(chat)/new");
  }, [client?.userID, router]);

  const handleChannelSelect = useCallback(
    (channel: Channel) => {
      if (!client?.userID) {
        console.log("[ChatList] Cannot open chat: No user ID");
        return;
      }
      console.log("[ChatList] Opening channel:", {
        channelId: channel.id,
        channelType: channel.type,
        memberCount: channel.state.members?.length,
      });
      router.push(`/(app)/(chat)/${channel.id}`);
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

  // Memoize additional FlatList props
  const additionalFlatListProps = useMemo(
    () => ({
      ...FLAT_LIST_PROPS,
      onEndReached: showSearchBar,
      onEndReachedThreshold: 0.1,
      onMomentumScrollBegin: hideSearchBar,
    }),
    [showSearchBar, hideSearchBar]
  );

  // Add focus effect to refresh channel list
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
        <Animated.View style={{ height: searchBarHeight, overflow: "hidden" }}>
          <View className="px-4 py-2">
            <TextInput
              value={searchText}
              onChangeText={setSearchText}
              placeholder="Search chats..."
              className="p-2 rounded-lg bg-muted"
              placeholderTextColor="#666"
            />
          </View>
        </Animated.View>

        <View style={{ flex: 1 }}>
          <ChannelListErrorBoundary
            onError={(error) => {
              console.error("[ChatList] Channel list error boundary:", error);
              setError(error.message);
            }}
          >
            <ChannelList
              key={`${refreshKey}-${client?.wsConnection?.connectionID}`}
              filters={filters}
              sort={CHANNEL_SORT}
              options={{
                ...CHANNEL_LIST_OPTIONS,
                state: true,
                watch: true,
              }}
              onSelect={handleChannelSelect}
              Preview={ChannelPreview}
              additionalFlatListProps={additionalFlatListProps}
              numberOfSkeletons={3}
              loadMoreThreshold={0.2}
              List={({ loadingChannels, channels, error }) => {
                // Move logging here since we can't use the event handlers
                if (loadingChannels) {
                  console.log(
                    "[ChatList] Channels loading with filters:",
                    filters,
                    "Active channels:",
                    client?.activeChannels
                      ? Object.keys(client.activeChannels).length
                      : 0,
                    "Manual channels:",
                    manualChannels.length
                  );
                } else if (channels) {
                  console.log("[ChatList] Channels loaded in List component:", {
                    count: channels.length,
                    channelIds: channels.map((channel) => channel.id),
                    channelData: channels.map((channel) => ({
                      id: channel.id,
                      type: channel.type,
                      memberCount: Object.keys(channel.state.members || {})
                        .length,
                      members: Object.keys(channel.state.members || {}),
                    })),
                    filters,
                    activeChannels: client?.activeChannels
                      ? Object.keys(client.activeChannels).length
                      : 0,
                  });
                } else if (error) {
                  console.error("[ChatList] Channel list error:", error);
                }

                if (error) {
                  return (
                    <View className="items-center justify-center flex-1">
                      <Text className="px-4 text-center text-red-500">
                        Error loading chats: {error.message}
                      </Text>
                      <TouchableOpacity
                        onPress={() => setIsLoading(true)}
                        className="p-2 mt-4 rounded bg-primary"
                      >
                        <Text className="text-white">Retry</Text>
                      </TouchableOpacity>
                    </View>
                  );
                }

                if (loadingChannels) {
                  return (
                    <View className="items-center justify-center flex-1">
                      <ActivityIndicator
                        size="large"
                        color={theme.colors.primary}
                      />
                      <Text className="mt-4 text-foreground">
                        Loading channels...
                      </Text>
                    </View>
                  );
                }

                // If no channels from Stream but we have manual channels, show those
                if (!channels?.length && manualChannels.length > 0) {
                  console.log(
                    "[ChatList] Using manual channels:",
                    manualChannels.length
                  );
                  return (
                    <View className="flex-1">
                      {manualChannels.map((channel) => (
                        <TouchableOpacity
                          key={channel.id}
                          onPress={() => handleChannelSelect(channel)}
                          className="p-4 border-b border-gray-200"
                        >
                          <Text className="text-foreground">
                            Channel: {channel.id}
                          </Text>
                          <Text className="text-sm text-gray-500">
                            Members:{" "}
                            {Object.keys(channel.state.members || {}).length}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  );
                }

                if (!channels?.length) {
                  return (
                    <View className="items-center justify-center flex-1">
                      <Text className="text-foreground">No chats yet</Text>
                    </View>
                  );
                }

                return null;
              }}
            />
          </ChannelListErrorBoundary>
        </View>

        <TouchableOpacity
          onPress={handleNewChat}
          className="absolute items-center justify-center w-16 h-16 rounded-full shadow-lg bottom-14 right-6 bg-primary"
          style={{
            elevation: 4,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.25,
            shadowRadius: 3.84,
          }}
        >
          <Plus size={24} color="white" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
