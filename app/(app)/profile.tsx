import React, { useState } from "react";
import {
  View,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { supabase } from "~/src/lib/supabase";
import * as ImagePicker from "expo-image-picker";
import {
  Camera,
  UserCircle,
  Mail,
  User,
  AtSign,
  LogOut,
} from "lucide-react-native";
import { useUser } from "~/hooks/useUserData";
import { Text } from "~/src/components/ui/text";
import { Input } from "~/src/components/ui/input";
import { Button } from "~/src/components/ui/button";
import { MotiView } from "moti";
import Toast from "react-native-toast-message";
import { Label } from "~/src/components/ui/label";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/src/components/ui/card";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "~/src/components/ui/avatar";
import { Separator } from "~/src/components/ui/separator";

export default function Profile() {
  const insets = useSafeAreaInsets();
  const { user, loading, updateUser } = useUser();
  const [editing, setEditing] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

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
        text1: "Profile updated successfully",
      });
    } catch (error) {
      Toast.show({
        type: "error",
        text1: "Failed to update profile",
      });
    }
  };

  async function pickImage() {
    try {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Toast.show({
          type: "error",
          text1: "Please allow access to your photo library",
        });
        return;
      }

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
            .from("profile-pictures")
            .upload(`avatars/${fileName}`, blob, {
              contentType: `image/${fileExt}`,
              upsert: true,
            });

          if (uploadError) throw uploadError;

          const {
            data: { publicUrl },
          } = supabase.storage
            .from("profile-pictures")
            .getPublicUrl(`avatars/${fileName}`);

          await updateUser({
            avatar_url: publicUrl,
            updated_at: new Date().toISOString(),
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
  }

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error("Sign out error:", error);
      Toast.show({
        type: "error",
        text1: "Failed to sign out",
      });
    }
  };

  if (loading) {
    return (
      <View className="items-center justify-center flex-1">
        <ActivityIndicator size="large" className="text-primary" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      {/* Header with Safe Area */}
      <View
        className="bg-content1"
        style={{
          paddingTop: insets.top + 16,
          paddingBottom: 10,
          marginVertical: 16,
        }}
      >
        <View className="px-6">
          <View className="flex-row items-center justify-between">
            <Text className="text-3xl font-semibold text-primary-foreground">
              Profile
            </Text>
            <Button
              variant="secondary"
              size="icon"
              onPress={handleSignOut}
              className="w-10 h-10 rounded-full bg-primary-foreground/10"
            >
              <LogOut size={20} className="text-primary-foreground" />
            </Button>
          </View>
        </View>
      </View>

      {/* Scrollable Content */}
      <ScrollView
        className="flex-1 pt-5"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: insets.bottom + 24,
        }}
      >
        {/* Profile Content */}
        <View className="px-6 -mt-1">
          <MotiView
            from={{ opacity: 0, translateY: 20 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: "spring", damping: 18 }}
          >
            <Card className="bg-content1 backdrop-blur-lg">
              <CardHeader className="items-center pb-2">
                <TouchableOpacity onPress={pickImage} className="relative mb-3">
                  <Avatar
                    alt="profile"
                    className="w-24 h-24 border-4 border-background"
                  >
                    <AvatarImage
                      source={{ uri: user?.avatar_url || undefined }}
                      className="bg-muted"
                    />
                    <AvatarFallback>
                      <UserCircle size={40} className="text-muted-foreground" />
                    </AvatarFallback>
                    {uploadingImage ? (
                      <View className="absolute bottom-0 right-0 p-2 rounded-full bg-primary">
                        <ActivityIndicator size="small" color="white" />
                      </View>
                    ) : (
                      <View className="absolute bottom-0 right-0 p-2 rounded-full bg-primary">
                        <Camera size={16} className="text-primary-foreground" />
                      </View>
                    )}
                  </Avatar>
                </TouchableOpacity>

                <Text className="mt-2 text-xl font-semibold">
                  {user?.first_name} {user?.last_name}
                </Text>
                <Text className="text-muted-foreground">
                  @{user?.username || "username"}
                </Text>
              </CardHeader>

              <CardContent className="pt-4">
                {editing ? (
                  <View className="space-y-6">
                    <View>
                      <Label className="mb-2 text-muted-foreground">
                        <Text className="text-foreground">Username</Text>
                      </Label>
                      <View className="flex-row items-center">
                        <AtSign size={20} className="mr-2 text-primary" />
                        <Input
                          value={username}
                          onChangeText={setUsername}
                          placeholder="Enter username"
                          className="flex-1"
                        />
                      </View>
                    </View>

                    <View>
                      <Label className="mb-2 text-muted-foreground">
                        <Text className="text-foreground">Full Name</Text>
                      </Label>
                      <View className="space-y-3">
                        <View className="flex-row items-center">
                          <User size={20} className="mr-2 text-primary" />
                          <Input
                            value={firstName}
                            onChangeText={setFirstName}
                            placeholder="First name"
                            className="flex-1"
                          />
                        </View>
                        <View className="flex-row items-center">
                          <User size={20} className="mr-2 text-primary" />
                          <Input
                            value={lastName}
                            onChangeText={setLastName}
                            placeholder="Last name"
                            className="flex-1"
                          />
                        </View>
                      </View>
                    </View>

                    <View>
                      <Label className="mb-2 text-muted-foreground">
                        <Text className="text-foreground">Email</Text>
                      </Label>
                      <View className="flex-row items-center p-4 rounded-md bg-muted">
                        <Mail size={20} className="mr-2 text-primary" />
                        <Text className="text-muted-foreground">
                          {user?.email}
                        </Text>
                      </View>
                    </View>
                  </View>
                ) : (
                  <View className="space-y-6">
                    <View>
                      <Label className="mb-2 text-muted-foreground">
                        <Text className="text-foreground">Username</Text>
                      </Label>
                      <View className="flex-row items-center">
                        <AtSign size={18} className="mr-2 text-primary" />
                        <Text>{user?.username || "Not set"}</Text>
                      </View>
                    </View>

                    <Separator />

                    <View>
                      <Label className="mb-2 text-muted-foreground">
                        <Text className="text-foreground">Full Name</Text>
                      </Label>
                      <View className="flex-row items-center">
                        <User size={18} className="mr-2 text-primary" />
                        <Text>
                          {user?.first_name} {user?.last_name}
                        </Text>
                      </View>
                    </View>

                    <Separator />

                    <View>
                      <Label className="mb-2 text-muted-foreground">
                        <Text className="text-foreground">Email</Text>
                      </Label>
                      <View className="flex-row items-center">
                        <Mail size={18} className="mr-2 text-primary" />
                        <Text>{user?.email}</Text>
                      </View>
                    </View>
                  </View>
                )}
              </CardContent>

              <CardFooter className="pt-6">
                {editing ? (
                  <View className="flex-row w-full gap-4">
                    <Button
                      variant="outline"
                      onPress={() => setEditing(false)}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="default"
                      onPress={handleUpdateProfile}
                      className="flex-1"
                    >
                      Save Changes
                    </Button>
                  </View>
                ) : (
                  <Button
                    variant="default"
                    onPress={() => setEditing(true)}
                    className="w-full"
                  >
                    <Text className="text-foreground">Edit Profile</Text>
                  </Button>
                )}
              </CardFooter>
            </Card>
          </MotiView>
        </View>
      </ScrollView>
    </View>
  );
}
