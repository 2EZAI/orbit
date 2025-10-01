import {
  Briefcase,
  Calendar,
  GraduationCap,
  Heart,
  Info,
  MapPin,
  Users,
} from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  TouchableOpacity,
  View,
} from "react-native";
import { useTheme } from "~/src/components/ThemeProvider";
import { Text } from "~/src/components/ui/text";
import { useAuth } from "~/src/lib/auth";
import { supabase } from "~/src/lib/supabase";
import { useUser } from "~/src/lib/UserProvider";
import InterestsSheet from "./IntrestsSheet";

interface ProfileInfo {
  bio?: string;
  location?: string;
  education?: string;
  occupation?: string;
  gender?: string;
  hometown?: {
    address?: string;
    city?: string;
    state?: string;
    postal_code?: string;
  };
  topics?: Array<{
    id: string;
    name: string;
    icon?: string;
  }>;
  member_since?: string;
  posts_count?: number;
  followers_count?: number;
  following_count?: number;
  events_count?: number;
}

interface UnifiedInfoTabProps {
  userId: string;
  isCurrentUser: boolean;
  onScroll?: any;
  refreshControl?: any;
}

export default function UnifiedInfoTab({
  userId,
  isCurrentUser,
  onScroll,
  refreshControl,
}: UnifiedInfoTabProps) {
  const { theme, isDarkMode } = useTheme();
  const { session } = useAuth();
  const { user: currentUser, userTopicsList } = useUser();

  const [profileInfo, setProfileInfo] = useState<ProfileInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showInterestsSheet, setShowInterestsSheet] = useState(false);
  useEffect(() => {
    loadProfileInfo();
  }, [userId]);

  const loadProfileInfo = async () => {
    setLoading(true);
    try {
      if (isCurrentUser && currentUser) {
        // Use current user data
        const currentUserProfileData = {
          bio: currentUser.bio || undefined,
          location: currentUser.location || undefined,
          education: currentUser.education || undefined,
          occupation: undefined, // Will be fetched from database if needed
          gender: currentUser.gender || undefined,
          topics: Array.isArray(userTopicsList)
            ? userTopicsList.map((topic) => ({
                id: topic,
                name: topic,
                icon: undefined,
              }))
            : [],
          member_since: currentUser.created_at,
          posts_count: 0, // Will be loaded by other components
          followers_count: 0,
          following_count: 0,
          events_count: 0,
        };

        console.log(
          "🔍 [UnifiedInfoTab] Current user topics from UserProvider:",
          userTopicsList
        );
        console.log(
          "🔍 [UnifiedInfoTab] userTopicsList type:",
          typeof userTopicsList
        );
        console.log(
          "🔍 [UnifiedInfoTab] userTopicsList is array:",
          Array.isArray(userTopicsList)
        );
        setProfileInfo(currentUserProfileData);
      } else {
        // Fetch other user's profile info
        const { data: userData, error: userError } = await supabase
          .from("users")
          .select(
            `
            id,
            bio,
            location,
            education,
            gender,
            occupation_id,
            created_at
          `
          )
          .eq("id", userId)
          .single();

        if (userError) throw userError;

        // Fetch occupation separately if user has one
        let occupationData = null;
        if (userData.occupation_id) {
          const { data: occData, error: occError } = await supabase
            .from("occupation")
            .select("name")
            .eq("id", userData.occupation_id)
            .single();

          if (!occError) {
            occupationData = occData;
          }
        }

        // Fetch user location separately (since it references auth.users, not public.users)
        const { data: userLocationData, error: locationError } = await supabase
          .from("user_locations")
          .select("address, city, state, postal_code")
          .eq("user_id", userId)
          .single();

        // Fetch user topics separately (since user_topics.user_id references auth.users, not public.users)
        const { data: userTopicsData, error: topicsError } = await supabase
          .from("user_topics")
          .select("topic")
          .eq("user_id", userId);

        // Note: locationError and topicsError are expected if user has no data

        // Get counts
        const [
          { count: postsCount },
          { count: followersCount },
          { count: followingCount },
          { count: eventsCount },
        ] = await Promise.all([
          supabase
            .from("posts")
            .select("*", { count: "exact" })
            .eq("created_by", userData.id),
          supabase
            .from("follows")
            .select("*", { count: "exact" })
            .eq("following_id", userData.id),
          supabase
            .from("follows")
            .select("*", { count: "exact" })
            .eq("follower_id", userData.id),
          supabase
            .from("event_attendees")
            .select("*", { count: "exact" })
            .eq("user_id", userData.id),
        ]);

        const profileData = {
          bio: userData.bio || undefined,
          location: userData.location || undefined,
          education: userData.education || undefined,
          occupation: occupationData?.name || undefined,
          gender: userData.gender || undefined,
          hometown: userLocationData || undefined,
          topics:
            userTopicsData
              ?.map((ut: any) => {
                console.log("🔍 [UnifiedInfoTab] Raw topic data:", ut);
                return {
                  id: ut.topic, // Use topic text as ID for now
                  name: ut.topic,
                  icon: undefined, // No icon available from current schema
                };
              })
              .filter((topic) => topic.name && topic.name.trim() !== "") || [],
          member_since: userData.created_at,
          posts_count: postsCount || 0,
          followers_count: followersCount || 0,
          following_count: followingCount || 0,
          events_count: eventsCount || 0,
        };

        setProfileInfo(profileData);
      }
    } catch (error) {
      console.error("Error loading profile info:", error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadProfileInfo();
    setRefreshing(false);
  };

  const InfoCard = ({
    icon,
    label,
    value,
    onPress,
  }: {
    icon: React.ReactNode;
    label: string;
    value?: string;
    onPress?: () => void;
  }) => {
    if (!value) return null;

    const Component = onPress ? TouchableOpacity : View;

    return (
      <Component
        onPress={onPress}
        style={{
          flexDirection: "row",
          alignItems: "center",
          padding: 16,
          backgroundColor: theme.colors.card,
          borderRadius: 12,
          marginBottom: 12,
          borderWidth: 1,
          borderColor: theme.colors.border,
        }}
      >
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: theme.colors.primary + "20",
            justifyContent: "center",
            alignItems: "center",
            marginRight: 12,
          }}
        >
          {icon}
        </View>
        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontSize: 14,
              color: theme.colors.text + "80",
              marginBottom: 2,
            }}
          >
            {label}
          </Text>
          <Text
            style={{
              fontSize: 16,
              fontWeight: "500",
              color: theme.colors.text,
            }}
          >
            {value}
          </Text>
        </View>
      </Component>
    );
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return undefined;
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
      });
    } catch {
      return undefined;
    }
  };

  const formatLocation = (hometown?: ProfileInfo["hometown"]) => {
    if (!hometown) return undefined;
    const parts = [hometown.city, hometown.state].filter(Boolean);
    return parts.join(", ") || hometown.address;
  };

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          paddingVertical: 40,
          backgroundColor: theme.colors.card,
        }}
      >
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text
          style={{
            marginTop: 16,
            color: theme.colors.text + "80",
          }}
        >
          Loading profile info...
        </Text>
      </View>
    );
  }

  // If no onScroll prop provided, render as regular view to avoid ScrollView nesting
  if (!onScroll) {
    const handleViewAllInterests = () => {
      // Handle view all interests action
      setShowInterestsSheet(true);
    };
    return (
      <View style={{ backgroundColor: theme.colors.card, paddingBottom: 20 }}>
        <View style={{ padding: 16 }}>
          {/* Bio */}
          {profileInfo?.bio && (
            <View
              style={{
                padding: 16,
                backgroundColor: theme.colors.card,
                borderRadius: 12,
                marginBottom: 16,
                borderWidth: 1,
                borderColor: theme.colors.border,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginBottom: 12,
                }}
              >
                <Info size={20} color={theme.colors.primary} />
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: "600",
                    color: theme.colors.text,
                    marginLeft: 8,
                  }}
                >
                  About
                </Text>
              </View>
              <Text
                style={{
                  fontSize: 16,
                  lineHeight: 24,
                  color: theme.colors.text,
                }}
              >
                {profileInfo.bio}
              </Text>
            </View>
          )}

          {/* Basic Info */}
          <InfoCard
            icon={<MapPin size={20} color={theme.colors.primary} />}
            label="Location"
            value={profileInfo?.location}
          />

          <InfoCard
            icon={<MapPin size={20} color={theme.colors.primary} />}
            label="Hometown"
            value={formatLocation(profileInfo?.hometown)}
          />

          <InfoCard
            icon={<Briefcase size={20} color={theme.colors.primary} />}
            label="Occupation"
            value={profileInfo?.occupation}
          />

          <InfoCard
            icon={<GraduationCap size={20} color={theme.colors.primary} />}
            label="Education"
            value={profileInfo?.education}
          />

          <InfoCard
            icon={<Heart size={20} color={theme.colors.primary} />}
            label="Gender"
            value={profileInfo?.gender}
          />

          <InfoCard
            icon={<Calendar size={20} color={theme.colors.primary} />}
            label="Member Since"
            value={formatDate(profileInfo?.member_since)}
          />

          {/* Topics/Interests */}
          {profileInfo?.topics && profileInfo.topics.length > 0 && (
            <View
              style={{
                padding: 16,
                backgroundColor: theme.colors.card,
                borderRadius: 12,
                marginBottom: 16,
                borderWidth: 1,
                borderColor: theme.colors.border,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginBottom: 12,
                }}
              >
                <Users size={20} color={theme.colors.primary} />
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: "600",
                    color: theme.colors.text,
                    marginLeft: 8,
                  }}
                >
                  Interests
                </Text>
              </View>
              <View
                style={{
                  flexDirection: "row",
                  flexWrap: "wrap",
                  gap: 8,
                }}
              >
                {profileInfo.topics
                  .filter((topic) => topic.name && topic.name.trim() !== "")
                  .slice(0, 4)
                  .map((topic, index) => (
                    <View
                      key={topic.id || `topic-${index}`}
                      style={{
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                        backgroundColor: theme.colors.primary + "20",
                        borderRadius: 16,
                        borderWidth: 1,
                        borderColor: theme.colors.primary + "40",
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 14,
                          fontWeight: "500",
                          color: theme.colors.primary,
                        }}
                      >
                        {topic.name}
                      </Text>
                    </View>
                  ))}
                {profileInfo.topics.length > 4 && (
                  <TouchableOpacity
                    onPress={handleViewAllInterests}
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      backgroundColor: theme.colors.primary + "20",
                      borderRadius: 16,
                      borderWidth: 1,
                      borderColor: theme.colors.primary + "40",
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: "500",
                        color: theme.colors.primary,
                        textDecorationLine: "underline",
                      }}
                    >
                      View All
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}
          <InterestsSheet
            isOpen={showInterestsSheet}
            onClose={() => setShowInterestsSheet(false)}
            interests={profileInfo?.topics || []}
          />
          {/* Empty State */}
          {!profileInfo?.bio &&
            !profileInfo?.location &&
            !profileInfo?.occupation &&
            !profileInfo?.education &&
            !profileInfo?.gender &&
            (!profileInfo?.topics || profileInfo.topics.length === 0) && (
              <View
                style={{
                  padding: 32,
                  backgroundColor: theme.colors.card,
                  borderRadius: 12,
                  alignItems: "center",
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                }}
              >
                <Info size={48} color={theme.colors.text + "40"} />
                <Text
                  style={{
                    fontSize: 18,
                    fontWeight: "600",
                    color: theme.colors.text,
                    marginTop: 16,
                    textAlign: "center",
                  }}
                >
                  No information available
                </Text>
                <Text
                  style={{
                    fontSize: 14,
                    color: theme.colors.text + "80",
                    marginTop: 8,
                    textAlign: "center",
                    lineHeight: 20,
                  }}
                >
                  {isCurrentUser
                    ? "Add information to your profile to let others know more about you"
                    : "This user hasn't added any profile information yet"}
                </Text>
              </View>
            )}
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.colors.card }}
      refreshControl={
        refreshControl || (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[theme.colors.primary]}
            tintColor={theme.colors.primary}
          />
        )
      }
      onScroll={onScroll}
      scrollEventThrottle={16}
      bounces={true}
      overScrollMode="always"
      showsVerticalScrollIndicator={false}
    >
      <View style={{ padding: 16 }}>
        {/* Bio */}
        {profileInfo?.bio && (
          <View
            style={{
              padding: 16,
              backgroundColor: theme.colors.card,
              borderRadius: 12,
              marginBottom: 16,
              borderWidth: 1,
              borderColor: theme.colors.border,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: 12,
              }}
            >
              <Info size={20} color={theme.colors.primary} />
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "600",
                  color: theme.colors.text,
                  marginLeft: 8,
                }}
              >
                About
              </Text>
            </View>
            <Text
              style={{
                fontSize: 16,
                lineHeight: 24,
                color: theme.colors.text,
              }}
            >
              {profileInfo.bio}
            </Text>
          </View>
        )}

        {/* Basic Info */}
        <InfoCard
          icon={<MapPin size={20} color={theme.colors.primary} />}
          label="Location"
          value={profileInfo?.location}
        />

        <InfoCard
          icon={<MapPin size={20} color={theme.colors.primary} />}
          label="Hometown"
          value={formatLocation(profileInfo?.hometown)}
        />

        <InfoCard
          icon={<Briefcase size={20} color={theme.colors.primary} />}
          label="Occupation"
          value={profileInfo?.occupation}
        />

        <InfoCard
          icon={<GraduationCap size={20} color={theme.colors.primary} />}
          label="Education"
          value={profileInfo?.education}
        />

        <InfoCard
          icon={<Heart size={20} color={theme.colors.primary} />}
          label="Gender"
          value={profileInfo?.gender}
        />

        <InfoCard
          icon={<Calendar size={20} color={theme.colors.primary} />}
          label="Member Since"
          value={formatDate(profileInfo?.member_since)}
        />

        {/* Topics/Interests */}
        {profileInfo?.topics && profileInfo.topics.length > 0 && (
          <View
            style={{
              padding: 16,
              backgroundColor: theme.colors.card,
              borderRadius: 12,
              marginBottom: 16,
              borderWidth: 1,
              borderColor: theme.colors.border,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: 12,
              }}
            >
              <Users size={20} color={theme.colors.primary} />
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "600",
                  color: theme.colors.text,
                  marginLeft: 8,
                }}
              >
                Interests
              </Text>
            </View>
            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                gap: 8,
              }}
            >
              {profileInfo.topics
                .filter((topic) => topic.name && topic.name.trim() !== "")
                .map((topic, index) => (
                  <View
                    key={topic.id || `topic-${index}`}
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      backgroundColor: theme.colors.primary + "20",
                      borderRadius: 16,
                      borderWidth: 1,
                      borderColor: theme.colors.primary + "40",
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: "500",
                        color: theme.colors.primary,
                      }}
                    >
                      {topic.name}
                    </Text>
                  </View>
                ))}
            </View>
          </View>
        )}

        {/* Empty State */}
        {!profileInfo?.bio &&
          !profileInfo?.location &&
          !profileInfo?.occupation &&
          !profileInfo?.education &&
          !profileInfo?.gender &&
          (!profileInfo?.topics || profileInfo.topics.length === 0) && (
            <View
              style={{
                padding: 32,
                backgroundColor: theme.colors.card,
                borderRadius: 12,
                alignItems: "center",
                borderWidth: 1,
                borderColor: theme.colors.border,
              }}
            >
              <Info size={48} color={theme.colors.text + "40"} />
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: "600",
                  color: theme.colors.text,
                  marginTop: 16,
                  textAlign: "center",
                }}
              >
                No information available
              </Text>
              <Text
                style={{
                  fontSize: 14,
                  color: theme.colors.text + "80",
                  marginTop: 8,
                  textAlign: "center",
                  lineHeight: 20,
                }}
              >
                {isCurrentUser
                  ? "Add information to your profile to let others know more about you"
                  : "This user hasn't added any profile information yet"}
              </Text>
            </View>
          )}

        {/* Bottom spacing */}
        <View style={{ height: 20 }} />
      </View>
    </ScrollView>
  );
}
