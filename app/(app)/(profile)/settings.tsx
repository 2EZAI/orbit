import { router, useNavigation } from "expo-router";
import {
  ArrowLeft,
  ChevronRight,
  Edit3,
  FileText,
  Heart,
  Lock,
  LogOut,
  Mail,
  MapPin,
  Shield,
  Trash2,
  User,
  ClipboardList,
  Sparkles,
  Zap,
  Calendar,
  Clock,
  Image as ImageIcon,
  ExternalLink,
} from "lucide-react-native";
import { IProposal } from "../../../hooks/useProposals";
import { ChatSelectionModal } from "~/src/components/social/ChatSelectionModal";
import type { Channel } from "stream-chat";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  TouchableOpacity,
  View,
  Linking,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "~/src/components/ThemeProvider";
import { Text } from "~/src/components/ui/text";
import { supabase } from "~/src/lib/supabase";
import { draftService } from "~/src/services/draftService";
import { EventDraft } from "~/src/types/draftTypes";
import { MotiView } from "moti";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";

// Import modal components (we'll create these next)
import { PasswordModal } from "~/src/components/settings/PasswordModal";
import { PersonalInfoModal } from "~/src/components/settings/PersonalInfoModal";
import { UsernameModal } from "~/src/components/settings/UsernameModal";

import { SafeAreaView } from "react-native-safe-area-context";
import UnifiedProposalSheet from "~/src/components/map/UnifiedProposalSheet";
import { DeleteAccountModal } from "~/src/components/settings/DeleteAccountModal";
import { EmailModal } from "~/src/components/settings/EmailModal";
import { InterestsModal } from "~/src/components/settings/InterestsModal";
import { LocationPreferencesModal } from "~/src/components/settings/LocationPreferencesModal";
import { PrivacyModal } from "~/src/components/settings/PrivacyModal";
import { SocialMediaSettings } from "~/src/components/settings/SocialMediaSettings";

interface SettingItemProps {
  icon: React.ReactNode;
  title: string;
  onPress: () => void;
  destructive?: boolean;
  loading?: boolean;
}

function SettingItem({
  icon,
  title,
  onPress,
  destructive = false,
  loading = false,
}: SettingItemProps) {
  const { theme } = useTheme();

  return (
    <TouchableOpacity
      onPress={loading ? undefined : onPress}
      disabled={loading}
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 16,
        paddingHorizontal: 20,
        backgroundColor: theme.colors.card,
        marginHorizontal: 16,
        marginBottom: 8,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: theme.colors.border,
      }}
    >
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: destructive
            ? "#FF3B30" + "20"
            : theme.colors.primary + "20",
          alignItems: "center",
          justifyContent: "center",
          marginRight: 16,
        }}
      >
        {icon}
      </View>

      <Text
        style={{
          flex: 1,
          fontSize: 16,
          fontWeight: "600",
          color: destructive ? "#FF3B30" : theme.colors.text,
        }}
      >
        {title}
      </Text>

      {loading ? (
        <ActivityIndicator
          size="small"
          color={destructive ? "#FF3B30" : theme.colors.primary}
        />
      ) : (
        <ChevronRight
          size={20}
          color={destructive ? "#FF3B30" : theme.colors.text + "60"}
        />
      )}
    </TouchableOpacity>
  );
}

interface SectionHeaderProps {
  title: string;
}

function SectionHeader({ title }: SectionHeaderProps) {
  const { theme } = useTheme();

  return (
    <Text
      style={{
        fontSize: 20,
        fontWeight: "800",
        color: theme.colors.text,
        marginHorizontal: 16,
        marginTop: 24,
        marginBottom: 12,
        lineHeight: 25,
        paddingVertical: 2,
      }}
    >
      {title}
    </Text>
  );
}

