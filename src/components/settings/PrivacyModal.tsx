import React, { useState, useEffect } from "react";
import {
  View,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
} from "react-native";
import { Text } from "~/src/components/ui/text";
import { KeyboardAwareSheet } from "./KeyboardAwareSheet";
import { useTheme } from "~/src/components/ThemeProvider";
import { useAuth } from "~/src/lib/auth";
import { useUser } from "~/src/lib/UserProvider";
import Toast from "react-native-toast-message";
import { Shield, X, Eye, EyeOff, MapPin, Users } from "lucide-react-native";

interface PrivacyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PrivacyModal({ isOpen, onClose }: PrivacyModalProps) {
  const { theme } = useTheme();
  const { session } = useAuth();
  const { user, updateUser } = useUser();

  const [isLiveLocationEnabled, setIsLiveLocationEnabled] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user && isOpen) {
      // Assuming we have a field for live location sharing
      setIsLiveLocationEnabled((user as any).is_live_location_shared === 1);
    }
  }, [user, isOpen]);

  const handleSave = async () => {
    if (!session?.user?.id) return;

    setSaving(true);
    try {
      await updateUser({
        is_live_location_shared: isLiveLocationEnabled ? 1 : 0,
      } as any);

      Toast.show({
        type: "success",
        text1: "Privacy settings updated!",
        text2: isLiveLocationEnabled
          ? "Your followers can now see your live location"
          : "Your live location is now private",
      });

      onClose();
    } catch (error) {
      console.error("Error updating privacy settings:", error);
      Toast.show({
        type: "error",
        text1: "Failed to update settings",
        text2: "Please try again",
      });
    } finally {
      setSaving(false);
    }
  };

  const PrivacySetting = ({
    icon,
    title,
    description,
    isEnabled,
    onToggle,
  }: {
    icon: React.ReactNode;
    title: string;
    description: string;
    isEnabled: boolean;
    onToggle: () => void;
  }) => (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        padding: 16,
        borderRadius: 12,
        backgroundColor: theme.colors.card,
        borderWidth: 1,
        borderColor: theme.colors.border,
        marginBottom: 16,
      }}
    >
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: theme.colors.primary + "20",
          alignItems: "center",
          justifyContent: "center",
          marginRight: 16,
        }}
      >
        {icon}
      </View>

      <View style={{ flex: 1 }}>
        <Text
          style={{
            fontSize: 16,
            fontWeight: "700",
            color: theme.colors.text,
            marginBottom: 4,
          }}
        >
          {title}
        </Text>
        <Text
          style={{
            fontSize: 14,
            color: theme.colors.text + "80",
            lineHeight: 18,
          }}
        >
          {description}
        </Text>
      </View>

      <Switch
        value={isEnabled}
        onValueChange={onToggle}
        trackColor={{
          false: theme.colors.border,
          true: theme.colors.primary + "60",
        }}
        thumbColor={isEnabled ? theme.colors.primary : theme.colors.card}
        ios_backgroundColor={theme.colors.border}
      />
    </View>
  );

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
              <Shield size={20} color={theme.colors.primary} />
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
              Map & Location Privacy
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

        {/* Info */}
        <View style={{ marginBottom: 24 }}>
          <Text
            style={{
              fontSize: 14,
              color: theme.colors.text + "80",
              lineHeight: 20,
            }}
          >
            Control who can see your location and when. These settings help you
            manage your privacy while using location-based features.
          </Text>
        </View>

        {/* Privacy Settings */}
        <View style={{ marginBottom: 24 }}>
          <PrivacySetting
            icon={<MapPin size={20} color={theme.colors.primary} />}
            title="Share Live Location"
            description="Allow your followers to see your real-time location when you're online. This helps friends find you and discover nearby events together."
            isEnabled={isLiveLocationEnabled}
            onToggle={() => setIsLiveLocationEnabled(!isLiveLocationEnabled)}
          />

          {/* Info Box */}
          <View
            style={{
              padding: 16,
              borderRadius: 12,
              backgroundColor: isLiveLocationEnabled
                ? theme.colors.primary + "10"
                : theme.colors.card,
              borderWidth: 1,
              borderColor: isLiveLocationEnabled
                ? theme.colors.primary + "30"
                : theme.colors.border,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: 8,
              }}
            >
              {isLiveLocationEnabled ? (
                <Eye size={16} color={theme.colors.primary} />
              ) : (
                <EyeOff size={16} color={theme.colors.text + "60"} />
              )}
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "600",
                  color: isLiveLocationEnabled
                    ? theme.colors.primary
                    : theme.colors.text,
                  marginLeft: 8,
                }}
              >
                {isLiveLocationEnabled
                  ? "Location Visible"
                  : "Location Private"}
              </Text>
            </View>
            <Text
              style={{
                fontSize: 12,
                color: theme.colors.text + "80",
                lineHeight: 16,
              }}
            >
              {isLiveLocationEnabled
                ? "Your followers can see when you're online and your approximate location. This helps with discovering events and meeting up with friends."
                : "Your location remains private. You can still see events and use location features, but others won't see where you are."}
            </Text>
          </View>
        </View>

        {/* Future Settings Placeholder */}
        <View style={{ marginBottom: 24 }}>
          <Text
            style={{
              fontSize: 16,
              fontWeight: "700",
              color: theme.colors.text,
              marginBottom: 12,
            }}
          >
            More Privacy Controls
          </Text>
          <Text
            style={{
              fontSize: 14,
              color: theme.colors.text + "60",
              lineHeight: 18,
            }}
          >
            Additional privacy settings like profile visibility, event
            participation sharing, and location history controls will be
            available in future updates.
          </Text>
        </View>

        {/* Actions */}
        <View
          style={{
            flexDirection: "row",
            gap: 12,
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
            disabled={saving}
            style={{
              flex: 1,
              paddingVertical: 14,
              borderRadius: 12,
              backgroundColor: theme.colors.primary,
              alignItems: "center",
              opacity: saving ? 0.7 : 1,
            }}
          >
            {saving ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "600",
                  color: "white",
                }}
              >
                Save Settings
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAwareSheet>
  );
}
