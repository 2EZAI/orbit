import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { ChevronRight } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import { useFocusEffect } from "expo-router";
import {
  Animated,
  Dimensions,
  Image,
  Platform,
  StatusBar,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSocialLoginsApi } from "~/hooks/useSocialLoginsApi";
import { useTheme } from "~/src/components/ThemeProvider";
import { ImageCacheManager } from "~/src/components/ui/optimized-image";
import { Text } from "~/src/components/ui/text";
import { useAuth } from "~/src/lib/auth";
import { cacheMonitor } from "~/src/lib/cacheMonitor";
import { cacheWarmer } from "~/src/lib/cacheWarmer";
const { width, height } = Dimensions.get("window");

// Background images data
const backgroundImages = [
  require("~/assets/bg-images/Rectangle 11.png"),
  require("~/assets/bg-images/Rectangle 11-1.png"),
  require("~/assets/bg-images/Rectangle 11-2.png"),
  require("~/assets/bg-images/Rectangle 12.png"),
  require("~/assets/bg-images/Rectangle 12-1.png"),
  require("~/assets/bg-images/Rectangle 13.png"),
  require("~/assets/bg-images/Rectangle 13-1.png"),
  require("~/assets/bg-images/Rectangle 14.png"),
  require("~/assets/bg-images/Rectangle 14-1.png"),
  require("~/assets/bg-images/Rectangle 14-2.png"),
  require("~/assets/bg-images/Rectangle 15.png"),
  require("~/assets/bg-images/Rectangle 15-1.png"),
  require("~/assets/bg-images/Rectangle 15-2.png"),
  require("~/assets/bg-images/Rectangle 16.png"),
];

