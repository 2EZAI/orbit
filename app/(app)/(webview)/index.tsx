import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState, useRef } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";
import { AlertDialogs } from "~/src/components/ui/alertdialogs";
import Toast from "react-native-toast-message";
import { useStripe } from "~/hooks/useStripe";
import { useAuth } from "~/src/lib/auth";

export default function Webview() {
  const [isShowAlert, setIsShowAlert] = useState(false);
  const { external_url, type, accountId } = useLocalSearchParams();
  const router = useRouter();
  const { session } = useAuth();
  const hasHandledReturn = useRef(false);
  const statusCheckInterval = useRef<NodeJS.Timeout | null>(null);
  
  console.log("external_url>>", external_url);
  
  // Function to check Stripe status directly
  const checkStripeStatus = async () => {
    if (!session?.access_token) return null;
    
    try {
      const API_BASE_URL = "https://orbit-stripe-backend.onrender.com/api/";
      const response = await fetch(
        `${API_BASE_URL}onboard/check-stripe-setup`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );
      
      const data = await response.json();
      
      if (response.status === 200) {
        return {
          status: data.status || "completed",
          accountId: data.accountId,
        };
      } else if (response.status === 202) {
        return {
          status: data.status || "in_progress",
          accountId: data.accountId,
        };
      }
      
      return null;
    } catch (error) {
      console.error("Error checking Stripe status:", error);
      return null;
    }
  };
  
  useEffect(() => {
    return () => {
      setIsShowAlert(true);
      if (statusCheckInterval.current) {
        clearInterval(statusCheckInterval.current);
      }
    };
  }, []);

  // Poll Stripe status to detect completion
  useEffect(() => {
    if (type === "stripe-onboarding" && accountId && !hasHandledReturn.current && session?.access_token) {
      // Start polling Stripe status every 3 seconds
      statusCheckInterval.current = setInterval(async () => {
        try {
          const currentStatus = await checkStripeStatus();
          
          // Check if status changed to completed
          if (currentStatus?.status === "completed") {
            hasHandledReturn.current = true;
            
            if (statusCheckInterval.current) {
              clearInterval(statusCheckInterval.current);
              statusCheckInterval.current = null;
            }
            
            // Navigate back to settings
            router.back();
            
            // Show success message
            setTimeout(() => {
              Toast.show({
                type: "success",
                text1: "Stripe Setup Complete",
                text2: "Your payment account is ready!",
              });
            }, 500);
          }
        } catch (error) {
          console.error("Error checking Stripe status:", error);
        }
      }, 3000); // Check every 3 seconds
    }

    return () => {
      if (statusCheckInterval.current) {
        clearInterval(statusCheckInterval.current);
        statusCheckInterval.current = null;
      }
    };
  }, [type, accountId, session?.access_token, router]);

  const handleNavigationStateChange = (navState: any) => {
    // Also check URL for return indicators as backup
    if (type === "stripe-onboarding" && accountId && !hasHandledReturn.current) {
      const url = navState.url.toLowerCase();
      
      // Check if Stripe is redirecting to return URL (indicates completion)
      if (
        url.includes("orbit://") ||
        url.includes("stripe-onboarding") ||
        url.includes("return") ||
        (url.includes("connect.stripe.com") && !url.includes("setup") && navState.loading === false)
      ) {
        // URL suggests completion, verify with status check
        // The polling will handle the actual verification
      }
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <WebView
        source={{ uri: external_url as string }}
        style={{ flex: 1 }}
        onNavigationStateChange={handleNavigationStateChange}
        onShouldStartLoadWithRequest={(request) => {
          // Intercept deep link redirects for Stripe onboarding
          if (type === "stripe-onboarding" && request.url.includes("orbit://")) {
            // Don't load the deep link - we'll detect completion via status polling
            return false;
          }
          return true; // Allow all other navigation
        }}
      />
      <AlertDialogs isvisible={isShowAlert} />
    </SafeAreaView>
  );
}
