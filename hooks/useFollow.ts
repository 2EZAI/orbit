import { useCallback, useState } from "react";
import { supabase } from "~/src/lib/supabase";
import { useAuth } from "~/src/lib/auth";
import Toast from "react-native-toast-message";
import { haptics } from "~/src/lib/haptics";

interface UseFollowReturn {
  isFollowing: (userId: string) => Promise<boolean>;
  followUser: (userId: string) => Promise<void>;

  unfollowUser: (userId: string) => Promise<void>;
  getFollowers: (userId: string) => Promise<string[]>;
  getFollowerUsers: (userId: string) => Promise<ChatUser[]>;
  getFollowingUsers: (userId: string) => Promise<ChatUser[]>;
  getFollowing: (userId: string) => Promise<string[]>;
  getFollowCounts: (userId: string) => Promise<{
    followerCount: number;
    followingCount: number;
  }>;
  loading: boolean;
}
export interface ChatUser {
  id: string;
  username: string;
  first_name?: string;
  last_name?: string;
  avatar_url?: string;
  bio?: string;
  is_following: boolean;
  is_follower: boolean;
  relationship_type: "following" | "follower" | "mutual" | "none";
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
          haptics.impact(); // Medium haptic for follow action
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

        haptics.selection(); // Light haptic for unfollow action
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
  const getFollowerUsers = useCallback(
    async (userId: string): Promise<ChatUser[]> => {
      const { data, error } = await supabase
        .from("follows")
        .select(
          `
        follower_id,
        users!follows_follower_id_fkey (
          id,
          username,
          first_name,
          last_name,
          avatar_url,
          bio
        )
      `
        )
        .eq("following_id", userId);
      return (
        data?.map((follower: any) => ({
          id: follower.users.id,
          username: follower.users.username,
          first_name: follower.users.first_name,
          last_name: follower.users.last_name,
          avatar_url: follower.users.avatar_url,
          bio: follower.users.bio,
          is_following: false,
          is_follower: true,
          relationship_type: "follower" as const,
        })) || []
      );
    },
    []
  );
  const getFollowingUsers = useCallback(
    async (userId: string): Promise<ChatUser[]> => {
      const { data, error } = await supabase
        .from("follows")
        .select(
          `
        following_id,
        users!follows_following_id_fkey (
          id,
          username,
          first_name,
          last_name,
          avatar_url,
          bio
        )
      `
        )
        .eq("follower_id", userId);
      return (
        data?.map((follow: any) => ({
          id: follow.users.id,
          username: follow.users.username,
          first_name: follow.users.first_name,
          last_name: follow.users.last_name,
          avatar_url: follow.users.avatar_url,
          bio: follow.users.bio,
          is_following: true,
          is_follower: false,
          relationship_type: "following" as const,
        })) || []
      );
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
    getFollowerUsers,
    getFollowingUsers,
    loading,
  };
}
