import React, { useEffect, useRef } from "react";
import { View, Platform, StyleSheet } from "react-native";
import { Text } from "~/src/components/ui/text";
import { Button } from "~/src/components/ui/button";
import { router } from "expo-router";
import { useAuth } from "~/src/lib/auth";
import { MotiView } from "moti";
import { Easing } from "react-native-reanimated";
import Animated, {
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  useSharedValue,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ChevronRight, Apple } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";

const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient);

interface SocialButtonProps {
  onPress: () => void;
  icon: React.ReactNode;
  label: string;
  customStyle: string;
  textColor?: string;
  delay?: number;
}

const SocialButton = ({
  onPress,
  icon,
  label,
  customStyle,
  textColor = "text-white",
  delay = 0,
}: SocialButtonProps) => (
  <MotiView
    from={{ opacity: 0, translateY: 10 }}
    animate={{ opacity: 1, translateY: 0 }}
    transition={{
      type: "timing",
      duration: 500,
      easing: Easing.out(Easing.ease),
      delay,
    }}
    className="w-full"
  >
    <Button
      variant="default"
      onPress={onPress}
      className={`h-[56px] flex-row items-center justify-center shadow-sm ${customStyle}`}
    >
      <View className="flex-row items-center justify-center">
        <View style={{ marginRight: 8 }}>{icon}</View>
        <Text className={`text-[16px] font-semibold ${textColor}`}>
          {label}
        </Text>
      </View>
    </Button>
  </MotiView>
);

export default function Intro() {
  const { session } = useAuth();
  const insets = useSafeAreaInsets();

  const translateX = useRef(useSharedValue(0)).current;
  const translateY = useRef(useSharedValue(0)).current;

  useEffect(() => {
    translateX.value = withRepeat(
      withSequence(
        withTiming(50, { duration: 10000 }),
        withTiming(-50, { duration: 10000 })
      ),
      -1,
      true
    );
    translateY.value = withRepeat(
      withSequence(
        withTiming(30, { duration: 8000 }),
        withTiming(-30, { duration: 8000 })
      ),
      -1,
      true
    );
  }, [translateX, translateY]);

  const animatedStyleX = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const animatedStyleY = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const handleAppleSignIn = async () => {
    console.log("Apple sign in pressed");
  };

  const handleGoogleSignIn = async () => {
    console.log("Google sign in pressed");
  };
  

  return (
    
    <View style={styles.container}>
      {/* Static Diagonal Gradient */}
      <LinearGradient
        colors={["transparent", "#1E3A8A"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Animated Gradients */}
      <AnimatedLinearGradient
        colors={["#7C3AED", "transparent"]}
        start={{ x: 0.3, y: 0 }}
        end={{ x: 0.7, y: 1 }}
        style={[StyleSheet.absoluteFill, { opacity: 0.7 }, animatedStyleX]}
      />

      <AnimatedLinearGradient
        colors={["transparent", "#4338CA"]}
        start={{ x: 0, y: 0.3 }}
        end={{ x: 1, y: 0.7 }}
        style={[StyleSheet.absoluteFill, { opacity: 0.5 }, animatedStyleY]}
      />

      <LinearGradient
        colors={["transparent", "rgba(0,0,0,0.4)"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Content */}
      <View
        style={[
          styles.contentContainer,
          {
            paddingTop: insets.top,
            paddingBottom: insets.bottom + 16,
          },
        ]}
      >
        {/* Top Section */}
        <View className="items-center px-8 mt-20">
          <MotiView
            from={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", duration: 700 }}
            className="items-center"
          >
            <View className="items-center justify-center w-24 h-24 mb-16 rounded-full bg-white/10 backdrop-blur-lg">
              <View className="items-center justify-center w-14 h-14">
                <Text className="text-4xl">🌍</Text>
              </View>
            </View>

            <Text className="mb-5 text-4xl font-bold text-white">
              Welcome to Orbit
            </Text>
            <Text className="mb-8 text-[17px] text-gray-200 text-center">
              Connect with friends around the world in real-time
            </Text>
          </MotiView>
        </View>

        {/* Bottom Section - Buttons */}
        <View className="px-8 space-y-6 gap-y-4">
          {Platform.OS === "ios" && (
            <SocialButton
              onPress={handleAppleSignIn}
              icon={<Apple size={24} color="white" />}
              label="Continue with Apple"
              customStyle="bg-black"
              textColor="text-white"
              delay={200}
            />
          )}

          {Platform.OS === "android" && (
            <SocialButton
              onPress={handleGoogleSignIn}
              icon={
                <View className="items-center justify-center w-6 h-6">
                  <Text className="text-[18px] font-bold text-white">G</Text>
                </View>
              }
              label="Continue with Google"
              customStyle="bg-[#ea4335]"
              delay={300}
            />
          )}

          {/* Separator */}
          <View className="flex-row items-center py-4">
            <View className="flex-1 h-[1px] bg-white/20" />
            <Text className="px-6 text-[15px] text-gray-300">
              or continue with email
            </Text>
            <View className="flex-1 h-[1px] bg-white/20" />
          </View>

          <View className="space-y-4 gap-y-4">
            <SocialButton
              onPress={() => router.push("/(auth)/sign-in")}
              icon={<ChevronRight size={22} color="white" />}
              label="Sign In with Email"
              customStyle="bg-violet-600"
              delay={400}
            />

            <SocialButton
              onPress={() => router.push("/(auth)/sign-up")}
              icon={<ChevronRight size={22} color="black" />}
              label="Create New Account"
              customStyle="bg-white"
              textColor="text-black"
              delay={500}
            />
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  contentContainer: {
    flex: 1,
    justifyContent: "space-between",
  },
});
