import { useState } from "react";
import {
  ActivityIndicator,
  TouchableOpacity,
  SafeAreaView,
  View,
  TouchableWithoutFeedback,
  Keyboard,
} from "react-native";
import { supabase } from "../../src/lib/supabase";
import { router } from "expo-router";
import { Input } from "~/src/components/ui/input";
import { Button } from "~/src/components/ui/button";
import { Text } from "~/src/components/ui/text";
import Toast from "react-native-toast-message";
import { useTheme } from "~/src/components/ThemeProvider";
import { Mail ,AlertTriangle,ArrowLeft} from "lucide-react-native";
import { MotiView } from "moti";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function ResetPassword(): JSX.Element {
  const [email, setEmail] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const { theme } = useTheme();
 const insets = useSafeAreaInsets();

const handleBack = () => {
    router.back();
  };
  async function handleForgotPassword(): Promise<void> {
    if (!email) {
       setError("Please enter your email address.");
      // Toast.show({
      //   type: "error",
      //   text1: "Error",
      //   text2: "Please enter your email address.",
      // });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: "your-app://reset-password", // Replace this with your app's deep link for password reset
      });

      if (error) {
        console.log(error);
        setError(error.message || "Unable to send reset email.");
        // Toast.show({
        //   type: "error",
        //   text1: "Error",
        //   text2: error.message || "Unable to send reset email.",
        // });
        return;
      }

      Toast.show({
        type: "success",
        text1: "Success",
        text2: "Password reset email sent. Please check your inbox.",
      });

      // Optionally redirect the user back to the sign-in page
      router.push("/(auth)/sign-in");
    } catch (error) {
      if (error instanceof Error) {
        setError(error.message);
        // Toast.show({
        //   type: "error",
        //   text1: "Error",
        //   text2: error.message,
        // });
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
    <SafeAreaView  style={{
        paddingTop: Math.max(insets.top + 20, 40),
      }} className="flex-1 bg-background">
      <View className="flex-1 w-full px-4">
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
        }}
      >
        <TouchableOpacity
          onPress={handleBack}
          style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: theme.dark
              ? "rgba(139, 92, 246, 0.2)"
              : "rgba(139, 92, 246, 0.1)",
            justifyContent: "center",
            alignItems: "center",
            marginRight: 16,
            borderWidth: 1,
            borderColor: theme.dark
              ? "rgba(139, 92, 246, 0.3)"
              : "rgba(139, 92, 246, 0.2)",
          }}
        >
          <ArrowLeft size={20} color="#8B5CF6" />
        </TouchableOpacity>
      </View>
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
            {/* Error Message */}
              {error && (
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    padding: 16,
                    marginBottom: 24,
                    backgroundColor: theme.dark
                      ? "rgba(239, 68, 68, 0.15)"
                      : "rgba(239, 68, 68, 0.1)",
                    borderRadius: 16,
                    borderWidth: 1,
                    borderColor: theme.dark
                      ? "rgba(239, 68, 68, 0.3)"
                      : "rgba(239, 68, 68, 0.2)",
                  }}
                >
                  <AlertTriangle
                    size={20}
                    color="#EF4444"
                    style={{ marginRight: 12 }}
                  />
                  <Text style={{ flex: 1, fontSize: 14, color: "#EF4444" }}>
                    {error}
                  </Text>
                  <TouchableOpacity
                    onPress={() => setError("")}
                    style={{ padding: 4 }}
                  >
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: "600",
                        color: "#EF4444",
                      }}
                    >
                      ✕
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
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
            <TouchableOpacity onPress={() => router.push("/(auth)/sign-in")}>
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
     </TouchableWithoutFeedback>
  );
}
