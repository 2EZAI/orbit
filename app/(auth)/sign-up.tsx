import { useState } from "react";
import {
  View,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  Platform,
} from "react-native";
import { useChat } from "~/src/lib/chat";
import { supabase } from "../../src/lib/supabase";
import { router } from "expo-router";
import { Input } from "~/src/components/ui/input";
import { Button } from "~/src/components/ui/button";
import { Text } from "~/src/components/ui/text";
import { Camera, Lock, Mail, Phone, UserCircle } from "lucide-react-native";
import { Icon } from 'react-native-elements';
import Toast from "react-native-toast-message";
import * as ImagePicker from "expo-image-picker";
import { MotiView } from "moti";
import { BlurView } from "expo-blur";
import Constants from "expo-constants";
import * as FileSystem from "expo-file-system";

// console.log("Supabase URL:", Constants.expoConfig?.extra?.supabaseUrl);
// console.log(
//   "Supabase Key:",
//   Constants.expoConfig?.extra?.supabaseAnonKey?.slice(0, 5) + "..."
// );

// Function to convert base64 to Uint8Array for Supabase storage
function decode(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export default function SignUp() {
  const { client } = useChat();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [profileImage, setProfileImage] = useState<string | null>(null);

  async function uploadProfilePicture(userId: string, uri: string) {
    try {
      // Get the file extension
      const fileExt = uri.split(".").pop();
      const fileName = `${userId}/profile.${fileExt}`;
      const filePath = `${FileSystem.documentDirectory}profile.${fileExt}`;

      // console.log("uri>",uri);
      var base64='';
            // Download the image first (needed for expo-file-system)
      if (Platform.OS === 'ios') {
      // Download the image first (needed for expo-file-system)
      await FileSystem.downloadAsync(uri, filePath);

      // Read the file as base64
       base64 = await FileSystem.readAsStringAsync(filePath, {
        encoding: FileSystem.EncodingType.Base64,
      });
      }
      else{
         const urii = uri; // Assuming this is a local file URI like 'file:///path/to/file'
         const fileUri = `${FileSystem.documentDirectory}profile.${fileExt}`;
         await FileSystem.copyAsync({ from: urii, to: fileUri });
            // Read the file as base64
         base64 = await FileSystem.readAsStringAsync(fileUri, {
              encoding: FileSystem.EncodingType.Base64,
            });
          }

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from("profile-pictures")
        .upload(fileName, decode(base64), {
          contentType: `image/${fileExt}`,
          upsert: true,
        });

      if (error) throw error;

      // Get the public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from("profile-pictures").getPublicUrl(fileName);

      return publicUrl;
    } catch (error) {
      console.error("Error uploading profile picture:", error);
      throw error;
    }
  }


 

  async function signUp() {
    setLoading(true);
    console.log("Starting sign up process...");
    try {
      if (!email || !password) {
        throw new Error("Email and password are required");
      }

      if (!profileImage) {
        throw new Error("Please select a profile picture");
      }

      console.log("Creating user account...");
      // 1. Create the user account
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName || null,
            last_name: lastName || null,
            phone: phone || null,
          },
          emailRedirectTo: "orbit://onboarding",
        },
      });

      if (error) throw error;
      // console.log("User account created:", data.user?.id);

      if (!data?.user) {
        throw new Error("Failed to create account");
      }

      console.log("Uploading profile picture...");
      // 2. Upload the profile picture
      const publicUrl = await uploadProfilePicture(data.user.id, profileImage);
      // console.log("Profile picture uploaded:", publicUrl);

      console.log("Updating user avatar...");
      // 3. Update the user's avatar_url
      const { error: updateError } = await supabase
        .from("users")
        .update({ avatar_url: publicUrl })
        .eq("id", data.user.id);

      if (updateError) throw updateError;
      console.log("Avatar updated successfully");

      Toast.show({
        type: "success",
        text1: "Welcome!",
        text2: "Your account has been created successfully",
      });

      // 4. Get the current session to ensure we're logged in
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();
      if (sessionError || !session) {
        throw new Error("Failed to get session after sign up");
      }

      // 5. Create initial user record with empty username
      const { error: userError } = await supabase.from("users").upsert({
        id: session.user.id,
        username: null,
        permissions_granted: false,
      });

      if (userError) throw userError;

      // 6. Navigate to username screen
      setTimeout(() => {
   router.replace("/(auth)/(onboarding)/username");
}, 2000);
     

      
    } catch (error) {
      // console.error("Sign up error:", error);
      if (error.name === "AuthWeakPasswordError") {
        Toast.show({
         type: 'customError',
  text1: 'Password Requirements',
   });

    } else {
      Toast.show({
        type: "error",
        text1: "Error",
        text2:
          error instanceof Error ? error.message : "Failed to create account",
      });
      }
    } finally {
      setLoading(false);
      console.log("Sign up process completed");
    }
  }
  const toastConfig = {
   customError: (props) => {return (
    <View
      style={{
        padding: 16,
        backgroundColor: '#f8d7da',
        borderLeftWidth: 5,
        borderLeftColor: '#dc3545',
        borderRadius: 6,
      }}
    >
      <Text style={{ fontWeight: 'bold', color: '#721c24' }}>{props.text1}</Text>
      <Text style={{ color: '#721c24', marginTop: 4 }}>
        • Uppercase letters{'\n'}
        • Numbers{'\n'}
        • Special characters
      </Text>
    </View>
  );
   }
};

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
                  {Platform.OS === 'ios'?
              <UserCircle size={44} className="text-primary" />
               :<Icon name="account-circle-outline" type="material-community"
                      size={44}
                      color="#239ED0"/>
              }
                  
                </View>
              )}
            </BlurView>
            <View className="absolute bottom-0 right-0 p-3 rounded-full bg-primary">
              {Platform.OS === 'ios'?
              <Camera size={22} className="text-primary" />
               :<Icon name="camera-outline" type="material-community"
                      size={22}
                      color="#239ED0"/>
              }
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
                   {Platform.OS === 'ios'?
                    <Mail size={22} className="text-primary" />
                    :<Icon name="email-outline" type="material-community"
                      size={22}
                      color="#6495ED"/>
                    }
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
                   {Platform.OS === 'ios'?
                    <Phone size={22} className="text-primary" />
                    :<Icon name="phone-outline" type="material-community"
                      size={22}
                      color="#6495ED"/>
                    }
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
                     {Platform.OS === 'ios'?
        <Lock size={22} className="text-primary" />
        :
                     <Icon name="lock-outline" type="material-community"
                      size={22}
                      color="#6495ED"/>
                     }
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
            <TouchableOpacity onPress={() => router.push("/(auth)/sign-in")}>
              <Text className="text-base font-medium text-primary">
                Sign in
              </Text>
            </TouchableOpacity>
          </View>
        </MotiView>
      </ScrollView>
       {/* Toast Component */}
      <Toast />
      <Toast config={toastConfig} />
    </SafeAreaView>
  );
}
