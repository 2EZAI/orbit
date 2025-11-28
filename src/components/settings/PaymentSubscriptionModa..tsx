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
import Payment from "~/assets/svg/Payment";
interface PaymentSubscriptionModalProps {
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
export function PaymentSubscriptionModal({
  isOpen,
  onClose,
}: PaymentSubscriptionModalProps) {
  const { theme } = useTheme();
  const { session } = useAuth();
  const { user, refreshUser } = useUser();

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
              <Payment width={24} height={24} fill={theme.colors.primary} />
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
              Payment & Subscriptions
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
      </View>
    </KeyboardAwareSheet>
  );
}
