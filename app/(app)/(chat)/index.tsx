import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import {
  SafeAreaView,
  View,
  TouchableOpacity,
  TextInput,
  Animated,
  ActivityIndicator,
  RefreshControl,
  ActionSheetIOS,
  PanResponder,
  GestureResponderEvent,
  PanResponderGestureState,
  Alert,
} from "react-native";
import {
  ChannelList,
  ChannelPreviewMessenger,
  ChannelPreviewTitle,
  ChannelPreviewMessage,
  ChannelPreviewStatus,
  ChannelAvatar,
  useChannelsContext,
  useTheme as useStreamTheme,
  Channel as StreamChannel,
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
import { Plus, Search, X, Bell, BellOff, Trash2 } from "lucide-react-native";
import { useTheme } from "~/src/components/ThemeProvider";
import { Text } from "~/src/components/ui/text";
import { supabase } from "~/src/lib/supabase";

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

// Add custom preview component
const CustomChannelPreview = ({
  channel,
  onSelect,
  PreviewAvatar,
  PreviewTitle,
  PreviewMessage,
  PreviewStatus,
  ...previewProps
}: {
  channel: Channel<DefaultGenerics>;
  onSelect: (channel: Channel<DefaultGenerics>) => void;
  PreviewAvatar: React.ComponentType<any>;
  PreviewTitle: React.ComponentType<any>;
  PreviewMessage: React.ComponentType<any>;
  PreviewStatus: React.ComponentType<any>;
}) => {
  const { theme } = useTheme();
  const translateX = useRef(new Animated.Value(0)).current;
  const rowRef = useRef<View>(null);
  const [isSwipeOpen, setIsSwipeOpen] = useState(false);

  // Ensure channel has required data
  const hasRequiredData = useMemo(() => {
    return channel && channel.state && channel.state.messages;
  }, [channel]);

  const resetSwipe = useCallback(() => {
    Animated.spring(translateX, {
      toValue: 0,
      useNativeDriver: true,
    }).start(() => setIsSwipeOpen(false));
  }, [translateX]);

  const handleDelete = useCallback(async () => {
    try {
      // First get the channel ID from chat_channels
      const { data: channelData, error: channelQueryError } = await supabase
        .from("chat_channels")
        .select("id")
        .eq("stream_channel_id", channel.id)
        .single();

      if (channelQueryError) {
        console.error("[ChatList] Error finding channel:", channelQueryError);
        return;
      }

      if (!channelData) {
        console.error("[ChatList] Channel not found in database");
        return;
      }

      // Delete from Supabase first (cascade will handle members)
      const { error: deleteError } = await supabase
        .from("chat_channels")
        .delete()
        .eq("id", channelData.id);

      if (deleteError) {
        console.error("[ChatList] Error deleting from Supabase:", deleteError);
        return;
      }

      // Then delete from Stream
      await channel.delete();

      // Reset the swipe state
      resetSwipe();
    } catch (error) {
      console.error("[ChatList] Error deleting channel:", error);
      Alert.alert("Error", "Failed to delete chat. Please try again.");
    }
  }, [channel, resetSwipe]);

  const handleLongPress = useCallback(() => {
    ActionSheetIOS.showActionSheetWithOptions(
      {
        options: ["Mute Channel", "Mark as Read", "Delete Channel", "Cancel"],
        cancelButtonIndex: 3,
        destructiveButtonIndex: 2,
      },
      async (buttonIndex) => {
        try {
          switch (buttonIndex) {
            case 0:
              await channel.mute();
              break;
            case 1:
              await channel.markRead();
              break;
            case 2:
              await handleDelete();
              break;
          }
        } catch (error) {
          console.error("[ChatList] Error performing channel action:", error);
        }
      }
    );
  }, [channel, handleDelete]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, { dx, dy }) => {
          return Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 5;
        },
        onPanResponderMove: (_, { dx }) => {
          // Only allow right swipe for delete
          const x = Math.min(Math.max(dx, 0), 75);
          translateX.setValue(x);
        },
        onPanResponderRelease: (_, { dx, vx }) => {
          if (dx > 50 || vx > 0.5) {
            // Swipe right to delete
            Alert.alert(
              "Delete Chat",
              "Are you sure you want to delete this chat?",
              [
                {
                  text: "Cancel",
                  style: "cancel",
                  onPress: () => {
                    Animated.spring(translateX, {
                      toValue: 0,
                      useNativeDriver: true,
                    }).start(() => setIsSwipeOpen(false));
                  },
                },
                {
                  text: "Delete",
                  style: "destructive",
                  onPress: handleDelete,
                },
              ]
            );
          } else {
            // Reset position
            Animated.spring(translateX, {
              toValue: 0,
              useNativeDriver: true,
            }).start(() => setIsSwipeOpen(false));
          }
        },
      }),
    [channel, translateX, handleDelete]
  );

  // Background actions view
  const renderActions = () => (
    <View className="absolute inset-y-0 right-0 flex-row">
      <TouchableOpacity
        className="items-center justify-center w-[75px] bg-red-500"
        onPress={() => {
          Alert.alert(
            "Delete Chat",
            "Are you sure you want to delete this chat?",
            [
              {
                text: "Cancel",
                style: "cancel",
                onPress: () => resetSwipe(),
              },
              {
                text: "Delete",
                style: "destructive",
                onPress: handleDelete,
              },
            ]
          );
        }}
      >
        <Trash2 size={24} color="white" />
      </TouchableOpacity>
    </View>
  );

  // If channel data isn't ready, show a loading state
  if (!hasRequiredData) {
    return (
      <View className="flex-row items-center px-4 py-3 space-x-3 border-b border-border">
        <View className="w-10 h-10 rounded-full bg-muted" />
        <View className="flex-1">
          <View className="w-24 h-4 mb-1 rounded bg-muted" />
          <View className="w-32 h-3 rounded bg-muted" />
        </View>
      </View>
    );
  }

  return (
    <View className="relative">
      {renderActions()}
      <Animated.View
        ref={rowRef}
        className="bg-background"
        style={{ transform: [{ translateX }] }}
        {...panResponder.panHandlers}
      >
        <TouchableOpacity
          onPress={() => onSelect(channel)}
          onLongPress={handleLongPress}
          className="flex-row items-center px-4 py-3 space-x-3 border-b border-border"
        >
          <PreviewAvatar channel={channel} {...previewProps} />
          <View className="flex-1">
            <PreviewTitle channel={channel} {...previewProps} />
            <PreviewMessage channel={channel} {...previewProps} />
          </View>
          {channel.state?.messages && (
            <PreviewStatus channel={channel} {...previewProps} />
          )}
        </TouchableOpacity>
      </Animated.View>
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
    router.push("/(app)/(chat)/new");
  }, [client?.userID, router]);

  const handleChannelSelect = useCallback(
    (channel: Channel<DefaultGenerics>) => {
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
        {isSearching ? (
          <SearchInput
            value={searchText}
            onChangeText={setSearchText}
            onClose={handleCloseSearch}
          />
        ) : (
          <View className="flex-row items-center justify-between px-4 py-2">
            <Text className="text-xl font-semibold text-foreground">
              Messages
            </Text>
            <TouchableOpacity onPress={handleSearch}>
              <Search size={24} color={theme.colors.text} />
            </TouchableOpacity>
          </View>
        )}

        <View style={{ flex: 1 }}>
          <ChannelList
            key={refreshKey}
            filters={filters}
            sort={CHANNEL_SORT}
            options={CHANNEL_LIST_OPTIONS}
            onSelect={handleChannelSelect}
            Preview={(previewProps) => (
              <CustomChannelPreview
                {...previewProps}
                PreviewAvatar={ChannelAvatar}
                PreviewTitle={ChannelPreviewTitle}
                PreviewMessage={ChannelPreviewMessage}
                PreviewStatus={ChannelPreviewStatus}
                onSelect={handleChannelSelect}
              />
            )}
            additionalFlatListProps={{
              ...FLAT_LIST_PROPS,
              refreshControl: (
                <RefreshControl
                  refreshing={isRefreshing}
                  onRefresh={handleRefresh}
                  tintColor={theme.colors.primary}
                  colors={[theme.colors.primary]}
                />
              ),
            }}
            EmptyStateIndicator={() => (
              <View className="items-center justify-center flex-1 px-4">
                <Text className="text-lg font-medium text-foreground">
                  No conversations yet
                </Text>
                <Text className="mt-2 text-center text-muted-foreground">
                  Start a new chat or wait for someone to message you
                </Text>
                <TouchableOpacity
                  onPress={handleNewChat}
                  className="px-6 py-3 mt-4 rounded-lg bg-primary"
                >
                  <Text className="font-medium text-primary-foreground">
                    Start a new chat
                  </Text>
                </TouchableOpacity>
              </View>
            )}
            LoadingIndicator={() => (
              <View className="items-center justify-center flex-1">
                <ActivityIndicator size="large" color={theme.colors.primary} />
                <Text className="mt-4 text-foreground">
                  Loading conversations...
                </Text>
              </View>
            )}
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
