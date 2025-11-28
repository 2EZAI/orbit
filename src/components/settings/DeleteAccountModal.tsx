import React, { useState } from "react";
import { View, TouchableOpacity, ActivityIndicator, Alert } from "react-native";
import { Text } from "~/src/components/ui/text";
import { KeyboardAwareSheet } from "./KeyboardAwareSheet";
import { useTheme } from "~/src/components/ThemeProvider";
import { Trash2, X, AlertTriangle } from "lucide-react-native";
import { supabase } from "~/src/lib/supabase";
import { useAuth } from "~/src/lib/auth";
import { router } from "expo-router";

interface DeleteAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DeleteAccountModal({
  isOpen,
  onClose,
}: DeleteAccountModalProps) {
  const { theme } = useTheme();
  const { session } = useAuth();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteAccount = async () => {
    if (!session?.user) {
      Alert.alert('Error', 'No user session found');
      return;
    }

    Alert.alert(
      'Delete Account',
      'Are you absolutely sure you want to delete your account? This action cannot be undone and will permanently remove all your data.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete Account',
          style: 'destructive',
          onPress: async () => {
            setIsDeleting(true);
            try {
              // Call RPC function to delete user data
              const { data, error } = await supabase.rpc('delete_user_account', {
                user_id_to_delete: session.user.id
              });

              if (error) {
                console.error('Error deleting user account:', error);
                Alert.alert(
                  'Unable to Delete Account',
                  'We were unable to delete your account. Please try again later or contact support.',
                  [{ text: 'OK' }]
                );
                setIsDeleting(false);
                return;
              }

              if (data?.error) {
                console.error('RPC function error:', data);
                Alert.alert(
                  'Unable to Delete Account',
                  'We were unable to delete your account. Please try again later or contact support.',
                  [{ text: 'OK' }]
                );
                setIsDeleting(false);
                return;
              }

              // Sign out the user first
              await supabase.auth.signOut();
              
              // Close the modal before navigation
              onClose();
              
              // Navigate to landing page (sign-in screen)
              // Use dismissAll to clear navigation stack, then navigate to root
              router.dismissAll();
              router.replace('/');
              
              Alert.alert('Success', 'Your account data has been deleted successfully. Your account will be completely removed within 24 hours.');
            } catch (error: any) {
              console.error('Unexpected error during account deletion:', error);
              Alert.alert(
                'Unable to Delete Account',
                'We were unable to delete your account. Please try again later or contact support.',
                [{ text: 'OK' }]
              );
              setIsDeleting(false);
            }
          },
        },
      ]
    );
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
                lineHeight: 25,
                paddingVertical: 2,
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
            This action will permanently delete your account and all associated
            data including:
            {"\n\n"}
            • Your profile information
            • All your posts and activities
            • Your followers and following lists
            • Chat messages and conversations
            • Event drafts and saved locations
            {"\n\n"}
            This action cannot be undone.
          </Text>
        </View>

        <View style={{ flexDirection: "row", gap: 12 }}>
          <TouchableOpacity
            onPress={onClose}
            disabled={isDeleting}
            style={{
              flex: 1,
              paddingVertical: 14,
              borderRadius: 12,
              backgroundColor: theme.colors.card,
              borderWidth: 1,
              borderColor: theme.colors.border,
              alignItems: "center",
              opacity: isDeleting ? 0.5 : 1,
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
            onPress={handleDeleteAccount}
            disabled={isDeleting}
            style={{
              flex: 1,
              paddingVertical: 14,
              borderRadius: 12,
              backgroundColor: "#FF3B30",
              alignItems: "center",
              opacity: isDeleting ? 0.7 : 1,
            }}
          >
            {isDeleting ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "600",
                  color: "white",
                }}
              >
                Delete Account
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAwareSheet>
  );
}
