import { useState, useEffect } from "react";
import {
  View,
  ActivityIndicator,
  TouchableOpacity,
  StatusBar,
  Dimensions,
  Image,
  Platform,
  ScrollView,
  KeyboardAvoidingView,
} from "react-native";
import { router } from "expo-router";
import { supabase } from "~/src/lib/supabase";
import { Text } from "~/src/components/ui/text";
import { Input } from "~/src/components/ui/input";
import { KeyboardAwareInput } from "~/src/components/ui/keyboard-aware-input";
import { useUser } from "~/src/lib/UserProvider";
import { Check, X, Camera, Mail, Phone, User } from "lucide-react-native";
import { useDebouncedCallback } from "~/src/hooks/useDebounce";
import Toast from "react-native-toast-message";
import { useAuth } from "~/src/lib/auth";
import { useChat } from "~/src/lib/chat";
import { useTheme } from "~/src/components/ThemeProvider";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useKeyboardAware } from "~/src/hooks/useKeyboardAware";
import { ImagePickerService } from "~/src/lib/imagePicker";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system";

const { width, height } = Dimensions.get("window");

// Function to convert base64 to Uint8Array for Supabase storage
function decode(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export default function UsernameScreen() {
  const senderId = "00ec5a71-8807-4ef7-809e-2ffe45682ef2";
  const { client } = useChat();
  const { user, updateUser, refreshUser } = useUser();
  const { session } = useAuth();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { keyboardState, scrollViewRef, scrollToInput, ScrollToInputContext } =
    useKeyboardAware();

  // Form state
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");

  // Validation state
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showValidationErrors, setShowValidationErrors] = useState(false);

  useEffect(() => {
    // Only check user on initial load, not on every user state change
    // to avoid interfering with the completion flow
    checkUser();
    if (session?.user?.email) {
      setEmail(session.user.email);
    }
  }, [session]); // Remove 'user' dependency to prevent interference

  const checkUser = async () => {
    // Only redirect if user already has username on initial load
    if (user?.username != null && !isSubmitting) {
      console.log("User already has username, redirecting to topics");
      router.replace("/(auth)/(onboarding)/topics");
    }
  };

  const checkUsername = useDebouncedCallback(async (value: string) => {
    if (!value) {
      setIsAvailable(null);
      setError(null);
      return;
    }

    // Validate username format
    if (!/^[a-zA-Z0-9_]+$/.test(value)) {
      setError("Username can only contain letters, numbers, and underscores");
      setIsAvailable(false);
      return;
    }

    setIsChecking(true);
    try {
      const { data, error } = await supabase.rpc("check_username_available", {
        username_to_check: value,
      });

      if (error) throw error;
      setIsAvailable(data);
      setError(null);
    } catch (err) {
      console.error("Error checking username:", err);
      setError("Error checking username availability");
      setIsAvailable(false);
    } finally {
      setIsChecking(false);
    }
  }, 500);

  const handleUsernameChange = (value: string) => {
    setUsername(value);
    if (value) {
      checkUsername(value);
    } else {
      setIsAvailable(null);
      setError(null);
    }
  };

  async function pickImage() {
    try {
      const results = await ImagePickerService.pickImage({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
      });

      if (results.length > 0) {
        setProfileImage(results[0].uri);
        // Clear validation errors when image is selected
        if (showValidationErrors) {
          setShowValidationErrors(false);
        }
      }
    } catch (error) {
      console.error("Error picking image:", error);
      Alert.alert("Error", "Failed to pick image. Please try again.");
    }
  }

  async function uploadProfilePicture(userId: string, uri: string) {
    try {
      const fileExt = uri.split(".").pop();
      const fileName = `${userId}/profile.${fileExt}`;
      const filePath = `${FileSystem.documentDirectory}profile.${fileExt}`;

      var base64 = "";
      if (Platform.OS === "ios") {
        await FileSystem.downloadAsync(uri, filePath);
        base64 = await FileSystem.readAsStringAsync(filePath, {
          encoding: FileSystem.EncodingType.Base64,
        });
      } else {
        const fileUri = `${FileSystem.documentDirectory}profile.${fileExt}`;
        await FileSystem.copyAsync({ from: uri, to: fileUri });
        base64 = await FileSystem.readAsStringAsync(fileUri, {
          encoding: FileSystem.EncodingType.Base64,
        });
      }

      const { data, error } = await supabase.storage
        .from("profile-pictures")
        .upload(fileName, decode(base64), {
          contentType: `image/${fileExt}`,
          upsert: true,
        });

      if (error) throw error;

      const {
        data: { publicUrl },
      } = supabase.storage.from("profile-pictures").getPublicUrl(fileName);

      return publicUrl;
    } catch (error) {
      console.error("Error uploading profile picture:", error);
      throw error;
    }
  }

  const createChat = async () => {
    console.log("Starting createChat function", client);

    if (!client?.userID) {
      console.log("Prerequisites not met, returning early - no client userID");
      throw new Error("Chat client not ready");
    }

    try {
      const memberIds = [senderId, client.userID];
      const timestamp = Date.now();
      const randomStr = Math.random().toString(36).substring(7);
      const uniqueChannelId = `${timestamp}-${randomStr}`;

      console.log("Creating Stream channel...");
      const channel = client.channel("messaging", uniqueChannelId, {
        members: memberIds,
        name: "Orbit Social App",
      });

      await channel.watch();
      console.log("Stream channel created successfully");

      console.log("Creating chat channel in Supabase...");
      const { data: chatChannel, error: channelError } = await supabase
        .from("chat_channels")
        .insert({
          stream_channel_id: channel.id,
          channel_type: "messaging",
          created_by: client.userID,
          name: "signup",
        })
        .select()
        .single();

      if (channelError) {
        console.error("Error creating chat channel:", channelError);
        throw channelError;
      }
      console.log("Chat channel created in Supabase");

      console.log("Creating member records...");
      const { error: ownMemberError } = await supabase
        .from("chat_channel_members")
        .insert({
          channel_id: chatChannel.id,
          user_id: client.userID,
          role: "super_admin",
        });

      if (ownMemberError) {
        console.error("Error creating own member record:", ownMemberError);
        throw ownMemberError;
      }

      const otherMembers = memberIds.filter((id) => id !== client.userID);
      for (const memberId of otherMembers) {
        const { error: memberError } = await supabase
          .from("chat_channel_members")
          .insert({
            channel_id: chatChannel.id,
            user_id: memberId,
            role: "super_member",
          });

        if (memberError) {
          console.error("Error creating member record:", memberError);
          throw memberError;
        }
      }
      console.log("All member records created");

      console.log("Fetching user data for welcome message...");
      const { data: userData, error: fetchError } = await supabase
        .from("users")
        .select("*")
        .eq("id", session?.user?.id)
        .single();

      if (fetchError) {
        console.error("Error fetching user data:", fetchError);
        throw fetchError;
      }

      let welcomeMessage = `👋 Hey ${userData?.first_name} ${userData?.last_name}, welcome to Orbit Social App! We're excited to have you.
This platform helps you discover and join amazing events near you. Let's get started!`;

      console.log("Sending welcome message...");
      await channel.sendMessage({
        text: welcomeMessage,
      });
      console.log("Welcome message sent");

      console.log("Manually refreshing user data before redirect...");
      await refreshUser();
      console.log("User data refreshed, current user:", !!user);

      console.log("Redirecting to topics page...");
      console.log(
        "About to call router.replace with: /(auth)/(onboarding)/topics"
      );
      const redirectResult = router.replace(
        "/(auth)/(onboarding)/topics?from=onboarding"
      );
      console.log("Router.replace called, result:", redirectResult);
      console.log("Redirect to topics should be complete");
    } catch (error: any) {
      console.error("Error in chat creation:", error);
      // Don't show alert, just throw the error to be handled by handleContinue
      throw error;
    }
  };

  const handleContinue = async () => {
    if (!user || !username || !isAvailable || isSubmitting) return;

    if ( !firstName || !lastName) {
      setShowValidationErrors(true);
      setError(
        "Please fill in all required fields"
      );
      // Toast.show({
      //   type: "error",
      //   text1: "Missing Required Fields",
      //   text2: "Please complete all required fields before continuing",
      // });
      return;
    }

    setIsSubmitting(true);
    try {
      console.log("Starting profile completion...");
      let profileUrl = "";

      // Upload profile picture if provided
      if (profileImage && session?.user?.id) {
        console.log("Uploading profile picture...");
        profileUrl = await uploadProfilePicture(session.user.id, profileImage);
        console.log("Profile picture uploaded:", profileUrl);
      }

      // Update user with all profile data
      console.log("Updating user profile...");
      await updateUser({
        username,
        first_name: firstName,
        last_name: lastName,
        phone: phone || null,
        avatar_url: profileUrl,
      });
      console.log("User profile updated successfully");

      // Wait a moment for user state to propagate
      console.log("Waiting for user state to update...");
      await new Promise((resolve) => setTimeout(resolve, 200));

      // Verify user state is updated
      if (!user?.username) {
        console.log("User state not updated yet, waiting longer...");
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
      console.log("User state confirmed, proceeding with chat creation...");

      console.log("Creating chat...");
      await createChat();
      console.log("Profile completion flow finished");
    } catch (error) {
      console.error("Error updating profile:", error);
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Failed to update profile",
      });

      // Don't redirect on error - stay on current page
      setIsSubmitting(false);
    }
    // Note: Don't set setIsSubmitting(false) in finally block
    // because createChat() should redirect away from this page
  };

  const isFormValid =
    firstName && lastName && username && isAvailable;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: theme.dark ? "#1a1a2e" : "#f8fafc",
        }}
      >
        <StatusBar
          barStyle={theme.dark ? "light-content" : "dark-content"}
          backgroundColor="transparent"
          translucent
        />

        <ScrollToInputContext.Provider value={{ scrollToInput }}>
          <ScrollView
            ref={scrollViewRef}
            style={{ flex: 1 }}
            contentContainerStyle={{
              paddingTop: Math.max(insets.top + 40, 60),
              paddingHorizontal: 24,
              paddingBottom: Math.max(
                insets.bottom +
                  40 +
                  (keyboardState.isKeyboardVisible ? 100 : 0),
                60
              ),
            }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            scrollEventThrottle={16}
          >
            {/* Header */}
            <View style={{ marginBottom: 48 }}>
              <Text
                style={{
                  fontSize: 42,
                  fontWeight: "900",
                  color: theme.colors.text,
                  marginBottom: 16,
                  lineHeight: 50,
                  textAlign: "center",
                }}
              >
                Complete Your Profile ✨
              </Text>
              <Text
                style={{
                  fontSize: 18,
                  color: theme.colors.text + "CC",
                  lineHeight: 26,
                  textAlign: "center",
                  maxWidth: 320,
                  alignSelf: "center",
                }}
              >
                Tell us a bit about yourself to get started on your cosmic
                journey
              </Text>
            </View>

            {/* Error Message */}
            {error && (
              <View
                style={{
                  padding: 20,
                  marginBottom: 32,
                  backgroundColor: theme.dark
                    ? "rgba(239, 68, 68, 0.15)"
                    : "rgba(239, 68, 68, 0.1)",
                  borderRadius: 20,
                  borderWidth: 1,
                  borderColor: theme.dark
                    ? "rgba(239, 68, 68, 0.3)"
                    : "rgba(239, 68, 68, 0.2)",
                  marginHorizontal: 8,
                }}
              >
                <Text
                  style={{
                    fontSize: 16,
                    color: "#EF4444",
                    textAlign: "center",
                  }}
                >
                  {error}
                </Text>
              </View>
            )}

            {/* Profile Picture */}
            <View style={{ alignItems: "center", marginBottom: 40 }}>
              <TouchableOpacity onPress={pickImage}>
                <View
                  style={{
                    width: 140,
                    height: 140,
                    borderRadius: 70,
                    backgroundColor: profileImage
                      ? theme.dark
                        ? "rgba(139, 92, 246, 0.2)"
                        : "rgba(139, 92, 246, 0.1)"
                      : showValidationErrors && !profileImage
                      ? theme.dark
                        ? "rgba(239, 68, 68, 0.15)"
                        : "rgba(239, 68, 68, 0.1)"
                      : theme.dark
                      ? "rgba(139, 92, 246, 0.2)"
                      : "rgba(139, 92, 246, 0.1)",
                    borderWidth: 4,
                    borderColor: profileImage
                      ? "#10B981"
                      : showValidationErrors && !profileImage
                      ? "#EF4444"
                      : "#8B5CF6",
                    justifyContent: "center",
                    alignItems: "center",
                    overflow: "hidden",
                    shadowColor: profileImage
                      ? "#10B981"
                      : showValidationErrors && !profileImage
                      ? "#EF4444"
                      : "#8B5CF6",
                    shadowOffset: { width: 0, height: 8 },
                    shadowOpacity: 0.3,
                    shadowRadius: 20,
                    elevation: 12,
                  }}
                >
                  {profileImage ? (
                    <Image
                      source={{ uri: profileImage }}
                      style={{ width: 140, height: 140, borderRadius: 70 }}
                      resizeMode="cover"
                    />
                  ) : (
                    <User
                      size={56}
                      color={
                        showValidationErrors && !profileImage
                          ? "#EF4444"
                          : "#8B5CF6"
                      }
                    />
                  )}
                </View>
                <View
                  style={{
                    position: "absolute",
                    bottom: 8,
                    right: 8,
                    width: 44,
                    height: 44,
                    borderRadius: 22,
                    backgroundColor: profileImage
                      ? "#10B981"
                      : showValidationErrors && !profileImage
                      ? "#EF4444"
                      : "#8B5CF6",
                    justifyContent: "center",
                    alignItems: "center",
                    borderWidth: 4,
                    borderColor: theme.dark ? "#1a1a2e" : "#f8fafc",
                    shadowColor: profileImage
                      ? "#10B981"
                      : showValidationErrors && !profileImage
                      ? "#EF4444"
                      : "#8B5CF6",
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.4,
                    shadowRadius: 12,
                    elevation: 8,
                  }}
                >
                  <Camera size={20} color="white" />
                </View>
              </TouchableOpacity>
              <Text
                style={{
                  marginTop: 16,
                  fontSize: 16,
                  color:
                    showValidationErrors && !profileImage
                      ? "#EF4444"
                      : profileImage
                      ? "#10B981"
                      : theme.colors.text + "CC",
                  textAlign: "center",
                  fontWeight: "600",
                }}
              >
                {profileImage
                  ? "✓ Profile picture added"
                  : showValidationErrors && !profileImage
                  ? "⚠️ Profile picture required"
                  : "Tap to add profile picture *"}
              </Text>
            </View>

            {/* Name Fields */}
            <View style={{ marginBottom: 32 }}>
              <Text
                style={{
                  fontSize: 20,
                  fontWeight: "700",
                  color: theme.colors.text,
                  marginBottom: 20,
                  textAlign: "center",
                }}
              >
                What should we call you?
              </Text>
              <View style={{ flexDirection: "row", gap: 16 }}>
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: "600",
                      color:
                        showValidationErrors && !firstName
                          ? "#EF4444"
                          : theme.colors.text,
                      marginBottom: 12,
                    }}
                  >
                    First Name *
                    {showValidationErrors && !firstName && (
                      <Text style={{ color: "#EF4444" }}> - Required</Text>
                    )}
                  </Text>
                  <View
                    style={{
                      height: 60,
                      backgroundColor: theme.dark
                        ? "rgba(255, 255, 255, 0.08)"
                        : "rgba(255, 255, 255, 0.9)",
                      borderRadius: 20,
                      borderWidth: 2,
                      borderColor: firstName
                        ? "#10B981"
                        : showValidationErrors && !firstName
                        ? "#EF4444"
                        : theme.dark
                        ? "rgba(139, 92, 246, 0.3)"
                        : "rgba(139, 92, 246, 0.2)",
                      paddingHorizontal: 20,
                      justifyContent: "center",
                      shadowColor: firstName
                        ? "#10B981"
                        : showValidationErrors && !firstName
                        ? "#EF4444"
                        : firstName
                        ? "#8B5CF6"
                        : "transparent",
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.2,
                      shadowRadius: 12,
                      elevation:
                        firstName || (showValidationErrors && !firstName)
                          ? 6
                          : 0,
                    }}
                  >
                    <KeyboardAwareInput
                      placeholder="John"
                      placeholderTextColor={theme.colors.text + "66"}
                      value={firstName}
                      onChangeText={(text) => {
                        setFirstName(text);
                        if (showValidationErrors && text) {
                          setShowValidationErrors(false);
                        }
                      }}
                      autoCapitalize="words"
                      style={{
                        backgroundColor: "transparent",
                        borderWidth: 0,
                        height: 60,
                        fontSize: 18,
                        color: theme.colors.text,
                        fontWeight: "500",
                      }}
                    />
                  </View>
                </View>

                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: "600",
                      color:
                        showValidationErrors && !lastName
                          ? "#EF4444"
                          : theme.colors.text,
                      marginBottom: 12,
                    }}
                  >
                    Last Name *
                    {showValidationErrors && !lastName && (
                      <Text style={{ color: "#EF4444" }}> - Required</Text>
                    )}
                  </Text>
                  <View
                    style={{
                      height: 60,
                      backgroundColor: theme.dark
                        ? "rgba(255, 255, 255, 0.08)"
                        : "rgba(255, 255, 255, 0.9)",
                      borderRadius: 20,
                      borderWidth: 2,
                      borderColor: lastName
                        ? "#10B981"
                        : showValidationErrors && !lastName
                        ? "#EF4444"
                        : theme.dark
                        ? "rgba(139, 92, 246, 0.3)"
                        : "rgba(139, 92, 246, 0.2)",
                      paddingHorizontal: 20,
                      justifyContent: "center",
                      shadowColor: lastName
                        ? "#10B981"
                        : showValidationErrors && !lastName
                        ? "#EF4444"
                        : lastName
                        ? "#8B5CF6"
                        : "transparent",
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.2,
                      shadowRadius: 12,
                      elevation:
                        lastName || (showValidationErrors && !lastName) ? 6 : 0,
                    }}
                  >
                    <KeyboardAwareInput
                      placeholder="Doe"
                      placeholderTextColor={theme.colors.text + "66"}
                      value={lastName}
                      onChangeText={(text) => {
                        setLastName(text);
                        if (showValidationErrors && text) {
                          setShowValidationErrors(false);
                        }
                      }}
                      autoCapitalize="words"
                      style={{
                        backgroundColor: "transparent",
                        borderWidth: 0,
                        height: 60,
                        fontSize: 18,
                        color: theme.colors.text,
                        fontWeight: "500",
                      }}
                    />
                  </View>
                </View>
              </View>
            </View>

            {/* Contact Information */}
            <View style={{ marginBottom: 32 }}>
              <Text
                style={{
                  fontSize: 20,
                  fontWeight: "700",
                  color: theme.colors.text,
                  marginBottom: 20,
                  textAlign: "center",
                }}
              >
                Contact Information
              </Text>

              {/* Email (Read-only) */}
              <View style={{ marginBottom: 20 }}>
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: "600",
                    color: theme.colors.text,
                    marginBottom: 12,
                  }}
                >
                  Email Address
                </Text>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    height: 60,
                    backgroundColor: theme.dark
                      ? "rgba(255, 255, 255, 0.05)"
                      : "rgba(255, 255, 255, 0.6)",
                    borderRadius: 20,
                    borderWidth: 2,
                    borderColor: theme.dark
                      ? "rgba(139, 92, 246, 0.2)"
                      : "rgba(139, 92, 246, 0.15)",
                    paddingHorizontal: 20,
                  }}
                >
                  <Mail
                    size={24}
                    color={theme.colors.text + "66"}
                    style={{ marginRight: 16 }}
                  />
                  <Text
                    style={{
                      flex: 1,
                      fontSize: 18,
                      color: theme.colors.text + "77",
                      fontWeight: "500",
                    }}
                  >
                    {email}
                  </Text>
                </View>
              </View>

              {/* Phone */}
              <View>
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: "600",
                    color: theme.colors.text,
                    marginBottom: 12,
                  }}
                >
                  Phone Number (Optional)
                </Text>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    height: 60,
                    backgroundColor: theme.dark
                      ? "rgba(255, 255, 255, 0.08)"
                      : "rgba(255, 255, 255, 0.9)",
                    borderRadius: 20,
                    borderWidth: 2,
                    borderColor: phone
                      ? "#8B5CF6"
                      : theme.dark
                      ? "rgba(139, 92, 246, 0.3)"
                      : "rgba(139, 92, 246, 0.2)",
                    paddingHorizontal: 20,
                    shadowColor: phone ? "#8B5CF6" : "transparent",
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.2,
                    shadowRadius: 12,
                    elevation: phone ? 6 : 0,
                  }}
                >
                  <Phone
                    size={24}
                    color="#8B5CF6"
                    style={{ marginRight: 16 }}
                  />
                  <KeyboardAwareInput
                    placeholder="+1 (555) 000-0000"
                    placeholderTextColor={theme.colors.text + "66"}
                    value={phone}
                    onChangeText={setPhone}
                    keyboardType="phone-pad"
                    style={{
                      flex: 1,
                      backgroundColor: "transparent",
                      borderWidth: 0,
                      height: 60,
                      fontSize: 18,
                      color: theme.colors.text,
                      fontWeight: "500",
                    }}
                  />
                </View>
              </View>
            </View>

            {/* Username */}
            <View style={{ marginBottom: 48 }}>
              <Text
                style={{
                  fontSize: 20,
                  fontWeight: "700",
                  color: theme.colors.text,
                  marginBottom: 20,
                  textAlign: "center",
                }}
              >
                Choose Your Username
              </Text>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  height: 60,
                  backgroundColor: theme.dark
                    ? "rgba(255, 255, 255, 0.08)"
                    : "rgba(255, 255, 255, 0.9)",
                  borderRadius: 20,
                  borderWidth: 2,
                  borderColor:
                    username && isAvailable
                      ? "#10B981"
                      : username && isAvailable === false
                      ? "#EF4444"
                      : username
                      ? "#8B5CF6"
                      : theme.dark
                      ? "rgba(139, 92, 246, 0.3)"
                      : "rgba(139, 92, 246, 0.2)",
                  paddingHorizontal: 20,
                  shadowColor:
                    username && isAvailable
                      ? "#10B981"
                      : username && isAvailable === false
                      ? "#EF4444"
                      : username
                      ? "#8B5CF6"
                      : "transparent",
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.2,
                  shadowRadius: 12,
                  elevation: username ? 6 : 0,
                }}
              >
                <Text
                  style={{
                    fontSize: 20,
                    color: "#8B5CF6",
                    marginRight: 12,
                    fontWeight: "700",
                  }}
                >
                  @
                </Text>
                <KeyboardAwareInput
                  placeholder="username"
                  placeholderTextColor={theme.colors.text + "66"}
                  value={username}
                  onChangeText={handleUsernameChange}
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={{
                    flex: 1,
                    backgroundColor: "transparent",
                    borderWidth: 0,
                    height: 60,
                    fontSize: 18,
                    color: theme.colors.text,
                    fontWeight: "500",
                  }}
                />
                <View style={{ marginLeft: 12 }}>
                  {isChecking ? (
                    <ActivityIndicator size="small" color="#8B5CF6" />
                  ) : username ? (
                    isAvailable ? (
                      <Check size={24} color="#10B981" />
                    ) : (
                      <X size={24} color="#EF4444" />
                    )
                  ) : null}
                </View>
              </View>
              {error && (
                <Text
                  style={{
                    marginTop: 12,
                    fontSize: 16,
                    color: "#EF4444",
                    textAlign: "center",
                  }}
                >
                  {error}
                </Text>
              )}
              {isAvailable === false && !error && (
                <Text
                  style={{
                    marginTop: 12,
                    fontSize: 16,
                    color: "#EF4444",
                    textAlign: "center",
                  }}
                >
                  This username is already taken
                </Text>
              )}
              {isAvailable === true && (
                <Text
                  style={{
                    marginTop: 12,
                    fontSize: 16,
                    color: "#10B981",
                    textAlign: "center",
                  }}
                >
                  ✓ Username is available!
                </Text>
              )}
              {username && (
                <Text
                  style={{
                    marginTop: 8,
                    fontSize: 14,
                    color: theme.colors.text + "66",
                    textAlign: "center",
                  }}
                >
                  Letters, numbers, and underscores only
                </Text>
              )}
            </View>

            {/* Continue Button */}
            <TouchableOpacity
              onPress={handleContinue}
              disabled={!isFormValid || isChecking || isSubmitting}
              style={{
                height: 64,
                backgroundColor:
                  isFormValid && !isChecking
                    ? "#8B5CF6"
                    : theme.colors.text + "33",
                borderRadius: 20,
                justifyContent: "center",
                alignItems: "center",
                shadowColor: "#8B5CF6",
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: isFormValid ? 0.4 : 0,
                shadowRadius: 16,
                elevation: isFormValid ? 12 : 0,
                marginHorizontal: 8,
              }}
            >
              {isSubmitting ? (
                <ActivityIndicator color="white" size="large" />
              ) : (
                <Text
                  style={{
                    fontSize: 20,
                    fontWeight: "800",
                    color: isFormValid ? "white" : theme.colors.text + "66",
                  }}
                >
                  {!isFormValid
                    ? `Complete All Fields ${
                         !firstName || !lastName
                          ? "👤"
                          : !username || !isAvailable
                          ? "@"
                          : ""
                      }`
                    : "Continue to Topics ✨"}
                </Text>
              )}
            </TouchableOpacity>

            {/* Help Text */}
            {!isFormValid && (
              <Text
                style={{
                  marginTop: 16,
                  fontSize: 14,
                  color: theme.colors.text + "88",
                  textAlign: "center",
                  lineHeight: 20,
                }}
              >
                Please complete all required fields:{" "}
                {!firstName && "First Name"}
                {!firstName && !lastName && ", "}
                {!lastName && "Last Name"}
                {( !firstName || !lastName) &&
                  (!username || !isAvailable) &&
                  ", "}
                {!username && "Username"}
                {username && !isAvailable && "Valid Username"}
              </Text>
            )}
          </ScrollView>
        </ScrollToInputContext.Provider>

        <Toast />
      </View>
    </KeyboardAvoidingView>
  );
}
