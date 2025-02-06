import { View } from "react-native";
import { Button } from "~/src/components/ui/button";
import { Text } from "~/src/components/ui/text";
import { supabase } from "~/src/lib/supabase";
import { router } from "expo-router";

export default function ForceSignOut() {
  const handleForceSignOut = async () => {
    await supabase.auth.signOut();
    router.replace("/");
  };

  return (
    <View className="flex-1 items-center justify-center p-4">
      <Text className="text-xl mb-4 text-center">Force Sign Out</Text>
      <Button onPress={handleForceSignOut}>
        <Text className="text-primary-foreground">Sign Out</Text>
      </Button>
    </View>
  );
}