// Firefly Component
const Firefly = ({ id, theme }: { id: string; theme: any }) => {
  const translateX = useState(
    () => new Animated.Value(Math.random() * width)
  )[0];
  const translateY = useState(
    () => new Animated.Value(Math.random() * height * 0.6)
  )[0];
  const opacity = useState(() => new Animated.Value(0))[0];
  const scale = useState(() => new Animated.Value(0))[0];

  // Enhanced firefly properties with theme support
  const size = useState(() => 3 + Math.random() * 12)[0]; // 3-15px (bigger range)
  const speed = useState(() => 5000 + Math.random() * 20000)[0]; // 5-25 seconds (wider range)
  const glowColor = useState(() => {
    // Theme-aware colors
    const darkModeColors = [
      "#8B5CF6",
      "#A78BFA",
      "#C084FC",
      "#DDD6FE",
      "#F3E8FF",
      "#EC4899",
      "#F472B6",
      "#60A5FA",
      "#34D399",
    ];
    const lightModeColors = [
      "#8B5CF6",
      "#8B5CF6",
      "#A855F7",
      "#C026D3",
      "#DB2777",
      "#DC2626",
      "#EA580C",
      "#0EA5E9",
      "#059669",
    ];
    const colors = theme.dark ? darkModeColors : lightModeColors;
    return colors[Math.floor(Math.random() * colors.length)];
  })[0];
  const glowIntensity = useState(() => 8 + Math.random() * 12)[0]; // 8-20px glow radius
  const baseOpacity = useState(() => (theme.dark ? 0.8 : 0.6))[0]; // Higher opacity in dark mode

  useEffect(() => {
    const animate = () => {
      // Random floating path
      const newX = Math.random() * width;
      const newY = Math.random() * height * 0.6;

      Animated.sequence([
        // Fade in and scale up
        Animated.parallel([
          Animated.timing(opacity, {
            toValue: baseOpacity + Math.random() * 0.2,
            duration: 800 + Math.random() * 400,
            useNativeDriver: true,
          }),
          Animated.spring(scale, {
            toValue: 0.8 + Math.random() * 0.4,
            tension: 40 + Math.random() * 20,
            friction: 6 + Math.random() * 4,
            useNativeDriver: true,
          }),
        ]),
        // Float to new position
        Animated.parallel([
          Animated.timing(translateX, {
            toValue: newX,
            duration: speed,
            useNativeDriver: true,
          }),
          Animated.timing(translateY, {
            toValue: newY,
            duration: speed,
            useNativeDriver: true,
          }),
          // Enhanced twinkling effect
          Animated.loop(
            Animated.sequence([
              Animated.timing(opacity, {
                toValue: baseOpacity * 0.3 + Math.random() * 0.2,
                duration: 1500 + Math.random() * 1000,
                useNativeDriver: true,
              }),
              Animated.timing(opacity, {
                toValue: baseOpacity + Math.random() * 0.2,
                duration: 1500 + Math.random() * 1000,
                useNativeDriver: true,
              }),
            ])
          ),
        ]),
      ]).start(() => {
        animate();
      });
    };

    const delay = Math.random() * 4000;
    const timeout = setTimeout(animate, delay);
    return () => clearTimeout(timeout);
  }, []);

  return (
    <Animated.View
      style={{
        position: "absolute",
        width: size * 3, // Larger container for blur effect
        height: size * 3,
        transform: [
          { translateX: translateX },
          { translateY: translateY },
          { scale: scale },
        ],
        opacity: opacity,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      {/* Outermost blur layer */}
      <View
        style={{
          position: "absolute",
          width: size * 2.5,
          height: size * 2.5,
          backgroundColor: glowColor,
          borderRadius: (size * 2.5) / 2,
          opacity: theme.dark ? 0.15 : 0.1,
        }}
      />

      {/* Middle blur layer */}
      <View
        style={{
          position: "absolute",
          width: size * 1.8,
          height: size * 1.8,
          backgroundColor: glowColor,
          borderRadius: (size * 1.8) / 2,
          opacity: theme.dark ? 0.25 : 0.2,
        }}
      />

      {/* Main glowing firefly core */}
      <View
        style={{
          width: size,
          height: size,
          backgroundColor: glowColor,
          borderRadius: size / 2,
          shadowColor: glowColor,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: theme.dark ? 1 : 0.8,
          shadowRadius: glowIntensity,
          elevation: 15,
        }}
      />

      {/* Inner glow layer */}
      <View
        style={{
          position: "absolute",
          width: size * 0.6,
          height: size * 0.6,
          backgroundColor: "#FFFFFF",
          borderRadius: (size * 0.6) / 2,
          opacity: theme.dark ? 0.4 : 0.6,
        }}
      />
    </Animated.View>
  );
};

// Orbiting Circle Component
const OrbitingCircle = ({
  index,
  image,
  centerX,
  centerY,
}: {
  index: number;
  image: any;
  centerX: number;
  centerY: number;
}) => {
  const rotation = useState(() => new Animated.Value(0))[0];
  const opacity = useState(() => new Animated.Value(1))[0];
  const scale = useState(() => new Animated.Value(1))[0];
  const imageGlow = useState(() => new Animated.Value(0.6))[0];

  // UNIVERSE-scale solar system properties - spread across the whole screen!
  const orbitRadius = useState(() => 80 + index * 25 + Math.random() * 60)[0]; // MUCH wider orbits: 80-300px spread
  const orbitSpeed = useState(
    () => 20000 + index * 5000 + Math.random() * 20000
  )[0]; // More varied speeds: 20-65 seconds
  const startAngle = useState(() => Math.random() * 360)[0]; // Random starting position
  const size = useState(() => 20 + index * 6 + Math.random() * 25)[0]; // BIGGER planets: 20-73px, more random
  const clockwise = useState(() => Math.random() > 0.5)[0]; // Random direction

  useEffect(() => {
    // Simple fade in
    Animated.timing(opacity, {
      toValue: 0.85,
      duration: 2000,
      useNativeDriver: true,
    }).start();

    // Slow, smooth orbital animation
    const orbitAnimation = () => {
      Animated.loop(
        Animated.timing(rotation, {
          toValue: 1,
          duration: orbitSpeed,
          useNativeDriver: true,
        })
      ).start();
    };

    const delay = index * 800;
    const timeout = setTimeout(() => {
      orbitAnimation();
    }, delay);

    return () => clearTimeout(timeout);
  }, []);

  // SMOOTH circular motion using many interpolation points for perfect circles
  const translateX = rotation.interpolate({
    inputRange: [0, 0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875, 1],
    outputRange: [
      centerX +
        orbitRadius * Math.cos(((startAngle + 0) * Math.PI) / 180) -
        size / 2,
      centerX +
        orbitRadius *
          Math.cos(((startAngle + (clockwise ? 45 : -45)) * Math.PI) / 180) -
        size / 2,
      centerX +
        orbitRadius *
          Math.cos(((startAngle + (clockwise ? 90 : -90)) * Math.PI) / 180) -
        size / 2,
      centerX +
        orbitRadius *
          Math.cos(((startAngle + (clockwise ? 135 : -135)) * Math.PI) / 180) -
        size / 2,
      centerX +
        orbitRadius *
          Math.cos(((startAngle + (clockwise ? 180 : -180)) * Math.PI) / 180) -
        size / 2,
      centerX +
        orbitRadius *
          Math.cos(((startAngle + (clockwise ? 225 : -225)) * Math.PI) / 180) -
        size / 2,
      centerX +
        orbitRadius *
          Math.cos(((startAngle + (clockwise ? 270 : -270)) * Math.PI) / 180) -
        size / 2,
      centerX +
        orbitRadius *
          Math.cos(((startAngle + (clockwise ? 315 : -315)) * Math.PI) / 180) -
        size / 2,
      centerX +
        orbitRadius *
          Math.cos(((startAngle + (clockwise ? 360 : -360)) * Math.PI) / 180) -
        size / 2,
    ],
  });

  const translateY = rotation.interpolate({
    inputRange: [0, 0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875, 1],
    outputRange: [
      centerY +
        orbitRadius * Math.sin(((startAngle + 0) * Math.PI) / 180) -
        size / 2,
      centerY +
        orbitRadius *
          Math.sin(((startAngle + (clockwise ? 45 : -45)) * Math.PI) / 180) -
        size / 2,
      centerY +
        orbitRadius *
          Math.sin(((startAngle + (clockwise ? 90 : -90)) * Math.PI) / 180) -
        size / 2,
      centerY +
        orbitRadius *
          Math.sin(((startAngle + (clockwise ? 135 : -135)) * Math.PI) / 180) -
        size / 2,
      centerY +
        orbitRadius *
          Math.sin(((startAngle + (clockwise ? 180 : -180)) * Math.PI) / 180) -
        size / 2,
      centerY +
        orbitRadius *
          Math.sin(((startAngle + (clockwise ? 225 : -225)) * Math.PI) / 180) -
        size / 2,
      centerY +
        orbitRadius *
          Math.sin(((startAngle + (clockwise ? 270 : -270)) * Math.PI) / 180) -
        size / 2,
      centerY +
        orbitRadius *
          Math.sin(((startAngle + (clockwise ? 315 : -315)) * Math.PI) / 180) -
        size / 2,
      centerY +
        orbitRadius *
          Math.sin(((startAngle + (clockwise ? 360 : -360)) * Math.PI) / 180) -
        size / 2,
    ],
  });

  const glowIntensity = imageGlow.interpolate({
    inputRange: [0, 1],
    outputRange: [3, 8], // Tiny glow for tiny planets
  });

  return (
    <Animated.View
      style={{
        position: "absolute",
        width: size,
        height: size,
        transform: [
          { translateX: translateX },
          { translateY: translateY },
          { scale: scale },
        ],
        opacity: opacity,
      }}
    >
      {/* Tiny planet container */}
      <Animated.View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          overflow: "hidden",
          borderWidth: 1, // Very thin border for tiny planets
          borderColor: "#8B5CF6",
          shadowColor: "#8B5CF6",
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.6,
          shadowRadius: glowIntensity,
          elevation: 8,
          backgroundColor: "#1a1a1a",
        }}
      >
        {/* Subtle glow layer */}
        <View
          style={{
            position: "absolute",
            top: -3,
            left: -3,
            right: -3,
            bottom: -3,
            backgroundColor: "#8B5CF6",
            opacity: 0.1,
            borderRadius: (size + 6) / 2,
          }}
        />

        <Image
          source={image}
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
            opacity: 0.9,
          }}
          resizeMode="cover"
        />

        {/* Minimal overlay */}
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: size,
            height: size,
            backgroundColor: "#8B5CF6",
            opacity: 0.05,
            borderRadius: size / 2,
          }}
        />
      </Animated.View>
    </Animated.View>
  );
};

