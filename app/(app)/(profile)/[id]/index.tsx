import { useState } from "react";
import {
  View,
  SafeAreaView,
  TouchableOpacity,
  Image,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { Text } from "~/src/components/ui/text";
import { Input } from "~/src/components/ui/input";
import { useUser } from "~/hooks/useUserData";
import { supabase } from "~/src/lib/supabase";
import { ArrowLeft, Pencil } from "lucide-react-native";
import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";

import Toast from "react-native-toast-message";

export default function EditProfile() {
  const { user, updateUser } = useUser();
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Form state
  const [firstName, setFirstName] = useState(user?.first_name || "");
  const [lastName, setLastName] = useState(user?.last_name || "");
  const [username, setUsername] = useState(user?.username || "");
  const [bio, setBio] = useState(user?.bio || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [location, setLocation] = useState(user?.location || "");

  const handleSave = async () => {
    setLoading(true);
    try {
      await updateUser({
        first_name: firstName,
        last_name: lastName,
        username,
        bio,
        location,
        phone,
      });
      Toast.show({
        type: "success",
        text1: "Profile updated successfully",
      });
      router.back();
    } catch (error) {
      Toast.show({
        type: "error",
        text1: "Failed to update profile",
        text2: error instanceof Error ? error.message : "An error occurred",
      });
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
      });

      if (!result.canceled && result.assets?.[0]) {
        setUploadingImage(true);
        try {
          const file = result.assets[0];
          const response = await fetch(file.uri);
          const blob = await response.blob();
          const fileExt = file.uri.split(".").pop();
          const fileName = `${user?.id}-${Date.now()}.${fileExt}`;

          const { error: uploadError } = await supabase.storage
            .from("avatars")
            .upload(fileName, blob, {
              contentType: `image/${fileExt}`,
              upsert: true,
            });

          if (uploadError) throw uploadError;

          const {
            data: { publicUrl },
          } = supabase.storage.from("avatars").getPublicUrl(fileName);

          await updateUser({
            avatar_url: publicUrl,
          });

          Toast.show({
            type: "success",
            text1: "Profile picture updated",
          });
        } catch (error) {
          console.error("Upload error:", error);
          Toast.show({
            type: "error",
            text1: "Failed to upload image",
          });
        }
      }
    } catch (error) {
      console.error("Image picker error:", error);
      Toast.show({
        type: "error",
        text1: "Failed to select image",
      });
    } finally {
      setUploadingImage(false);
    }
  };

  if (!user) return null;

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="items-center mt-4">
          <TouchableOpacity onPress={pickImage} className="relative">
            <Image
              source={
                user.avatar_url
                  ? { uri: user.avatar_url }
                  : require("~/assets/favicon.png")
              }
              className="w-24 h-24 bg-gray-800 rounded-full"
            />
            <View className="absolute bottom-0 right-0 p-2 rounded-full bg-primary">
              {uploadingImage ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Pencil size={16} className="text-primary-foreground" />
              )}
            </View>
          </TouchableOpacity>
        </View>

        <View className="px-4 mt-6 space-y-6">
          <View>
            <Text className="text-sm text-muted-foreground mb-1.5">Name</Text>
            <View className="flex-row gap-x-4">
              <View className="flex-1">
                <Input
                  value={firstName}
                  onChangeText={setFirstName}
                  placeholder="First name"
                  className="h-12 px-4 border-0 bg-gray-800/40"
                />
              </View>
              <View className="flex-1">
                <Input
                  value={lastName}
                  onChangeText={setLastName}
                  placeholder="Last name"
                  className="h-12 px-4 border-0 bg-gray-800/40"
                />
              </View>
            </View>
          </View>

          <View>
            <Text className="text-sm text-muted-foreground mb-1.5">
              Username
            </Text>
            <Input
              value={username}
              onChangeText={setUsername}
              placeholder="@username"
              className="h-12 px-4 border-0 bg-gray-800/40"
            />
          </View>

          <View>
            <Text className="text-sm text-muted-foreground mb-1.5">
              Location
            </Text>
            <Input
              value={location}
              onChangeText={setLocation}
              placeholder="City, Country"
              className="h-12 px-4 border-0 bg-gray-800/40"
            />
          </View>

          <View>
            <Text className="text-sm text-muted-foreground mb-1.5">Bio</Text>
            <Input
              value={bio}
              onChangeText={setBio}
              placeholder="Write a little bit about yourself"
              multiline
              numberOfLines={3}
              className="h-24 px-4 py-3 align-text-top border-0 bg-gray-800/40"
              textAlignVertical="top"
            />
          </View>

          <View>
            <Text className="text-sm text-muted-foreground mb-1.5">
              Phone Number
            </Text>
            <Input
              value={phone}
              onChangeText={setPhone}
              placeholder="+1 (555) 000-0000"
              keyboardType="phone-pad"
              className="h-12 px-4 border-0 bg-gray-800/40"
            />
          </View>

          <View>
            <Text className="text-sm text-muted-foreground mb-1.5">Email</Text>
            <Input
              value={user.email}
              editable={false}
              className="h-12 px-4 border-0 opacity-50 bg-gray-800/40"
            />
          </View>

          {/* Sign Out Button */}
          <View className="mt-8">
            <TouchableOpacity
              onPress={async () => {
                await supabase.auth.signOut();
                router.replace("/(auth)/sign-in");
              }}
              className="py-4 border rounded-xl border-destructive"
            >
              <Text className="font-medium text-center text-destructive">
                Sign Out
              </Text>
            </TouchableOpacity>
          </View>

          {/* Bottom Spacing */}
          <View className="h-20" />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
