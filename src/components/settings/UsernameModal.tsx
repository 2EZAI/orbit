import React, { useState, useEffect } from "react";
import { View, TouchableOpacity, ActivityIndicator } from "react-native";
import { Text } from "~/src/components/ui/text";
import { Input } from "~/src/components/ui/input";
import { KeyboardAwareSheet } from "./KeyboardAwareSheet";
import { useTheme } from "~/src/components/ThemeProvider";
import { useAuth } from "~/src/lib/auth";
import { useUser } from "~/hooks/useUserData";
import { supabase } from "~/src/lib/supabase";
import Toast from "react-native-toast-message";
import { Edit3, X, AlertCircle, CheckCircle } from "lucide-react-native";

interface UsernameModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function UsernameModal({ isOpen, onClose }: UsernameModalProps) {
  const { theme } = useTheme();
  const { session } = useAuth();
  const { user, refreshUser } = useUser();

  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);

  // Load user data
  useEffect(() => {
    if (user && isOpen) {
      setUsername(user.username || "");
      setIsAvailable(null);
    }
  }, [user, isOpen]);

  const checkUsernameAvailability = async (newUsername: string) => {
    if (!newUsername || newUsername.length < 3) {
      setIsAvailable(null);
      return;
    }

    // Don't check if it's the same as current username
    if (newUsername === user?.username) {
      setIsAvailable(true);
      return;
    }

    setChecking(true);
    try {
      const { data, error } = await supabase
        .from("users")
        .select("id")
        .eq("username", newUsername)
        .limit(1);

      if (error) throw error;

      setIsAvailable(data.length === 0);
    } catch (error) {
      console.error("Error checking username:", error);
      setIsAvailable(null);
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (username && username !== user?.username) {
        checkUsernameAvailability(username);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [username, user?.username]);

  const handleSave = async () => {
    if (!session?.user?.id || !username.trim()) return;

    const trimmedUsername = username.trim().toLowerCase();

    // Validate username format
    if (!/^[a-zA-Z0-9._]+$/.test(trimmedUsername)) {
      Toast.show({
        type: "error",
        text1: "Invalid username",
        text2:
          "Username can only contain letters, numbers, dots, and underscores",
      });
      return;
    }

    if (trimmedUsername.length < 3) {
      Toast.show({
        type: "error",
        text1: "Username too short",
        text2: "Username must be at least 3 characters long",
      });
      return;
    }

    if (isAvailable === false) {
      Toast.show({
        type: "error",
        text1: "Username not available",
        text2: "Please choose a different username",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from("users")
        .update({ username: trimmedUsername })
        .eq("id", session.user.id);

      if (error) throw error;

      // Refresh user data
      await refreshUser();

      Toast.show({
        type: "success",
        text1: "Username updated successfully!",
      });

      onClose();
    } catch (error: any) {
      console.error("Error updating username:", error);

      if (error?.code === "23505") {
        // Unique constraint violation
        Toast.show({
          type: "error",
          text1: "Username not available",
          text2: "Please choose a different username",
        });
      } else {
        Toast.show({
          type: "error",
          text1: "Failed to update username",
          text2: "Please try again",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const canSave =
    username.trim() &&
    username !== user?.username &&
    isAvailable === true &&
    !checking;

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
              <Edit3 size={20} color={theme.colors.primary} />
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
              Update Username
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

        {/* Current Username */}
        <View style={{ marginBottom: 20 }}>
          <Text
            style={{
              fontSize: 14,
              fontWeight: "500",
              color: theme.colors.text + "80",
              marginBottom: 4,
            }}
          >
            Current Username
          </Text>
          <Text
            style={{
              fontSize: 16,
              fontWeight: "600",
              color: theme.colors.text,
            }}
          >
            @{user?.username || "Not set"}
          </Text>
        </View>

        {/* New Username */}
        <View>
          <Text
            style={{
              fontSize: 16,
              fontWeight: "600",
              color: theme.colors.text,
              marginBottom: 8,
            }}
          >
            New Username
          </Text>
          <View
            style={{
              backgroundColor: theme.colors.card,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: theme.colors.border,
              position: "relative",
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Text
                style={{
                  paddingLeft: 16,
                  fontSize: 16,
                  color: theme.colors.text + "60",
                }}
              >
                @
              </Text>
              <Input
                value={username}
                onChangeText={setUsername}
                placeholder="choose_username"
                autoCapitalize="none"
                autoCorrect={false}
                style={{
                  flex: 1,
                  paddingHorizontal: 4,
                  paddingVertical: 14,
                  fontSize: 16,
                  color: theme.colors.text,
                  backgroundColor: "transparent",
                  borderWidth: 0,
                }}
                placeholderTextColor={theme.colors.text + "60"}
              />

              {/* Status Icon */}
              <View style={{ paddingRight: 16 }}>
                {checking ? (
                  <ActivityIndicator
                    size="small"
                    color={theme.colors.primary}
                  />
                ) : isAvailable === true ? (
                  <CheckCircle size={18} color="#34C759" />
                ) : isAvailable === false ? (
                  <AlertCircle size={18} color="#FF3B30" />
                ) : null}
              </View>
            </View>
          </View>

          {/* Status Messages */}
          {username && username !== user?.username && (
            <View style={{ marginTop: 8 }}>
              {checking ? (
                <Text
                  style={{
                    fontSize: 14,
                    color: theme.colors.text + "80",
                  }}
                >
                  Checking availability...
                </Text>
              ) : isAvailable === true ? (
                <Text
                  style={{
                    fontSize: 14,
                    color: "#34C759",
                    fontWeight: "500",
                  }}
                >
                  ✓ Username available
                </Text>
              ) : isAvailable === false ? (
                <Text
                  style={{
                    fontSize: 14,
                    color: "#FF3B30",
                    fontWeight: "500",
                  }}
                >
                  ✗ Username not available
                </Text>
              ) : null}
            </View>
          )}

          {/* Rules */}
          <View style={{ marginTop: 12 }}>
            <Text
              style={{
                fontSize: 12,
                color: theme.colors.text + "60",
                lineHeight: 16,
              }}
            >
              • Must be at least 3 characters long{"\n"}• Can contain letters,
              numbers, dots, and underscores{"\n"}• No spaces or special
              characters
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
                Save Changes
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAwareSheet>
  );
}
