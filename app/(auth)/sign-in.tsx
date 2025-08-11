import { useState } from "react";
import {
  ActivityIndicator,
  TouchableOpacity,
  View,
  StatusBar,
  Dimensions,
  ScrollView,
} from "react-native";
import { supabase } from "../../src/lib/supabase";
import { router } from "expo-router";
import { Input } from "~/src/components/ui/input";
import { Button } from "~/src/components/ui/button";
import { Text } from "~/src/components/ui/text";
import Toast from "react-native-toast-message";
import {
  Lock,
  Mail,
  AlertTriangle,
  ArrowLeft,
  Eye,
  EyeOff,
} from "lucide-react-native";
import { useTheme } from "~/src/components/ThemeProvider";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width, height } = Dimensions.get("window");

export default function SignIn(): JSX.Element {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);

  const handleBack = () => {
    router.back();
  };

  async function signIn(): Promise<void> {
    if (!email || !password) {
      setError("Please fill in all fields.");
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Please fill in all fields",
      });
      return;
    }

    setLoading(true);

    try {
      await saveTutorialFinished();
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.log(error);
        setError(
          "Invalid login credentials or no account associated with email."
        );
        Toast.show({
          type: "error",
          text1: "Error",
          text2: error.message || "Invalid login credentials",
        });
        return;
      }

      Toast.show({
        type: "success",
        text1: "Success",
        text2: "Signed in successfully",
      });

      // Navigate to the main app after successful login
      router.replace("/(app)/(map)");
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

  const saveTutorialFinished = async () => {
    try {
      await AsyncStorage.setItem("tutorial_finished", JSON.stringify("1"));
      console.log("Saved successfully");
    } catch (error) {
      console.error("Error saving tutorial_finished:", error);
    }
  };

  return (
    <View
      style={{
        flex: 1,
        paddingTop: Math.max(insets.top + 20, 40),
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
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        {/* Main Content */}
        <View
          style={{
            flex: 1,
            paddingTop: Math.max(insets.top + 20, 40),
            paddingHorizontal: 20,
            paddingBottom: Math.max(insets.bottom + 20, 40),
          }}
        >
          {/* Header Section */}
          <View>
            <Text
              style={{
                fontSize: 36,
                fontWeight: "800",
                color: theme.colors.text,
                marginBottom: 12,
                lineHeight: 44,
              }}
            >
              Welcome Back ✨
            </Text>
            <Text
              style={{
                fontSize: 18,
                color: theme.colors.text + "CC",
                lineHeight: 26,
              }}
            >
              Continue discovering spontaneous events and creating unforgettable
              memories
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
                    autoComplete="password"
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

              {/* Forgot Password */}
              <TouchableOpacity
                style={{ alignSelf: "flex-end", marginBottom: 32 }}
                onPress={() => {
                  router.push("/(auth)/reset-password");
                }}
              >
                <Text
                  style={{ fontSize: 16, color: "#8B5CF6", fontWeight: "600" }}
                >
                  Forgot password?
                </Text>
              </TouchableOpacity>

              {/* Sign In Button */}
              <TouchableOpacity
                onPress={signIn}
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
                    Sign In ✨
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Sign Up Link */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              marginTop: 32,
            }}
          >
            <Text style={{ fontSize: 16, color: theme.colors.text + "CC" }}>
              Don't have an account?{" "}
            </Text>
            <TouchableOpacity onPress={() => router.push("/sign-up")}>
              <Text
                style={{ fontSize: 16, fontWeight: "700", color: "#8B5CF6" }}
              >
                Sign up
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Toast Component */}
      <Toast />
    </View>
  );
}
