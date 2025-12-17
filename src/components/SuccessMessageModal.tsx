import { LinearGradient } from "expo-linear-gradient";
import { CheckCircle2 } from "lucide-react-native";
import { MotiView } from "moti";
import React from "react";
import { StyleSheet, Text } from "react-native";
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
        colors={["rgba(139, 92, 246, 0.95)", "rgba(168, 85, 247, 0.95)"]}
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
          <CheckCircle2 size={48} color="white" strokeWidth={2.5} />
        </MotiView>
        <Text style={styles.successText}>{message}</Text>
      </LinearGradient>
    </MotiView>
  );
};
export default SuccessMessageModal;
const styles = StyleSheet.create({
  successGradient: {
    width: 220,
    height: 130,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
    shadowColor: "#8B5CF6",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
  },
  successText: {
    fontSize: 16,
    fontWeight: "700",
    color: "white",
    textAlign: "center",
    letterSpacing: 0.3,
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
