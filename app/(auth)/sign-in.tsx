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
import { Lock, Mail } from "lucide-react-native";
import { MotiView } from "moti";

export default function SignIn(): JSX.Element {
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  async function signIn(): Promise<void> {
    if (!email || !password) {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Please fill in all fields",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      Toast.show({
        type: "success",
        text1: "Success",
        text2: "Signed in successfully",
      });
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
          <Text className="w-full text-4xl font-bold">Welcome Back 👋</Text>
          <Text className="mt-3 text-base text-muted-foreground">
            Sign in to continue your journey
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

            {/* Password Input */}
            <View className="mb-4">
              <Text className="mb-4 text-lg font-medium">Password</Text>
              <View className="flex-row items-center h-14 bg-input rounded-xl">
                <View className="px-4">
                  <Lock size={22} className="text-primary" />
                </View>
                <Input
                  placeholder="••••••••"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  autoComplete="password"
                  className="flex-1 bg-transparent border-0 h-14"
                />
              </View>
            </View>

            {/* Forgot Password */}
            <TouchableOpacity
              className="self-end mb-6"
              onPress={() => {
                /* Add forgot password handler */
              }}
            >
              <Text className="text-base text-primary">Forgot password?</Text>
            </TouchableOpacity>

            {/* Sign In Button */}
            <Button
              onPress={signIn}
              disabled={loading}
              className="h-14 bg-primary rounded-xl"
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-lg font-medium text-primary-foreground">
                  Sign In
                </Text>
              )}
            </Button>
          </MotiView>
        </View>

        {/* Sign Up Link */}
        <View className="justify-end flex-1 pb-8">
          <View className="flex-row items-center justify-center">
            <Text className="text-base text-muted-foreground">
              Don't have an account?{" "}
            </Text>
            <TouchableOpacity onPress={() => router.push("/sign-up")}>
              <Text className="text-base font-medium text-primary">
                Sign up
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}
