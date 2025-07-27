import React from "react";
import { View, TouchableOpacity } from "react-native";
import { Text } from "~/src/components/ui/text";
import { Sheet } from "~/src/components/ui/sheet";
import { useTheme } from "~/src/components/ThemeProvider";
import { Trash2, X, AlertTriangle } from "lucide-react-native";

interface DeleteAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DeleteAccountModal({
  isOpen,
  onClose,
}: DeleteAccountModalProps) {
  const { theme } = useTheme();

  return (
    <Sheet isOpen={isOpen} onClose={onClose}>
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
                backgroundColor: "#FF3B30" + "20",
                alignItems: "center",
                justifyContent: "center",
                marginRight: 12,
              }}
            >
              <Trash2 size={20} color="#FF3B30" />
            </View>
            <Text
              style={{
                fontSize: 20,
                fontWeight: "800",
                color: "#FF3B30",
              }}
            >
              Delete My Account
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

        {/* Warning Content */}
        <View style={{ alignItems: "center", padding: 20 }}>
          <View
            style={{
              width: 60,
              height: 60,
              borderRadius: 30,
              backgroundColor: "#FF3B30" + "20",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 16,
            }}
          >
            <AlertTriangle size={30} color="#FF3B30" />
          </View>

          <Text
            style={{
              fontSize: 18,
              fontWeight: "700",
              color: "#FF3B30",
              marginBottom: 12,
              textAlign: "center",
            }}
          >
            Account Deletion
          </Text>

          <Text
            style={{
              fontSize: 14,
              color: theme.colors.text,
              textAlign: "center",
              lineHeight: 20,
              marginBottom: 20,
            }}
          >
            Account deletion functionality will be available in a future update.
            {"\n\n"}
            This action will permanently delete your account and all associated
            data. This cannot be undone.
            {"\n\n"}
            For now, please contact support if you need to delete your account.
          </Text>
        </View>

        <View style={{ flexDirection: "row", gap: 12 }}>
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
            onPress={onClose}
            style={{
              flex: 1,
              paddingVertical: 14,
              borderRadius: 12,
              backgroundColor: "#FF3B30",
              alignItems: "center",
            }}
          >
            <Text
              style={{
                fontSize: 16,
                fontWeight: "600",
                color: "white",
              }}
            >
              Contact Support
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Sheet>
  );
}
