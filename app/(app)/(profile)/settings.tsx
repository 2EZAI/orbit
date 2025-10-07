import { router } from "expo-router";
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
} from "lucide-react-native";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "~/src/components/ThemeProvider";
import { Text } from "~/src/components/ui/text";
import { supabase } from "~/src/lib/supabase";
import { draftService } from "~/src/services/draftService";
import { EventDraft } from "~/src/types/draftTypes";

// Import modal components (we'll create these next)
import { PasswordModal } from "~/src/components/settings/PasswordModal";
import { PersonalInfoModal } from "~/src/components/settings/PersonalInfoModal";
import { UsernameModal } from "~/src/components/settings/UsernameModal";

import { SafeAreaView } from "react-native-safe-area-context";
import { DeleteAccountModal } from "~/src/components/settings/DeleteAccountModal";
import { EmailModal } from "~/src/components/settings/EmailModal";
import { InterestsModal } from "~/src/components/settings/InterestsModal";
import { LocationPreferencesModal } from "~/src/components/settings/LocationPreferencesModal";
import { PrivacyModal } from "~/src/components/settings/PrivacyModal";

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

  // Modal states
  const [showPersonalInfo, setShowPersonalInfo] = useState(false);
  const [showUsername, setShowUsername] = useState(false);
  const [showEmail, setShowEmail] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showLocationPreferences, setShowLocationPreferences] = useState(false);
  const [showInterests, setShowInterests] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showDeleteAccount, setShowDeleteAccount] = useState(false);

  // Drafts state
  const [drafts, setDrafts] = useState<EventDraft[]>([]);
  const [showDrafts, setShowDrafts] = useState(false);
  const [loadingDrafts, setLoadingDrafts] = useState(false);
  const [deletingDraftId, setDeletingDraftId] = useState<string | null>(null);
  const [clearingAllDrafts, setClearingAllDrafts] = useState(false);

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
      router.replace("/(app)/(map)");

      console.log("Logout successful - app layout will handle redirect");
    } catch (error) {
      console.error("Error logging out:", error);
      setIsLoggingOut(false); // Reset on error
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

  const handleDraftsPress = () => {
    loadDrafts();
    setShowDrafts(true);
  };

  const handleDeleteDraft = async (draftId: string, draftName: string) => {
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
            } catch (error) {
              console.error("Error deleting draft:", error);
              Alert.alert("Error", "Failed to delete draft. Please try again.");
            } finally {
              setDeletingDraftId(null);
            }
          },
        },
      ]
    );
  };

  const handleResumeDraft = (draft: EventDraft) => {
    setShowDrafts(false);
    // Navigate to create screen with draft data
    router.push({
      pathname: "/(app)/(create)",
      params: {
        draftId: draft.id,
        resumeDraft: "true",
        locationId: draft.location_id, // Pass the location_id so the screen knows the context
      },
    });
    // Close the settings modal after navigation
    router.back();
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

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
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
        {/* Privacy & more */}
        <SectionHeader title="Privacy & more" />
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
        <SettingItem
          icon={<FileText size={20} color={theme.colors.primary} />}
          title="Terms & Conditions"
          onPress={() =>
            openWebview("https://yourapp.com/terms", "Terms & Conditions")
          }
        />
        <SettingItem
          icon={<FileText size={20} color={theme.colors.primary} />}
          title="Privacy Policy"
          onPress={() =>
            openWebview("https://yourapp.com/privacy", "Privacy Policy")
          }
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

      {/* Drafts Modal */}
      {showDrafts && (
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1000,
          }}
        >
          <View
            style={{
              backgroundColor: theme.colors.card,
              borderRadius: 20,
              padding: 20,
              margin: 20,
              maxHeight: "80%",
              width: "90%",
            }}
          >
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 20,
              }}
            >
              <Text
                style={{
                  fontSize: 20,
                  fontWeight: "bold",
                  color: theme.colors.text,
                }}
              >
                My Drafts ({drafts.length})
              </Text>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                {drafts.length > 0 && (
                  <TouchableOpacity
                    onPress={handleClearAllDrafts}
                    disabled={clearingAllDrafts}
                    style={{
                      padding: 8,
                      borderRadius: 16,
                      backgroundColor: clearingAllDrafts
                        ? "#9CA3AF"
                        : "#EF4444",
                      marginRight: 8,
                      opacity: clearingAllDrafts ? 0.7 : 1,
                    }}
                  >
                    {clearingAllDrafts ? (
                      <ActivityIndicator size={12} color="white" />
                    ) : (
                      <Text style={{ color: "white", fontSize: 12 }}>
                        Clear All
                      </Text>
                    )}
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  onPress={() => setShowDrafts(false)}
                  style={{
                    padding: 8,
                    borderRadius: 16,
                    backgroundColor: theme.colors.border,
                  }}
                >
                  <Text style={{ color: theme.colors.text }}>✕</Text>
                </TouchableOpacity>
              </View>
            </View>

            {loadingDrafts ? (
              <View style={{ alignItems: "center", padding: 20 }}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
                <Text style={{ marginTop: 10, color: theme.colors.text }}>
                  Loading drafts...
                </Text>
              </View>
            ) : drafts.length === 0 ? (
              <View style={{ alignItems: "center", padding: 20 }}>
                <Text style={{ color: theme.colors.text, textAlign: "center" }}>
                  No drafts found. Start creating an activity to see your drafts
                  here.
                </Text>
              </View>
            ) : (
              <ScrollView style={{ maxHeight: 400 }}>
                {drafts.map((draft) => (
                  <View
                    key={draft.id}
                    style={{
                      backgroundColor: theme.colors.background,
                      borderRadius: 12,
                      padding: 16,
                      marginBottom: 12,
                      borderWidth: 1,
                      borderColor: theme.colors.border,
                    }}
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        marginBottom: 8,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 16,
                          fontWeight: "600",
                          color: theme.colors.text,
                          flex: 1,
                        }}
                        numberOfLines={2}
                      >
                        {draft.name || "Untitled Activity"}
                      </Text>
                      <TouchableOpacity
                        onPress={() => handleDeleteDraft(draft.id, draft.name)}
                        disabled={deletingDraftId === draft.id}
                        style={{
                          padding: 4,
                          marginLeft: 8,
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

                    {draft.description && (
                      <Text
                        style={{
                          fontSize: 14,
                          color: theme.colors.text,
                          opacity: 0.7,
                          marginBottom: 8,
                        }}
                        numberOfLines={2}
                      >
                        {draft.description}
                      </Text>
                    )}

                    <Text
                      style={{
                        fontSize: 12,
                        color: theme.colors.text,
                        opacity: 0.5,
                        marginBottom: 12,
                      }}
                    >
                      Last updated:{" "}
                      {new Date(draft.updated_at).toLocaleDateString()}
                    </Text>

                    <TouchableOpacity
                      onPress={() => handleResumeDraft(draft)}
                      style={{
                        backgroundColor: theme.colors.primary,
                        paddingHorizontal: 16,
                        paddingVertical: 8,
                        borderRadius: 8,
                        alignSelf: "flex-start",
                      }}
                    >
                      <Text style={{ color: "white", fontWeight: "600" }}>
                        Resume Draft
                      </Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}
