import { format } from "date-fns";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { set } from "lodash";
import {
  Bell,
  Heart,
  MapPin,
  MessageCircle,
  Plus,
  Send,
} from "lucide-react-native";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  ScrollView,
  StatusBar,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { Channel } from "stream-chat";
import { FlagReason, useFlagging } from "~/hooks/useFlagging";
import { useNotificationsApi } from "~/hooks/useNotificationsApi";
import { IProposal } from "~/hooks/useProposals";
import {
  UnifiedData,
  UnifiedDetailsSheet,
} from "~/src/components/map/UnifiedDetailsSheet";
import UnifiedShareSheet from "~/src/components/map/UnifiedShareSheet";
import FlagContentModal, {
  Flags,
} from "~/src/components/modals/FlagContentModal";
import { ChatSelectionModal } from "~/src/components/social/ChatSelectionModal";
import { PostMenuDropdown } from "~/src/components/social/PostMenuDropdown";
import { SocialEventCard } from "~/src/components/social/SocialEventCard";
import { useTheme } from "~/src/components/ThemeProvider";
import NotificationBadge from "~/src/components/ui/NotificationBadge";
import { ScreenHeader } from "~/src/components/ui/screen-header";
import { Text } from "~/src/components/ui/text";
import { UserAvatar } from "~/src/components/ui/user-avatar";
import { useAuth } from "~/src/lib/auth";
import { useChat } from "~/src/lib/chat";
import { usePostRefresh } from "~/src/lib/postProvider";
import { useUser } from "~/src/lib/UserProvider";
import { socialPostService } from "~/src/services/socialPostService";

interface Post {
  id: string;
  content: string;
  media_urls: string[];
  created_at: string;
  address: string;
  city: string;
  state: string;
  like_count: number;
  comment_count: number;
  user: {
    id: string;
    username: string | null;
    avatar_url: string | null;
    first_name?: string | null;
    last_name?: string | null;
  };
  event?: any;
  isLiked?: boolean;
}

