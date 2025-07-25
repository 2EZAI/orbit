import { useState, useEffect ,createContext} from "react";
import { View, ActivityIndicator } from "react-native";
import { router } from "expo-router";
import { supabase } from "~/src/lib/supabase";
import { Text } from "~/src/components/ui/text";
import { Input } from "~/src/components/ui/input";
import { Button } from "~/src/components/ui/button";
import { useUser } from "~/hooks/useUserData";
import { Check, X } from "lucide-react-native";
import { useDebouncedCallback } from "~/src/hooks/useDebounce";
import Toast from "react-native-toast-message";
import { useAuth } from "~/src/lib/auth";
import Constants from "expo-constants";
import { useChat } from "~/src/lib/chat";
import { SafeAreaView} from "react-native-safe-area-context";

export default function UsernameScreen() {
  // const senderId="f2cb0eea-edef-4d9a-9d6e-8a6023cc1055";
    const senderId="00ec5a71-8807-4ef7-809e-2ffe45682ef2";
  const senderEmail="orbit@gmail.com";
  const { client } = useChat();
  const { user, updateUser, fetchUserNew } = useUser();
  const [username, setUsername] = useState("");
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { session } = useAuth();


  // console.log("session??", session?.user?.id);
  // Prevent navigation away from this screen until username is set
  useEffect(() => {
    // console.log("user>", user);
    checkUse();
  }, [user]);

  const checkUse = async () => {
    const data = await fetchUserNew();
    // console.log("data>", data);
    // if (!user) {
    //   console.log('user>>','not found>>???');
    // }
    if (user?.username == null) {
      console.log("user>>", "not found>>???");
      router.replace("/(auth)/sign-in");
    }
  };

  const checkUsername = useDebouncedCallback(async (value: string) => {
    if (!value) {
      setIsAvailable(null);
      setError(null);
      return;
    }

    // Validate username format
    if (!/^[a-zA-Z0-9_]+$/.test(value)) {
      setError("Username can only contain letters, numbers, and underscores");
      setIsAvailable(false);
      return;
    }

    setIsChecking(true);
    try {
      const { data, error } = await supabase.rpc("check_username_available", {
        username_to_check: value,
      });

      if (error) throw error;
      setIsAvailable(data);
      setError(null);
    } catch (err) {
      console.error("Error checking username:", err);
      setError("Error checking username availability");
      setIsAvailable(false);
    } finally {
      setIsChecking(false);
    }
  }, 500);

  ////
  const createChat = async () => {
    // console.log("Starting createChat function signup",client);
    // console.log("Checking prerequisites:", {
    //   hasClientId: Boolean(client?.userID),
    // });

    if (!client?.userID) {
      console.log("Prerequisites not met, returning early");
      return;
    }

    try {
      // Get all member IDs including the current user
      const memberIds = [senderId, client.userID];
      // console.log("Member IDs:", memberIds);

      // Generate a unique channel ID using timestamp and random string
      const timestamp = Date.now();
      const randomStr = Math.random().toString(36).substring(7);
      const uniqueChannelId = `${timestamp}-${randomStr}`;

      // Create the channel with members list and name
      // console.log("[NewChat] Creating Stream channel with config:", {
      //   members: memberIds,
      //   name: "Orbit",
      // });
      const channel = client.channel("messaging", uniqueChannelId, {
        members: memberIds,
        name: "Orbit Social App",
      });

      // This both creates the channel and subscribes to it
      console.log("[NewChat] Watching channel...");
      await channel.watch();
      // console.log("[NewChat] Channel created and watching:", {
      //   channelId: channel.id,
      //   channelType: channel.type,
      //   channelData: channel.data,
      //   memberCount: channel.state.members?.size,
      // });

      // Create channel record in Supabase
      console.log("[NewChat] Creating chat channel in Supabase");
      const { data: chatChannel, error: channelError } = await supabase
        .from("chat_channels")
        .insert({
          stream_channel_id: channel.id,
          channel_type: "messaging",
          created_by: client.userID,
          name: "signup",
        })
        .select()
        .single();

      if (channelError) {
        console.error("Error creating chat channel:", channelError);
        throw channelError;
      }

      // console.log("Chat channel created:", chatChannel);

      // Create your own member record first
      console.log("Creating own member record");
      const { error: ownMemberError } = await supabase
        .from("chat_channel_members")
        .insert({
          channel_id: chatChannel.id,
          user_id: client.userID,
          role: "super_admin",
        });

      if (ownMemberError) {
        console.error("Error creating own member record:", ownMemberError);
        throw ownMemberError;
      }

      // Then create other member records
      console.log("Creating other member records");
      const otherMembers = memberIds.filter((id) => id !== client.userID);
      for (const memberId of otherMembers) {
        const { error: memberError } = await supabase
          .from("chat_channel_members")
          .insert({
            channel_id: chatChannel.id,
            user_id: memberId,
            role: "super_member",
          });

        if (memberError) {
          console.error("Error creating member record:", {
            memberId,
            error: memberError,
          });
          throw memberError;
        }
      }

      console.log("All member records created successfully");
      // Fetch user data from "users" table
      const { data: userData, error: fetchError } = await supabase
        .from("users")
        .select("*")
        .eq("id", session?.user?.id)
        .single();

      if (fetchError) throw fetchError;

      // console.log("Fetched user data:", userData);

      let welcomeMessage = `👋 Hey ${userData?.first_name} ${userData?.last_name}, welcome to Orbit Social App! We're excited to have you.
This platform helps you discover and join amazing events near you. Let's get started!`;

      await channel.sendMessage({
        text: welcomeMessage,
      });
      router.replace("/(auth)/(onboarding)/topics");
    } catch (error: any) {
      console.error("Final error in chat creation:", {
        name: error?.name,
        message: error?.message,
        code: error?.code,
        status: error?.status,
        details: error?.details || {},
      });

      // Show a more specific error message
      Alert.alert(
        "Error",
        error?.message || "Failed to create chat. Please try again."
      );
    }
  };
  ////

  const handleUsernameChange = (value: string) => {
    setUsername(value);
    if (value) {
      checkUsername(value);
    } else {
      setIsAvailable(null);
      setError(null);
    }
  };

  const handleContinue = async () => {
    if (!user || !username || !isAvailable || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await updateUser({ username });
      // router.replace("/(auth)/(onboarding)/permissions");
      console.log("click>>", ">>");
      // router.replace("/(auth)/(onboarding)/topics");
      await createChat();
    } catch (error) {
      console.error("Error updating username:", error);
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Failed to update username",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 px-4 bg-background">
      <View className="py-12">
        <Text className="text-4xl font-bold">Choose your username</Text>
        <Text className="mt-3 text-base text-muted-foreground">
          Pick a unique username for your profile
        </Text>
      </View>

      <View className="space-y-6">
        <View>
          <Text className="mb-2 text-base font-medium">Username</Text>
          <View className="relative">
            <Input
              value={username}
              onChangeText={handleUsernameChange}
              placeholder="Enter username"
              autoCapitalize="none"
              autoCorrect={false}
              className="pr-10 h-14"
            />
            <View className="absolute right-3 top-4">
              {isChecking ? (
                <ActivityIndicator size="small" />
              ) : username ? (
                isAvailable ? (
                  <Check className="text-green-500" size={24} />
                ) : (
                  <X className="text-red-500" size={24} />
                )
              ) : null}
            </View>
          </View>
          {error && <Text className="mt-2 text-sm text-red-500">{error}</Text>}
          {isAvailable === false && !error && (
            <Text className="mt-2 text-sm text-red-500">
              This username is already taken
            </Text>
          )}
        </View>

        <Button
          onPress={handleContinue}
          disabled={!username || !isAvailable || isChecking || isSubmitting}
          className="h-14 mt-2 "
        >
          {isSubmitting ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-lg font-medium text-primary-foreground">
              Continue
            </Text>
          )}
        </Button>
      </View>
    </SafeAreaView>
  );
}
