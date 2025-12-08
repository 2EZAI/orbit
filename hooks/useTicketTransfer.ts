import { useState, useCallback } from "react";
import { useAuth } from "~/src/lib/auth";
import { captureError } from "~/src/lib/utils/sentry";
import Toast from "react-native-toast-message";

const API_BASE_URL = "https://orbit-stripe-backend.onrender.com";

export interface TransferTicketResponse {
  success: boolean;
  ticket: {
    id: string;
    event_id: string;
    owner_id: string;
    purchaser_id: string;
    status: string;
    transfer_count: number;
  };
  transfer: {
    id: string;
    from_user_id: string;
    to_user_id: string;
    transferred_at: string;
    status: string;
  };
  newOwner: {
    id: string;
    email: string;
    name: string | null;
  };
}

export interface CancelTransferResponse {
  success: boolean;
  ticket: {
    id: string;
    event_id: string;
    owner_id: string;
    purchaser_id: string;
    status: string;
    transfer_count: number;
  };
  transfer: {
    id: string;
    from_user_id: string;
    to_user_id: string;
    transferred_at: string;
    cancelled_at: string;
    status: string;
  };
  previousOwner: {
    id: string;
    email: string;
    name: string | null;
  };
}

export interface TransferError {
  success: false;
  error: string;
  message: string;
}

export interface UseTransferTicketResult {
  transferTicket: (
    ticketId: string,
    recipientEmail: string
  ) => Promise<TransferTicketResponse | null>;
  isLoading: boolean;
  isError: boolean;
  error: string | null;
}

export interface UseCancelTransferResult {
  cancelTransfer: (ticketId: string) => Promise<CancelTransferResponse | null>;
  isLoading: boolean;
  isError: boolean;
  error: string | null;
}

/**
 * Hook to transfer a ticket to another user
 */
