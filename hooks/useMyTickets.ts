import { useCallback, useEffect, useState } from "react";
import { useAuth } from "~/src/lib/auth";
import { captureError } from "~/src/lib/utils/sentry";

const API_BASE_URL = "https://orbit-stripe-backend.onrender.com";

export type TicketStatus =
  | "active"
  | "used"
  | "transferred"
  | "refunded"
  | "canceled";

export interface Ticket {
  id: string;
  event_id: string;
  event_name: string | null;
  event_start_datetime: string | null;
  event_venue_name: string | null;
  event_currency: string | null;
  owner_id: string;
  purchaser_id: string;
  qr_code: string;
  status: TicketStatus;
  transfer_count: number;
  issued_at: string;
  used_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface MyTicketsResponse {
  tickets: Array<Ticket>;
  total: number;
  limit: number;
  offset: number;
}

export interface MyTicketsQueryParams {
  status?: TicketStatus;
  event_id?: string;
  limit?: number;
  offset?: number;
}

export interface UseMyTicketsResult {
  data: MyTicketsResponse | null;
  isLoading: boolean;
  isError: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useMyTickets(
  params: MyTicketsQueryParams = {}
): UseMyTicketsResult {
  const { session } = useAuth();
  const { status, limit = 20, offset = 0, event_id } = params;

  const [data, setData] = useState<MyTicketsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEnabled = !!session?.access_token;

  const fetchTickets = useCallback(async () => {
    console.log("🎫 [useMyTickets] Hook called:", {
      params: { status, event_id, limit, offset },
      hasSession: !!session,
      hasAccessToken: !!session?.access_token,
      enabled: isEnabled,
      API_BASE_URL,
    });

    if (!isEnabled) {
      setData(null);
      setIsError(false);
      setError(null);
      return;
    }

    console.log("🎫 [useMyTickets] Starting to fetch tickets:", {
      params: {
        status,
        event_id,
        limit,
        offset,
      },
      hasAuthToken: !!session?.access_token,
      timestamp: new Date().toISOString(),
    });

    const queryParams = new URLSearchParams();
    if (status) queryParams.append("status", status);
    if (event_id) queryParams.append("event_id", event_id);
    if (limit) queryParams.append("limit", limit.toString());
    if (offset) queryParams.append("offset", offset.toString());

    const url = `${API_BASE_URL}/api/tickets/my-tickets?${queryParams.toString()}`;

    console.log("🎫 [useMyTickets] Request URL:", url);
    console.log(
      "🎫 [useMyTickets] Query params:",
      Object.fromEntries(queryParams)
    );

    const startTime = Date.now();
    setIsLoading(true);
    setIsError(false);
    setError(null);

    try {
      if (!session?.access_token) {
        console.error("🎫 [useMyTickets] Authentication required");
        throw new Error("Authentication required");
      }

      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      const duration = Date.now() - startTime;
      console.log("🎫 [useMyTickets] API response received:", {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        duration: `${duration}ms`,
        url,
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorData: any;

        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = {
            success: false,
            error: "unknown_error",
            message: errorText || "Failed to fetch tickets",
          };
        }

        console.error("🎫 [useMyTickets] API error response:", {
          status: response.status,
          statusText: response.statusText,
          errorData,
          errorText,
          duration: `${duration}ms`,
          url,
          params: {
            status,
            event_id,
            limit,
            offset,
          },
        });

        captureError(errorData, {
          operation: "useMyTickets.fetchTickets",
          tags: {
            hook: "useMyTickets",
            api: "tickets",
            operation_type: "fetch_my_tickets",
          },
          extra: {
            status: response.status,
            statusText: response.statusText,
            errorData,
            errorText,
            params,
            url,
            duration,
          },
        });

        const message = errorData.message || "Failed to fetch tickets";
        setIsError(true);
        setError(message);
        setData(null);
        return;
      }

      const json: MyTicketsResponse = await response.json();

      const ticketsCount = json.tickets.length;
      const ticketStatuses = json.tickets.map((t) => t.status);
      const eventIds = json.tickets.map((t) => t.event_id);
      const ticketIds = json.tickets.map((t) => t.id);

      console.log("🎫 [useMyTickets] Successfully fetched tickets:", {
        ticketsCount,
        total: json.total,
        limit: json.limit,
        offset: json.offset,
        duration: `${duration}ms`,
        ticketStatuses,
        eventIds,
        ticketIds,
      });

      if (ticketsCount > 0) {
        console.log("🎫 [useMyTickets] Sample ticket data:", {
          firstTicket: {
            id: json.tickets[0].id,
            event_name: json.tickets[0].event_name,
            status: json.tickets[0].status,
            event_start_datetime: json.tickets[0].event_start_datetime,
            issued_at: json.tickets[0].issued_at,
          },
        });
      }

      setData(json);
      setIsError(false);
      setError(null);
    } catch (err) {
      const duration = Date.now() - startTime;
      console.error("🎫 [useMyTickets] Fetch error:", {
        error: err instanceof Error ? err.message : String(err),
        errorStack: err instanceof Error ? err.stack : undefined,
        duration: `${duration}ms`,
        url,
        params: {
          status,
          event_id,
          limit,
          offset,
        },
      });

      setIsError(true);
      setError(err instanceof Error ? err.message : String(err));
      setData(null);
    } finally {
      setIsLoading(false);
    }
  }, [
    API_BASE_URL,
    event_id,
    isEnabled,
    limit,
    offset,
    params,
    session,
    status,
  ]);

  useEffect(() => {
    fetchTickets();
  }, [status]);

  return {
    data,
    isLoading,
    isError,
    error,
    refetch: fetchTickets,
  };
}
