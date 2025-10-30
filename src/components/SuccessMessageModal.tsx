import React from "react";
import { MotiView } from "moti";
import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, Text } from "react-native";
import { CheckCircle2 } from "lucide-react-native";
import { useTheme } from "~/src/components/ThemeProvider";
const SuccessMessageModal = ({ message }: { message: string }) => {
  return (
    <MotiView
      from={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{
        type: "spring",
        damping: 15,
        stiffness: 300,
      }}
      style={styles.successOverlay}
    >
      <LinearGradient
        colors={["rgba(16, 185, 129, 0.9)", "rgba(34, 197, 94, 0.9)"]}
        style={styles.successGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <MotiView
          animate={{
            rotate: "360deg",
            scale: [1, 1.2, 1],
          }}
          transition={{
            type: "spring",
            damping: 15,
            stiffness: 300,
            loop: true,
          }}
        >
          <CheckCircle2 size={48} color="white" />
        </MotiView>
        <Text style={styles.successText}>{message}</Text>
      </LinearGradient>
    </MotiView>
  );
};
export default SuccessMessageModal;
const styles = StyleSheet.create({
  successGradient: {
    width: 200,
    height: 120,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  successText: {
    fontSize: 16,
    fontWeight: "600",
    color: "white",
    textAlign: "center",
  },
  successOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 2000,
  },
});
