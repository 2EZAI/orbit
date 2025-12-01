import { X, AlertTriangle, CheckCircle2, Info } from "lucide-react-native";
import React, { useState, useEffect } from "react";
import {
  ActivityIndicator,
  TouchableOpacity,
  View,
  ScrollView,
  Alert,
} from "react-native";
import { router } from "expo-router";
import Payment from "~/assets/svg/Payment";
import { useStripe } from "~/hooks/useStripe";
import { useTheme } from "~/src/components/ThemeProvider";
import { Text } from "~/src/components/ui/text";
import { Input } from "~/src/components/ui/input";
import { useAuth } from "~/src/lib/auth";
import { useUser } from "~/src/lib/UserProvider";
import { Sheet } from "../ui/sheet";
import { PaymentsDashboard } from "./PaymentsDashboard";
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
  const { status, isLoading, createStripeAccount, createAccountLink, fetchStatus } =
    useStripe();
  const [formData, setFormData] = useState({
    first_name: user?.first_name || "",
    last_name: user?.last_name || "",
    phone: user?.phone || "",
  });
  const [isStartingOnboarding, setIsStartingOnboarding] = useState(false);

  // Refresh status when modal opens
  useEffect(() => {
    if (isOpen && session?.access_token) {
      fetchStatus();
    }
  }, [isOpen, session?.access_token]);

  const handleStartOnboarding = async () => {
    if (!session?.access_token) {
      Toast.show({
        type: "error",
        text1: "Authentication Required",
        text2: "Please log in to continue",
      });
      return;
    }

    setIsStartingOnboarding(true);

    try {
      let accountId = status?.accountId;

      // If no account exists, create one
      if (!accountId && status?.status === "not_setup") {
        if (!formData.first_name || !formData.last_name || !formData.phone) {
          Toast.show({
            type: "error",
            text1: "Missing Information",
            text2: "Please fill in all required fields",
          });
          setIsStartingOnboarding(false);
          return;
        }

        accountId = await createStripeAccount({
          first_name: formData.first_name,
          last_name: formData.last_name,
          phone: formData.phone,
        });

        if (!accountId) {
          setIsStartingOnboarding(false);
          return;
        }
      }

      if (!accountId) {
        throw new Error("Unable to get Stripe account ID");
      }

      // Get account link and open in WebView
      const accountLinkUrl = await createAccountLink(accountId);

      // Close modal and navigate to WebView
      onClose();
      
      router.push({
        pathname: "/(app)/(webview)",
        params: {
          external_url: accountLinkUrl,
          title: "Stripe Onboarding",
          accountId: accountId,
          type: "stripe-onboarding",
        },
      });
    } catch (error: any) {
      console.error("Failed to start Stripe onboarding:", error);
      Toast.show({
        type: "error",
        text1: "Failed to Start Onboarding",
        text2: error.message || "Please try again later",
      });
    } finally {
      setIsStartingOnboarding(false);
    }
  };

  const getStatusMessage = () => {
    switch (status?.status) {
      case "not_setup":
        return {
          title: "Set Up Stripe to Accept Payments",
          description:
            "Connect your Stripe account to start selling tickets for your events. It only takes a few minutes!",
          buttonText: "Set Up Stripe",
        };
      case "not_started":
      case "in_progress":
        return {
          title: "Complete Stripe Onboarding",
          description:
            "Finish setting up your Stripe account to enable payments for your events.",
          buttonText: "Continue Setup",
        };
      case "restricted":
        return {
          title: "Account Restrictions",
          description:
            "Your Stripe account has restrictions. Please contact support or complete additional verification.",
          buttonText: "Contact Support",
        };
      case "completed":
        return {
          title: "Stripe Account Ready",
          description:
            "Your Stripe account is fully set up and ready to receive payments.",
          buttonText: "Manage Account",
        };
      default:
        return {
          title: "Set Up Stripe",
          description: "Connect your Stripe account to accept payments.",
          buttonText: "Get Started",
        };
    }
  };

  const statusMessage = getStatusMessage();
  const needsAccountCreation = status?.status === "not_setup";
  const isCompleted = status?.status === "completed";
  const isRestricted = status?.status === "restricted";

  return (
    <Sheet isOpen={isOpen} onClose={onClose} isScrollable={!isCompleted}>
      {isCompleted && status?.accountId ? (
        <View style={{ flex: 1 }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              padding: 20,
              borderBottomWidth: 1,
              borderBottomColor: theme.colors.border,
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
          <PaymentsDashboard accountId={status.accountId} />
        </View>
      ) : (
        <ScrollView style={{ padding: 20 }}>
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

        {/* Status Card */}
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
            marginBottom: 16,
          }}
        >
          <View style={{ alignItems: "center", marginBottom: 16 }}>
            {isCompleted ? (
              <CheckCircle2 size={48} color={theme.colors.primary} />
            ) : isRestricted ? (
              <AlertTriangle size={48} color={theme.colors.notification} />
            ) : (
              <Payment width={48} height={48} fill={theme.colors.primary} />
            )}
          </View>

          <Text
            style={{
              fontSize: 22,
              fontWeight: "800",
              color: theme.colors.text,
              textAlign: "center",
              marginBottom: 12,
            }}
          >
            {statusMessage.title}
          </Text>

          <Text
            style={{
              fontSize: 15,
              color: theme.colors.text + "90",
              textAlign: "center",
              lineHeight: 22,
              marginBottom: 24,
            }}
          >
            {statusMessage.description}
          </Text>

          {/* Account Creation Form */}
          {needsAccountCreation && (
            <View
              style={{
                backgroundColor: theme.colors.background,
                borderRadius: 16,
                padding: 16,
                marginBottom: 24,
              }}
            >
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "600",
                  color: theme.colors.text,
                  marginBottom: 16,
                }}
              >
                Account Information
              </Text>
              <View style={{ flexDirection: "row", gap: 12, marginBottom: 12 }}>
                <View style={{ flex: 1 }}>
                  <Input
                    placeholder="First Name"
                    value={formData.first_name}
                    onChangeText={(text) =>
                      setFormData({ ...formData, first_name: text })
                    }
                    style={{
                      backgroundColor: theme.colors.card,
                      borderColor: theme.colors.border,
                    }}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Input
                    placeholder="Last Name"
                    value={formData.last_name}
                    onChangeText={(text) =>
                      setFormData({ ...formData, last_name: text })
                    }
                    style={{
                      backgroundColor: theme.colors.card,
                      borderColor: theme.colors.border,
                    }}
                  />
                </View>
              </View>
              <Input
                placeholder="Phone Number (+1234567890)"
                value={formData.phone}
                onChangeText={(text) =>
                  setFormData({ ...formData, phone: text })
                }
                keyboardType="phone-pad"
                style={{
                  backgroundColor: theme.colors.card,
                  borderColor: theme.colors.border,
                }}
              />
              <Text
                style={{
                  fontSize: 12,
                  color: theme.colors.text + "60",
                  marginTop: 8,
                }}
              >
                Include country code (e.g., +1 for US)
              </Text>
            </View>
          )}

          {/* Restricted Warning */}
          {isRestricted && (
            <View
              style={{
                backgroundColor: theme.colors.notification + "20",
                borderRadius: 12,
                padding: 16,
                marginBottom: 24,
                flexDirection: "row",
                alignItems: "flex-start",
              }}
            >
              <AlertTriangle
                size={20}
                color={theme.colors.notification}
                style={{ marginRight: 12, marginTop: 2 }}
              />
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: "600",
                    color: theme.colors.notification,
                    marginBottom: 4,
                  }}
                >
                  Account Restrictions Detected
                </Text>
                <Text
                  style={{
                    fontSize: 12,
                    color: theme.colors.text + "80",
                  }}
                >
                  {status?.message}
                </Text>
              </View>
            </View>
          )}

          {/* Info Box */}
          {!isCompleted && !isRestricted && (
            <View
              style={{
                backgroundColor: theme.colors.primary + "20",
                borderRadius: 12,
                padding: 16,
                marginBottom: 24,
                flexDirection: "row",
                alignItems: "flex-start",
              }}
            >
              <Info
                size={20}
                color={theme.colors.primary}
                style={{ marginRight: 12, marginTop: 2 }}
              />
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: "600",
                    color: theme.colors.primary,
                    marginBottom: 8,
                  }}
                >
                  What happens next?
                </Text>
                <Text
                  style={{
                    fontSize: 12,
                    color: theme.colors.text + "80",
                    lineHeight: 18,
                  }}
                >
                  • You'll be redirected to Stripe's secure onboarding page{"\n"}
                  • Complete your account setup (takes 2-3 minutes){"\n"}
                  • Return here automatically when done
                </Text>
              </View>
            </View>
          )}

          {/* Action Button */}
          {!isCompleted && (
            <TouchableOpacity
              onPress={handleStartOnboarding}
              disabled={isLoading || isStartingOnboarding}
              style={{
                borderRadius: 999,
                paddingHorizontal: 24,
                paddingVertical: 12,
                backgroundColor: theme.colors.primary,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                opacity: isLoading || isStartingOnboarding ? 0.6 : 1,
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
                {isStartingOnboarding
                  ? "Redirecting..."
                  : statusMessage.buttonText}
              </Text>
              {(isLoading || isStartingOnboarding) && (
                <ActivityIndicator
                  size="small"
                  color="#FFFFFF"
                  style={{ marginLeft: 8 }}
                />
              )}
            </TouchableOpacity>
          )}

          {/* Completed State */}
          {isCompleted && (
            <View
              style={{
                backgroundColor: theme.colors.primary + "20",
                borderRadius: 12,
                padding: 16,
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "600",
                  color: theme.colors.primary,
                }}
              >
                ✓ Your Stripe account is ready to accept payments
              </Text>
            </View>
          )}
        </View>
        </ScrollView>
      )}
      <Toast />
    </Sheet>
  );
}
