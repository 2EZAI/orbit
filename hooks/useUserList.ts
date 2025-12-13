import { useCallback, useEffect, useState } from "react";
import { useAuth } from "~/src/lib/auth";
import { captureError } from "~/src/lib/utils/sentry";

const API_BASE_URL = "https://orbit-web-backend.onrender.com/api/users";

export interface UserListItem {
  id: string;
  username: string | null;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  email?: string | null;
  mutual_connections?: number;
  is_following?: boolean;
}

export interface UserListParams {
  page?: number;
  limit?: number;
  sortBy?: "recent" | "alphabetical" | "mutual";
  search?: string;
  includeMutualConnections?: boolean;
}

export interface UserListResponse {
  users: Array<UserListItem>;
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface UserSearchParams {
  q: string;
  page?: number;
  limit?: number;
  includeMutualConnections?: boolean;
}

export interface UserSearchResponse {
  users: Array<UserListItem>;
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface UseUserListResult {
  users: Array<UserListItem>;
  loading: boolean;
  error: string | null;
  total: number;
  page: number;
  totalPages: number;
  setPage: (page: number) => void;
  refetch: () => Promise<void>;
}

export interface UseUserSearchResult {
  users: Array<UserListItem>;
  loading: boolean;
  error: string | null;
  total: number;
  page: number;
  totalPages: number;
  setPage: (page: number) => void;
  refetch: () => Promise<void>;
}

/**
 * Hook to fetch a list of users with optional filtering and pagination
 */
export function useUserList(params: UserListParams = {}): UseUserListResult {
  const [users, setUsers] = useState<Array<UserListItem>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(params.page || 1);
  const [totalPages, setTotalPages] = useState(0);
  const { session } = useAuth();

  const fetchUsers = useCallback(async () => {
    console.log("👥 [useUserList] Fetching users:", {
      page,
      limit: params.limit || 20,
      search: params.search,
      hasAuth: !!session?.access_token,
    });

    const startTime = Date.now();
    setLoading(true);
    setError(null);

    try {
      const queryParams = new URLSearchParams({
        page: String(page),
        limit: String(params.limit || 20),
        sortBy: params.sortBy || "recent",
        includeMutualConnections: String(
          params.includeMutualConnections || false
        ),
      });

      if (params.search) {
        queryParams.append("search", params.search);
      }

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      // Add auth header if user is authenticated
      if (session?.access_token) {
        headers.Authorization = `Bearer ${session.access_token}`;
      }

      const url = `${API_BASE_URL}?${queryParams}`;
      const response = await fetch(url, {
        method: "GET",
        headers,
      });

      const duration = Date.now() - startTime;
      console.log("👥 [useUserList] API response received:", {
        status: response.status,
        ok: response.ok,
        duration: `${duration}ms`,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("👥 [useUserList] API error:", {
          status: response.status,
          errorText,
        });
        throw new Error(`Failed to fetch users: ${response.statusText}`);
      }

      const result: UserListResponse = await response.json();
      console.log("👥 [useUserList] Users fetched successfully:", {
        count: result.users.length,
        total: result.total,
        page: result.page,
        totalPages: result.totalPages,
        duration: `${duration}ms`,
      });

      setUsers(result.users);
      setTotal(result.total);
      setTotalPages(result.totalPages);
      setError(null);
    } catch (err) {
      const duration = Date.now() - startTime;
      const errorMessage = err instanceof Error ? err.message : String(err);

      console.error("👥 [useUserList] Fetch error:", {
        error: errorMessage,
        duration: `${duration}ms`,
      });

      captureError(err instanceof Error ? err : new Error(String(err)), {
        operation: "useUserList.fetchUsers",
        tags: {
          hook: "useUserList",
          api: "user_profile",
          operation_type: "fetch_users",
        },
        extra: {
          page,
          limit: params.limit || 20,
          has_search: !!params.search,
          has_access_token: !!session?.access_token,
          duration,
        },
      });

      setError(errorMessage);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [page, params, session?.access_token]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  return {
    users,
    loading,
    error,
    total,
    page,
    totalPages,
    setPage,
    refetch: fetchUsers,
  };
}

/**
 * Hook to search for users with a query string
 */
export function useUserSearch(params: UserSearchParams): UseUserSearchResult {
  const [users, setUsers] = useState<Array<UserListItem>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(params.page || 1);
  const [totalPages, setTotalPages] = useState(0);
  const { session } = useAuth();

  const searchUsers = useCallback(async () => {
    if (!params.q.trim()) {
      setUsers([]);
      setLoading(false);
      setTotal(0);
      setTotalPages(0);
      return;
    }

    console.log("🔍 [useUserSearch] Searching users:", {
      query: params.q,
      page,
      limit: params.limit || 20,
      hasAuth: !!session?.access_token,
    });

    const startTime = Date.now();
    setLoading(true);
    setError(null);

    try {
      const searchQueryParams = new URLSearchParams({
        search: params.q,
        page: String(page),
        limit: String(params.limit || 20),
        includeMutualConnections: String(
          params.includeMutualConnections || false
        ),
      });

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      // Add auth header if user is authenticated
      if (session?.access_token) {
        headers.Authorization = `Bearer ${session.access_token}`;
      }

      const url = `${API_BASE_URL}?${searchQueryParams}`;
      const response = await fetch(url, {
        method: "GET",
        headers,
      });

      const duration = Date.now() - startTime;
      console.log("🔍 [useUserSearch] API response received:", {
        status: response.status,
        ok: response.ok,
        duration: `${duration}ms`,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("🔍 [useUserSearch] API error:", {
          status: response.status,
          errorText,
        });
        throw new Error(`Failed to search users: ${response.statusText}`);
      }

      const result: UserSearchResponse = await response.json();
      console.log("🔍 [useUserSearch] Search successful:", {
        count: result.users.length,
        total: result.total,
        query: params.q,
        duration: `${duration}ms`,
      });

      setUsers(result.users);
      setTotal(result.total);
      setTotalPages(result.totalPages);
      setError(null);
    } catch (err) {
      const duration = Date.now() - startTime;
      const errorMessage = err instanceof Error ? err.message : String(err);

      console.error("🔍 [useUserSearch] Search error:", {
        error: errorMessage,
        query: params.q,
        duration: `${duration}ms`,
      });

      captureError(err instanceof Error ? err : new Error(String(err)), {
        operation: "useUserSearch.searchUsers",
        tags: {
          hook: "useUserSearch",
          api: "user_profile",
          operation_type: "search_users",
        },
        extra: {
          query: params.q,
          page,
          limit: params.limit || 20,
          has_access_token: !!session?.access_token,
          duration,
        },
      });

      setError(errorMessage);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [
    params.q,
    params.limit,
    params.includeMutualConnections,
    page,
    session?.access_token,
  ]);

  useEffect(() => {
    searchUsers();
  }, [searchUsers]);

  return {
    users,
    loading,
    error,
    total,
    page,
    totalPages,
    setPage,
    refetch: searchUsers,
  };
}
