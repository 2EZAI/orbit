import React, { useState } from "react";
import {
  View,
  TouchableOpacity,
  Image,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { supabase } from "~/src/lib/supabase";
import * as ImagePicker from "expo-image-picker";
import { Camera, UserCircle, Mail, User, AtSign } from "lucide-react-native";
import { useUser } from "~/hooks/useUserData";
import { Text } from "~/src/components/ui/text";
import { Input } from "~/src/components/ui/input";
import { Button } from "~/src/components/ui/button";
import { MotiView } from "moti";
import Toast from "react-native-toast-message";

export default function Profile() {
  const { user, loading, updateUser } = useUser();
  const [editing, setEditing] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | undefined>(
    undefined
  );

  // Form state
  const [username, setUsername] = useState(user?.username || "");
  const [firstName, setFirstName] = useState(user?.first_name || "");
  const [lastName, setLastName] = useState(user?.last_name || "");

  const handleUpdateProfile = async () => {
    try {
      await updateUser({
        username,
        first_name: firstName,
        last_name: lastName,
        updated_at: new Date().toISOString(),
      });

      setEditing(false);
      Toast.show({
        type: "success",
        text1: "Success",
        text2: "Profile updated successfully",
      });
    } catch (error) {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Failed to update profile",
      });
    }
  };

  async function pickImage() {
    try {
      // Request permissions first
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Toast.show({
          type: "error",
          text1: "Permission needed",
          text2: "Please allow access to your photo library",
        });
        return;
      }

      // Launch picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: false,
        aspect: [1, 1],
        quality: 1,
        allowsMultipleSelection: false,
      });

      if (result.canceled) {
        return;
      }

      if (result.assets?.[0]) {
        setUploadingImage(true);

        try {
          const file = result.assets[0];

          // Fetch the image and convert to blob
          const fetchResponse = await fetch(file.uri);
          const imageBlob = await fetchResponse.blob();

          // Generate unique filename
          const fileExt = file.uri.substring(file.uri.lastIndexOf(".") + 1);
          const fileName = `${user?.id}-${Date.now()}.${fileExt}`;

          // Upload to Supabase storage with proper content type
          const { error: uploadError } = await supabase.storage
            .from("profile-pictures")
            .upload(`avatars/${fileName}`, imageBlob, {
              contentType: `image/${fileExt}`,
              upsert: false,
            });

          if (uploadError) throw uploadError;

          // Get the public URL
          const {
            data: { publicUrl },
          } = supabase.storage
            .from("profile-pictures")
            .getPublicUrl(`avatars/${fileName}`);

          // Update user profile
          await updateUser({
            avatar_url: publicUrl,
            updated_at: new Date().toISOString(),
          });

          Toast.show({
            type: "success",
            text1: "Success",
            text2: "Profile picture updated",
          });
        } catch (error) {
          console.error("Upload error:", error);
          Toast.show({
            type: "error",
            text1: "Upload failed",
            text2: "Please try again",
          });
        }
      }
    } catch (error) {
      console.error("Image picker error:", error);
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Failed to select image",
      });
    } finally {
      setUploadingImage(false);
    }
  }

  const handleSignOut = () => supabase.auth.signOut();

  if (loading) {
    return (
      <View className="items-center justify-center flex-1 ">
        <ActivityIndicator size="large" className="text-primary" />
      </View>
    );
  }

  return (
    <ScrollView className="flex-1">
      {/* Profile Header with Image */}
      <MotiView
        from={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ type: "timing", duration: 1000 }}
        className="relative h-52 bg-content1"
      >
        <View className="absolute w-full px-6 -bottom-16">
          <View className="flex-row items-end">
            <TouchableOpacity onPress={pickImage} className="relative">
              {user?.avatar_url ? (
                <Image
                  source={{ uri: user.avatar_url }}
                  className="w-32 h-32 border-4 rounded-full border-background bg-muted"
                />
              ) : (
                <View className="items-center justify-center w-32 h-32 border-4 rounded-full border-background bg-primary/5">
                  <UserCircle size={50} className="text-primary/60" />
                </View>
              )}
              {uploadingImage ? (
                <View className="absolute bottom-0 right-0 p-3 rounded-full bg-primary">
                  <ActivityIndicator size="small" color="white" />
                </View>
              ) : (
                <View className="absolute bottom-0 right-0 p-3 rounded-full shadow-lg bg-primary">
                  <Camera size={18} className="text-primary-foreground" />
                </View>
              )}
            </TouchableOpacity>

            <View className="flex-1 mb-4 ml-4">
              <Text className="text-2xl font-bold">
                {user?.first_name} {user?.last_name}
              </Text>
              <Text className="text-muted-foreground">
                @{user?.username || "username"}
              </Text>
            </View>
          </View>
        </View>
      </MotiView>

      {/* Profile Content */}
      <View className="px-6 pt-20 ">
        {editing ? (
          <MotiView
            from={{ opacity: 0, translateY: 20 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: "spring" }}
            className="space-y-6"
          >
            {/* Username Input */}
            <View>
              <Text className="mb-2 text-base font-medium">Username</Text>
              <View className="flex-row items-center h-12 overflow-hidden bg-input/5 rounded-2xl">
                <View className="px-4">
                  <AtSign size={20} className="text-primary" />
                </View>
                <Input
                  value={username}
                  onChangeText={setUsername}
                  placeholder="Enter username"
                  className="flex-1 h-12 bg-transparent border-0"
                />
              </View>
            </View>

            {/* Name Inputs */}
            <View className="flex-row gap-4">
              <View className="flex-1">
                <Text className="mb-2 text-base font-medium">First Name</Text>
                <View className="flex-row items-center h-12 overflow-hidden bg-input/5 rounded-2xl">
                  <View className="px-4">
                    <User size={20} className="text-primary" />
                  </View>
                  <Input
                    value={firstName}
                    onChangeText={setFirstName}
                    placeholder="First name"
                    className="flex-1 h-12 bg-transparent border-0"
                  />
                </View>
              </View>

              <View className="flex-1">
                <Text className="mb-2 text-base font-medium">Last Name</Text>
                <View className="flex-row items-center h-12 overflow-hidden bg-input/5 rounded-2xl">
                  <View className="px-4">
                    <User size={20} className="text-primary" />
                  </View>
                  <Input
                    value={lastName}
                    onChangeText={setLastName}
                    placeholder="Last name"
                    className="flex-1 h-12 bg-transparent border-0"
                  />
                </View>
              </View>
            </View>

            {/* Email Display */}
            <View>
              <Text className="mb-2 text-base font-medium">Email</Text>
              <View className="flex-row items-center h-12 px-4 bg-input/5 rounded-2xl">
                <Mail size={20} className="mr-3 text-primary" />
                <Text className="text-muted-foreground">{user?.email}</Text>
              </View>
            </View>

            {/* Action Buttons */}
            <View className="flex-row gap-4 pt-4">
              <Button
                variant="outline"
                onPress={() => setEditing(false)}
                className="flex-1 h-12 rounded-2xl"
              >
                <Text className="text-base font-medium">Cancel</Text>
              </Button>
              <Button
                onPress={handleUpdateProfile}
                className="flex-1 h-12 bg-primary rounded-2xl"
              >
                <Text className="text-base font-medium text-primary-foreground">
                  Save Changes
                </Text>
              </Button>
            </View>
          </MotiView>
        ) : (
          <MotiView
            from={{ opacity: 0, translateY: 20 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: "spring" }}
            className="space-y-6"
          >
            {/* Info Card */}
            <View className="p-6 space-y-6 bg-card rounded-3xl">
              <View>
                <Text className="mb-1 text-sm text-muted-foreground">
                  Username
                </Text>
                <View className="flex-row items-center">
                  <AtSign size={18} className="mr-2 text-primary" />
                  <Text className="text-lg">{user?.username || "Not set"}</Text>
                </View>
              </View>

              <View>
                <Text className="mb-1 text-sm text-muted-foreground">
                  Full Name
                </Text>
                <View className="flex-row items-center">
                  <User size={18} className="mr-2 text-primary" />
                  <Text className="text-lg">
                    {user?.first_name} {user?.last_name}
                  </Text>
                </View>
              </View>

              <View>
                <Text className="mb-1 text-sm text-muted-foreground">
                  Email
                </Text>
                <View className="flex-row items-center">
                  <Mail size={18} className="mr-2 text-primary" />
                  <Text className="text-lg">{user?.email}</Text>
                </View>
              </View>
            </View>

            <View className="flex-row gap-4 justify-bottom">
              {/* Edit Button */}
              <Button
                onPress={() => setEditing(true)}
                className="h-12 bg-primary rounded-2xl"
              >
                <Text className="text-base font-medium text-primary-foreground">
                  Edit Profile
                </Text>
              </Button>

              {/* Sign Out Button */}
              <Button
                variant="destructive"
                onPress={handleSignOut}
                className="h-12 rounded-2xl"
              >
                <Text className="text-base font-medium text-destructive-foreground">
                  Sign Out
                </Text>
              </Button>
            </View>
          </MotiView>
        )}
      </View>

      {/* Bottom Spacing */}
      <View className="h-20" />
    </ScrollView>
  );
}
