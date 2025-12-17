import React from "react";
import {
  View,
  Modal,
  TouchableWithoutFeedback,
  Animated,
  StyleSheet,
  Dimensions,
  ScrollView,
} from "react-native";
import { BlurView } from "expo-blur";
import { useTheme } from "../ThemeProvider";

interface SheetProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  fullScreen?: boolean;
  expanded?: boolean;
  isScrollable?: boolean;
}

export const Sheet: React.FC<SheetProps> = ({
  isOpen,
  onClose,
  children,
  fullScreen = false,
  expanded = false,
  isScrollable = true,
}) => {
  const { theme, isDarkMode } = useTheme();
  const [modalVisible, setModalVisible] = React.useState(false);
  const slideAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (isOpen) {
      setModalVisible(true);
      Animated.spring(slideAnim, {
        toValue: 1,
        useNativeDriver: true,
        damping: 20,
        mass: 1,
        stiffness: 100,
      }).start();
    } else {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        damping: 20,
        mass: 1,
        stiffness: 100,
      }).start(() => {
        setModalVisible(false);
      });
    }
  }, [isOpen]);

  const translateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [Dimensions.get("window").height, fullScreen ? 0 : 0],
  });

  const dynamicStyles = {
    content: {
      backgroundColor: theme.colors.card,
      borderTopLeftRadius: fullScreen ? 0 : 24,
      borderTopRightRadius: fullScreen ? 0 : 24,
      paddingTop: fullScreen ? 0 : 8,
      maxHeight: fullScreen ? "100%" : expanded ? "75%" : "90%",
      minHeight: fullScreen ? "100%" : expanded ? "75%" : "50%",
    },
    handle: {
      backgroundColor: theme.colors.border,
    },
  };

  return (
    <Modal
      animationType="none"
      transparent={true}
      visible={modalVisible}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        {!fullScreen && (
          <TouchableWithoutFeedback onPress={onClose}>
            <View style={StyleSheet.absoluteFill}>
              <BlurView
                intensity={isDarkMode ? 10 : 20}
                style={StyleSheet.absoluteFill}
              />
            </View>
          </TouchableWithoutFeedback>
        )}

        <Animated.View
          style={[
            styles.content,
            dynamicStyles.content,
            {
              transform: [{ translateY }],
            },
          ]}
        >
          {!fullScreen && (
            <View style={[styles.handle, dynamicStyles.handle]} />
          )}
          {isScrollable ? (
            <ScrollView
              style={[
                styles.scrollView,
                { backgroundColor: theme.colors.card },
              ]}
              bounces={true}
              showsVerticalScrollIndicator={true}
              contentContainerStyle={{
                backgroundColor: theme.colors.card,
              }}
            >
              {children}
            </ScrollView>
          ) : (
            children
          )}
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0, 0, 0, 0.4)",
  },
  content: {
    paddingTop: 8,
  },
  handle: {
    width: 32,
    height: 4,
    borderRadius: 2,
    marginVertical: 8,
    alignSelf: "center",
  },
  scrollView: {
    maxHeight: "100%",
  },
});
