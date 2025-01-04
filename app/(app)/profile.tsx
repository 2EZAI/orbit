import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
} from "react-native";
import { supabase } from "../../src/lib/supabase";
import { useAuth } from "../../src/lib/auth";
import * as ImagePicker from "expo-image-picker";
import { User } from "@supabase/supabase-js";
import { Pencil, Camera } from "lucide-react-native";

interface Profile {
  id: string;
  email: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
}

export default function Profile() {
  const { session } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Form state
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");

  useEffect(() => {
    if (session?.user) {
      fetchProfile(session.user);
    }
  }, [session]);

  const fetchProfile = async (user: User) => {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error) throw error;

      setProfile(data);
      setUsername(data.username || "");
      setFullName(data.full_name || "");
    } catch (error) {
      console.error("Error fetching profile:", error);
      Alert.alert("Error fetching profile");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async () => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from("users")
        .update({
          username,
          full_name: fullName,
          updated_at: new Date().toISOString(),
        })
        .eq("id", session?.user.id);

      if (error) throw error;

      setEditing(false);
      fetchProfile(session!.user);
      Alert.alert("Success", "Profile updated successfully");
    } catch (error) {
      console.error("Error updating profile:", error);
      Alert.alert("Error updating profile");
    } finally {
      setLoading(false);
    }
  };

  const handleImagePick = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled) {
        await uploadProfilePicture(result.assets[0].uri);
      }
    } catch (error) {
      console.error("Error picking image:", error);
      Alert.alert("Error selecting image");
    }
  };

  const uploadProfilePicture = async (uri: string) => {
    try {
      setUploadingImage(true);
      const response = await fetch(uri);
      const blob = await response.blob();
      const fileExt = uri.split(".").pop();
      const fileName = `${session?.user.id}-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      // Upload image
      const { error: uploadError } = await supabase.storage
        .from("profile-pictures")
        .upload(filePath, blob);

      if (uploadError) throw uploadError;

      // Get public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from("profile-pictures").getPublicUrl(filePath);

      // Update profile with new image URL
      const { error: updateError } = await supabase
        .from("users")
        .update({ avatar_url: publicUrl })
        .eq("id", session?.user.id);

      if (updateError) throw updateError;

      fetchProfile(session!.user);
      Alert.alert("Success", "Profile picture updated");
    } catch (error) {
      console.error("Error uploading image:", error);
      Alert.alert("Error uploading image");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  if (loading) {
    return (
      <View className="items-center justify-center flex-1">
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-white">
      <View className="items-center p-6">
        {/* Profile Picture Section */}
        <TouchableOpacity onPress={handleImagePick} className="relative mb-6">
          {profile?.avatar_url ? (
            <Image
              source={{ uri: profile.avatar_url }}
              className="w-32 h-32 rounded-full"
            />
          ) : (
            <View className="items-center justify-center w-32 h-32 bg-gray-200 rounded-full">
              <Camera size={40} color="#666666" />
            </View>
          )}
          {uploadingImage && (
            <View className="absolute inset-0 items-center justify-center rounded-full bg-black/30">
              <ActivityIndicator color="white" />
            </View>
          )}
          <View className="absolute bottom-0 right-0 p-2 bg-blue-500 rounded-full">
            <Camera size={20} color="white" />
          </View>
        </TouchableOpacity>

        {/* Email Display */}
        <Text className="mb-6 text-gray-600">{session?.user.email}</Text>

        {/* Profile Information */}
        {editing ? (
          <View className="w-full space-y-4">
            <View>
              <Text className="mb-1 text-gray-600">Username</Text>
              <TextInput
                value={username}
                onChangeText={setUsername}
                className="w-full p-3 border border-gray-300 rounded-lg"
                placeholder="Enter username"
              />
            </View>

            <View>
              <Text className="mb-1 text-gray-600">Full Name</Text>
              <TextInput
                value={fullName}
                onChangeText={setFullName}
                className="w-full p-3 border border-gray-300 rounded-lg"
                placeholder="Enter full name"
              />
            </View>

            <TouchableOpacity
              onPress={handleUpdateProfile}
              className="w-full p-4 bg-blue-500 rounded-lg"
            >
              <Text className="font-semibold text-center text-white">
                Save Changes
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setEditing(false)}
              className="w-full p-4 bg-gray-200 rounded-lg"
            >
              <Text className="font-semibold text-center text-gray-800">
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View className="w-full space-y-4">
            <View className="p-4 rounded-lg bg-gray-50">
              <Text className="mb-1 text-gray-600">Username</Text>
              <Text className="text-lg">{profile?.username || "Not set"}</Text>
            </View>

            <View className="p-4 rounded-lg bg-gray-50">
              <Text className="mb-1 text-gray-600">Full Name</Text>
              <Text className="text-lg">{profile?.full_name || "Not set"}</Text>
            </View>

            <TouchableOpacity
              onPress={() => setEditing(true)}
              className="flex-row items-center justify-center w-full p-4 space-x-2 bg-blue-500 rounded-lg"
            >
              <Pencil size={20} color="white" />
              <Text className="font-semibold text-white">Edit Profile</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Sign Out Button */}
        <TouchableOpacity
          onPress={handleSignOut}
          className="w-full p-4 mt-6 bg-black rounded-lg"
        >
          <Text className="font-semibold text-center text-white">Sign Out</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
