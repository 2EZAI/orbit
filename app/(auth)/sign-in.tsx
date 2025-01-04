import { useState } from "react";
import { SafeAreaView, TouchableOpacity, View } from "react-native";
import { supabase } from "../../src/lib/supabase";
import { router } from "expo-router";
import { Input } from "~/src/components/ui/input";
import { Button } from "~/src/components/ui/button";
import { Text } from "~/src/components/ui/text";
import Toast from "react-native-toast-message";
import { ChevronLeft } from "lucide-react-native";

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
      <View className="justify-center flex-1 p-5 bg-background">
        <View className="gap-4 space-y-6">
          <View className="gap-2">
            <Text className="text-4xl font-bold tracking-tight text-foreground">
              Welcome back! 👋🏾
            </Text>
            <Text className="text-xl text-muted-foreground">
              Sign in to your account
            </Text>
          </View>

          <View className="gap-4 space-y-4">
            <View className="space-y-2">
              <Input
                placeholder="Email"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                editable={!loading}
              />
            </View>

            <View className="space-y-2">
              <Input
                placeholder="Password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoComplete="password"
              />
            </View>
          </View>

          <View className="space-y-4">
            <Button variant="default" onPress={signIn} disabled={loading}>
              <Text>Sign In</Text>
            </Button>
          </View>

          <Button variant="outline" onPress={() => router.push("/sign-up")}>
            <Text>Don't have an account? Sign up</Text>
          </Button>
        </View>
      </View>
    </SafeAreaView>
  );
}
