import * as FileSystem from "expo-file-system";
import * as ImagePicker from "expo-image-picker";
import { Camera, User, X } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  TouchableOpacity,
  View,
} from "react-native";
import Toast from "react-native-toast-message";
import { useTheme } from "~/src/components/ThemeProvider";
import { Text } from "~/src/components/ui/text";
import { useAuth } from "~/src/lib/auth";
import { ImagePickerService } from "~/src/lib/imagePicker";
import { supabase } from "~/src/lib/supabase";
import { useUser } from "~/src/lib/UserProvider";
import { KeyboardAwareInput } from "./KeyboardAwareInput";
import { KeyboardAwareSheet } from "./KeyboardAwareSheet";
interface PersonalInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
}
function decode(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}
export function PersonalInfoModal({ isOpen, onClose }: PersonalInfoModalProps) {
  const { theme } = useTheme();
  const { session } = useAuth();
  const { user, refreshUser } = useUser();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [bio, setBio] = useState("");
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  async function pickImage() {
    try {
      const results = await ImagePickerService.pickImage({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
      });

      if (results.length > 0) {
        setProfileImage(results[0].uri);
        // Clear validation errors when image is selected
      }
    } catch (error) {
      console.error("Error picking image:", error);
      Alert.alert("Error", "Failed to pick image. Please try again.");
    }
  }

  async function uploadProfilePicture(userId: string, uri: string) {
    try {
      const fileExt = uri.split(".").pop();
      const fileName = `${userId}/profile.${fileExt}`;
      const filePath = `${FileSystem.documentDirectory}profile.${fileExt}`;

      var base64 = "";
      if (Platform.OS === "ios") {
        await FileSystem.downloadAsync(uri, filePath);
        base64 = await FileSystem.readAsStringAsync(filePath, {
          encoding: FileSystem.EncodingType.Base64,
        });
      } else {
        const fileUri = `${FileSystem.documentDirectory}profile.${fileExt}`;
        await FileSystem.copyAsync({ from: uri, to: fileUri });
        base64 = await FileSystem.readAsStringAsync(fileUri, {
          encoding: FileSystem.EncodingType.Base64,
        });
      }

      const { data, error } = await supabase.storage
        .from("profile-pictures")
        .upload(fileName, decode(base64), {
          contentType: `image/${fileExt}`,
          upsert: true,
        });

      if (error) throw error;

      const {
        data: { publicUrl },
      } = supabase.storage.from("profile-pictures").getPublicUrl(fileName);

      return publicUrl;
    } catch (error) {
      console.error("Error uploading profile picture:", error);
      throw error;
    }
  }
  // Load user data
  useEffect(() => {
    if (user && isOpen) {
      setFirstName(user.first_name || "");
      setLastName(user.last_name || "");
      setBio(user.bio || "");
      setProfileImage(user.avatar_url || null);
    }
  }, [user, isOpen]);

  const handleSave = async () => {
    if (!session?.user?.id) return;
    setLoading(true);
    let profileUrl = user?.avatar_url || "";
    if (profileImage && profileImage !== user?.avatar_url) {
      console.log("Uploading profile picture...");
      profileUrl = await uploadProfilePicture(session.user.id, profileImage);
      console.log("Profile picture uploaded:", profileUrl);
    }

    try {
      const { error } = await supabase
        .from("users")
        .update({
          first_name: firstName.trim() || null,
          last_name: lastName.trim() || null,
          bio: bio.trim() || null,
          avatar_url: profileUrl,
        })
        .eq("id", session.user.id);

      if (error) throw error;

      // Refresh user data
      await refreshUser();

      Toast.show({
        type: "success",
        text1: "Profile updated successfully!",
      });

      onClose();
    } catch (error) {
      console.error("Error updating profile:", error);
      Toast.show({
        type: "error",
        text1: "Failed to update profile",
        text2: "Please try again",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAwareSheet isOpen={isOpen} onClose={onClose}>
      <View style={{ padding: 20 }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 24,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: theme.colors.primary + "20",
                alignItems: "center",
                justifyContent: "center",
                marginRight: 12,
              }}
            >
              <User size={20} color={theme.colors.primary} />
            </View>
            <Text
              style={{
                fontSize: 20,
                fontWeight: "800",
                color: theme.colors.text,
                lineHeight: 25,
                paddingVertical: 2,
              }}
            >
              Personal Information
            </Text>
          </View>

          <TouchableOpacity
            onPress={onClose}
            style={{
              width: 32,
              height: 32,
              borderRadius: 16,
              backgroundColor: theme.colors.background,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <X size={18} color={theme.colors.text} />
          </TouchableOpacity>
        </View>
        <View style={{ alignItems: "center", marginBottom: 40 }}>
          <TouchableOpacity onPress={pickImage}>
            <View
              style={{
                width: 140,
                height: 140,
                borderRadius: 70,
                backgroundColor: profileImage
                  ? theme.dark
                    ? "rgba(139, 92, 246, 0.2)"
                    : "rgba(139, 92, 246, 0.1)"
                  : theme.dark
                  ? "rgba(139, 92, 246, 0.2)"
                  : "rgba(139, 92, 246, 0.1)",
                borderWidth: 4,
                borderColor: profileImage ? "#10B981" : "#8B5CF6",
                justifyContent: "center",
                alignItems: "center",
                overflow: "hidden",
                shadowColor: profileImage ? "#10B981" : "#8B5CF6",
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.3,
                shadowRadius: 20,
                elevation: 12,
              }}
            >
              {profileImage ? (
                <Image
                  source={{ uri: profileImage }}
                  style={{ width: 140, height: 140, borderRadius: 70 }}
                  resizeMode="cover"
                />
              ) : (
                <User size={56} color={"#8B5CF6"} />
              )}
            </View>
            <View
              style={{
                position: "absolute",
                bottom: 8,
                right: 8,
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: profileImage ? "#10B981" : "#8B5CF6",
                justifyContent: "center",
                alignItems: "center",
                borderWidth: 4,
                borderColor: theme.dark ? "#1a1a2e" : "#f8fafc",
                shadowColor: profileImage ? "#10B981" : "#8B5CF6",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.4,
                shadowRadius: 12,
                elevation: 8,
              }}
            >
              <Camera size={20} color="white" />
            </View>
          </TouchableOpacity>
        </View>
        {/* Form */}
        <View style={{ gap: 20 }}>
          {/* First Name */}
          <View>
            <Text
              style={{
                fontSize: 16,
                fontWeight: "600",
                color: theme.colors.text,
                marginBottom: 8,
              }}
            >
              First Name
            </Text>
            <KeyboardAwareInput
              value={firstName}
              onChangeText={setFirstName}
              placeholder="Enter your first name"
              containerStyle={{
                backgroundColor: theme.colors.background,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: theme.colors.border,
              }}
              style={{
                paddingHorizontal: 16,
                paddingVertical: 10,
                fontSize: 16,
                color: theme.colors.text,
                backgroundColor: "transparent",
                borderWidth: 0,
              }}
              placeholderTextColor={theme.colors.text + "60"}
            />
          </View>

          {/* Last Name */}
          <View>
            <Text
              style={{
                fontSize: 16,
                fontWeight: "600",
                color: theme.colors.text,
                marginBottom: 8,
              }}
            >
              Last Name
            </Text>
            <KeyboardAwareInput
              value={lastName}
              onChangeText={setLastName}
              placeholder="Enter your last name"
              containerStyle={{
                backgroundColor: theme.colors.background,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: theme.colors.border,
              }}
              style={{
                paddingHorizontal: 16,
                paddingVertical: 10,
                fontSize: 16,
                color: theme.colors.text,
                backgroundColor: "transparent",
                borderWidth: 0,
              }}
              placeholderTextColor={theme.colors.text + "60"}
            />
          </View>

          {/* Bio */}
          <View>
            <Text
              style={{
                fontSize: 16,
                fontWeight: "600",
                color: theme.colors.text,
                marginBottom: 8,
              }}
            >
              Bio
            </Text>
            <KeyboardAwareInput
              value={bio}
              onChangeText={setBio}
              placeholder="Tell others about yourself..."
              multiline
              numberOfLines={4}
              containerStyle={{
                backgroundColor: theme.colors.background,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: theme.colors.border,
                minHeight: 100,
              }}
              style={{
                paddingHorizontal: 16,
                paddingVertical: 14,
                fontSize: 16,
                color: theme.colors.text,
                backgroundColor: "transparent",
                borderWidth: 0,
                textAlignVertical: "top",
                minHeight: 100,
              }}
              placeholderTextColor={theme.colors.text + "60"}
            />
          </View>
        </View>

        {/* Actions */}
        <View
          style={{
            flexDirection: "row",
            gap: 12,
            marginTop: 24,
          }}
        >
          <TouchableOpacity
            onPress={onClose}
            style={{
              flex: 1,
              paddingVertical: 14,
              borderRadius: 12,
              backgroundColor: theme.colors.background,
              borderWidth: 1,
              borderColor: theme.colors.border,
              alignItems: "center",
            }}
          >
            <Text
              style={{
                fontSize: 16,
                fontWeight: "600",
                color: theme.colors.text,
              }}
            >
              Cancel
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleSave}
            disabled={loading}
            style={{
              flex: 1,
              paddingVertical: 14,
              borderRadius: 12,
              backgroundColor: theme.colors.primary,
              alignItems: "center",
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "600",
                  color: "white",
                }}
              >
                Save Changes
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAwareSheet>
  );
}
