import { useCallback } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useNotificationsApi } from "~/hooks/useNotificationsApi";
import { useFocusEffect } from "expo-router";

const NotificationBadge = () => {
  const { unReadCount, fetchAllNoifications } = useNotificationsApi();
  useFocusEffect(
    useCallback(() => {
      fetchAllNoifications(1, 20);
    }, [])
  );
  
  return unReadCount ? (
    <View style={[
      styles.container,
      unReadCount > 9 && { right: -12 } // Move further right when showing "9+" to avoid touching bell icon
    ]}>
      <Text style={styles.text}>
        {unReadCount > 9 ? "9+" : String(unReadCount)}
      </Text>
    </View>
  ) : null;
};
export default NotificationBadge;
const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: "#ff3b30",
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "white",
  },
  text: {
    color: "white",
    fontSize: 12,
    fontWeight: "bold",
    lineHeight: 14,
    textAlign: "center",
    includeFontPadding: false,
  },
});
