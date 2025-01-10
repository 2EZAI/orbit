import { useState } from "react";
import {
  ActivityIndicator,
  SafeAreaView,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../../src/lib/supabase";
import { router } from "expo-router";
import { Input } from "~/src/components/ui/input";
import { Button } from "~/src/components/ui/button";
import { Text } from "~/src/components/ui/text";
import Toast from "react-native-toast-message";
import { Mail } from "lucide-react-native";
import { MotiView } from "moti";

export default function ResetPassword(): JSX.Element {
  const [email, setEmail] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  async function handleForgotPassword(): Promise<void> {
    if (!email) {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Please enter your email address.",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: "your-app://reset-password", // Replace this with your app's deep link for password reset
      });

      if (error) {
        console.log(error);
        Toast.show({
          type: "error",
          text1: "Error",
          text2: error.message || "Unable to send reset email.",
        });
        return;
      }

      Toast.show({
        type: "success",
        text1: "Success",
        text2: "Password reset email sent. Please check your inbox.",
      });

      // Optionally redirect the user back to the sign-in page
      router.push("/sign-in");
    } catch (error) {
      if (error instanceof Error) {
        Toast.show({
          type: "error",
          text1: "Error",
          text2: error.message,
        });
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-1 w-full px-4">
        {/* Header Section */}
        <MotiView
          from={{ opacity: 0, translateY: -20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: "timing", duration: 1000 }}
          className="pt-12 pb-8"
        >
          <Text className="w-full text-4xl font-bold">Forgot Password</Text>
          <Text className="mt-3 text-base text-muted-foreground">
            Enter your email address to reset your password.
          </Text>
        </MotiView>

        {/* Form Section */}
        <View className="flex-1 justify-middle">
          <MotiView
            from={{ opacity: 0, translateY: 20 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: "spring", delay: 300 }}
            className="p-6 rounded-3xl bg-content2"
          >
            {/* Email Input */}
            <View className="mb-6">
              <Text className="mb-4 text-lg font-medium">Email Address</Text>
              <View className="flex-row items-center h-14 bg-input rounded-xl">
                <View className="px-4">
                  <Mail size={22} className="text-primary" />
                </View>
                <Input
                  placeholder="you@example.com"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  autoComplete="email"
                  keyboardType="email-address"
                  editable={!loading}
                  className="flex-1 bg-transparent border-0 h-14"
                />
              </View>
            </View>

            {/* Reset Password Button */}
            <Button
              onPress={handleForgotPassword}
              disabled={loading}
              className="h-14 bg-primary rounded-xl"
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-lg font-medium text-primary-foreground">
                  Reset Password
                </Text>
              )}
            </Button>
          </MotiView>
        </View>

        {/* Back to Sign In Link */}
        <View className="justify-end flex-1 pb-8">
          <View className="flex-row items-center justify-center">
            <Text className="text-base text-muted-foreground">
              Remember your password?{" "}
            </Text>
            <TouchableOpacity onPress={() => router.push("/sign-in")}>
              <Text className="text-base font-medium text-primary">
                Sign In
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Toast Component */}
      <Toast />
    </SafeAreaView>
  );
}
