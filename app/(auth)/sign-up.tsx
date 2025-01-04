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
import { Camera, UserCircle } from "lucide-react-native";
import Toast from "react-native-toast-message";
import * as ImagePicker from "expo-image-picker";

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
      <ScrollView className="flex-1 px-6" showsVerticalScrollIndicator={false}>
        <View className="justify-center flex-1 p-5 bg-background">
          {/* Header */}
          <Text className="mb-1 text-3xl font-bold">Create Account</Text>
          <Text className="mb-6 text-base text-muted-foreground">
            Fill in your details to get started
          </Text>
        </View>

        {/* Profile Picture */}
        <View className="items-center mb-6">
          <TouchableOpacity onPress={pickImage} className="relative">
            {profileImage ? (
              <Image
                source={{ uri: profileImage }}
                className="w-24 h-24 rounded-full bg-muted"
              />
            ) : (
              <View className="items-center justify-center w-24 h-24 rounded-full bg-muted">
                <UserCircle size={40} className="text-muted-foreground" />
              </View>
            )}
            <View className="absolute bottom-0 right-0 p-2 rounded-full bg-primary">
              <Camera size={16} className="text-primary-foreground" />
            </View>
          </TouchableOpacity>
          <Text className="mt-2 text-sm text-muted-foreground">
            Tap to add profile picture
          </Text>
        </View>

        {/* Form Fields */}
        <View className="space-y-4">
          {/* Name Fields */}
          <View className="flex-row gap-3">
            <View className="flex-1">
              <Text className="text-sm mb-1.5">First Name</Text>
              <Input
                placeholder="John"
                value={firstName}
                onChangeText={setFirstName}
                autoCapitalize="words"
                className="bg-muted/50"
              />
            </View>

            <View className="flex-1">
              <Text className="text-sm mb-1.5">Last Name</Text>
              <Input
                placeholder="Doe"
                value={lastName}
                onChangeText={setLastName}
                autoCapitalize="words"
                className="bg-muted/50"
              />
            </View>
          </View>

          <View>
            <Text className="text-sm mb-1.5">Email</Text>
            <Input
              placeholder="your@email.com"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              className="bg-muted/50"
            />
          </View>

          <View>
            <Text className="text-sm mb-1.5">Phone Number (Optional)</Text>
            <Input
              placeholder="+1 (555) 000-0000"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              className="bg-muted/50"
            />
          </View>

          <View>
            <Text className="text-sm mb-1.5">Password</Text>
            <Input
              placeholder="Choose a strong password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              className="bg-muted/50"
            />
          </View>
        </View>

        {/* Action Buttons */}
        <View className="mt-6 space-y-4">
          <Button
            onPress={signUp}
            disabled={loading}
            className="py-3 bg-primary rounded-xl"
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="font-medium text-primary-foreground">
                Create Account
              </Text>
            )}
          </Button>

          <View className="flex-row justify-center">
            <Text className="text-muted-foreground">
              Already have an account?{" "}
            </Text>
            <TouchableOpacity onPress={() => router.push("/sign-in")}>
              <Text className="font-medium text-primary">Sign in</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