const ImageGallery = ({
  images,
  postId,
  event,
}: {
  images: string[];
  postId: string;
  event?: any;
}) => {
  const handleImagePress = () => {
    router.push({
      pathname: `/post/${postId}`,
      params: { event: event ? JSON.stringify(event) : "" },
    });
  };

  if (images.length === 0) return null;

  return (
    <View className="px-4 pb-3">
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View className="flex-row gap-2">
          {images.map((imageUrl, index) => (
            <TouchableOpacity
              key={`${postId}-image-${index}`}
              onPress={handleImagePress}
              className="overflow-hidden rounded-xl"
              style={{
                width: 120,
                height: 120,
              }}
            >
              <Image
                source={{ uri: imageUrl }}
                style={{
                  width: 120,
                  height: 120,
                  resizeMode: "cover",
                }}
              />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
};

export default function SocialFeed() {
  const { session } = useAuth();
  const { user } = useUser();
  const { refreshRequired = false } = useLocalSearchParams();
  const { theme, isDarkMode } = useTheme();
  const { sendNotification } = useNotificationsApi();
  const { client } = useChat();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isScrolled, setIsScrolled] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null);
  const { setRefreshRequired, isRefreshRequired } = usePostRefresh();
  const [shareData, setShareData] = useState<{
    data: UnifiedData;
    isEventType: boolean;
  } | null>(null);
  const [chatShareSelection, setChatShareSelection] = useState<{
    proposal: IProposal | null;
    show: boolean;
    event: UnifiedData | null;
    isEventType: boolean;
  }>({
    proposal: null,
    show: false,
    event: null,
    isEventType: false,
  });
  const [isSelectedItemLocation, setIsSelectedItemLocation] = useState(false);
  const [showUnifiedCard, setShowUnifiedCard] = useState(false);
  const [showChatSelection, setShowChatSelection] = useState(false);
  const [selectedPostForShare, setSelectedPostForShare] = useState<Post | null>(
    null
  );
  const [flagOpen, setFlagOpen] = useState({
    open: false,
    id: "",
  });
  const PAGE_SIZE = 20;

  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const { createFlag } = useFlagging();
  const isLoadingRef = useRef(false);
  const loadPostsRef = useRef<((isRefresh?: boolean) => Promise<void>) | null>(
    null
  );

  const handleFlagPost = async ({
    reason,
    explanation,
  }: {
    reason: string;
    explanation: string;
  }) => {
    console.log("🚩 [SocialFeed] Starting flag post process", {
      postId: flagOpen.id,
      reason,
      hasExplanation: !!explanation,
    });

    if (!flagOpen.id) {
      console.error("❌ [SocialFeed] No post ID provided for flagging");
      return;
    }

    if (!session?.access_token) {
      console.error("❌ [SocialFeed] No access token available for flagging");
      return;
    }

    try {
      console.log("🚩 [SocialFeed] Calling createFlag API", {
        post_id: flagOpen.id,
        reason,
      });

      const result = await createFlag({
        reason: reason as FlagReason,
        explanation: explanation.trim(),
        post_id: flagOpen.id,
      });

      console.log("✅ [SocialFeed] Flag created successfully", { result });
      if (result) {
        await loadPosts(true);
        setFlagOpen({ open: false, id: "" });
      }
      // Refresh posts after flagging
    } catch (error) {
      console.error("❌ [SocialFeed] Error flagging post:", error);
      if (error instanceof Error) {
        console.error("❌ [SocialFeed] Error message:", error.message);
        console.error("❌ [SocialFeed] Error stack:", error.stack);
      }
      // Re-throw to let FlagContentModal handle the error display
      throw error;
    }
  };

  const loadPosts = useCallback(
    async (isRefresh = false) => {
      if (isLoadingRef.current || (!hasMore && !isRefresh)) {
        return;
      }

      const currentPage = isRefresh ? 1 : page;

      if (isRefresh) {
        setPage(1);
        setHasMore(true);
        setNextCursor(null);
      }

      isLoadingRef.current = true;
      setLoading(true);

      try {
        const response = await socialPostService.fetchPosts({
          cursor: isRefresh ? undefined : nextCursor || undefined,
          page: isRefresh ? 1 : currentPage, // Fallback for backward compatibility
          limit: PAGE_SIZE,
          authToken: session?.access_token,
        });

        const postsData = response.feed_items || [];
        const transformedPosts = socialPostService.transformPostsToMobileFormat(
          postsData.filter((item) => item.type === "post") as any[]
        );

        // Update pagination cursor
        if (response.pagination?.next_cursor) {
          setNextCursor(response.pagination.next_cursor);
          setHasMore(response.pagination.has_more);
        } else {
          // Fallback to page-based pagination
          if (transformedPosts.length === 0) {
            setHasMore(false);
          } else {
            setHasMore(true);
            setPage((prev) => prev + 1);
          }
        }
        if (transformedPosts.length === 0) {
          setHasMore(false);
        } else {
          if (isRefresh) {
            setPosts(transformedPosts);
          } else {
            // Deduplicate posts by ID to prevent duplicate key errors
            setPosts((prev) => {
              const existingIds = new Set(prev.map((p) => p.id));
              const newPosts = transformedPosts.filter(
                (p) => !existingIds.has(p.id)
              );
              return [...prev, ...newPosts];
            });
          }
        }
      } catch (error) {
        console.error("Error fetching posts:", error);
        setHasMore(false);
      } finally {
        isLoadingRef.current = false;
        setLoading(false);
        setRefreshing(false);
      }
    },
    [hasMore, page, nextCursor, session?.access_token]
  );

  // Store loadPosts in ref to keep stable reference for useFocusEffect
  loadPostsRef.current = loadPosts;

  useEffect(() => {
    loadPosts(true);
  }, []); // Only run on mount

  useFocusEffect(
    useCallback(() => {
      if (isRefreshRequired && loadPostsRef.current) {
        // Set to false immediately to prevent multiple calls
        setRefreshRequired(false);
        loadPostsRef.current(true);
      }
    }, [isRefreshRequired, setRefreshRequired])
  );
  const onRefresh = () => {
    setRefreshing(true);
    setPage(1);
    setHasMore(true);
    setPosts([]);
    loadPosts(true);
  };

  const toggleLike = async (postId: string) => {
    if (!session?.user?.id || !session?.access_token) return;

    try {
      const post = posts.find((p) => p.id === postId);
      if (!post) return;

      if (post.isLiked) {
        await socialPostService.unlikePost(postId, session.access_token);
        setPosts((prevPosts) =>
          prevPosts.map((p) =>
            p.id === postId
              ? {
                  ...p,
                  like_count: Math.max(0, p.like_count - 1),
                  isLiked: false,
                }
              : p
          )
        );
      } else {
        await socialPostService.likePost(postId, session.access_token);
        setPosts((prevPosts) =>
          prevPosts.map((p) =>
            p.id === postId
              ? {
                  ...p,
                  like_count: Math.max(0, p.like_count + 1),
                  isLiked: true,
                }
              : p
          )
        );
        // Send notification when liking
        sendNotification({
          type: "like",
          userId: post.user.id,
          postId: postId,
        });
      }
    } catch (error) {
      console.error("Error toggling like:", error);
    }
  };

  const handleSharePost = (post: Post) => {
    if (!client || !session?.user?.id) {
      console.log("Cannot share: No chat client or session");
      return;
    }

    // Show chat selection modal
    setSelectedPostForShare(post);
    setShowChatSelection(true);
  };

  const handleSelectChat = async (channel: any) => {
    if (!selectedPostForShare) return;

    try {
      // Ensure channel is watched before sending
      await channel.watch();

      // Send the post as a custom message with attachment
      const message = await channel.sendMessage({
        text: "Check out this post!",
        type: "regular",
        attachments: [
          {
            type: "post_share",
            post_data: selectedPostForShare,
            post_id: selectedPostForShare.id,
            post_url: `orbit://post/${selectedPostForShare.id}`,
          },
        ],
      });

      console.log("Post shared successfully:", message);

      // Navigate to the chat
      router.push(`/(app)/(chat)/channel/${channel.id}`);
    } catch (error) {
      console.error("Error sharing post:", error);
      // You could show a toast or alert here
    } finally {
      setSelectedPostForShare(null);
    }
  };

  const renderPost = ({ item: post, index }: { item: Post; index: number }) => {
    const hasEvent = post.event;
    const hasImages = post.media_urls && post.media_urls.length > 0;
    const hasContent = post.content && post.content.trim();

    return (
      <View style={{ backgroundColor: theme.colors.card }}>
        {/* Post Header */}
        <View
          className={`flex-row items-center px-4 py-4 ${
            index === 0 ? "pt-6" : ""
          }`}
        >
          <TouchableOpacity
            onPress={() => {
              if (post.user?.id) {
                router.push({
                  pathname: `/profile/${post.user.id}`,
                  params: { from: "social" },
                });
              }
            }}
            className="flex-row flex-1 items-center"
          >
            <UserAvatar
              size={40}
              user={{
                id: post.user.id,
                name:
                  post.user.first_name && post.user.last_name
                    ? `${post.user.first_name} ${post.user.last_name}`
                    : post.user.username || "Anonymous",
                image: post.user.avatar_url,
              }}
            />
            <View className="flex-1 ml-3">
              {(post.user.first_name || post.user.last_name) && (
                <Text
                  className="text-base font-semibold"
                  style={{ color: theme.colors.text }}
                >
                  {post.user.first_name} {post.user.last_name}
                </Text>
              )}
              <Text
                className="text-sm font-medium"
                style={{ color: theme.colors.text }}
              >
                @{post.user.username || "Anonymous"}
              </Text>
              <Text
                className="text-sm"
                style={{ color: isDarkMode ? "#9CA3AF" : "#6B7280" }}
              >
                {format(new Date(post.created_at), "MMM d • h:mm a")}
              </Text>
            </View>
          </TouchableOpacity>
          <PostMenuDropdown
            postId={post.id}
            isOwner={post.user.id === session?.user.id}
            onReport={(postId) => setFlagOpen({ open: true, id: postId })}
          />
        </View>

        {/* Post Content */}
        {hasContent && (
          <TouchableOpacity
            onPress={() => {
              router.push({
                pathname: `/post/${post.id}`,
                params: { event: post.event ? JSON.stringify(post.event) : "" },
              });
            }}
            className="px-4 pb-3"
          >
            <Text
              className="text-base leading-6"
              style={{ color: theme.colors.text }}
            >
              {post.content}
            </Text>
          </TouchableOpacity>
        )}

        {/* Image Gallery */}
        {hasImages && (
          <ImageGallery
            images={post.media_urls}
            postId={post.id}
            event={post.event}
          />
        )}

        {/* Event Card */}
        {hasEvent && (
          <View className="px-4 pb-3">
            <SocialEventCard
              data={post.event}
              onDataSelect={(data) => {
                setSelectedEvent(data);
                setIsSelectedItemLocation(false);
                setShowUnifiedCard(true);
              }}
              onShowDetails={() => {
                setSelectedEvent(post.event);
                setIsSelectedItemLocation(false);
                setShowUnifiedCard(true);
              }}
              treatAsEvent={true}
            />
          </View>
        )}

        {/* Location */}
        {post.address && (
          <TouchableOpacity
            onPress={() => {
              router.push({
                pathname: `/post/${post.id}`,
                params: { event: post.event ? JSON.stringify(post.event) : "" },
              });
            }}
            className="flex-row items-center px-4 pb-3"
          >
            <MapPin size={16} color={isDarkMode ? "#9CA3AF" : "#6B7280"} />
            <Text
              className="ml-2 text-sm"
              style={{ color: isDarkMode ? "#9CA3AF" : "#6B7280" }}
            >
              {post.address}
              {post.city && `, ${post.city}`}
              {post.state && `, ${post.state}`}
            </Text>
          </TouchableOpacity>
        )}

        {/* Post Actions */}
        <View className="px-4 py-4">
          <View className="flex-row justify-between items-center">
            <View className="flex-row items-center">
              <TouchableOpacity
                onPress={() => toggleLike(post.id)}
                className="flex-row items-center mr-8"
              >
                <Heart
                  size={20}
                  color={
                    post.isLiked
                      ? "#ef4444"
                      : isDarkMode
                      ? "#9CA3AF"
                      : "#6B7280"
                  }
                  fill={post.isLiked ? "#ef4444" : "none"}
                />
                <Text
                  className="ml-2 text-sm font-medium"
                  style={{
                    color: post.isLiked
                      ? "#ef4444"
                      : isDarkMode
                      ? "#9CA3AF"
                      : "#6B7280",
                  }}
                >
                  {post.like_count > 0 ? post.like_count : "0"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  router.push({
                    pathname: `/post/${post.id}`,
                    params: {
                      event: post.event ? JSON.stringify(post.event) : "",
                    },
                  });
                }}
                className="flex-row items-center mr-8"
              >
                <MessageCircle
                  size={20}
                  color={isDarkMode ? "#9CA3AF" : "#6B7280"}
                />
                <Text
                  className="ml-2 text-sm font-medium"
                  style={{ color: isDarkMode ? "#9CA3AF" : "#6B7280" }}
                >
                  {post.comment_count > 0 ? post.comment_count : "0"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                className="flex-row items-center"
                onPress={() => handleSharePost(post)}
              >
                <Send size={20} color={isDarkMode ? "#9CA3AF" : "#6B7280"} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Divider */}
        <View
          className="mx-4 h-px"
          style={{ backgroundColor: theme.colors.border }}
        />
      </View>
    );
  };
  const handleChatSelect = async (channel: Channel) => {
    if (!channel) return;
    try {
      // Ensure channel is watched before sending
      await channel.watch();
      if (chatShareSelection.proposal) {
        const message = await channel.sendMessage({
          text: "Check out this proposal!",
          type: "regular",
          data: {
            proposal: chatShareSelection.proposal,
            type: "proposal/share",
          },
        });
        // router.push(`/(app)/(chat)/channel/${channel.id}`);
      }
      if (chatShareSelection.event) {
        const attachmentType =
          chatShareSelection.event?.source === "ticketmaster"
            ? "ticketmaster"
            : chatShareSelection.isEventType
            ? "event"
            : "location";
        const createPostShareAttachment = (
          type: "event" | "location" | "ticketmaster"
        ) => {
          switch (type) {
            case "event":
              const eventData = chatShareSelection.event;
              return {
                type: "event_share",
                event_id: eventData?.id || "",
                event_data: eventData,
              };
            case "location":
              const locationData = chatShareSelection.event;
              return {
                type: "location_share",
                location_id: locationData?.id || "",
                location_data: locationData,
              };
            case "ticketmaster":
              const ticketmasterData = chatShareSelection.event;
              return {
                type: "ticketmaster_share",
                event_id: ticketmasterData?.id || "",
                event_data: {
                  id: ticketmasterData?.id,
                  name: ticketmasterData?.name,
                  description: ticketmasterData?.description,
                  image_urls: ticketmasterData?.image_urls,
                  start_datetime: ticketmasterData?.start_datetime,
                  venue_name: ticketmasterData?.venue_name,
                  address: ticketmasterData?.address,
                  city: ticketmasterData?.city,
                  state: ticketmasterData?.state,
                  source: "ticketmaster",
                },
              };
            default:
              return null;
          }
        };
        const attachment = createPostShareAttachment(attachmentType);
        await channel.sendMessage({
          text: `Check out ${chatShareSelection.event?.name} on Orbit!`,
          type: "regular",
          // Send attachment (like web app) for cross-platform compatibility
          attachments: attachment ? [attachment] : [],
        });
      }
      // Send the post as a custom message with attachment

      // Navigate to the chat
    } catch (error) {
      console.error("Error sharing post:", error);
      // You could show a toast or alert here
    }
  };
  if (loading && posts.length === 0) {
    return (
      <SafeAreaView
        className="flex-1"
        style={{ backgroundColor: theme.colors.card }}
      >
        <StatusBar
          barStyle={isDarkMode ? "light-content" : "dark-content"}
          backgroundColor={theme.colors.card}
        />

        <ScreenHeader
          title="Social Feed"
          actions={[
            {
              icon: <Bell size={18} color="white" strokeWidth={2.5} />,
              onPress: () => {
                router.push({
                  pathname: `/(app)/(notification)`,
                  params: { from: "social" },
                });
              },
              backgroundColor: theme.colors.primary,
              badge: <NotificationBadge />,
            },
            {
              icon: (
                <Image
                  source={
                    user?.avatar_url
                      ? { uri: user.avatar_url }
                      : require("~/assets/favicon.png")
                  }
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    borderWidth: 2,
                    borderColor: theme.colors.primary,
                  }}
                />
              ),
              onPress: () => router.push("/(app)/(profile)"),
            },
          ]}
        />

        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text
            className="mt-4"
            style={{ color: isDarkMode ? "#9CA3AF" : "#6B7280" }}
          >
            Loading posts...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      className="flex-1"
      style={{ backgroundColor: theme.colors.card }}
    >
      <StatusBar
        barStyle={isDarkMode ? "light-content" : "dark-content"}
        backgroundColor={theme.colors.card}
      />

      <ScreenHeader
        title="Social Feed"
        actions={[
          {
            icon: <Bell size={18} color="white" strokeWidth={2.5} />,
            onPress: () => {
              router.push({
                pathname: `/(app)/(notification)`,
                params: { from: "social" },
              });
            },
            backgroundColor: theme.colors.primary,
            badge: <NotificationBadge />,
          },
          {
            icon: (
              <Image
                source={
                  user?.avatar_url
                    ? { uri: user.avatar_url }
                    : require("~/assets/favicon.png")
                }
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  borderWidth: 2,
                  borderColor: theme.colors.primary,
                }}
              />
            ),
            onPress: () => router.push("/(app)/(profile)"),
          },
        ]}
      />

      <FlatList
        data={posts}
        renderItem={renderPost}
        onScroll={() => setIsScrolled(true)}
        keyExtractor={(item, index) => {
          // Ensure unique keys - use index as fallback if ID is missing or duplicate
          const key = item.id || `post-${index}`;
          return key;
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#3B82F6"]}
            tintColor="#3B82F6"
          />
        }
        onEndReached={() => {
          if (hasMore && !loading && isScrolled) {
            loadPosts();
          }
        }}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          loading && hasMore ? (
            <View className="py-8">
              <ActivityIndicator size="small" color="#3B82F6" />
            </View>
          ) : null
        }
        ListEmptyComponent={
          !loading ? (
            <View className="flex-1 justify-center items-center py-20">
              <Text
                className="text-xl font-medium"
                style={{ color: theme.colors.text }}
              >
                No posts yet
              </Text>
              <Text
                className="mt-2 text-base text-center"
                style={{ color: isDarkMode ? "#9CA3AF" : "#6B7280" }}
              >
                Follow people to see their posts here
              </Text>
            </View>
          ) : null
        }
        showsVerticalScrollIndicator={false}
      />

      {/* Event Details Sheet */}
      {selectedEvent && showUnifiedCard && (
        <UnifiedDetailsSheet
          data={selectedEvent as any}
          isOpen={!!selectedEvent && showUnifiedCard}
          onClose={() => {
            setSelectedEvent(null);
            setIsSelectedItemLocation(false);
            setShowUnifiedCard(false);
          }}
          nearbyData={[]}
          onDataSelect={(data) => {
            setSelectedEvent(data as any);
            setIsSelectedItemLocation(false);
          }}
          onShare={(data, isEvent) => {
            setSelectedEvent(null);
            setShareData({ data, isEventType: isEvent });
          }}
          onShowControler={() => {}}
          isEvent={!isSelectedItemLocation}
          from="social"
        />
      )}
      {shareData && (
        <UnifiedShareSheet
          isOpen={!!shareData}
          onClose={() => setShareData(null)}
          data={shareData?.data}
          isEventType={shareData?.isEventType}
          onProposalShare={(proposal: IProposal) => {
            setShareData(null);
            setChatShareSelection({
              show: true,
              proposal: proposal || null,
              event: null,
              isEventType: false,
            });
          }}
          onEventShare={(event) => {
            setShareData(null);
            setChatShareSelection({
              show: true,
              proposal: null,
              event: event || null,
              isEventType: shareData?.isEventType,
            });
          }}
        />
      )}
      <ChatSelectionModal
        isOpen={chatShareSelection.show}
        onClose={() => {
          setChatShareSelection({
            show: false,
            proposal: null,
            event: null,
            isEventType: false,
          });
        }}
        onSelectChat={handleChatSelect}
      />
      {/* Floating Action Button */}
      <TouchableOpacity
        onPress={() => router.push("/(app)/post/create")}
        accessibilityLabel="Create new post"
        accessibilityHint="Navigate to create a new post"
        accessibilityRole="button"
        style={{
          position: "absolute",
          bottom: 120, // Above the tab bar
          right: 20,
          width: 60,
          height: 60,
          borderRadius: 40,
          backgroundColor: "#8B5CF6",
          justifyContent: "center",
          alignItems: "center",
          shadowColor: isDarkMode ? theme.colors.primary : "#000",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: isDarkMode ? 0.4 : 0.25,
          shadowRadius: 8,
          elevation: 8,
          zIndex: 1000,
        }}
      >
        <Plus size={24} color="white" strokeWidth={2.5} />
      </TouchableOpacity>

      {/* Chat Selection Modal */}
      <ChatSelectionModal
        isOpen={showChatSelection}
        onClose={() => {
          setShowChatSelection(false);
          setSelectedPostForShare(null);
        }}
        onSelectChat={handleSelectChat}
        // postId={selectedPostForShare?.id || ""}
      />
      <FlagContentModal
        visible={flagOpen.open}
        contentTitle={"Post"}
        variant="sheet"
        onClose={() => setFlagOpen({ open: false, id: "" })}
        onSubmit={handleFlagPost}
      />
    </SafeAreaView>
  );
}
