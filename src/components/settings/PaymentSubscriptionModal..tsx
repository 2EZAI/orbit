import { X } from "lucide-react-native";
import React from "react";
import { ActivityIndicator, TouchableOpacity, View } from "react-native";
import Payment from "~/assets/svg/Payment";
import { useStripe } from "~/hooks/useStripe";
import { useTheme } from "~/src/components/ThemeProvider";
import { Text } from "~/src/components/ui/text";
import { useAuth } from "~/src/lib/auth";
import { useUser } from "~/src/lib/UserProvider";
import { Sheet } from "../ui/sheet";
import Toast from "react-native-toast-message";
interface PaymentSubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PaymentSubscriptionModal({
  isOpen,
  onClose,
}: PaymentSubscriptionModalProps) {
  const { theme } = useTheme();
  const { session } = useAuth();
  const { user } = useUser();
  const { status, isLoading, createStripeAccount } = useStripe();

  console.log(status);
  const handleSetupStripeConnect = async () => {
    if (!user) return;
    const accountId = await createStripeAccount({
      first_name: user?.first_name || "",
      last_name: user?.last_name || "",
      phone: user?.phone || "+19195558247",
    });
    console.log(accountId);
  };
  return (
    <Sheet isOpen={isOpen} onClose={onClose} isScrollable={false}>
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

        {/* Helper copy above the card */}
        <Text
          style={{
            fontSize: 14,
            color: theme.colors.text + "80",
            marginBottom: 16,
          }}
        >
          Set up Stripe Connect to charge for events and receive payouts.
        </Text>

        {/* Stripe Connect card */}
        <View
          style={{
            borderRadius: 24,
            paddingVertical: 32,
            paddingHorizontal: 20,
            backgroundColor: theme.colors.card,
            borderWidth: theme.dark ? 1 : 0.5,
            borderColor: theme.colors.border,
            shadowColor: "#000000",
            shadowOpacity: theme.dark ? 0.35 : 0.08,
            shadowRadius: 24,
            shadowOffset: { width: 0, height: 18 },
            elevation: 6,
          }}
        >
          <Text
            style={{
              fontSize: 22,
              fontWeight: "800",
              color: theme.colors.text,
              textAlign: "center",
              marginBottom: 12,
            }}
          >
            Enable Payments for Your Events
          </Text>

          <Text
            style={{
              fontSize: 15,
              color: theme.colors.text + "90",
              textAlign: "center",
              lineHeight: 22,
            }}
          >
            Connect your Stripe account to start charging for events and
            receiving payouts. The setup process takes just a few minutes.
          </Text>

          <TouchableOpacity
            onPress={async () => {
              await handleSetupStripeConnect();
            }}
            disabled={isLoading}
            style={{
              marginTop: 28,
              alignSelf: "center",
              borderRadius: 999,
              paddingHorizontal: 24,
              paddingVertical: 12,
              backgroundColor: theme.colors.primary,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
            }}
            activeOpacity={0.9}
          >
            <View
              style={{
                width: 28,
                height: 28,
                borderRadius: 14,
                backgroundColor: "rgba(255,255,255,0.16)",
                alignItems: "center",
                justifyContent: "center",
                marginRight: 10,
              }}
            >
              <Payment width={18} height={18} fill="#FFFFFF" />
            </View>
            <Text
              style={{
                fontSize: 16,
                fontWeight: "700",
                color: "#FFFFFF",
              }}
            >
              Set Up Stripe Connect
            </Text>
            {isLoading && (
              <ActivityIndicator
                size="small"
                color="#FFFFFF"
                style={{ marginLeft: 8 }}
              />
            )}
          </TouchableOpacity>
        </View>
      </View>
      <Toast />
    </Sheet>
  );
}