export default function SettingsScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const [chatShareSelection, setChatShareSelection] = useState<{
    proposal: IProposal | null;
    show: boolean;
  }>({
    proposal: null,
    show: false,
  });
  // Modal states
  const [showPersonalInfo, setShowPersonalInfo] = useState(false);
  const [showUsername, setShowUsername] = useState(false);
  const [showEmail, setShowEmail] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showLocationPreferences, setShowLocationPreferences] = useState(false);
  const [showInterests, setShowInterests] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showDeleteAccount, setShowDeleteAccount] = useState(false);
  const [showSocialMedia, setShowSocialMedia] = useState(false);

  // Log user ID on mount
  React.useEffect(() => {
    const getUserId = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.user?.id) {
        console.log("👤 [Settings] ===================================");
        console.log("👤 [Settings] YOUR USER ID:", session.user.id);
        console.log("👤 [Settings] ===================================");
      }
    };
    getUserId();
  }, []);

  // Drafts state
  const [drafts, setDrafts] = useState<EventDraft[]>([]);
  const [showDrafts, setShowDrafts] = useState(false);
  const [loadingDrafts, setLoadingDrafts] = useState(false);
  const [deletingDraftId, setDeletingDraftId] = useState<string | null>(null);
  const [clearingAllDrafts, setClearingAllDrafts] = useState(false);
  const [showProposals, setShowProposals] = useState(false);
  const handleBack = () => {
    router.back();
  };

  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    if (isLoggingOut) return; // Prevent multiple logout attempts

    setIsLoggingOut(true);
    try {
      console.log("Initiating logout...");

      // Clear any navigation state first to prevent navigation errors
      // router.dismissAll?.();

      // Sign out from Supabase
      await supabase.auth.signOut();
      // Reset navigation to the first screen (e.g., "/")router.back();
      // router.dismiss();
      router.back();
      // router.replace("/");
      navigation.dispatch({ type: "POP_TO_TOP" });

      console.log("Logout successful - app layout will handle redirect");
    } catch (error) {
      console.error("Error logging out:", error);
      setIsLoggingOut(false); // Reset on error
    }
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
      // Send the post as a custom message with attachment

      // Navigate to the chat
    } catch (error) {
      console.error("Error sharing post:", error);
      // You could show a toast or alert here
    }
  };
  const openWebview = (external_url: string, title: string) => {
    router.back();
    router.push({
      pathname: "/(app)/(webview)",
      params: { external_url, title },
    });
  };

  // Drafts functionality
  const loadDrafts = async () => {
    try {
      setLoadingDrafts(true);
      const userDrafts = await draftService.getDrafts();
      setDrafts(userDrafts);
    } catch (error) {
      console.error("Error loading drafts:", error);
    } finally {
      setLoadingDrafts(false);
    }
  };

  const handleDraftsPress = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    loadDrafts();
    setShowDrafts(true);
  };
  const handleProposalsPress = () => {
    setShowProposals(true);
  };
  const handleDeleteDraft = async (draftId: string, draftName: string) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      "Delete Draft",
      `Are you sure you want to delete "${
        draftName || "Untitled Activity"
      }"? This action cannot be undone.`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              setDeletingDraftId(draftId);
              await draftService.deleteDraft(draftId);
              setDrafts(drafts.filter((draft) => draft.id !== draftId));
              await Haptics.notificationAsync(
                Haptics.NotificationFeedbackType.Success
              );
            } catch (error) {
              console.error("Error deleting draft:", error);
              await Haptics.notificationAsync(
                Haptics.NotificationFeedbackType.Error
              );
              Alert.alert("Error", "Failed to delete draft. Please try again.");
            } finally {
              setDeletingDraftId(null);
            }
          },
        },
      ]
    );
  };
  const handleImportContacts = () => {
    router.back();
    router.push({
      pathname: "/(app)/contacts",
    });
  };
  const handleResumeDraft = async (draft: EventDraft) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowDrafts(false);
    // Close the settings modal after navigation
    router.back();
    // Navigate to create screen with draft data
    router.push({
      pathname: "/(app)/(create)",
      params: {
        draftId: draft.id,
        resumeDraft: "true",
        locationId: draft.location_id, // Pass the location_id so the screen knows the context
      },
    });
  };

  const handleClearAllDrafts = async () => {
    Alert.alert(
      "Clear All Drafts",
      `Are you sure you want to delete all ${drafts.length} drafts? This action cannot be undone.`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete All",
          style: "destructive",
          onPress: async () => {
            try {
              setClearingAllDrafts(true);
              for (const draft of drafts) {
                await draftService.deleteDraft(draft.id);
              }
              setDrafts([]);
            } catch (error) {
              console.error("Error clearing all drafts:", error);
              Alert.alert(
                "Error",
                "Failed to delete some drafts. Please try again."
              );
            } finally {
              setClearingAllDrafts(false);
            }
          },
        },
      ]
    );
  };

  const handleOpenLink = async (url: string) => {
    try {
      await Linking.openURL(url);
    } catch (error) {
      console.error("Error opening link:", error);
      Alert.alert("Error", "Unable to open link. Please try again.");
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.card }}>
      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 16,
          paddingVertical: 12,
          borderBottomWidth: 1,
          borderBottomColor: theme.colors.border,
        }}
      >
        <TouchableOpacity
          onPress={handleBack}
          style={{
            padding: 8,
            borderRadius: 20,
            backgroundColor: theme.colors.card,
            marginRight: 16,
          }}
        >
          <ArrowLeft size={20} color={theme.colors.text} />
        </TouchableOpacity>

        <Text
          style={{
            fontSize: 24,
            fontWeight: "800",
            color: theme.colors.text,
            flex: 1,
            textAlign: "center",
            marginRight: 44, // Compensate for back button
            lineHeight: 30,
            paddingVertical: 4,
          }}
        >
          Settings
        </Text>
      </View>

      <ScrollView
        style={{ flex: 1, marginBottom: Platform.OS === "android" ? 90 : 0 }}
        showsVerticalScrollIndicator={false}
        // iOS page-sheet modals add large automatic bottom insets for scroll views.
        // Disable that and pad manually using the device safe-area bottom inset.
        contentInsetAdjustmentBehavior="never"
        contentInset={{ bottom: 0, top: 0, left: 0, right: 0 }}
        scrollIndicatorInsets={{ bottom: 0, top: 0, left: 0, right: 0 }}
        contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
      >
        {/* Profile Settings */}
        <SectionHeader title="Profile Settings" />
        <SettingItem
          icon={<User size={20} color={theme.colors.primary} />}
          title="Update Personal Information"
          onPress={() => setShowPersonalInfo(true)}
        />
        <SettingItem
          icon={<Edit3 size={20} color={theme.colors.primary} />}
          title="Update User Name"
          onPress={() => setShowUsername(true)}
        />
        <SettingItem
          icon={<Mail size={20} color={theme.colors.primary} />}
          title="Update Email"
          onPress={() => setShowEmail(true)}
        />
        <SettingItem
          icon={<ExternalLink size={20} color={theme.colors.primary} />}
          title="Social Media Links"
          onPress={() => setShowSocialMedia(true)}
        />
        <SettingItem
          icon={<Lock size={20} color={theme.colors.primary} />}
          title="Update Password"
          onPress={() => setShowPassword(true)}
        />
        {/* Event & Maps Settings */}
        <SectionHeader title="Event & Maps Settings" />
        <SettingItem
          icon={<MapPin size={20} color={theme.colors.primary} />}
          title="Location Preferences"
          onPress={() => setShowLocationPreferences(true)}
        />

        <SettingItem
          icon={<Heart size={20} color={theme.colors.primary} />}
          title="Update Interests"
          onPress={() => setShowInterests(true)}
        />
        <SettingItem
          icon={<Shield size={20} color={theme.colors.primary} />}
          title="Map & Location Privacy"
          onPress={() => setShowPrivacy(true)}
        />

        {/* Drafts Section */}
        <SectionHeader title="Activity Drafts" />
        <SettingItem
          icon={<FileText size={20} color={theme.colors.primary} />}
          title="My Drafts"
          onPress={handleDraftsPress}
          loading={loadingDrafts}
        />
        <SectionHeader title="Proposals" />
        <SettingItem
          icon={<ClipboardList size={20} color={theme.colors.primary} />}
          title="Proposals"
          onPress={handleProposalsPress}
        />
        {/* Privacy & more */}
        <SectionHeader title="Privacy & more" />
        <SettingItem
          icon={<FileText size={20} color={theme.colors.primary} />}
          title="Import Contacts"
          onPress={handleImportContacts}
        />
        <SettingItem
          icon={<ExternalLink size={20} color={theme.colors.primary} />}
          title="Terms & Conditions"
          onPress={() =>
            handleOpenLink(
              "https://orbit-app.framer.website/policies/terms-and-conditions"
            )
          }
        />
        <SettingItem
          icon={<ExternalLink size={20} color={theme.colors.primary} />}
          title="Privacy Policy"
          onPress={() =>
            handleOpenLink(
              "https://orbit-app.framer.website/policies/privacy-and-policy"
            )
          }
        />

        <SettingItem
          icon={<LogOut size={20} color={theme.colors.primary} />}
          title="Log Out"
          onPress={handleLogout}
          loading={isLoggingOut}
        />
        <SettingItem
          icon={<Trash2 size={20} color="#FF3B30" />}
          title="Delete My Account"
          onPress={() => setShowDeleteAccount(true)}
          destructive
        />
      </ScrollView>

      {/* Modals */}
      <PersonalInfoModal
        isOpen={showPersonalInfo}
        onClose={() => setShowPersonalInfo(false)}
      />

      <UsernameModal
        isOpen={showUsername}
        onClose={() => setShowUsername(false)}
      />

      <EmailModal isOpen={showEmail} onClose={() => setShowEmail(false)} />

      <PasswordModal
        isOpen={showPassword}
        onClose={() => setShowPassword(false)}
      />

      <LocationPreferencesModal
        isOpen={showLocationPreferences}
        onClose={() => setShowLocationPreferences(false)}
      />

      <InterestsModal
        isOpen={showInterests}
        onClose={() => setShowInterests(false)}
      />

      <PrivacyModal
        isOpen={showPrivacy}
        onClose={() => setShowPrivacy(false)}
      />

      <DeleteAccountModal
        isOpen={showDeleteAccount}
        onClose={() => setShowDeleteAccount(false)}
      />

      {/* Premium Drafts Modal */}
      {showDrafts && (
        <MotiView
          from={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ type: "timing", duration: 200 }}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 1000,
          }}
        >
          <BlurView
            intensity={20}
            style={{
              flex: 1,
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <MotiView
              from={{ opacity: 0, scale: 0.9, translateY: 50 }}
              animate={{ opacity: 1, scale: 1, translateY: 0 }}
              transition={{
                type: "spring",
                damping: 20,
                stiffness: 300,
              }}
              style={{
                backgroundColor: theme.colors.card,
                borderRadius: 24,
                padding: 24,
                margin: 20,
                marginTop: 40, // Add more top margin to prevent cutoff
                maxHeight: "80%", // Reduce height slightly to ensure it fits
                width: "90%",
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 20 },
                shadowOpacity: 0.3,
                shadowRadius: 30,
                elevation: 20,
              }}
            >
              {/* Premium Header */}
              <MotiView
                from={{ opacity: 0, translateY: -20 }}
                animate={{ opacity: 1, translateY: 0 }}
                transition={{
                  type: "spring",
                  damping: 15,
                  stiffness: 300,
                  delay: 100,
                }}
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 24,
                  paddingTop: 8, // Add some top padding to the header
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    flex: 1,
                  }}
                >
                  <LinearGradient
                    colors={["#8B5CF6", "#A855F7"]}
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 20,
                      justifyContent: "center",
                      alignItems: "center",
                      marginRight: 12,
                    }}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <FileText size={20} color="white" />
                  </LinearGradient>
                  <View>
                    <Text
                      style={{
                        fontSize: 24,
                        fontWeight: "700",
                        color: theme.colors.text,
                        letterSpacing: -0.5,
                        paddingTop: 20,
                      }}
                    >
                      My Drafts
                    </Text>
                    <Text
                      style={{
                        fontSize: 14,
                        color: theme.colors.text + "60",
                        marginTop: 2,
                      }}
                    >
                      {drafts.length} {drafts.length === 1 ? "draft" : "drafts"}
                    </Text>
                  </View>
                </View>

                <View
                  style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
                >
                  {drafts.length > 0 && (
                    <MotiView
                      from={{ scale: 0, rotate: "180deg" }}
                      animate={{ scale: 1, rotate: "0deg" }}
                      transition={{
                        type: "spring",
                        damping: 15,
                        stiffness: 300,
                        delay: 200,
                      }}
                    >
                      <TouchableOpacity
                        onPress={handleClearAllDrafts}
                        disabled={clearingAllDrafts}
                        style={{
                          paddingHorizontal: 12,
                          paddingVertical: 8,
                          borderRadius: 16,
                          backgroundColor: clearingAllDrafts
                            ? "#9CA3AF"
                            : "#EF4444",
                          opacity: clearingAllDrafts ? 0.7 : 1,
                        }}
                      >
                        {clearingAllDrafts ? (
                          <ActivityIndicator size={12} color="white" />
                        ) : (
                          <Text
                            style={{
                              color: "white",
                              fontSize: 12,
                              fontWeight: "600",
                            }}
                          >
                            Clear All
                          </Text>
                        )}
                      </TouchableOpacity>
                    </MotiView>
                  )}

                  <MotiView
                    from={{ scale: 0, rotate: "180deg" }}
                    animate={{ scale: 1, rotate: "0deg" }}
                    transition={{
                      type: "spring",
                      damping: 15,
                      stiffness: 300,
                      delay: 300,
                    }}
                  >
                    <TouchableOpacity
                      onPress={async () => {
                        await Haptics.impactAsync(
                          Haptics.ImpactFeedbackStyle.Light
                        );
                        setShowDrafts(false);
                      }}
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 18,
                        backgroundColor: theme.colors.border,
                        justifyContent: "center",
                        alignItems: "center",
                      }}
                    >
                      <Text
                        style={{
                          color: theme.colors.text,
                          fontSize: 16,
                          fontWeight: "600",
                        }}
                      >
                        ✕
                      </Text>
                    </TouchableOpacity>
                  </MotiView>
                </View>
              </MotiView>

              {/* Content Area */}
              {loadingDrafts ? (
                <MotiView
                  from={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{
                    type: "spring",
                    damping: 15,
                    stiffness: 300,
                    delay: 400,
                  }}
                  style={{ alignItems: "center", padding: 40 }}
                >
                  <ActivityIndicator
                    size="large"
                    color={theme.colors.primary}
                  />
                  <Text
                    style={{
                      marginTop: 16,
                      color: theme.colors.text,
                      fontSize: 16,
                      fontWeight: "500",
                    }}
                  >
                    Loading drafts...
                  </Text>
                </MotiView>
              ) : drafts.length === 0 ? (
                <MotiView
                  from={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{
                    type: "spring",
                    damping: 15,
                    stiffness: 300,
                    delay: 400,
                  }}
                  style={{ alignItems: "center", padding: 40 }}
                >
                  <LinearGradient
                    colors={[
                      "rgba(139, 92, 246, 0.1)",
                      "rgba(168, 85, 247, 0.05)",
                    ]}
                    style={{
                      padding: 32,
                      borderRadius: 20,
                      alignItems: "center",
                      width: "100%",
                    }}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Sparkles size={48} color={theme.colors.primary} />
                    <Text
                      style={{
                        color: theme.colors.text,
                        textAlign: "center",
                        fontSize: 18,
                        fontWeight: "600",
                        marginTop: 16,
                        marginBottom: 8,
                      }}
                    >
                      No Drafts Yet
                    </Text>
                    <Text
                      style={{
                        color: theme.colors.text + "60",
                        textAlign: "center",
                        fontSize: 14,
                        lineHeight: 20,
                      }}
                    >
                      Start creating an activity to see your drafts here
                    </Text>
                  </LinearGradient>
                </MotiView>
              ) : (
                <ScrollView
                  style={{ maxHeight: 400 }}
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={{ paddingBottom: 8 }}
                >
                  {drafts.map((draft, index) => (
                    <MotiView
                      key={draft.id}
                      from={{ opacity: 0, translateY: 30, scale: 0.9 }}
                      animate={{ opacity: 1, translateY: 0, scale: 1 }}
                      transition={{
                        type: "spring",
                        damping: 15,
                        stiffness: 300,
                        delay: 400 + index * 100,
                      }}
                      style={{ marginBottom: 16 }}
                    >
                      <View
                        style={{
                          backgroundColor: theme.colors.background,
                          borderRadius: 20,
                          padding: 20,
                          borderWidth: 1,
                          borderColor: theme.colors.border,
                          shadowColor: "#000",
                          shadowOffset: { width: 0, height: 4 },
                          shadowOpacity: 0.1,
                          shadowRadius: 12,
                          elevation: 4,
                        }}
                      >
                        {/* Header */}
                        <View
                          style={{
                            flexDirection: "row",
                            justifyContent: "space-between",
                            alignItems: "flex-start",
                            marginBottom: 12,
                          }}
                        >
                          <View style={{ flex: 1, marginRight: 12 }}>
                            <Text
                              style={{
                                fontSize: 18,
                                fontWeight: "700",
                                color: theme.colors.text,
                                lineHeight: 24,
                                marginBottom: 4,
                              }}
                              numberOfLines={2}
                            >
                              {draft.name || "Untitled Activity"}
                            </Text>
                            {draft.description && (
                              <Text
                                style={{
                                  fontSize: 14,
                                  color: theme.colors.text + "70",
                                  lineHeight: 20,
                                }}
                                numberOfLines={2}
                              >
                                {draft.description}
                              </Text>
                            )}
                          </View>

                          <TouchableOpacity
                            onPress={() =>
                              handleDeleteDraft(draft.id, draft.name)
                            }
                            disabled={deletingDraftId === draft.id}
                            style={{
                              width: 32,
                              height: 32,
                              borderRadius: 16,
                              backgroundColor: "rgba(239, 68, 68, 0.1)",
                              justifyContent: "center",
                              alignItems: "center",
                              opacity: deletingDraftId === draft.id ? 0.5 : 1,
                            }}
                          >
                            {deletingDraftId === draft.id ? (
                              <ActivityIndicator size={16} color="#EF4444" />
                            ) : (
                              <Trash2 size={16} color="#EF4444" />
                            )}
                          </TouchableOpacity>
                        </View>

                        {/* Metadata */}
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            marginBottom: 16,
                            gap: 16,
                          }}
                        >
                          <View
                            style={{
                              flexDirection: "row",
                              alignItems: "center",
                              gap: 4,
                            }}
                          >
                            <Calendar
                              size={14}
                              color={theme.colors.text + "60"}
                            />
                            <Text
                              style={{
                                fontSize: 12,
                                color: theme.colors.text + "60",
                                fontWeight: "500",
                              }}
                            >
                              {draft.start_datetime
                                ? new Date(
                                    draft.start_datetime
                                  ).toLocaleDateString()
                                : "No date"}
                            </Text>
                          </View>
                          <View
                            style={{
                              flexDirection: "row",
                              alignItems: "center",
                              gap: 4,
                            }}
                          >
                            <Clock size={14} color={theme.colors.text + "60"} />
                            <Text
                              style={{
                                fontSize: 12,
                                color: theme.colors.text + "60",
                                fontWeight: "500",
                              }}
                            >
                              {new Date(draft.updated_at).toLocaleDateString()}
                            </Text>
                          </View>
                        </View>

                        {/* Resume Button */}
                        <TouchableOpacity
                          onPress={() => handleResumeDraft(draft)}
                          style={{
                            borderRadius: 12,
                            overflow: "hidden",
                            alignSelf: "flex-start",
                          }}
                        >
                          <LinearGradient
                            colors={["#8B5CF6", "#A855F7"]}
                            style={{
                              paddingHorizontal: 20,
                              paddingVertical: 12,
                              flexDirection: "row",
                              alignItems: "center",
                              gap: 8,
                            }}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                          >
                            <Zap size={16} color="white" />
                            <Text
                              style={{
                                color: "white",
                                fontWeight: "700",
                                fontSize: 14,
                              }}
                            >
                              Resume Draft
                            </Text>
                          </LinearGradient>
                        </TouchableOpacity>
                      </View>
                    </MotiView>
                  ))}
                </ScrollView>
              )}
            </MotiView>
          </BlurView>
        </MotiView>
      )}
      <UnifiedProposalSheet
        show={showProposals}
        onClose={() => setShowProposals(false)}
        onProposalShare={(proposal: IProposal) => {
          setShowProposals(false);
          setTimeout(() => {
            setChatShareSelection({
              show: true,
              proposal: proposal || null,
            });
          }, 1500);
        }}
      />
      <ChatSelectionModal
        isOpen={chatShareSelection.show}
        onClose={() => {
          setChatShareSelection({ show: false, proposal: null });
        }}
        onSelectChat={handleChatSelect}
      />

      {/* Social Media Settings Modal */}
      <SocialMediaSettings
        isOpen={showSocialMedia}
        onClose={() => setShowSocialMedia(false)}
      />
    </SafeAreaView>
  );
}
