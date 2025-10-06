import { router, useLocalSearchParams } from "expo-router";
import { AlertTriangle, ArrowLeft, Eye, EyeOff, Lock } from "lucide-react-native";
import { MotiView } from "moti";
import { useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  SafeAreaView,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";
import { useTheme } from "~/src/components/ThemeProvider";
import { Button } from "~/src/components/ui/button";
import { Input } from "~/src/components/ui/input";
import { Text } from "~/src/components/ui/text";
import { supabase } from "../../src/lib/supabase";

export default function NewPassword(): JSX.Element {
  const [password, setPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();

  const handleBack = () => {
    router.back();
  };

  // Validate password strength
  const validatePassword = (password: string) => {
    if (password.length < 8) {
      return "Password must be at least 8 characters long";
    }
    if (!/[A-Z]/.test(password)) {
      return "Password must contain at least one uppercase letter";
    }
    if (!/[a-z]/.test(password)) {
      return "Password must contain at least one lowercase letter";
    }
    if (!/\d/.test(password)) {
      return "Password must contain at least one number";
    }
    return null;
  };

  async function handleResetPassword(): Promise<void> {
    if (!password || !confirmPassword) {
      setError("Please fill in all fields.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    const validationError = validatePassword(password);
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) {
        console.log(error);
        setError(error.message || "Unable to update password.");
        return;
      }

      Toast.show({
        type: "success",
        text1: "Success",
        text2: "Password updated successfully! You can now sign in.",
      });

      // Navigate to sign in page
      router.replace("/(auth)/sign-in");
    } catch (error) {
      if (error instanceof Error) {
        setError(error.message);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <SafeAreaView
        style={{
          paddingTop: Math.max(insets.top + 20, 40),
        }}
        className="flex-1 bg-background"
      >
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
            <Text className="w-full text-4xl font-bold">New Password</Text>
            <Text className="mt-3 text-base text-muted-foreground">
              Enter your new password below.
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

              {/* Password Input */}
              <View className="mb-6">
                <Text className="mb-4 text-lg font-medium">New Password</Text>
                <View className="flex-row items-center h-14 bg-input rounded-xl">
                  <View className="px-4">
                    <Lock size={22} className="text-primary" />
                  </View>
                  <Input
                    placeholder="Enter new password"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    autoComplete="new-password"
                    editable={!loading}
                    className="flex-1 bg-transparent border-0 h-14"
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                    style={{ padding: 4, marginRight: 12 }}
                  >
                    {showPassword ? (
                      <EyeOff size={20} color={theme.colors.text + "66"} />
                    ) : (
                      <Eye size={20} color={theme.colors.text + "66"} />
                    )}
                  </TouchableOpacity>
                </View>
              </View>

              {/* Confirm Password Input */}
              <View className="mb-6">
                <Text className="mb-4 text-lg font-medium">Confirm Password</Text>
                <View className="flex-row items-center h-14 bg-input rounded-xl">
                  <View className="px-4">
                    <Lock size={22} className="text-primary" />
                  </View>
                  <Input
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry={!showConfirmPassword}
                    autoCapitalize="none"
                    autoComplete="new-password"
                    editable={!loading}
                    className="flex-1 bg-transparent border-0 h-14"
                  />
                  <TouchableOpacity
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                    style={{ padding: 4, marginRight: 12 }}
                  >
                    {showConfirmPassword ? (
                      <EyeOff size={20} color={theme.colors.text + "66"} />
                    ) : (
                      <Eye size={20} color={theme.colors.text + "66"} />
                    )}
                  </TouchableOpacity>
                </View>
              </View>

              {/* Password Requirements */}
              <View className="mb-6">
                <Text className="mb-2 text-sm font-medium text-muted-foreground">
                  Password Requirements:
                </Text>
                <View className="space-y-1">
                  <Text
                    className={`text-xs ${
                      password.length >= 8 ? "text-green-600" : "text-muted-foreground"
                    }`}
                  >
                    • At least 8 characters
                  </Text>
                  <Text
                    className={`text-xs ${
                      /[A-Z]/.test(password) ? "text-green-600" : "text-muted-foreground"
                    }`}
                  >
                    • One uppercase letter
                  </Text>
                  <Text
                    className={`text-xs ${
                      /[a-z]/.test(password) ? "text-green-600" : "text-muted-foreground"
                    }`}
                  >
                    • One lowercase letter
                  </Text>
                  <Text
                    className={`text-xs ${
                      /\d/.test(password) ? "text-green-600" : "text-muted-foreground"
                    }`}
                  >
                    • One number
                  </Text>
                </View>
              </View>

              {/* Reset Password Button */}
              <Button
                onPress={handleResetPassword}
                disabled={loading || !password || !confirmPassword}
                className="h-14 bg-primary rounded-xl"
              >
                {loading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text className="text-lg font-medium text-primary-foreground">
                    Update Password
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

