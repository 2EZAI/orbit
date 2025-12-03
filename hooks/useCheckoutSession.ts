import { useCallback, useState } from "react";
import Toast from "react-native-toast-message";
import { useStripe as useStripeRN } from "@stripe/stripe-react-native";
import { useAuth } from "~/src/lib/auth";

const API_BASE_URL = "https://orbit-stripe-backend.onrender.com/api/";

type CreateCheckoutParams = {
  eventId: string;
  idempotencyKey: string;
};

type CheckoutResult = {
  success: boolean;
  paymentIntent: {
    clientSecret: string;
    id: string;
  } | null;
  event: {
    id: string;
    name: string;
    ticketPriceCents: number | null;
    ticketRemaining: number | null;
    ticketLimitPerUser: number;
    ticketStatus: string;
  } | null;
};

interface UseCheckoutSessionState {
  loading: boolean;
  error: string | null;
}

export const useCheckoutSession = () => {
  const { session } = useAuth();
  const { initPaymentSheet, presentPaymentSheet } = useStripeRN();

  const [state, setState] = useState<UseCheckoutSessionState>({
    loading: false,
    error: null,
  });

  const createCheckoutSession = useCallback(
    async (params: CreateCheckoutParams): Promise<CheckoutResult> => {
      if (!session?.access_token) {
        const message = "You must be signed in to start a checkout.";
        setState({ loading: false, error: message });
        Toast.show({
          type: "error",
          text1: "Not signed in",
          text2: message,
        });
        return { success: false, paymentIntent: null, event: null };
      }

      setState({ loading: true, error: null });

      try {
        // 1. Ask your backend to create a PaymentIntent & ephemeral key
        const response = await fetch(
          `${API_BASE_URL}stripe/payment-intent/${params.eventId}?idempotencyKey=${params.idempotencyKey}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session.access_token}`,
            },
          }
        );

        const data = await response.json();

        if (!response.ok) {
          const message =
            (data as any)?.error ||
            (data as any)?.message ||
            "Failed to start checkout.";
          setState({ loading: false, error: message });
          Toast.show({
            type: "error",
            text1: "Payment error",
            text2: message,
          });
          return { success: false, paymentIntent: null, event: null };
        }
        setState({ loading: false, error: null });
        return data;
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Unexpected error while starting checkout.";
        setState({ loading: false, error: message });
        Toast.show({
          type: "error",
          text1: "Payment error",
          text2: message,
        });
        return { success: false, paymentIntent: null, event: null };
      }
    },
    [session?.access_token, initPaymentSheet, presentPaymentSheet]
  );

  return {
    loading: state.loading,
    error: state.error,
    createCheckoutSession,
  };
};
