import React, { useState, useEffect } from "react";
import { View, TouchableOpacity, ActivityIndicator } from "react-native";
import { Text } from "~/src/components/ui/text";
import { Input } from "~/src/components/ui/input";
import { KeyboardAwareSheet } from "./KeyboardAwareSheet";
import { useTheme } from "~/src/components/ThemeProvider";
import { useAuth } from "~/src/lib/auth";
import { supabase } from "~/src/lib/supabase";
import Toast from "react-native-toast-message";
import { Mail, X } from "lucide-react-native";

interface EmailModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function EmailModal({ isOpen, onClose }: EmailModalProps) {
  const { theme } = useTheme();
  const { session } = useAuth();

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  // Load user data
  useEffect(() => {
    if (session?.user?.email && isOpen) {
      setEmail(session.user.email);
    }
  }, [session?.user?.email, isOpen]);

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSave = async () => {
    if (!session?.user?.id || !email.trim()) return;

    const trimmedEmail = email.trim().toLowerCase();

    if (!validateEmail(trimmedEmail)) {
      Toast.show({
        type: "error",
        text1: "Invalid email address",
        text2: "Please enter a valid email address",
      });
      return;
    }

    if (trimmedEmail === session.user.email) {
      Toast.show({
        type: "info",
        text1: "No changes made",
        text2: "Email address is the same",
      });
      onClose();
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        email: trimmedEmail,
      });

      if (error) throw error;

      Toast.show({
        type: "success",
        text1: "Email update initiated",
        text2:
          "Please check both your old and new email for confirmation links",
      });

      onClose();
    } catch (error: any) {
      console.error("Error updating email:", error);

      if (error?.message?.includes("email_address_invalid")) {
        Toast.show({
          type: "error",
          text1: "Invalid email address",
          text2: "Please enter a valid email address",
        });
      } else if (error?.message?.includes("email_already_confirmed")) {
        Toast.show({
          type: "error",
          text1: "Email already in use",
          text2: "This email is already associated with another account",
        });
      } else {
        Toast.show({
          type: "error",
          text1: "Failed to update email",
          text2: error?.message || "Please try again",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const canSave =
    email.trim() &&
    email !== session?.user?.email &&
    validateEmail(email.trim());

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
              <Mail size={20} color={theme.colors.primary} />
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
              Update Email
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

        {/* Current Email */}
        <View style={{ marginBottom: 20 }}>
          <Text
            style={{
              fontSize: 14,
              fontWeight: "500",
              color: theme.colors.text + "80",
              marginBottom: 4,
            }}
          >
            Current Email
          </Text>
          <Text
            style={{
              fontSize: 16,
              fontWeight: "600",
              color: theme.colors.text,
            }}
          >
            {session?.user?.email || "Not set"}
          </Text>
        </View>

        {/* New Email */}
        <View>
          <Text
            style={{
              fontSize: 16,
              fontWeight: "600",
              color: theme.colors.text,
              marginBottom: 8,
            }}
          >
            New Email Address
          </Text>
          <View
            style={{
              backgroundColor: theme.colors.background,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: theme.colors.border,
            }}
          >
            <Input
              value={email}
              onChangeText={setEmail}
              placeholder="your.email@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
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

          {/* Info */}
          <View style={{ marginTop: 12 }}>
            <Text
              style={{
                fontSize: 12,
                color: theme.colors.text + "60",
                lineHeight: 16,
              }}
            >
              • You'll receive confirmation emails at both your old and new
              email addresses{"\n"}• Your account will remain active during the
              email change process{"\n"}• Click the confirmation link in both
              emails to complete the change
            </Text>
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
            disabled={!canSave || loading}
            style={{
              flex: 1,
              paddingVertical: 14,
              borderRadius: 12,
              backgroundColor: canSave
                ? theme.colors.primary
                : theme.colors.border,
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
                  color: canSave ? "white" : theme.colors.text + "60",
                }}
              >
                Update Email
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAwareSheet>
  );
}
