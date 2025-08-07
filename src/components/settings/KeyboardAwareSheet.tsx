import React, { useEffect, useRef, createContext, useContext } from "react";
import {
  View,
  Modal,
  TouchableWithoutFeedback,
  Animated,
  StyleSheet,
  Dimensions,
  Keyboard,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
  findNodeHandle,
} from "react-native";
import { BlurView } from "expo-blur";
import { useTheme } from "../ThemeProvider";

interface KeyboardAwareSheetProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  fullScreen?: boolean;
  expanded?: boolean;
}

interface ScrollToInputContextType {
  scrollToInput: (inputRef: React.RefObject<any>) => void;
}

const ScrollToInputContext = createContext<ScrollToInputContextType | null>(
  null
);

export const useScrollToInput = () => {
  const context = useContext(ScrollToInputContext);
  if (!context) {
    throw new Error(
      "useScrollToInput must be used within a KeyboardAwareSheet"
    );
  }
  return context;
};

export const KeyboardAwareSheet: React.FC<KeyboardAwareSheetProps> = ({
  isOpen,
  onClose,
  children,
  fullScreen = false,
  expanded = false,
}) => {
  const { theme, isDarkMode } = useTheme();
  const [modalVisible, setModalVisible] = React.useState(false);
  const [keyboardHeight, setKeyboardHeight] = React.useState(0);
  const slideAnim = React.useRef(new Animated.Value(0)).current;
  const keyboardAnim = React.useRef(new Animated.Value(0)).current;
  const scrollViewRef = useRef<ScrollView>(null);

  // Function to scroll to a specific input when focused
  const scrollToInput = (inputRef: React.RefObject<any>) => {
    if (inputRef.current && scrollViewRef.current) {
      setTimeout(() => {
        inputRef.current.measureLayout(
          findNodeHandle(scrollViewRef.current),
          (x: number, y: number, width: number, height: number) => {
            scrollViewRef.current?.scrollTo({
              y: y - 50, // Add some padding above the input
              animated: true,
            });
          },
          () => {
            // Fallback: scroll to end if measure fails
            scrollViewRef.current?.scrollToEnd({ animated: true });
          }
        );
      }, 100);
    }
  };

  // Handle keyboard events
  useEffect(() => {
    const keyboardWillShow = (event: any) => {
      const { height, duration } = event;
      setKeyboardHeight(height);

      Animated.timing(keyboardAnim, {
        toValue: height,
        duration: duration || 250,
        useNativeDriver: false,
      }).start();
    };

    const keyboardWillHide = (event: any) => {
      const { duration } = event;
      setKeyboardHeight(0);

      Animated.timing(keyboardAnim, {
        toValue: 0,
        duration: duration || 250,
        useNativeDriver: false,
      }).start();
    };

    const keyboardDidShow = (event: any) => {
      // Scroll to bottom when keyboard shows to ensure input is visible
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    };

    // Use different event names based on platform
    const showEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSubscription = Keyboard.addListener(showEvent, keyboardWillShow);
    const hideSubscription = Keyboard.addListener(hideEvent, keyboardWillHide);
    const didShowSubscription = Keyboard.addListener(
      "keyboardDidShow",
      keyboardDidShow
    );

    return () => {
      showSubscription?.remove();
      hideSubscription?.remove();
      didShowSubscription?.remove();
    };
  }, []);

  // Handle modal animation
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
        // Reset keyboard state when modal closes
        setKeyboardHeight(0);
        keyboardAnim.setValue(0);
      });
    }
  }, [isOpen]);

  const translateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [Dimensions.get("window").height, fullScreen ? 0 : 0],
  });

  // Calculate dynamic heights based on keyboard presence
  const screenHeight = Dimensions.get("window").height;
  const availableHeight = screenHeight - keyboardHeight;

  // Auto-expand when keyboard is visible
  const isAutoExpanded = keyboardHeight > 0 || expanded;

  const dynamicStyles = {
    content: {
      backgroundColor: theme.colors.background,
      borderTopLeftRadius: fullScreen ? 0 : 24,
      borderTopRightRadius: fullScreen ? 0 : 24,
      paddingTop: fullScreen ? 0 : 8,
      // Adjust max height based on keyboard presence
      maxHeight: fullScreen
        ? "100%"
        : keyboardHeight > 0
        ? Math.min(availableHeight * 0.9, screenHeight * 0.85)
        : isAutoExpanded
        ? "75%"
        : "90%",
      minHeight: fullScreen
        ? "100%"
        : keyboardHeight > 0
        ? Math.min(availableHeight * 0.7, screenHeight * 0.6)
        : isAutoExpanded
        ? "75%"
        : "50%",
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
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
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
                // Add bottom margin when keyboard is visible
                marginBottom:
                  Platform.OS === "android" ? keyboardHeight * 0.1 : 0,
              },
            ]}
          >
            {!fullScreen && (
              <View style={[styles.handle, dynamicStyles.handle]} />
            )}

            <ScrollView
              ref={scrollViewRef}
              style={[
                styles.scrollView,
                { backgroundColor: theme.colors.background },
              ]}
              contentContainerStyle={{
                backgroundColor: theme.colors.background,
                // Add extra padding at bottom when keyboard is visible
                paddingBottom: keyboardHeight > 0 ? 20 : 0,
              }}
              bounces={true}
              showsVerticalScrollIndicator={true}
              keyboardShouldPersistTaps="handled"
              // Enable scroll to input when focused
              scrollEventThrottle={16}
            >
              <ScrollToInputContext.Provider value={{ scrollToInput }}>
                {children}
              </ScrollToInputContext.Provider>
            </ScrollView>
          </Animated.View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  keyboardAvoidingView: {
    flex: 1,
  },
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
