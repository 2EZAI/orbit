import { useState, useEffect } from "react";
import {
  View,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Text } from "~/src/components/ui/text";
import { Sheet } from "~/src/components/ui/sheet";
import { Input } from "~/src/components/ui/input";
import { MapEvent } from "~/hooks/useUnifiedMapData";
import { useChat } from "~/src/lib/chat";
import { supabase } from "~/src/lib/supabase";
import { useUser } from "~/src/lib/UserProvider";
import { X, Users, Search, UserPlus, UserMinus } from "lucide-react-native";

interface User {
  id: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
}

interface CreateOrbitModalProps {
  event: MapEvent;
  isOpen: boolean;
  onClose: () => void;
}

export const CreateOrbitModal = ({
  event,
  isOpen,
  onClose,
}: CreateOrbitModalProps) => {
  const { user } = useUser();
  const { client } = useChat();
  const [isLoading, setIsLoading] = useState(false);
  const [orbitName, setOrbitName] = useState(`${event.name} Orbit`);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Search users
  useEffect(() => {
    const searchUsers = async () => {
      if (!searchQuery.trim()) {
        setSearchResults([]);
        return;
      }

      setIsSearching(true);
      try {
        const { data, error } = await supabase
          .from("public_users")
          .select("id, first_name, last_name, avatar_url")
          .or(
            `first_name.ilike.%${searchQuery}%,last_name.ilike.%${searchQuery}%`
          )
          .neq("id", user?.id)
          .limit(10);

        if (error) throw error;
        setSearchResults(data || []);
      } catch (error) {
        console.error("Error searching users:", error);
      } finally {
        setIsSearching(false);
      }
    };

    const debounce = setTimeout(searchUsers, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery, user?.id]);

  const toggleUser = (userToToggle: User) => {
    setSelectedUsers((current) => {
      const isSelected = current.some((u) => u.id === userToToggle.id);
      if (isSelected) {
        return current.filter((u) => u.id !== userToToggle.id);
      } else {
        return [...current, userToToggle];
      }
    });
  };

  const handleCreateOrbit = async () => {
    if (!user || !client) {
      Alert.alert("Error", "Please sign in to create an orbit");
      return;
    }

    if (selectedUsers.length === 0) {
      Alert.alert("Error", "Please select at least one user to join the orbit");
      return;
    }

    setIsLoading(true);
    try {
      // Create new Stream chat channel with selected users
      const channel = client.channel("messaging", undefined, {
        name: orbitName,
        members: [user.id, ...selectedUsers.map((u) => u.id)],
        event_id: event.id,
      });

      await channel.watch();

      // Create channel record in Supabase
      const { data: chatChannel, error: channelError } = await supabase
        .from("chat_channels")
        .insert({
          stream_channel_id: channel.id,
          channel_type: "messaging",
          created_by: user.id,
          name: orbitName,
          event_id: event.id,
        })
        .select()
        .single();

      if (channelError) throw channelError;

      // Create member records
      const memberPromises = [
        // Create own member record
        supabase.from("chat_channel_members").insert({
          channel_id: chatChannel.id,
          user_id: user.id,
          role: "admin",
        }),
        // Create selected users' member records
        ...selectedUsers.map((selectedUser) =>
          supabase.from("chat_channel_members").insert({
            channel_id: chatChannel.id,
            user_id: selectedUser.id,
            role: "member",
          })
        ),
      ];

      await Promise.all(memberPromises);

      Alert.alert(
        "Success",
        "Orbit created! You can now chat with the selected users.",
        [{ text: "OK", onPress: onClose }]
      );
    } catch (error) {
      console.error("Error creating orbit:", error);
      Alert.alert("Error", "Failed to create orbit. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Sheet isOpen={isOpen} onClose={onClose}>
      <View className="flex-1 p-4">
        <View className="flex-row items-center justify-between mb-4">
          <Text className="text-xl font-bold">Create Orbit</Text>
          <TouchableOpacity onPress={onClose}>
            <X size={24} />
          </TouchableOpacity>
        </View>

        <View className="mb-6">
          <Text className="mb-2 text-base font-medium">Orbit Name</Text>
          <Input
            value={orbitName}
            onChangeText={setOrbitName}
            placeholder="Enter orbit name"
          />
        </View>

        <View className="mb-6">
          <Text className="mb-2 text-base font-medium">Search Users</Text>
          <View className="flex-row items-center space-x-2">
            <View className="flex-1">
              <Input
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search by name..."
                autoCapitalize="none"
              />
            </View>
            {isSearching ? (
              <ActivityIndicator size="small" />
            ) : (
              <Search size={20} className="text-muted-foreground" />
            )}
          </View>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <View className="mt-2  space-y-2">
              {searchResults.map((searchUser) => {
                const isSelected = selectedUsers.some(
                  (u) => u.id === searchUser.id
                );
                return (
                  <TouchableOpacity
                    key={searchUser.id}
                    onPress={() => toggleUser(searchUser)}
                    className={`flex-row items-center justify-between p-3 rounded-lg ${
                      isSelected ? "bg-primary/10" : "bg-secondary/10"
                    }`}
                  >
                    <View className="flex-row items-center">
                      <View className="w-8 h-8 mr-2 rounded-full bg-secondary/20 items-center justify-center">
                        <Users size={16} className="text-secondary" />
                      </View>
                      <Text>
                        {searchUser.first_name} {searchUser.last_name}
                      </Text>
                    </View>
                    {isSelected ? (
                      <UserMinus size={20} className="text-primary" />
                    ) : (
                      <UserPlus size={20} className="text-secondary" />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* Selected Users */}
          {selectedUsers.length > 0 && (
            <View className="mt-4">
              <Text className="mb-2 text-base font-medium">Selected Users</Text>
              <View className="flex-row flex-wrap gap-2">
                {selectedUsers.map((selectedUser) => (
                  <TouchableOpacity
                    key={selectedUser.id}
                    onPress={() => toggleUser(selectedUser)}
                    className="flex-row items-center bg-primary/10 rounded-full px-3 py-1"
                  >
                    <Text className="mr-2">
                      {selectedUser.first_name} {selectedUser.last_name}
                    </Text>
                    <X size={16} className="text-primary" />
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </View>

        <TouchableOpacity
          className="items-center py-3 rounded-full bg-primary"
          onPress={handleCreateOrbit}
          disabled={isLoading || selectedUsers.length === 0}
        >
          <Text className="font-medium text-white">
            {isLoading ? "Creating Orbit..." : "Create Orbit"}
          </Text>
        </TouchableOpacity>
      </View>
    </Sheet>
  );
};