export function useTransferTicket(): UseTransferTicketResult {
  const { session } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const transferTicket = useCallback(
    async (
      ticketId: string,
      recipientEmail: string
    ): Promise<TransferTicketResponse | null> => {
      if (!session?.access_token) {
        const errorMsg = "Authentication required";
        setIsError(true);
        setError(errorMsg);
        Toast.show({
          type: "error",
          text1: "Transfer failed",
          text2: errorMsg,
          position: "top",
          visibilityTime: 3000,
          autoHide: true,
          topOffset: 50,
        });
        return null;
      }

      console.log("🎫 [useTransferTicket] Transferring ticket:", {
        ticketId,
        recipientEmail,
        timestamp: new Date().toISOString(),
      });

      const startTime = Date.now();
      setIsLoading(true);
      setIsError(false);
      setError(null);

      try {
        const response = await fetch(
          `${API_BASE_URL}/api/tickets/${ticketId}/transfer`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({ recipientEmail }),
          }
        );

        const duration = Date.now() - startTime;
        console.log("🎫 [useTransferTicket] API response received:", {
          status: response.status,
          statusText: response.statusText,
          ok: response.ok,
          duration: `${duration}ms`,
        });

        if (!response.ok) {
          const errorData: TransferError = await response.json().catch(() => ({
            success: false,
            error: "unknown_error",
            message: "Failed to transfer ticket",
          }));

          console.error("🎫 [useTransferTicket] Transfer failed:", {
            status: response.status,
            errorData,
            duration: `${duration}ms`,
          });

          captureError(new Error(errorData.message), {
            operation: "useTransferTicket.transferTicket",
            tags: {
              hook: "useTransferTicket",
              api: "tickets",
              operation_type: "transfer_ticket",
            },
            extra: {
              status: response.status,
              errorData,
              ticketId,
              recipientEmail,
              duration,
            },
          });

          const message = errorData.message || "Failed to transfer ticket";
          setIsError(true);
          setError(message);

          Toast.show({
            type: "error",
            text1: "Transfer failed",
            text2: message,
            position: "top",
            visibilityTime: 3000,
            autoHide: true,
            topOffset: 50,
          });

          return null;
        }

        const data: TransferTicketResponse = await response.json();
        console.log("🎫 [useTransferTicket] Transfer successful:", {
          ticketId: data.ticket.id,
          newOwnerId: data.ticket.owner_id,
          transferCount: data.ticket.transfer_count,
          duration: `${duration}ms`,
        });

        setIsError(false);
        setError(null);

        Toast.show({
          type: "success",
          text1: "Transfer successful",
          text2: `Ticket transferred to ${
            data.newOwner.name || data.newOwner.email
          }`,
          position: "top",
          visibilityTime: 3000,
          autoHide: true,
          topOffset: 50,
        });

        return data;
      } catch (err) {
        const duration = Date.now() - startTime;
        const errorMessage = err instanceof Error ? err.message : String(err);

        console.error("🎫 [useTransferTicket] Transfer error:", {
          error: errorMessage,
          errorStack: err instanceof Error ? err.stack : undefined,
          duration: `${duration}ms`,
          ticketId,
          recipientEmail,
        });

        setIsError(true);
        setError(errorMessage);

        captureError(err instanceof Error ? err : new Error(String(err)), {
          operation: "useTransferTicket.transferTicket",
          tags: {
            hook: "useTransferTicket",
            api: "tickets",
            operation_type: "transfer_ticket",
          },
          extra: {
            ticketId,
            recipientEmail,
            duration,
          },
        });

        Toast.show({
          type: "error",
          text1: "Transfer failed",
          text2: errorMessage,
          position: "top",
          visibilityTime: 3000,
          autoHide: true,
          topOffset: 50,
        });

        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [session]
  );

  return {
    transferTicket,
    isLoading,
    isError,
    error,
  };
}

/**
 * Hook to cancel a ticket transfer and return it to the previous owner
 */
export function useCancelTransfer(): UseCancelTransferResult {
  const { session } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cancelTransfer = useCallback(
    async (ticketId: string): Promise<CancelTransferResponse | null> => {
      if (!session?.access_token) {
        const errorMsg = "Authentication required";
        setIsError(true);
        setError(errorMsg);
        Toast.show({
          type: "error",
          text1: "Cancel failed",
          text2: errorMsg,
          position: "top",
          visibilityTime: 3000,
          autoHide: true,
          topOffset: 50,
        });
        return null;
      }

      console.log("🎫 [useCancelTransfer] Cancelling transfer:", {
        ticketId,
        timestamp: new Date().toISOString(),
      });

      const startTime = Date.now();
      setIsLoading(true);
      setIsError(false);
      setError(null);

      try {
        const response = await fetch(
          `${API_BASE_URL}/api/tickets/${ticketId}/cancel-transfer`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session.access_token}`,
            },
          }
        );

        const duration = Date.now() - startTime;
        console.log("🎫 [useCancelTransfer] API response received:", {
          status: response.status,
          statusText: response.statusText,
          ok: response.ok,
          duration: `${duration}ms`,
        });

        if (!response.ok) {
          const errorData: TransferError = await response.json().catch(() => ({
            success: false,
            error: "unknown_error",
            message: "Failed to cancel transfer",
          }));

          console.error("🎫 [useCancelTransfer] Cancel failed:", {
            status: response.status,
            errorData,
            duration: `${duration}ms`,
          });

          captureError(new Error(errorData.message), {
            operation: "useCancelTransfer.cancelTransfer",
            tags: {
              hook: "useCancelTransfer",
              api: "tickets",
              operation_type: "cancel_transfer",
            },
            extra: {
              status: response.status,
              errorData,
              ticketId,
              duration,
            },
          });

          const message = errorData.message || "Failed to cancel transfer";
          setIsError(true);
          setError(message);

          Toast.show({
            type: "error",
            text1: "Cancel failed",
            text2: message,
            position: "top",
            visibilityTime: 3000,
            autoHide: true,
            topOffset: 50,
          });

          return null;
        }

        const data: CancelTransferResponse = await response.json();
        console.log("🎫 [useCancelTransfer] Cancel successful:", {
          ticketId: data.ticket.id,
          ownerId: data.ticket.owner_id,
          transferCount: data.ticket.transfer_count,
          duration: `${duration}ms`,
        });

        setIsError(false);
        setError(null);

        Toast.show({
          type: "success",
          text1: "Transfer cancelled",
          text2: `Ticket returned to ${
            data.previousOwner.name || data.previousOwner.email
          }`,
          position: "top",
          visibilityTime: 3000,
          autoHide: true,
          topOffset: 50,
        });

        return data;
      } catch (err) {
        const duration = Date.now() - startTime;
        const errorMessage = err instanceof Error ? err.message : String(err);

        console.error("🎫 [useCancelTransfer] Cancel error:", {
          error: errorMessage,
          errorStack: err instanceof Error ? err.stack : undefined,
          duration: `${duration}ms`,
          ticketId,
        });

        setIsError(true);
        setError(errorMessage);

        captureError(err instanceof Error ? err : new Error(String(err)), {
          operation: "useCancelTransfer.cancelTransfer",
          tags: {
            hook: "useCancelTransfer",
            api: "tickets",
            operation_type: "cancel_transfer",
          },
          extra: {
            ticketId,
            duration,
          },
        });

        Toast.show({
          type: "error",
          text1: "Cancel failed",
          text2: errorMessage,
          position: "top",
          visibilityTime: 3000,
          autoHide: true,
          topOffset: 50,
        });

        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [session]
  );

  return {
    cancelTransfer,
    isLoading,
    isError,
    error,
  };
}


