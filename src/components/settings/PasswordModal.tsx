import React, { useEffect, useState } from "react";
import { View, TouchableOpacity, ActivityIndicator } from "react-native";
import { Text } from "~/src/components/ui/text";
import { Input } from "~/src/components/ui/input";
import { Sheet } from "~/src/components/ui/sheet";
import { useTheme } from "~/src/components/ThemeProvider";
import { useAuth } from "~/src/lib/auth";
import { supabase } from "~/src/lib/supabase";
import Toast from "react-native-toast-message";
import { Lock, X, Eye, EyeOff } from "lucide-react-native";

interface PasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PasswordModal({ isOpen, onClose }: PasswordModalProps) {
  const { theme } = useTheme();
  const { session } = useAuth();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Reset expansion when modal opens
  useEffect(() => {
    if (isOpen) {
      setIsExpanded(false);
    }
  }, [isOpen]);

  const validatePassword = (password: string) => {
    if (password.length < 8)
      return "Password must be at least 8 characters long";
    if (!/[A-Z]/.test(password))
      return "Password must contain at least one uppercase letter";
    if (!/[a-z]/.test(password))
      return "Password must contain at least one lowercase letter";
    if (!/\d/.test(password))
      return "Password must contain at least one number";
    return null;
  };

  const handleSave = async () => {
    if (!session?.user?.id) return;

    // Validate passwords
    const validationError = validatePassword(newPassword);
    if (validationError) {
      Toast.show({
        type: "error",
        text1: "Invalid password",
        text2: validationError,
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      Toast.show({
        type: "error",
        text1: "Passwords don't match",
        text2: "Please make sure both passwords are the same",
      });
      return;
    }

    if (newPassword === currentPassword) {
      Toast.show({
        type: "info",
        text1: "No changes made",
        text2: "New password is the same as current password",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      Toast.show({
        type: "success",
        text1: "Password updated successfully!",
        text2: "Your password has been changed",
      });

      // Reset form
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      onClose();
    } catch (error: any) {
      console.error("Error updating password:", error);
      Toast.show({
        type: "error",
        text1: "Failed to update password",
        text2: error?.message || "Please try again",
      });
    } finally {
      setLoading(false);
    }
  };

  const canSave =
    currentPassword.trim() &&
    newPassword.trim() &&
    confirmPassword.trim() &&
    newPassword === confirmPassword &&
    validatePassword(newPassword) === null;

  const PasswordInput = ({
    value,
    onChangeText,
    placeholder,
    show,
    onToggleShow,
  }: {
    value: string;
    onChangeText: (text: string) => void;
    placeholder: string;
    show: boolean;
    onToggleShow: () => void;
  }) => (
    <View
      style={{
        backgroundColor: theme.colors.card,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: theme.colors.border,
        flexDirection: "row",
        alignItems: "center",
      }}
    >
      <Input
        value={value}
        onChangeText={onChangeText}
        onFocus={() => setIsExpanded(true)}
        onBlur={() => setIsExpanded(false)}
        placeholder={placeholder}
        secureTextEntry={!show}
        autoCapitalize="none"
        autoCorrect={false}
        style={{
          flex: 1,
          paddingHorizontal: 16,
          paddingVertical: 14,
          fontSize: 16,
          color: theme.colors.text,
          backgroundColor: "transparent",
          borderWidth: 0,
        }}
        placeholderTextColor={theme.colors.text + "60"}
      />
      <TouchableOpacity onPress={onToggleShow} style={{ paddingRight: 16 }}>
        {show ? (
          <EyeOff size={18} color={theme.colors.text + "60"} />
        ) : (
          <Eye size={18} color={theme.colors.text + "60"} />
        )}
      </TouchableOpacity>
    </View>
  );

  return (
    <Sheet isOpen={isOpen} onClose={onClose} expanded={isExpanded}>
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
              <Lock size={20} color={theme.colors.primary} />
            </View>
            <Text
              style={{
                fontSize: 20,
                fontWeight: "800",
                color: theme.colors.text,
              }}
            >
              Update Password
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
          {/* Current Password */}
          <View>
            <Text
              style={{
                fontSize: 16,
                fontWeight: "600",
                color: theme.colors.text,
                marginBottom: 8,
              }}
            >
              Current Password
            </Text>
            <PasswordInput
              value={currentPassword}
              onChangeText={setCurrentPassword}
              placeholder="Enter your current password"
              show={showCurrentPassword}
              onToggleShow={() => setShowCurrentPassword(!showCurrentPassword)}
            />
          </View>

          {/* New Password */}
          <View>
            <Text
              style={{
                fontSize: 16,
                fontWeight: "600",
                color: theme.colors.text,
                marginBottom: 8,
              }}
            >
              New Password
            </Text>
            <PasswordInput
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder="Enter your new password"
              show={showNewPassword}
              onToggleShow={() => setShowNewPassword(!showNewPassword)}
            />

            {/* Password Requirements */}
            <View style={{ marginTop: 8 }}>
              <Text
                style={{
                  fontSize: 12,
                  color: theme.colors.text + "60",
                  lineHeight: 16,
                }}
              >
                Password requirements:{"\n"}• At least 8 characters long{"\n"}•
                One uppercase letter{"\n"}• One lowercase letter{"\n"}• One
                number
              </Text>
            </View>
          </View>

          {/* Confirm Password */}
          <View>
            <Text
              style={{
                fontSize: 16,
                fontWeight: "600",
                color: theme.colors.text,
                marginBottom: 8,
              }}
            >
              Confirm New Password
            </Text>
            <PasswordInput
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Confirm your new password"
              show={showConfirmPassword}
              onToggleShow={() => setShowConfirmPassword(!showConfirmPassword)}
            />

            {/* Password Match Indicator */}
            {confirmPassword && (
              <View style={{ marginTop: 8 }}>
                <Text
                  style={{
                    fontSize: 14,
                    color:
                      newPassword === confirmPassword ? "#34C759" : "#FF3B30",
                    fontWeight: "500",
                  }}
                >
                  {newPassword === confirmPassword
                    ? "✓ Passwords match"
                    : "✗ Passwords don't match"}
                </Text>
              </View>
            )}
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
                Update Password
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Sheet>
  );
}
