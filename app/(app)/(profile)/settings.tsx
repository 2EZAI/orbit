import React, { useState } from "react";
import {
  View,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { Text } from "~/src/components/ui/text";
import { supabase } from "~/src/lib/supabase";
import { useTheme } from "~/src/components/ThemeProvider";
import {
  ArrowLeft,
  ChevronRight,
  User,
  Edit3,
  Mail,
  Lock,
  MapPin,
  Heart,
  Map,
  Shield,
  Trash2,
  FileText,
  LogOut,
} from "lucide-react-native";

// Import modal components (we'll create these next)
import { PersonalInfoModal } from "~/src/components/settings/PersonalInfoModal";
import { UsernameModal } from "~/src/components/settings/UsernameModal";
import { PasswordModal } from "~/src/components/settings/PasswordModal";

import { DeleteAccountModal } from "~/src/components/settings/DeleteAccountModal";
import { EmailModal } from "~/src/components/settings/EmailModal";
import { LocationPreferencesModal } from "~/src/components/settings/LocationPreferencesModal";
import { InterestsModal } from "~/src/components/settings/InterestsModal";
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

  // Modal states
  const [showPersonalInfo, setShowPersonalInfo] = useState(false);
  const [showUsername, setShowUsername] = useState(false);
  const [showEmail, setShowEmail] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showLocationPreferences, setShowLocationPreferences] = useState(false);
  const [showInterests, setShowInterests] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showDeleteAccount, setShowDeleteAccount] = useState(false);

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
      router.dismissAll?.();

      // Sign out from Supabase
      await supabase.auth.signOut();
      console.log("Logout successful - app layout will handle redirect");
    } catch (error) {
      console.error("Error logging out:", error);
      setIsLoggingOut(false); // Reset on error
    }
  };

  const openWebview = (url: string, title: string) => {
    router.push({
      pathname: "/(app)/(webview)",
      params: { url, title },
    });
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

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
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
        {/* Bottom spacing */}
        <View style={{ height: 40 }} />
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
    </SafeAreaView>
  );
}
