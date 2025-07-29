import { useEffect, useState } from "react";
import {
  View,
  ScrollView,
  StatusBar,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { supabase } from "~/src/lib/supabase";
import { Text } from "~/src/components/ui/text";
import { useUser } from "~/hooks/useUserData";
import { TopicList } from "~/src/components/topics/TopicList";
import { useTheme } from "~/src/components/ThemeProvider";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowLeft } from "lucide-react-native";

export default function TopicsScreen() {
  const { user } = useUser();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const searchParams = useLocalSearchParams();
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasWaitedForUser, setHasWaitedForUser] = useState(false);
  const [userCheckAttempts, setUserCheckAttempts] = useState(0);

  const isFromOnboarding = searchParams.from === "onboarding";

  const handleBack = () => {
    router.replace("/(auth)/(onboarding)/username?from=onboarding");
  };

  useEffect(() => {
    console.log(
      "Topics page loaded, user:",
      !!user,
      "from onboarding:",
      isFromOnboarding
    );
    checkUser();
  }, [user]);

  const checkUser = async () => {
    console.log(
      "Topics checkUser called, user exists:",
      !!user,
      "attempts:",
      userCheckAttempts
    );

    if (!user && isFromOnboarding && userCheckAttempts < 3) {
      console.log(
        "No user found but coming from onboarding - waiting for user data..."
      );
      setUserCheckAttempts((prev) => prev + 1);

      // Wait progressively longer for user state to load
      const waitTime =
        userCheckAttempts === 0 ? 500 : userCheckAttempts === 1 ? 1000 : 1500;
      console.log(
        `Attempt ${
          userCheckAttempts + 1
        }: Waiting ${waitTime}ms for user data...`
      );

      await new Promise((resolve) => setTimeout(resolve, waitTime));

      if (!user) {
        console.log(`Still no user after attempt ${userCheckAttempts + 1}`);
        // Will retry on next useEffect trigger or give up after 3 attempts
      } else {
        console.log("User found after wait, continuing...");
      }
    } else if (!user && userCheckAttempts >= 3) {
      console.log("No user found after 3 attempts, redirecting to sign-in");
      router.replace("/(auth)/sign-in");
    } else if (!user && !isFromOnboarding) {
      console.log(
        "No user found and not from onboarding, redirecting to sign-in"
      );
      router.replace("/(auth)/sign-in");
    } else if (user) {
      console.log("User confirmed in topics page");
    }
  };

  const handleContinue = async () => {
    if (!user || selectedTopics.length === 0 || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from("user_topics").insert(
        selectedTopics.map((topic) => ({
          user_id: user.id,
          topic,
        }))
      );

      if (error) throw error;

      router.replace("/(auth)/(onboarding)/permissions");
    } catch (error) {
      console.error("Error saving topics:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) return null;

  return (
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

      {/* Back Button */}
      <TouchableOpacity
        onPress={handleBack}
        style={{
          position: "absolute",
          top: Math.max(insets.top + 16, 40),
          left: 24,
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: theme.dark
            ? "rgba(255, 255, 255, 0.1)"
            : "rgba(255, 255, 255, 0.9)",
          borderWidth: 1,
          borderColor: theme.dark
            ? "rgba(139, 92, 246, 0.3)"
            : "rgba(139, 92, 246, 0.2)",
          justifyContent: "center",
          alignItems: "center",
          zIndex: 10,
          shadowColor: "#8B5CF6",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
          elevation: 4,
        }}
      >
        <ArrowLeft size={20} color={theme.colors.text} />
      </TouchableOpacity>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingTop: Math.max(insets.top + 40, 60),
          paddingHorizontal: 24,
          paddingBottom: Math.max(insets.bottom + 40, 60),
        }}
        showsVerticalScrollIndicator={false}
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
            Welcome to Orbit! 🌌
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
            Select topics you're interested in to personalize your cosmic
            journey
          </Text>
        </View>

        {/* Progress Indicator */}
        <View style={{ marginBottom: 40 }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 12,
            }}
          >
            <View
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: "#10B981",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Text style={{ color: "white", fontSize: 14, fontWeight: "700" }}>
                1
              </Text>
            </View>
            <View
              style={{
                width: 40,
                height: 3,
                backgroundColor: "#8B5CF6",
                borderRadius: 2,
              }}
            />
            <View
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: "#8B5CF6",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Text style={{ color: "white", fontSize: 14, fontWeight: "700" }}>
                2
              </Text>
            </View>
            <View
              style={{
                width: 40,
                height: 3,
                backgroundColor: theme.colors.text + "33",
                borderRadius: 2,
              }}
            />
            <View
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: theme.colors.text + "33",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  color: theme.colors.text + "66",
                  fontSize: 14,
                  fontWeight: "700",
                }}
              >
                3
              </Text>
            </View>
          </View>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              marginTop: 12,
              paddingHorizontal: 16,
            }}
          >
            <Text style={{ fontSize: 12, color: "#10B981", fontWeight: "600" }}>
              Profile
            </Text>
            <Text style={{ fontSize: 12, color: "#8B5CF6", fontWeight: "600" }}>
              Topics
            </Text>
            <Text
              style={{
                fontSize: 12,
                color: theme.colors.text + "66",
                fontWeight: "600",
              }}
            >
              Permissions
            </Text>
          </View>
        </View>

        {/* Selection Counter */}
        <View style={{ marginBottom: 24 }}>
          <View
            style={{
              backgroundColor: theme.dark
                ? "rgba(139, 92, 246, 0.15)"
                : "rgba(139, 92, 246, 0.1)",
              borderRadius: 16,
              padding: 16,
              borderWidth: 2,
              borderColor:
                selectedTopics.length > 0
                  ? "#8B5CF6"
                  : theme.dark
                  ? "rgba(139, 92, 246, 0.3)"
                  : "rgba(139, 92, 246, 0.2)",
              shadowColor:
                selectedTopics.length > 0 ? "#8B5CF6" : "transparent",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.2,
              shadowRadius: 12,
              elevation: selectedTopics.length > 0 ? 6 : 0,
            }}
          >
            <Text
              style={{
                fontSize: 16,
                fontWeight: "700",
                color: theme.colors.text,
                textAlign: "center",
                marginBottom: selectedTopics.length > 0 ? 8 : 0,
              }}
            >
              {selectedTopics.length === 0
                ? "🔍 Search and select your interests"
                : `✨ ${selectedTopics.length} interest${
                    selectedTopics.length === 1 ? "" : "s"
                  } selected`}
            </Text>
            {selectedTopics.length > 0 && (
              <Text
                style={{
                  fontSize: 14,
                  color: theme.colors.text + "CC",
                  textAlign: "center",
                }}
              >
                Great choices! You can always change these later
              </Text>
            )}
          </View>
        </View>

        {/* Topics List */}
        <View style={{ flex: 1, marginBottom: 32 }}>
          <TopicList
            selectedTopics={selectedTopics}
            onSelectTopic={setSelectedTopics}
          />
        </View>

        {/* Continue Button */}
        <TouchableOpacity
          onPress={handleContinue}
          disabled={selectedTopics.length === 0 || isSubmitting}
          style={{
            height: 64,
            backgroundColor:
              selectedTopics.length > 0 && !isSubmitting
                ? "#8B5CF6"
                : theme.colors.text + "33",
            borderRadius: 20,
            justifyContent: "center",
            alignItems: "center",
            shadowColor: "#8B5CF6",
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: selectedTopics.length > 0 ? 0.4 : 0,
            shadowRadius: 16,
            elevation: selectedTopics.length > 0 ? 12 : 0,
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
                color:
                  selectedTopics.length > 0
                    ? "white"
                    : theme.colors.text + "66",
              }}
            >
              Continue to Permissions ✨
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
