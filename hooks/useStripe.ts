import { useEffect, useState } from "react";
import Toast from "react-native-toast-message";
import { useAuth } from "~/src/lib/auth";
import { useUser } from "~/src/lib/UserProvider";

export type StripeStatus =
  | "not_setup"
  | "not_started"
  | "in_progress"
  | "completed"
  | "restricted";

export interface StripeRequirements {
  currently_due?: Array<string>;
  eventually_due?: Array<string>;
  past_due?: Array<string>;
}

export interface StripeAccountStatus {
  setup: boolean;
  status: StripeStatus;
  message: string;
  accountId?: string;
  payoutsEnabled?: boolean;
  chargesEnabled?: boolean;
  detailsSubmitted?: boolean;
  requirements?: StripeRequirements;
  error?: string;
}

interface StripeState {
  status: StripeAccountStatus | null;
  isLoading: boolean;
  lastFetched: number | null;
}

const API_BASE_URL = "https://orbit-stripe-backend.onrender.com/api/";

export const useStripe = () => {
  const { user } = useUser();
  const { session } = useAuth();
  const [status, setStatus] = useState<StripeAccountStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  useEffect(() => {
    setIsLoading(true);
    fetchStatus()
      .then((status) => {
        setStatus(status as StripeAccountStatus);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);
  const fetchStatus = async () => {
    if (!session?.access_token) {
      return;
    }
    try {
      const response = await fetch(
        `${API_BASE_URL}onboard/check-stripe-setup`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token}`,
          },
        }
      );
      console.log("Fetch status response", response);
      const data = await response.json();
      if (response.status === 404) {
        return {
          setup: false,
          status: "not_setup",
          message:
            data.message ||
            "No Stripe account found. Please set up your Stripe account to continue.",
        } as StripeAccountStatus;
      } else if (response.status === 200) {
        // Account fully set up
        const statusData = {
          setup: true,
          status: data.status || "completed",
          message:
            data.message ||
            "Stripe account is fully set up and ready to receive payments.",
          accountId: data.accountId,
          payoutsEnabled: data.payoutsEnabled,
          chargesEnabled: data.chargesEnabled,
          detailsSubmitted: data.detailsSubmitted,
        } as StripeAccountStatus;
        console.log("✅ [stripeStore] Account fully set up:", statusData);
        return statusData;
      } else if (response.status === 202) {
        // Account exists but onboarding not complete
        return {
          setup: true,
          status: data.status || "in_progress",
          message:
            data.message ||
            "Stripe account setup is in progress. Please complete the required information.",
          accountId: data.accountId,
          payoutsEnabled: data.payoutsEnabled,
          chargesEnabled: data.chargesEnabled,
          detailsSubmitted: data.detailsSubmitted,
          requirements: data.requirements,
        } as StripeAccountStatus;
      } else if (response.status === 403) {
        // Account restricted
        return {
          setup: true,
          status: "restricted",
          message:
            data.message ||
            "Your Stripe account has restrictions. Please contact support or complete additional verification.",
          accountId: data.accountId,
          payoutsEnabled: data.payoutsEnabled,
          chargesEnabled: data.chargesEnabled,
          detailsSubmitted: data.detailsSubmitted,
          requirements: data.requirements,
        };
      } else {
        // Unexpected status code
        return {
          setup: false,
          status: "not_setup",
          message:
            data.message ||
            "Error checking Stripe account status. Please try again later.",
          error: data.error || `Unexpected status: ${response.status}`,
        };
      }
    } catch (error) {
      return {
        setup: false,
        status: "not_setup",
        message:
          "Error checking Stripe account status. Please try again later.",
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  };
  const createStripeAccount = async (data: {
    first_name: string;
    last_name: string;
    phone: string;
  }): Promise<string> => {
    console.log("Creating stripe account", data);
    if (!session?.access_token) {
      return "";
    }
    setIsLoading(true);

    const response = await fetch(
      `${API_BASE_URL}onboard/create-connect-account`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify(data),
      }
    );
    setIsLoading(false);
    console.log("Create stripe account response", response);
    if (!response.ok) {
      const error = await response.json();

      Toast.show({
        type: "error",
        text1: "Failed to create account",
        text2: error.error || error.message || "Failed to create account",
      });
      return "";
    }
    Toast.show({
      type: "success",
      text1: "Stripe account created successfully",
    });
    console.log();
    const result = await response.json();
    return result?.accountId;
  };

  const createAccountSession = async (accountId: string): Promise<string> => {
    if (!session?.access_token) {
      return "";
    }

    setIsLoading(true);
    const response = await fetch(
      `${API_BASE_URL}/onboard/create-account-session`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ accountId }),
      }
    );
    setIsLoading(false);
    if (!response.ok) {
      const error = await response.json();
      return "";
    }

    const result = await response.json();
    return result.clientSecret;
  };
  const getAccountStatus = async (accountId: string) => {
    if (!session?.access_token) {
      return null;
    }
    setIsLoading(true);
    const response = await fetch(
      `${API_BASE_URL}/onboard/get-account-status/${accountId}`,
      {
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      }
    );
    setIsLoading(false);
    if (!response.ok) {
      const error = await response.json();
      return null;
    }

    return await response.json();
  };

  const getAccountDetails = async (accountId: string) => {
    if (!session?.access_token) {
      return null;
    }
    setIsLoading(true);
    const response = await fetch(
      `${API_BASE_URL}/onboard/get-account-details/${accountId}`,
      {
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      }
    );
    setIsLoading(false);
    if (!response.ok) {
      return null;
    }

    return await response.json();
  };

  const createAccountLink = async (accountId: string): Promise<string> => {
    if (!session?.access_token) {
      throw new Error("No authentication token available");
    }

    setIsLoading(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}onboard/create-account-link`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token}`,
            "User-Agent": "Orbit-Mobile",
          },
          body: JSON.stringify({ accountId, platform: "mobile" }),
        }
      );

      setIsLoading(false);

      if (!response.ok) {
        const error = await response.json().catch(() => ({
          error: `HTTP ${response.status}: ${response.statusText}`,
        }));
        const errorMessage =
          error.error || error.message || "Failed to create account link";

        if (
          response.status === 404 ||
          errorMessage.toLowerCase().includes("route not found") ||
          errorMessage.toLowerCase().includes("not found") ||
          errorMessage.toLowerCase().includes("endpoint not found")
        ) {
          throw new Error(
            "Onboarding endpoint not available. Please contact support."
          );
        }

        throw new Error(errorMessage);
      }

      const result = await response.json();
      return result.url;
    } catch (error) {
      setIsLoading(false);
      throw error;
    }
  };

  const createAccountManagementLink = async (
    accountId: string
  ): Promise<string> => {
    if (!session?.access_token) {
      throw new Error("No authentication token available");
    }

    setIsLoading(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}onboard/create-account-link`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token}`,
            "User-Agent": "Orbit-Mobile",
          },
          body: JSON.stringify({
            accountId,
            type: "account_update",
            platform: "mobile",
          }),
        }
      );

      setIsLoading(false);

      if (!response.ok) {
        const error = await response.json().catch(() => ({
          error: `HTTP ${response.status}: ${response.statusText}`,
        }));
        const errorMessage =
          error.error ||
          error.message ||
          `Failed to create account management link (${response.status})`;

        if (
          response.status === 404 ||
          errorMessage.toLowerCase().includes("route not found") ||
          errorMessage.toLowerCase().includes("not found") ||
          errorMessage.toLowerCase().includes("endpoint not found")
        ) {
          throw new Error(
            "Account management feature is not available. The backend endpoint may not be configured yet."
          );
        }

        throw new Error(errorMessage);
      }

      const result = await response.json();
      return result.url;
    } catch (error) {
      setIsLoading(false);
      throw error;
    }
  };

  const getAccountBalance = async (accountId: string) => {
    if (!session?.access_token) {
      throw new Error("No authentication token available");
    }

    const response = await fetch(`${API_BASE_URL}stripe/balance/${accountId}`, {
      headers: {
        Authorization: `Bearer ${session?.access_token}`,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        error: `HTTP ${response.status}: ${response.statusText}`,
      }));
      const errorMessage =
        error.error || error.message || "Failed to get account balance";

      if (response.status === 404) {
        throw new Error("BALANCE_ENDPOINT_NOT_AVAILABLE");
      }

      throw new Error(errorMessage);
    }

    return await response.json();
  };

  const getTransactions = async (
    accountId: string,
    options?: {
      limit?: number;
      startingAfter?: string;
    }
  ) => {
    if (!session?.access_token) {
      throw new Error("No authentication token available");
    }

    const params = new URLSearchParams({
      accountId,
      limit: (options?.limit || 20).toString(),
    });
    if (options?.startingAfter) {
      params.append("startingAfter", options.startingAfter);
    }

    const response = await fetch(
      `${API_BASE_URL}stripe/transactions?${params}`,
      {
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      }
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        error: `HTTP ${response.status}: ${response.statusText}`,
      }));
      const errorMessage =
        error.error || error.message || "Failed to get transactions";

      if (response.status === 404) {
        throw new Error("TRANSACTIONS_ENDPOINT_NOT_AVAILABLE");
      }

      throw new Error(errorMessage);
    }

    return await response.json();
  };

  const getPayouts = async (
    accountId: string,
    options?: {
      limit?: number;
      startingAfter?: string;
    }
  ) => {
    if (!session?.access_token) {
      throw new Error("No authentication token available");
    }

    const params = new URLSearchParams({
      accountId,
      limit: (options?.limit || 20).toString(),
    });
    if (options?.startingAfter) {
      params.append("startingAfter", options.startingAfter);
    }

    const response = await fetch(`${API_BASE_URL}stripe/payouts?${params}`, {
      headers: {
        Authorization: `Bearer ${session?.access_token}`,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        error: `HTTP ${response.status}: ${response.statusText}`,
      }));
      const errorMessage =
        error.error || error.message || "Failed to get payouts";

      if (response.status === 404) {
        throw new Error("PAYOUTS_ENDPOINT_NOT_AVAILABLE");
      }

      throw new Error(errorMessage);
    }

    return await response.json();
  };

  return {
    status,
    isLoading,
    fetchStatus,
    createStripeAccount,
    createAccountSession,
    getAccountStatus,
    getAccountDetails,
    createAccountLink,
    createAccountManagementLink,
    getAccountBalance,
    getTransactions,
    getPayouts,
  };
};
