import { useState } from "react";
import Toast from "react-native-toast-message";
import { useAuth } from "~/src/lib/auth";

// Base URL matches web backend used by posts, flags, blocking, etc.
const BASE_URL = "https://orbit-web-backend.onrender.com";
const API_BASE_URL = `${BASE_URL}/api/bookmarks`;

// ---------------------------------------------------------------------------
// TYPES (mirroring documentation/BookmarksAPI.md)
// ---------------------------------------------------------------------------

export interface BookmarkFolder {
  id: string;
  name: string;
  description?: string;
  created_by: string;
  is_public: boolean;
  created_at: string;
  updated_at: string;
  creator?: {
    id: string;
    username: string;
    first_name?: string;
    last_name?: string;
    avatar_url?: string;
  };
  member_count?: number;
  bookmark_count?: number;
}

export interface BookmarkFolderMember {
  id: string;
  folder_id: string;
  user_id: string;
  role: "owner" | "editor";
  added_by: string;
  created_at: string;
  user?: {
    id: string;
    username: string;
    first_name?: string;
    last_name?: string;
    avatar_url?: string;
  };
}

export type LocationBookmarkType = "static_location" | "event" | "post";

export interface LocationBookmark {
  id: string;
  folder_id: string;
  location_type: LocationBookmarkType;
  static_location_id?: string;
  event_id?: string;
  post_id?: string;
  added_by: string;
  notes?: string;
  created_at: string;
  static_location?: {
    id: string;
    name: string;
    address?: string;
    location?: {
      type: "Point";
      coordinates: [number, number];
    };
    image_urls?: string[];
    category_id?: string;
  };
  event?: {
    id: string;
    name: string;
    description?: string;
    start_datetime: string;
    venue_name?: string;
    address?: string;
    image_urls?: string[];
    category_id?: string;
  };
  post?: {
    id: string;
    content: string;
    media_urls?: string[];
    user_id: string;
    created_at: string;
  };
  added_by_user?: {
    id: string;
    username: string;
    first_name?: string;
    last_name?: string;
    avatar_url?: string;
  };
}

interface ApiListResponse<T> {
  success: boolean;
  data: T[];
  count?: number;
  message?: string;
}

interface ApiItemResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

// Request payloads ----------------------------------------------------------

export interface CreateFolderPayload {
  name: string;
  description?: string;
  is_public?: boolean;
}

export interface UpdateFolderPayload {
  name?: string;
  description?: string;
  is_public?: boolean;
}

export interface AddFolderMemberPayload {
  user_id: string;
  role?: "editor";
}

export interface CreateBookmarkPayload {
  folder_id: string;
  location_type: LocationBookmarkType;
  static_location_id?: string;
  event_id?: string;
  post_id?: string;
  notes?: string;
}

export interface UpdateBookmarkPayload {
  notes?: string;
}

export interface GetBookmarksQuery {
  folder_id?: string;
  location_type?: LocationBookmarkType;
  static_location_id?: string;
  event_id?: string;
  post_id?: string;
  limit?: number;
  offset?: number;
}

export interface UseBookmarkReturn {
  loading: boolean;
  error: Error | null;
  // Folder management
  createFolder: (
    payload: CreateFolderPayload
  ) => Promise<BookmarkFolder | null>;
  getFolders: () => Promise<BookmarkFolder[]>;
  getFolder: (folderId: string) => Promise<BookmarkFolder | null>;
  updateFolder: (
    folderId: string,
    payload: UpdateFolderPayload
  ) => Promise<BookmarkFolder | null>;
  deleteFolder: (folderId: string) => Promise<boolean>;
  // Folder sharing
  addFolderMember: (
    folderId: string,
    payload: AddFolderMemberPayload
  ) => Promise<BookmarkFolderMember | null>;
  getFolderMembers: (folderId: string) => Promise<BookmarkFolderMember[]>;
  removeFolderMember: (folderId: string, userId: string) => Promise<boolean>;
  // Bookmarks
  createBookmark: (
    payload: CreateBookmarkPayload
  ) => Promise<LocationBookmark | null>;
  getBookmarks: (
    query: GetBookmarksQuery
  ) => Promise<{ bookmarks: LocationBookmark[]; count: number }>;
  getBookmark: (bookmarkId: string) => Promise<LocationBookmark | null>;
  updateBookmark: (
    bookmarkId: string,
    payload: UpdateBookmarkPayload
  ) => Promise<LocationBookmark | null>;
  deleteBookmark: (bookmarkId: string) => Promise<boolean>;
  // Helpers
  isEventBookmarked: (eventId: string) => Promise<boolean>;
  isStaticLocationBookmarked: (locationId: string) => Promise<boolean>;
  isPostBookmarked: (postId: string) => Promise<boolean>;
}

