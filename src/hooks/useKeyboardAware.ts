import { useState, useEffect, useRef, createContext, useContext } from "react";
import {
  Keyboard,
  Platform,
  ScrollView,
  findNodeHandle,
  Dimensions,
} from "react-native";

interface KeyboardState {
  keyboardHeight: number;
  isKeyboardVisible: boolean;
}

interface ScrollToInputContextType {
  scrollToInput: (inputRef: React.RefObject<any>) => void;
}

const ScrollToInputContext = createContext<ScrollToInputContextType | null>(
  null
);

export const useScrollToInput = () => {
  const context = useContext(ScrollToInputContext);
  return context;
};

export function useKeyboardAware() {
  const [keyboardState, setKeyboardState] = useState<KeyboardState>({
    keyboardHeight: 0,
    isKeyboardVisible: false,
  });
  const scrollViewRef = useRef<ScrollView>(null);

  // Function to scroll to a specific input when focused
  const scrollToInput = (inputRef: React.RefObject<any>) => {
    if (inputRef.current && scrollViewRef.current) {
      // Very conservative approach - only scroll if absolutely necessary
      setTimeout(() => {
        inputRef.current.measureLayout(
          findNodeHandle(scrollViewRef.current),
          (x: number, y: number, width: number, height: number) => {
            const screenHeight = Dimensions.get("window").height;
            const keyboardHeight = keyboardState.isKeyboardVisible
              ? keyboardState.keyboardHeight
              : 0;

            // Only scroll if the input would be covered by the keyboard
            const inputBottomY = y + height;
            const keyboardStartY = screenHeight - keyboardHeight;

            if (keyboardHeight > 0 && inputBottomY > keyboardStartY - 50) {
              // Input is hidden by keyboard, scroll just enough to show it
              const minScrollNeeded = inputBottomY - keyboardStartY + 100; // 100px padding

              scrollViewRef.current?.scrollTo({
                y: minScrollNeeded,
                animated: true,
              });
            }
            // For inputs at the top, don't scroll at all to prevent aggressive scrolling
          },
          () => {
            // Don't scroll if measurement fails
          }
        );
      }, 250); // Longer delay to let keyboard animation settle
    }
  };

  useEffect(() => {
    const keyboardWillShow = (event: any) => {
      const { height } = event;
      setKeyboardState({
        keyboardHeight: height,
        isKeyboardVisible: true,
      });
    };

    const keyboardWillHide = () => {
      setKeyboardState({
        keyboardHeight: 0,
        isKeyboardVisible: false,
      });
    };

    const keyboardDidShow = () => {
      // Don't auto-scroll when keyboard shows - let individual inputs handle their own scrolling
      // This prevents aggressive auto-scrolling behavior
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

  return {
    keyboardState,
    scrollViewRef,
    scrollToInput,
    ScrollToInputContext,
  };
}
