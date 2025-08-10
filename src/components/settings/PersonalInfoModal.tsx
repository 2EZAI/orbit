import React, { useState, useEffect } from "react";
import { View, TouchableOpacity, ActivityIndicator } from "react-native";
import { Text } from "~/src/components/ui/text";
import { Input } from "~/src/components/ui/input";
import { KeyboardAwareInput } from "./KeyboardAwareInput";
import { Button } from "~/src/components/ui/button";
import { KeyboardAwareSheet } from "./KeyboardAwareSheet";
import { useTheme } from "~/src/components/ThemeProvider";
import { useAuth } from "~/src/lib/auth";
import { useUser } from "~/src/lib/UserProvider";
import { supabase } from "~/src/lib/supabase";
import Toast from "react-native-toast-message";
import { User, X } from "lucide-react-native";

interface PersonalInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PersonalInfoModal({ isOpen, onClose }: PersonalInfoModalProps) {
  const { theme } = useTheme();
  const { session } = useAuth();
  const { user, refreshUser } = useUser();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [bio, setBio] = useState("");
  const [loading, setLoading] = useState(false);

  // Load user data
  useEffect(() => {
    if (user && isOpen) {
      setFirstName(user.first_name || "");
      setLastName(user.last_name || "");
      setBio(user.bio || "");
    }
  }, [user, isOpen]);

  const handleSave = async () => {
    if (!session?.user?.id) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from("users")
        .update({
          first_name: firstName.trim() || null,
          last_name: lastName.trim() || null,
          bio: bio.trim() || null,
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
        {/* Header */}
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
              backgroundColor: theme.colors.card,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <X size={18} color={theme.colors.text} />
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
                backgroundColor: theme.colors.card,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: theme.colors.border,
              }}
              style={{
                paddingHorizontal: 16,
                paddingVertical: 14,
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
                backgroundColor: theme.colors.card,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: theme.colors.border,
              }}
              style={{
                paddingHorizontal: 16,
                paddingVertical: 14,
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
                backgroundColor: theme.colors.card,
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
              backgroundColor: theme.colors.card,
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
