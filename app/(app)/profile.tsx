import { View, Text, TouchableOpacity } from "react-native";
import { supabase } from "../../src/lib/supabase";
import { useAuth } from "../../src/lib/auth";

export default function Profile() {
  const { session } = useAuth();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <View className="flex-1 justify-center items-center p-4">
      <Text className="text-lg mb-4">Logged in as: {session?.user.email}</Text>

      <TouchableOpacity
        className="bg-black p-4 rounded-lg"
        onPress={handleSignOut}
      >
        <Text className="text-white font-semibold">Sign Out</Text>
      </TouchableOpacity>
    </View>
  );
}
