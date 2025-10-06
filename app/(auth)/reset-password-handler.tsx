import { useEffect } from "react";
import { router } from "expo-router";
import { supabase } from "../../src/lib/supabase";
import { View, ActivityIndicator } from "react-native";
import { Text } from "~/src/components/ui/text";
import { useTheme } from "~/src/components/ThemeProvider";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function ResetPasswordHandler(): JSX.Element {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const handlePasswordReset = async () => {
      try {
        // Get the current session to check if user is authenticated
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error("Error getting session:", error);
          // Redirect to sign in if there's an error
          router.replace("/(auth)/sign-in");
          return;
        }

        if (session) {
          // User is authenticated, redirect to new password screen
          router.replace("/(auth)/new-password");
        } else {
          // No session, redirect to sign in
          router.replace("/(auth)/sign-in");
        }
      } catch (error) {
        console.error("Error in password reset handler:", error);
        router.replace("/(auth)/sign-in");
      }
    };

    handlePasswordReset();
  }, []);

  return (
    <View 
      className="flex-1 justify-center items-center bg-background"
      style={{ paddingTop: insets.top }}
    >
      <ActivityIndicator size="large" color="#8B5CF6" />
      <Text className="mt-4 text-lg font-medium" style={{ color: theme.colors.text }}>
        Processing password reset...
      </Text>
    </View>
  );
}

