import { useCallback, useState } from "react";
import { supabase } from "~/src/lib/supabase";
import { useAuth } from "~/src/lib/auth";
import Toast from "react-native-toast-message";

interface UseFollowReturn {
  isFollowing: (userId: string) => Promise<boolean>;
  followUser: (userId: string) => Promise<void>;
  unfollowUser: (userId: string) => Promise<void>;
  getFollowers: (userId: string) => Promise<string[]>;
  getFollowing: (userId: string) => Promise<string[]>;
  getFollowCounts: (userId: string) => Promise<{
    followerCount: number;
    followingCount: number;
  }>;
  loading: boolean;
}

export function useFollow(): UseFollowReturn {
  const { session } = useAuth();
  const [loading, setLoading] = useState(false);

  // Check if current user is following a specific user
  const isFollowing = useCallback(
    async (userId: string): Promise<boolean> => {
      if (!session?.user) return false;

      const { data, error } = await supabase
        .from("follows")
        .select("id")
        .eq("follower_id", session.user.id)
        .eq("following_id", userId)
        .single();

      if (error) {
        return false;
      }

      return !!data;
    },
    [session?.user]
  );

  // Follow a user
  const followUser = useCallback(
    async (userId: string): Promise<void> => {
      if (!session?.user) {
        Toast.show({
          type: "error",
          text1: "Error",
          text2: "You must be logged in to follow users",
        });
        return;
      }

      setLoading(true);
      try {
        const { error } = await supabase.from("follows").insert({
          follower_id: session.user.id,
          following_id: userId,
        });

        if (error) {
          if (error.code === "23505") {
            // Unique constraint violation
            Toast.show({
              type: "error",
              text1: "Error",
              text2: "You are already following this user",
            });
          } else {
            throw error;
          }
        } else {
          Toast.show({
            type: "success",
            text1: "Success",
            text2: "Successfully followed user",
          });
        }
      } catch (error) {
        Toast.show({
          type: "error",
          text1: "Error",
          text2: "Failed to follow user",
        });
      } finally {
        setLoading(false);
      }
    },
    [session?.user]
  );

  // Unfollow a user
  const unfollowUser = useCallback(
    async (userId: string): Promise<void> => {
      if (!session?.user) {
        Toast.show({
          type: "error",
          text1: "Error",
          text2: "You must be logged in to unfollow users",
        });
        return;
      }

      setLoading(true);
      try {
        const { error } = await supabase.from("follows").delete().match({
          follower_id: session.user.id,
          following_id: userId,
        });

        if (error) throw error;

        Toast.show({
          type: "success",
          text1: "Success",
          text2: "Successfully unfollowed user",
        });
      } catch (error) {
        Toast.show({
          type: "error",
          text1: "Error",
          text2: "Failed to unfollow user",
        });
      } finally {
        setLoading(false);
      }
    },
    [session?.user]
  );

  // Get a user's followers
  const getFollowers = useCallback(
    async (userId: string): Promise<string[]> => {
      const { data, error } = await supabase
        .from("follows")
        .select("follower_id")
        .eq("following_id", userId);

      if (error) {
        return [];
      }

      return data.map((follow) => follow.follower_id);
    },
    []
  );

  // Get users that a user is following
  const getFollowing = useCallback(
    async (userId: string): Promise<string[]> => {
      const { data, error } = await supabase
        .from("follows")
        .select("following_id")
        .eq("follower_id", userId);

      if (error) {
        return [];
      }

      return data.map((follow) => follow.following_id);
    },
    []
  );

  // Get follower and following counts
  const getFollowCounts = useCallback(
    async (
      userId: string
    ): Promise<{ followerCount: number; followingCount: number }> => {
      const { data, error } = await supabase
        .from("users")
        .select("follower_count, following_count")
        .eq("id", userId)
        .single();

      if (error) {
        return { followerCount: 0, followingCount: 0 };
      }

      return {
        followerCount: data.follower_count || 0,
        followingCount: data.following_count || 0,
      };
    },
    []
  );

  return {
    isFollowing,
    followUser,
    unfollowUser,
    getFollowers,
    getFollowing,
    getFollowCounts,
    loading,
  };
}
