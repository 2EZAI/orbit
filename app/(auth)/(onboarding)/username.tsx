import { useState, useEffect } from "react";
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

export default function UsernameScreen() {
  const { user, updateUser,fetchUserNew } = useUser();
  const [username, setUsername] = useState("");
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Prevent navigation away from this screen until username is set
  useEffect(() => {
    console.log('user>',user);
   checkUse();
  }, [user]);
 
  const checkUse =async()=>{
const data= await fetchUserNew();
    console.log('data>',data);
    // if (!user) {
    //   console.log('user>>','not found>>???');
    // }
    if (user?.username == null) {
      console.log('user>>','not found>>???');
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
      console.log("click>>",">>");
      router.replace("/(auth)/(onboarding)/topics");
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
    <View className="flex-1 px-4 bg-background">
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
          className="h-14"
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
    </View>
  );
}
