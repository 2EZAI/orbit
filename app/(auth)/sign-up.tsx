import { useState } from "react";
import {
  ActivityIndicator,
  TouchableOpacity,
  View,
  StatusBar,
  Dimensions,
} from "react-native";
import { supabase } from "../../src/lib/supabase";
import { router } from "expo-router";
import { Input } from "~/src/components/ui/input";
import { Text } from "~/src/components/ui/text";
import Toast from "react-native-toast-message";
import {
  Lock,
  Mail,
  AlertTriangle,
  ArrowLeft,
  Eye,
  EyeOff,
  Check,
} from "lucide-react-native";
import { useTheme } from "~/src/components/ThemeProvider";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width, height } = Dimensions.get("window");

export default function SignUp(): JSX.Element {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] =
    useState<boolean>(false);
  const [agreedToTerms, setAgreedToTerms] = useState<boolean>(false);

  const handleBack = () => {
    router.back();
  };

  async function signUp(): Promise<void> {
    if (!email || !password || !confirmPassword) {
      setError("Please fill in all fields.");
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Please fill in all fields",
      });
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Passwords do not match",
      });
      return;
    }

    if (!agreedToTerms) {
      setError("Please agree to the Terms & Conditions and Privacy Policy.");
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Please agree to the Terms & Conditions and Privacy Policy",
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: "orbit://onboarding",
        },
      });

      if (error) {
        console.log(error);
        setError(error.message || "Failed to create account.");
        Toast.show({
          type: "error",
          text1: "Error",
          text2: error.message || "Failed to create account",
        });
        return;
      }

      if (!data?.user) {
        throw new Error("Failed to create account");
      }

      Toast.show({
        type: "success",
        text1: "Welcome!",
        text2: "Account created successfully",
      });

      // Navigate to onboarding
      router.replace("/(auth)/(onboarding)/username");
    } catch (error) {
      if (error instanceof Error) {
        setError(error.message || "An unexpected error occurred.");
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
    <View
      style={{
        flex: 1,
        backgroundColor: theme.colors.background,
      }}
    >
      <StatusBar
        barStyle={theme.dark ? "light-content" : "dark-content"}
        backgroundColor="transparent"
        translucent
      />

      {/* Cosmic Background */}
      <View
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: theme.dark ? "#1a1a2e" : "#f8fafc",
        }}
      />

      {/* Main Content */}
      <View
        style={{
          flex: 1,
          paddingTop: Math.max(insets.top + 20, 10),
          paddingHorizontal: 20,
          paddingBottom: Math.max(insets.bottom + 20, 10),
        }}
      >
        {/* Header Section */}
        <View>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginBottom: 40,
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

          <Text
            style={{
              fontSize: 36,
              fontWeight: "800",
              color: theme.colors.text,
              marginBottom: 12,
              lineHeight: 44,
            }}
          >
            Join Orbit ✨
          </Text>
        </View>

        {/* Form Section */}
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            marginTop: 40,
          }}
        >
          {/* Glassmorphism Card */}
          <View
            style={{
              backgroundColor: theme.dark
                ? "rgba(139, 92, 246, 0.1)"
                : "rgba(255, 255, 255, 0.8)",
              borderRadius: 32,
              padding: 32,
              borderWidth: 1,
              borderColor: theme.dark
                ? "rgba(139, 92, 246, 0.2)"
                : "rgba(139, 92, 246, 0.1)",
              shadowColor: "#8B5CF6",
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: theme.dark ? 0.3 : 0.1,
              shadowRadius: 24,
              elevation: 12,
            }}
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

            {/* Email Input */}
            <View style={{ marginBottom: 24 }}>
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "600",
                  color: theme.colors.text,
                  marginBottom: 12,
                }}
              >
                Email Address
              </Text>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  height: 56,
                  backgroundColor: theme.dark
                    ? "rgba(255, 255, 255, 0.05)"
                    : "rgba(255, 255, 255, 0.7)",
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: theme.dark
                    ? "rgba(139, 92, 246, 0.2)"
                    : "rgba(139, 92, 246, 0.15)",
                  paddingHorizontal: 16,
                }}
              >
                <Mail size={20} color="#8B5CF6" style={{ marginRight: 12 }} />
                <Input
                  placeholder="you@example.com"
                  placeholderTextColor={theme.colors.text + "66"}
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  autoComplete="email"
                  keyboardType="email-address"
                  editable={!loading}
                  style={{
                    flex: 1,
                    backgroundColor: "transparent",
                    borderWidth: 0,
                    height: 56,
                    fontSize: 16,
                    color: theme.colors.text,
                  }}
                />
              </View>
            </View>

            {/* Password Input */}
            <View style={{ marginBottom: 24 }}>
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "600",
                  color: theme.colors.text,
                  marginBottom: 12,
                }}
              >
                Password
              </Text>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  height: 56,
                  backgroundColor: theme.dark
                    ? "rgba(255, 255, 255, 0.05)"
                    : "rgba(255, 255, 255, 0.7)",
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: theme.dark
                    ? "rgba(139, 92, 246, 0.2)"
                    : "rgba(139, 92, 246, 0.15)",
                  paddingHorizontal: 16,
                }}
              >
                <Lock size={20} color="#8B5CF6" style={{ marginRight: 12 }} />
                <Input
                  placeholder="••••••••"
                  placeholderTextColor={theme.colors.text + "66"}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoComplete="new-password"
                  style={{
                    flex: 1,
                    backgroundColor: "transparent",
                    borderWidth: 0,
                    height: 56,
                    fontSize: 16,
                    color: theme.colors.text,
                  }}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={{ padding: 4 }}
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
            <View style={{ marginBottom: 24 }}>
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "600",
                  color: theme.colors.text,
                  marginBottom: 12,
                }}
              >
                Confirm Password
              </Text>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  height: 56,
                  backgroundColor: theme.dark
                    ? "rgba(255, 255, 255, 0.05)"
                    : "rgba(255, 255, 255, 0.7)",
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: theme.dark
                    ? "rgba(139, 92, 246, 0.2)"
                    : "rgba(139, 92, 246, 0.15)",
                  paddingHorizontal: 16,
                }}
              >
                <Lock size={20} color="#8B5CF6" style={{ marginRight: 12 }} />
                <Input
                  placeholder="••••••••"
                  placeholderTextColor={theme.colors.text + "66"}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirmPassword}
                  autoComplete="new-password"
                  style={{
                    flex: 1,
                    backgroundColor: "transparent",
                    borderWidth: 0,
                    height: 56,
                    fontSize: 16,
                    color: theme.colors.text,
                  }}
                />
                <TouchableOpacity
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={{ padding: 4 }}
                >
                  {showConfirmPassword ? (
                    <EyeOff size={20} color={theme.colors.text + "66"} />
                  ) : (
                    <Eye size={20} color={theme.colors.text + "66"} />
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* Terms & Conditions Checkbox */}
            <TouchableOpacity
              onPress={() => setAgreedToTerms(!agreedToTerms)}
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: 32,
                paddingVertical: 8,
              }}
            >
              <View
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 4,
                  borderWidth: 2,
                  borderColor: "#8B5CF6",
                  backgroundColor: agreedToTerms ? "#8B5CF6" : "transparent",
                  justifyContent: "center",
                  alignItems: "center",
                  marginRight: 12,
                }}
              >
                {agreedToTerms && <Check size={12} color="white" />}
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: 14,
                    color: theme.colors.text + "CC",
                    lineHeight: 20,
                  }}
                >
                  I agree to the{" "}
                  <Text style={{ color: "#8B5CF6", fontWeight: "600" }}>
                    Terms & Conditions
                  </Text>{" "}
                  and{" "}
                  <Text style={{ color: "#8B5CF6", fontWeight: "600" }}>
                    Privacy Policy
                  </Text>
                </Text>
              </View>
            </TouchableOpacity>

            {/* Create Account Button */}
            <TouchableOpacity
              onPress={signUp}
              disabled={loading}
              style={{
                height: 56,
                backgroundColor: "#8B5CF6",
                borderRadius: 16,
                justifyContent: "center",
                alignItems: "center",
                shadowColor: "#8B5CF6",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 12,
                elevation: 8,
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <Text
                  style={{
                    fontSize: 18,
                    fontWeight: "700",
                    color: "white",
                  }}
                >
                  Create Account ✨
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Sign In Link */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            marginTop: 32,
          }}
        >
          <Text style={{ fontSize: 16, color: theme.colors.text + "CC" }}>
            Already have an account?{" "}
          </Text>
          <TouchableOpacity onPress={() => router.push("/(auth)/sign-in")}>
            <Text style={{ fontSize: 16, fontWeight: "700", color: "#8B5CF6" }}>
              Sign in
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Toast Component */}
      <Toast />
    </View>
  );
}
