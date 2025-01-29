import { useEffect, useState, useRef } from "react";
import {
  SafeAreaView,
  Text,
  View,
  TouchableOpacity,
  TextInput,
  Animated,
  Platform,
} from "react-native";
import {
  Chat,
  ChannelList,
  ChannelPreview,
  ChannelAvatar,
  DefaultStreamChatGenerics,
} from "stream-chat-expo";
import { useChat } from "~/src/lib/chat";
import { useAuth } from "~/src/lib/auth";
import { useRouter } from "expo-router";
import Constants from "expo-constants";
import type { ChannelFilters, ChannelSort } from "stream-chat";
import { Plus } from "lucide-react-native";
import { useTheme } from "~/src/components/ThemeProvider";

const BACKEND_URL = Constants.expoConfig?.extra?.backendUrl;
console.log("[ChatList] Configured Backend URL:", BACKEND_URL);

if (!BACKEND_URL) {
  console.error("[ChatList] Backend URL is not configured in Constants!");
}

export default function ChatListScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { client, isConnecting, connectionError } = useChat();
  const { session } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [searchText, setSearchText] = useState("");
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const searchBarHeight = useRef(new Animated.Value(0)).current;

  const showSearchBar = () => {
    setIsSearchVisible(true);
    Animated.spring(searchBarHeight, {
      toValue: 56,
      useNativeDriver: false,
    }).start();
  };

  const hideSearchBar = () => {
    Animated.spring(searchBarHeight, {
      toValue: 0,
      useNativeDriver: false,
    }).start(() => setIsSearchVisible(false));
  };

  if (isConnecting) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <Text className="p-4">Connecting to chat...</Text>
      </SafeAreaView>
    );
  }

  if (error || connectionError) {
    const displayError = error || connectionError?.message;
    return (
      <SafeAreaView className="flex-1 bg-background">
        <Text className="p-4 text-red-500">Error: {displayError}</Text>
      </SafeAreaView>
    );
  }

  if (!client?.userID) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <Text className="p-4">Loading chat...</Text>
      </SafeAreaView>
    );
  }

  const filters: ChannelFilters = {
    type: "messaging",
    members: { $in: [client.userID] },
    ...(searchText
      ? {
          name: { $autocomplete: searchText },
        }
      : {}),
  };

  const sort: ChannelSort<DefaultStreamChatGenerics> = [
    { last_message_at: -1 as const },
  ];

  const options = {
    state: true,
    watch: true,
    presence: true,
    limit: 20,
  };

  const handleNewChat = () => {
    router.push("/(app)/(chat)/new");
  };

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

        <ChannelList
          filters={filters}
          sort={sort}
          options={options}
          onSelect={(channel) => {
            router.push(`/(app)/(chat)/${channel.id}`);
          }}
          Preview={ChannelPreview}
          additionalFlatListProps={{
            onEndReached: showSearchBar,
            onEndReachedThreshold: 0.1,
            onMomentumScrollBegin: hideSearchBar,
          }}
        />

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