export function useBookmark(): UseBookmarkReturn {
  const { session } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const getAuthToken = () => session?.access_token || null;

  const buildHeaders = (): HeadersInit => {
    const token = getAuthToken();
    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    return headers;
  };

  const ensureAuthenticated = () => {
    if (!session?.access_token) {
      Toast.show({
        type: "info",
        text1: "Please log in",
        text2: "You need to be signed in to manage bookmarks.",
      });
      return false;
    }
    return true;
  };

  const handleJsonResponse = async <T>(response: Response): Promise<T> => {
    const text = await response.text();

    if (!response.ok) {
      let message = `Request failed: ${response.status}`;
      try {
        const data = JSON.parse(text);
        message = data.error || data.message || message;
      } catch {
        if (text) message = text;
      }
      const err = new Error(message);
      setError(err);
      Toast.show({
        type: "error",
        text1: "Something went wrong",
        text2: message,
      });
      throw err;
    }

    try {
      return JSON.parse(text) as T;
    } catch {
      return {} as T;
    }
  };

  // -------------------------------------------------------------------------
  // Folder management
  // -------------------------------------------------------------------------

  const createFolder = async (
    payload: CreateFolderPayload
  ): Promise<BookmarkFolder | null> => {
    if (!ensureAuthenticated()) return null;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/folders`, {
        method: "POST",
        headers: buildHeaders(),
        body: JSON.stringify(payload),
      });
      const data = await handleJsonResponse<ApiItemResponse<BookmarkFolder>>(
        response
      );
      Toast.show({
        type: "success",
        text1: "Folder created",
        text2: data.message || "Folder created successfully.",
      });
      return data.data;
    } finally {
      setLoading(false);
    }
  };

  const getFolders = async (): Promise<BookmarkFolder[]> => {
    if (!ensureAuthenticated()) return [];
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/folders`, {
        method: "GET",
        headers: buildHeaders(),
      });
      const data = await handleJsonResponse<ApiListResponse<BookmarkFolder>>(
        response
      );
      return data.data || [];
    } finally {
      // don't toggle global loading here to avoid UI flicker
    }
  };

  const getFolder = async (
    folderId: string
  ): Promise<BookmarkFolder | null> => {
    if (!ensureAuthenticated()) return null;
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/folders/${folderId}`, {
        method: "GET",
        headers: buildHeaders(),
      });
      const data = await handleJsonResponse<ApiItemResponse<BookmarkFolder>>(
        response
      );
      return data.data;
    } finally {
      // no-op
    }
  };

  const updateFolder = async (
    folderId: string,
    payload: UpdateFolderPayload
  ): Promise<BookmarkFolder | null> => {
    if (!ensureAuthenticated()) return null;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/folders/${folderId}`, {
        method: "PUT",
        headers: buildHeaders(),
        body: JSON.stringify(payload),
      });
      const data = await handleJsonResponse<ApiItemResponse<BookmarkFolder>>(
        response
      );
      Toast.show({
        type: "success",
        text1: "Folder updated",
        text2: data.message || "Folder updated successfully.",
      });
      return data.data;
    } finally {
      setLoading(false);
    }
  };

  const deleteFolder = async (folderId: string): Promise<boolean> => {
    if (!ensureAuthenticated()) return false;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/folders/${folderId}`, {
        method: "DELETE",
        headers: buildHeaders(),
      });
      await handleJsonResponse<{ success: boolean; message?: string }>(
        response
      );
      Toast.show({
        type: "success",
        text1: "Folder deleted",
      });
      return true;
    } finally {
      setLoading(false);
    }
  };

  // -------------------------------------------------------------------------
  // Folder sharing
  // -------------------------------------------------------------------------

  const addFolderMember = async (
    folderId: string,
    payload: AddFolderMemberPayload
  ): Promise<BookmarkFolderMember | null> => {
    if (!ensureAuthenticated()) return null;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `${API_BASE_URL}/folders/${folderId}/members`,
        {
          method: "POST",
          headers: buildHeaders(),
          body: JSON.stringify(payload),
        }
      );
      const data = await handleJsonResponse<
        ApiItemResponse<BookmarkFolderMember>
      >(response);
      Toast.show({
        type: "success",
        text1: "Member added",
      });
      return data.data;
    } finally {
      setLoading(false);
    }
  };

  const getFolderMembers = async (
    folderId: string
  ): Promise<BookmarkFolderMember[]> => {
    if (!ensureAuthenticated()) return [];
    setError(null);
    try {
      const response = await fetch(
        `${API_BASE_URL}/folders/${folderId}/members`,
        {
          method: "GET",
          headers: buildHeaders(),
        }
      );
      const data = await handleJsonResponse<
        ApiListResponse<BookmarkFolderMember>
      >(response);
      return data.data || [];
    } finally {
      // no-op
    }
  };

  const removeFolderMember = async (
    folderId: string,
    userId: string
  ): Promise<boolean> => {
    if (!ensureAuthenticated()) return false;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `${API_BASE_URL}/folders/${folderId}/members/${userId}`,
        {
          method: "DELETE",
          headers: buildHeaders(),
        }
      );
      await handleJsonResponse<{ success: boolean; message?: string }>(
        response
      );
      Toast.show({
        type: "success",
        text1: "Member removed",
      });
      return true;
    } finally {
      setLoading(false);
    }
  };

  // -------------------------------------------------------------------------
  // Bookmarks
  // -------------------------------------------------------------------------

  const createBookmark = async (
    payload: CreateBookmarkPayload
  ): Promise<LocationBookmark | null> => {
    if (!ensureAuthenticated()) return null;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(API_BASE_URL, {
        method: "POST",
        headers: buildHeaders(),
        body: JSON.stringify(payload),
      });
      const data = await handleJsonResponse<ApiItemResponse<LocationBookmark>>(
        response
      );
      return data.data;
    } finally {
      setLoading(false);
    }
  };

  const getBookmarks = async (
    query: GetBookmarksQuery
  ): Promise<{ bookmarks: LocationBookmark[]; count: number }> => {
    if (!ensureAuthenticated()) return { bookmarks: [], count: 0 };
    setError(null);

    const searchParams = new URLSearchParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        searchParams.append(key, String(value));
      }
    });

    try {
      const response = await fetch(
        `${API_BASE_URL}?${searchParams.toString()}`,
        {
          method: "GET",
          headers: buildHeaders(),
        }
      );
      const data = await handleJsonResponse<
        ApiListResponse<LocationBookmark> & { count?: number }
      >(response);

      return {
        bookmarks: data.data || [],
        count: data.count ?? data.data?.length ?? 0,
      };
    } finally {
      // no-op
    }
  };

  const getBookmark = async (
    bookmarkId: string
  ): Promise<LocationBookmark | null> => {
    if (!ensureAuthenticated()) return null;
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/${bookmarkId}`, {
        method: "GET",
        headers: buildHeaders(),
      });
      const data = await handleJsonResponse<ApiItemResponse<LocationBookmark>>(
        response
      );
      return data.data;
    } finally {
      // no-op
    }
  };

  const updateBookmark = async (
    bookmarkId: string,
    payload: UpdateBookmarkPayload
  ): Promise<LocationBookmark | null> => {
    if (!ensureAuthenticated()) return null;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/${bookmarkId}`, {
        method: "PUT",
        headers: buildHeaders(),
        body: JSON.stringify(payload),
      });
      const data = await handleJsonResponse<ApiItemResponse<LocationBookmark>>(
        response
      );
      Toast.show({
        type: "success",
        text1: "Bookmark updated",
      });
      return data.data;
    } finally {
      setLoading(false);
    }
  };

  const deleteBookmark = async (bookmarkId: string): Promise<boolean> => {
    if (!ensureAuthenticated()) return false;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/${bookmarkId}`, {
        method: "DELETE",
        headers: buildHeaders(),
      });
      await handleJsonResponse<{ success: boolean; message?: string }>(
        response
      );
      return true;
    } finally {
      setLoading(false);
    }
  };

  // -------------------------------------------------------------------------
  // Helper functions: is X bookmarked?
  // -------------------------------------------------------------------------

  const isEventBookmarked = async (eventId: string): Promise<boolean> => {
    const { bookmarks } = await getBookmarks({
      location_type: "event",
      event_id: eventId,
      limit: 1,
    });
    return bookmarks.length > 0;
  };

  const isStaticLocationBookmarked = async (
    locationId: string
  ): Promise<boolean> => {
    const { bookmarks } = await getBookmarks({
      location_type: "static_location",
      static_location_id: locationId,
      limit: 1,
    });
    return bookmarks.length > 0;
  };

  const isPostBookmarked = async (postId: string): Promise<boolean> => {
    const { bookmarks } = await getBookmarks({
      location_type: "post",
      post_id: postId,
      limit: 1,
    });
    return bookmarks.length > 0;
  };

  return {
    loading,
    error,
    createFolder,
    getFolders,
    getFolder,
    updateFolder,
    deleteFolder,
    addFolderMember,
    getFolderMembers,
    removeFolderMember,
    createBookmark,
    getBookmarks,
    getBookmark,
    updateBookmark,
    deleteBookmark,
    isEventBookmarked,
    isStaticLocationBookmarked,
    isPostBookmarked,
  };
}