// Geometric Pattern Component
const GeometricPattern = ({ rotation }: { rotation: Animated.Value }) => {
  const scale = useState(() => new Animated.Value(1))[0];

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(scale, {
          toValue: 1.1,
          duration: 6000,
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 1,
          duration: 6000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const patternRotation = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  return (
    <Animated.View
      style={{
        position: "absolute",
        width: 300,
        height: 300,
        left: width / 2 - 150,
        top: height * 0.3 - 150,
        transform: [{ rotate: patternRotation }, { scale: scale }],
        opacity: 0.08,
      }}
    >
      {/* Orbital rings */}
      {[60, 100, 140].map((radius, i) => (
        <View
          key={i}
          style={{
            position: "absolute",
            width: radius * 2,
            height: radius * 2,
            left: 150 - radius,
            top: 150 - radius,
            borderWidth: 1,
            borderColor: "#8B5CF6",
            borderRadius: radius,
            opacity: 0.3,
          }}
        />
      ))}

      {/* Center dot */}
      <View
        style={{
          position: "absolute",
          width: 8,
          height: 8,
          left: 146,
          top: 146,
          backgroundColor: "#8B5CF6",
          borderRadius: 4,
          opacity: 0.5,
        }}
      />
    </Animated.View>
  );
};

export default function LandingPage() {
  const { theme } = useTheme();
  const { session, loading } = useAuth();
  const insets = useSafeAreaInsets();
  const [isReady, setIsReady] = useState(false);
  const [orbitingImages, setOrbitingImages] = useState<any[]>([]);
  const [fireflies, setFireflies] = useState<string[]>([]);
  const [isFirstTime, setIsFirstTime] = useState(false);
  const mainRotation = useState(() => new Animated.Value(0))[0];
  // Logo center coordinates
  const logoCenterX = width / 2;
  const logoCenterY = height * 0.3;
  const { appleLogin, googleLogin } = useSocialLoginsApi();
  const checkIfFirstTime = async () => {
    const isAlreadyGetStarted = await AsyncStorage.getItem("hasStarted");
    if (isAlreadyGetStarted) {
      setIsFirstTime(false);
    } else {
      setIsFirstTime(true);
    }
  };
  // Redirect authenticated users to the app
  useFocusEffect(
    React.useCallback(() => {
      checkIfFirstTime();
    }, [])
  );

  useEffect(() => {
    if (!loading && session) {
      console.log("Landing page: User is authenticated, redirecting to app");
      router.replace("/(app)/(map)");
      return;
    }
  }, [session, loading]);

  useEffect(() => {
    // Initialize app and create orbiting images
    const initializeApp = async () => {
      console.log("🪐 Initializing Orbit Chamber...");
      cacheWarmer.startPeriodicWarming();
      cacheMonitor.startMonitoring();
      ImageCacheManager.clearOldCache();

      // Create 8 orbiting images
      const newOrbitingImages = [];
      for (let i = 0; i < 8; i++) {
        newOrbitingImages.push({
          id: `orbit-${i}`,
          image:
            backgroundImages[
              Math.floor(Math.random() * backgroundImages.length)
            ],
        });
      }
      setOrbitingImages(newOrbitingImages);

      // Create fireflies - BIGGER SWARM!
      const newFireflies = [];
      for (let i = 0; i < 25; i++) {
        // Increased from 12 to 25 fireflies!
        newFireflies.push(`firefly-${i}-${Date.now()}`);
      }
      setFireflies(newFireflies);

      setIsReady(true);
      console.log("✨ Orbit ready!");
    };

    initializeApp();
  }, []);

  useEffect(() => {
    if (!isReady) return;

    // Slow background rotation
    Animated.loop(
      Animated.timing(mainRotation, {
        toValue: 1,
        duration: 60000, // Very slow 60 second rotation
        useNativeDriver: true,
      })
    ).start();

    // No more image refreshing - let them orbit forever!
  }, [isReady]);

  const handleGetStarted = () => {
    router.push("/(auth)/sign-in");
  };

  const handleSignUp = async () => {
    // router.push("/(auth)/sign-up");
    await AsyncStorage.setItem("hasStarted", "true");
    router.push("/(app)/(map)");
  };

  // Show loading while checking authentication
  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: theme.colors.background,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Text style={{ color: theme.colors.text }}>Loading...</Text>
      </View>
    );
  }

  if (!isReady) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: theme.colors.background,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Text style={{ color: theme.colors.text }}>Loading...</Text>
      </View>
    );
  }

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: theme.colors.background,
      }}
    >
      <StatusBar
        barStyle="light-content"
        backgroundColor="transparent"
        translucent
      />

      {/* Orbit Chamber */}
      <View
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          overflow: "hidden",
        }}
      >
        {/* Fireflies */}
        {fireflies.map((fireflyId) => (
          <Firefly key={fireflyId} id={fireflyId} theme={theme} />
        ))}

        {/* Background orbital pattern */}
        <GeometricPattern rotation={mainRotation} />

        {/* Orbiting circular images */}
        {orbitingImages.map((orbitItem, index) => (
          <OrbitingCircle
            key={orbitItem.id}
            index={index}
            image={orbitItem.image}
            centerX={logoCenterX}
            centerY={logoCenterY}
          />
        ))}
      </View>

      {/* Centered Logo */}
      <View
        style={{
          position: "absolute",
          top: height * 0.3 - 65,
          left: width / 2 - 65,
          width: 130,
          height: 130,
          alignItems: "center",
          justifyContent: "center",
          zIndex: 10,
        }}
      >
        <View
          style={{
            width: 130,
            height: 130,
            backgroundColor: theme.colors.background,
            borderRadius: 65,
            justifyContent: "center",
            alignItems: "center",
            shadowColor: "#8B5CF6",
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 1,
            shadowRadius: 30,
            elevation: 25,
            borderWidth: 4,
            borderColor: "#8B5CF6",
          }}
        >
          <Image
            source={require("~/assets/bg-images/OrbitLogo.png")}
            style={{
              width: 90,
              height: 90,
            }}
            resizeMode="contain"
          />
        </View>
      </View>

      {/* Content Sheet */}
      <View
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: "60%",
          backgroundColor: theme.colors.background,
          borderTopLeftRadius: 32,
          borderTopRightRadius: 32,
          justifyContent: "center",
          alignItems: "center",
          paddingTop: 32,
          paddingBottom: Math.max(40, insets.bottom + 5),
          paddingHorizontal: 20,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -8 },
          shadowOpacity: 0.15,
          shadowRadius: 16,
          elevation: 12,
        }}
      >
        <Text
          style={{
            fontSize: 32,
            fontWeight: "800",
            color: theme.colors.text,
            textAlign: "center",
            marginBottom: 16,
            lineHeight: 40,
          }}
        >
          Where the{"\n"}moment finds you
        </Text>

        <Text
          style={{
            fontSize: 16,
            color: theme.colors.text + "CC",
            textAlign: "center",
            marginBottom: 40,
            lineHeight: 24,
          }}
        >
          Discover spontaneous events, connect with like-minded people, and
          create unforgettable memories wherever life takes you.
        </Text>

        <View style={{ width: "100%", gap: 12 }}>
          {!isFirstTime ? (
            <>
              {Platform.OS == "ios" && (
                <TouchableOpacity
                  onPress={appleLogin}
                  style={{
                    backgroundColor: "transparent",
                    paddingVertical: 18,
                    paddingHorizontal: 24,
                    borderRadius: 16,
                    borderWidth: 2,
                    borderColor: theme.colors.border,
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
                    Apple Login
                  </Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                onPress={googleLogin}
                style={{
                  backgroundColor: "transparent",
                  paddingVertical: 18,
                  paddingHorizontal: 24,
                  borderRadius: 16,
                  borderWidth: 2,
                  borderColor: theme.colors.border,
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
                  Google Login
                </Text>
              </TouchableOpacity>
            </>
          ) : null}
          <TouchableOpacity
            onPress={handleSignUp}
            style={{
              backgroundColor: "#8B5CF6",
              paddingVertical: 18,
              paddingHorizontal: 24,
              borderRadius: 16,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              shadowColor: "#8B5CF6",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: 6,
            }}
          >
            <Text
              style={{
                color: "white",
                fontSize: 18,
                fontWeight: "700",
                marginRight: 8,
              }}
            >
              Get Started
            </Text>
            <View
              style={{
                width: 32,
                height: 32,
                backgroundColor: "white",
                borderRadius: 16,
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <ChevronRight size={18} color="#8B5CF6" />
            </View>
          </TouchableOpacity>

          {!isFirstTime ? (
            <TouchableOpacity
              onPress={handleGetStarted}
              style={{
                backgroundColor: "transparent",
                paddingVertical: 18,
                paddingHorizontal: 24,
                borderRadius: 16,
                borderWidth: 2,
                borderColor: theme.colors.border,
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
                Login
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    </View>
  );
}
