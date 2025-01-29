import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import {
  SafeAreaView,
  Text,
  View,
  TouchableOpacity,
  TextInput,
  Animated,
  Platform,
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
  presence: true,
  limit: 10,
  messages_limit: 10,
};

// Static sort for ChannelList
const CHANNEL_SORT: ChannelSort<DefaultStreamChatGenerics> = [
  { last_message_at: -1 as const },
];

// Static FlatList props
const FLAT_LIST_PROPS = {
  initialNumToRender: 7,
  maxToRenderPerBatch: 3,
  windowSize: 7,
  removeClippedSubviews: true,
  updateCellsBatchingPeriod: 150,
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
    });
    if (!client?.userID) return { type: "messaging" };
    return {
      type: "messaging",
      members: { $in: [client.userID as string] },
      ...(searchText
        ? {
            name: { $autocomplete: searchText },
          }
        : {}),
    };
  }, [client?.userID, searchText]);

  const handleNewChat = useCallback(() => {
    if (!client?.userID) {
      console.log("[ChatList] Cannot create chat: No user ID");
      return;
    }
    console.log("[ChatList] Navigating to new chat screen");
    router.push("/(app)/(chat)/new");
  }, [client?.userID, router]);

  const handleChannelSelect = useCallback(
    (channel: any) => {
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

  // Handle initial loading state with timeout and logging
  useEffect(() => {
    let mounted = true;
    let timeoutId: NodeJS.Timeout;

    const initializeScreen = async () => {
      console.log("[ChatList] Initializing screen:", {
        hasUserId: !!client?.userID,
        isConnected,
        isLoading,
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

        // Add a small delay to ensure Stream client is fully initialized
        await new Promise((resolve) => setTimeout(resolve, 500));

        if (mounted) {
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
  }, [client?.userID, isConnected]);

  // Log render states
  useEffect(() => {
    console.log("[ChatList] Render state:", {
      isLoading,
      isConnecting,
      isConnected,
      hasError: !!error || !!connectionError,
      hasClient: !!client,
    });
  }, [isLoading, isConnecting, isConnected, error, connectionError, client]);

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
      // Force a refresh of the channel list
      setRefreshKey((prev) => prev + 1);
    }, [])
  );

  if (isLoading || isConnecting || !isConnected) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="items-center justify-center flex-1">
          <ActivityIndicator size="large" color="#0000ff" />
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
          <ChannelList
            key={refreshKey}
            filters={filters}
            sort={CHANNEL_SORT}
            options={CHANNEL_LIST_OPTIONS}
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
                  filters
                );
              } else if (channels) {
                console.log("[ChatList] Channels loaded:", {
                  count: channels.length,
                  channelIds: channels.map((channel) => channel.id),
                  filters,
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
                    <ActivityIndicator size="large" color="#0000ff" />
                    <Text className="mt-4 text-foreground">
                      Loading channels...
                    </Text>
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
