import { useState } from "react";
import {
  View,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
} from "react-native";
import { supabase } from "../../src/lib/supabase";
import { router } from "expo-router";
import { Input } from "~/src/components/ui/input";
import { Button } from "~/src/components/ui/button";
import { Text } from "~/src/components/ui/text";
import { Camera, Lock, Mail, Phone, UserCircle } from "lucide-react-native";
import Toast from "react-native-toast-message";
import * as ImagePicker from "expo-image-picker";
import { MotiView } from "moti";
import { BlurView } from "expo-blur";

export default function SignUp() {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [profileImage, setProfileImage] = useState<string | null>(null);

  async function signUp() {
    if (!email || !password || !firstName || !lastName) {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Please fill in all required fields",
      });
      return;
    }

    setLoading(true);
    try {
      // 1. Sign up the user with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError) throw authError;

      // 2. Create the user profile if auth was successful
      if (authData.user) {
        const { error: profileError } = await supabase.from("users").insert({
          id: authData.user.id,
          email,
          first_name: firstName,
          last_name: lastName,
          phone_number: phone || null,
        });

        if (profileError) throw profileError;
      }

      Toast.show({
        type: "success",
        text1: "Success",
        text2: "Account created successfully",
      });

      // User will be automatically redirected by the auth listener
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

  async function pickImage() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (!result.canceled) {
      setProfileImage(result.assets[0].uri);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView
        className="flex-1 px-6"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* Header */}
        <MotiView
          from={{ opacity: 0, translateY: -20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: "timing", duration: 1000 }}
          className="pt-12 pb-8"
        >
          <Text className="text-4xl font-bold">Create Your Account</Text>
          <Text className="mt-3 text-base text-muted-foreground">
            Join the community and start exploring
          </Text>
        </MotiView>

        {/* Profile Picture */}
        <MotiView
          from={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", delay: 200 }}
          className="items-center mb-8"
        >
          <TouchableOpacity onPress={pickImage} className="relative">
            <BlurView intensity={20} className="overflow-hidden rounded-full">
              {profileImage ? (
                <Image
                  source={{ uri: profileImage }}
                  className="rounded-full w-28 h-28"
                />
              ) : (
                <View className="items-center justify-center rounded-full w-28 h-28 bg-primary/5">
                  <UserCircle size={44} className="text-primary" />
                </View>
              )}
            </BlurView>
            <View className="absolute bottom-0 right-0 p-3 rounded-full bg-primary">
              <Camera size={18} className="text-primary-foreground" />
            </View>
          </TouchableOpacity>
        </MotiView>

        {/* Form Card */}
        <MotiView
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: "spring", delay: 400 }}
        >
          <View className="gap-2 p-2 rounded-3xl bg-content2">
            {/* Name Fields */}
            <View className="flex-row gap-4 mb-6">
              <View className="flex-1">
                <Text className="mb-1 text-lg font-medium">First Name</Text>
                <View className="h-14 bg-input rounded-xl">
                  <Input
                    placeholder="John"
                    value={firstName}
                    onChangeText={setFirstName}
                    autoCapitalize="words"
                    className="px-4 bg-transparent border-0 h-14"
                  />
                </View>
              </View>

              <View className="flex-1">
                <Text className="mb-1 text-lg font-medium">Last Name</Text>
                <View className="h-14 bg-input rounded-xl">
                  <Input
                    placeholder="Doe"
                    value={lastName}
                    onChangeText={setLastName}
                    autoCapitalize="words"
                    className="px-4 bg-transparent border-0 h-14"
                  />
                </View>
              </View>
            </View>

            {/* Other Fields */}
            <View className="space-y-6">
              <View>
                <Text className="mb-1 text-lg font-medium">Email Address</Text>
                <View className="flex-row items-center h-14 bg-input rounded-xl">
                  <View className="px-4">
                    <Mail size={22} className="text-primary" />
                  </View>
                  <Input
                    placeholder="you@example.com"
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    className="flex-1 bg-transparent border-0 h-14"
                  />
                </View>
              </View>

              <View>
                <Text className="mb-1 text-lg font-medium">Phone Number</Text>
                <View className="flex-row items-center h-14 bg-input rounded-xl">
                  <View className="px-4">
                    <Phone size={22} className="text-primary" />
                  </View>
                  <Input
                    placeholder="+1 (555) 000-0000"
                    value={phone}
                    onChangeText={setPhone}
                    keyboardType="phone-pad"
                    className="flex-1 bg-transparent border-0 h-14"
                  />
                </View>
              </View>

              <View>
                <Text className="mb-1 text-lg font-medium">Password</Text>
                <View className="flex-row items-center h-14 bg-input rounded-xl">
                  <View className="px-4">
                    <Lock size={22} className="text-primary" />
                  </View>
                  <Input
                    placeholder="••••••••"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                    className="flex-1 bg-transparent border-0 h-14"
                  />
                </View>
              </View>
            </View>

            {/* Create Account Button */}
            <View className="mt-8">
              <Button
                onPress={signUp}
                disabled={loading}
                className="h-14 bg-primary rounded-xl"
              >
                {loading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text className="text-lg font-medium text-primary-foreground">
                    Create Account
                  </Text>
                )}
              </Button>
            </View>
          </View>

          {/* Sign In Link */}
          <View className="flex-row items-center justify-center mt-8">
            <Text className="text-base text-muted-foreground">
              Already have an account?{" "}
            </Text>
            <TouchableOpacity onPress={() => router.push("/sign-in")}>
              <Text className="text-base font-medium text-primary">
                Sign in
              </Text>
            </TouchableOpacity>
          </View>
        </MotiView>
      </ScrollView>
    </SafeAreaView>
  );
}
