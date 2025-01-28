import { useState } from "react";
import {
  SafeAreaView,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  FlatList,
  Switch,
} from "react-native";
import { useChat } from "~/src/lib/chat";
import { useRouter } from "expo-router";
import { supabase } from "~/src/lib/supabase";
import { User } from "@supabase/supabase-js";
import { Users } from "lucide-react-native";

export default function NewChatScreen() {
  const router = useRouter();
  const { client } = useChat();
  const [searchText, setSearchText] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [isGroupChat, setIsGroupChat] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const searchUsers = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsLoading(true);
    try {
      const { data: users, error } = await supabase
        .from("users")
        .select("*")
        .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%`)
        .limit(10);

      if (error) throw error;
      setSearchResults(users || []);
    } catch (error) {
      console.error("Error searching users:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleUserSelection = (user: User) => {
    if (selectedUsers.find((u) => u.id === user.id)) {
      setSelectedUsers(selectedUsers.filter((u) => u.id !== user.id));
    } else {
      setSelectedUsers([...selectedUsers, user]);
    }
  };

  const createChat = async () => {
    if (!client || selectedUsers.length === 0) return;

    try {
      // Create the Stream chat channel
      const channelId = `${client.userID}-${selectedUsers
        .map((u) => u.id)
        .join("-")}`;
      const members = [client.userID, ...selectedUsers.map((u) => u.id)].filter(
        (id): id is string => id !== undefined
      );
      const channelData = {
        members,
      };

      if (isGroupChat && groupName) {
        Object.assign(channelData, { name: groupName });
      }

      const channel = client.channel("messaging", channelId, channelData);
      await channel.create();

      // Create record in chat_channels table
      const { data: chatChannel, error: channelError } = await supabase
        .from("chat_channels")
        .insert({
          stream_channel_id: channelId,
          channel_type: "messaging",
          created_by: client.userID,
          name: isGroupChat ? groupName : null,
        })
        .select()
        .single();

      if (channelError) throw channelError;

      // Create records in chat_channel_members table
      const memberRecords = members.map((userId) => ({
        channel_id: chatChannel.id,
        user_id: userId,
        role: userId === client.userID ? "admin" : "member",
      }));

      const { error: membersError } = await supabase
        .from("chat_channel_members")
        .insert(memberRecords);

      if (membersError) throw membersError;

      router.push(`/(app)/(chat)/${channel.id}`);
    } catch (error) {
      console.error("Error creating chat:", error);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="p-4">
        <View className="flex-row items-center mb-4">
          <Text className="mr-2 text-foreground">Group Chat</Text>
          <Switch value={isGroupChat} onValueChange={setIsGroupChat} />
        </View>

        {isGroupChat && (
          <TextInput
            value={groupName}
            onChangeText={setGroupName}
            placeholder="Group name"
            className="p-2 mb-4 rounded-lg bg-muted"
            placeholderTextColor="#666"
          />
        )}

        <TextInput
          value={searchText}
          onChangeText={(text) => {
            setSearchText(text);
            searchUsers(text);
          }}
          placeholder="Search users..."
          className="p-2 rounded-lg bg-muted"
          placeholderTextColor="#666"
        />

        {selectedUsers.length > 0 && (
          <View className="mt-4">
            <Text className="mb-2 text-foreground">Selected Users:</Text>
            <View className="flex-row flex-wrap gap-2">
              {selectedUsers.map((user) => (
                <TouchableOpacity
                  key={user.id}
                  onPress={() => toggleUserSelection(user)}
                  className="flex-row items-center px-3 py-1 rounded-full bg-primary"
                >
                  <Text className="text-primary-foreground">{user.email}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        <FlatList
          data={searchResults}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => toggleUserSelection(item)}
              className="flex-row items-center justify-between p-4 border-b border-border"
            >
              <View className="flex-row items-center">
                <View className="items-center justify-center w-8 h-8 mr-3 rounded-full bg-muted">
                  <Users size={16} color="#666" />
                </View>
                <Text className="text-foreground">{item.email}</Text>
              </View>
              {selectedUsers.find((u) => u.id === item.id) && (
                <View className="w-3 h-3 rounded-full bg-primary" />
              )}
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            !isLoading && searchText ? (
              <Text className="p-4 text-center text-muted-foreground">
                No users found
              </Text>
            ) : null
          }
        />

        <TouchableOpacity
          onPress={createChat}
          disabled={selectedUsers.length === 0 || (isGroupChat && !groupName)}
          className={`mt-4 p-4 rounded-lg ${
            selectedUsers.length === 0 || (isGroupChat && !groupName)
              ? "bg-muted"
              : "bg-primary"
          }`}
        >
          <Text
            className={
              selectedUsers.length === 0 || (isGroupChat && !groupName)
                ? "text-muted-foreground text-center"
                : "text-primary-foreground text-center"
            }
          >
            Create Chat
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
