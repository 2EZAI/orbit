import React, { useRef } from "react";
import { View, ViewStyle, TextStyle } from "react-native";
import { Input } from "~/src/components/ui/input";
import { useScrollToInput } from "./KeyboardAwareSheet";

interface KeyboardAwareInputProps {
  value: string;
  onChangeText: (text: string) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  autoCorrect?: boolean;
  keyboardType?:
    | "default"
    | "email-address"
    | "numeric"
    | "phone-pad"
    | "number-pad"
    | "decimal-pad";
  multiline?: boolean;
  numberOfLines?: number;
  style?: TextStyle;
  placeholderTextColor?: string;
  containerStyle?: ViewStyle;
  maxLength?: number;
  renderAccessory?: () => React.ReactNode;
}

export const KeyboardAwareInput: React.FC<KeyboardAwareInputProps> = React.memo(
  ({ onFocus, containerStyle, renderAccessory, ...inputProps }) => {
    const inputRef = useRef(null);
    const { scrollToInput } = useScrollToInput();

    const handleFocus = () => {
      // Temporarily disable scrollToInput to test if it's causing the issue
      // scrollToInput(inputRef);
      onFocus?.();
    };

    // If no containerStyle and no accessory, don't wrap in an extra View
    if (!containerStyle && !renderAccessory) {
      return <Input ref={inputRef} {...inputProps} onFocus={handleFocus} />;
    }

    return (
      <View style={containerStyle}>
        <Input ref={inputRef} {...inputProps} onFocus={handleFocus} />
        {renderAccessory && renderAccessory()}
      </View>
    );
  }
);
