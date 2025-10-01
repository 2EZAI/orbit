import React, { useState } from "react";
import {
  View,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { Image, Camera, Paperclip } from "lucide-react-native";
import * as ImagePicker from "expo-image-picker";
import { useTheme } from "../ThemeProvider";
import { Text } from "../ui/text";

interface CustomMessageInputProps {
  onSendMessage: (text: string, attachments?: any[]) => void;
  onCommand?: (command: string, args: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function CustomMessageInput({
  onSendMessage,
  onCommand,
  placeholder = "Type a message...",
  disabled = false,
}: CustomMessageInputProps) {
  const { theme } = useTheme();
  const [message, setMessage] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  const handleSend = () => {
    if (message.trim() || isUploading) {
      // Check for commands (e.g., /event search_term)
      const trimmedMessage = message.trim();
      console.log("CustomMessageInput: Message to send:", trimmedMessage);
      
      if (trimmedMessage.startsWith('/') && onCommand) {
        const [command, ...args] = trimmedMessage.split(' ');
        const argsString = args.join(' ');
        console.log("CustomMessageInput: Command detected:", command.substring(1), "Args:", argsString);
        console.log("CustomMessageInput: onCommand function exists:", !!onCommand);
        onCommand(command.substring(1), argsString); // Remove the '/' from command
        setMessage("");
        return;
      }
      
      // Debug: Check if it's a command but onCommand is not available
      if (trimmedMessage.startsWith('/')) {
        console.log("CustomMessageInput: Command detected but onCommand not available");
      }
      
      // Regular message
      console.log("CustomMessageInput: Sending regular message");
      onSendMessage(trimmedMessage);
      setMessage("");
    }
  };

  const handleImagePicker = async (source: 'library' | 'camera') => {
    try {
      // Request appropriate permissions
      let permissionResult;
      if (source === 'camera') {
        permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      } else {
        permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      }

      if (permissionResult.status !== "granted") {
        Alert.alert(
          "Permission Required",
          `Please grant permission to access your ${source === 'camera' ? 'camera' : 'photo library'} to send images.`
        );
        return;
      }

      // Launch image picker with appropriate source
      const result = source === 'camera' 
        ? await ImagePicker.launchCameraAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.8,
            base64: false,
          })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.8,
            base64: false,
          });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const image = result.assets[0];
        setIsUploading(true);

        try {
          // Create attachment object for Stream Chat
          const attachment = {
            type: "image",
            asset_url: image.uri,
            thumb_url: image.uri,
            image_url: image.uri,
            fallback: "Image",
            title: "Image",
            title_link: image.uri,
            text: "Image attachment",
            actions: [],
            fields: [],
            asset: image.uri,
            og_scrape_url: image.uri,
            image: image.uri,
            name: image.fileName || "image.jpg",
            mime_type: "image/jpeg",
            file_size: image.fileSize || 0,
            original_width: image.width,
            original_height: image.height,
          };

          // Send message with image attachment
          onSendMessage("", [attachment]);
        } catch (error) {
          console.error("Error uploading image:", error);
          Alert.alert("Error", "Failed to upload image. Please try again.");
        } finally {
          setIsUploading(false);
        }
      }
    } catch (error) {
      console.error("Error with image picker:", error);
      Alert.alert("Error", "Failed to open image picker. Please try again.");
      setIsUploading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.card }]}>
      {/* Camera Button */}
      <TouchableOpacity
        style={[
          styles.imageButton,
          { backgroundColor: theme.colors.border },
          disabled && styles.disabledButton,
        ]}
        onPress={() => handleImagePicker('camera')}
        disabled={disabled || isUploading}
      >
        {isUploading ? (
          <ActivityIndicator size="small" color={theme.colors.primary} />
        ) : (
          <Camera size={20} color={theme.colors.primary} />
        )}
      </TouchableOpacity>

      {/* Photo Library Button */}
      <TouchableOpacity
        style={[
          styles.imageButton,
          { backgroundColor: theme.colors.border },
          disabled && styles.disabledButton,
        ]}
        onPress={() => handleImagePicker('library')}
        disabled={disabled || isUploading}
      >
        {isUploading ? (
          <ActivityIndicator size="small" color={theme.colors.primary} />
        ) : (
          <Image size={20} color={theme.colors.primary} />
        )}
      </TouchableOpacity>

      {/* Text Input */}
      <TextInput
        style={[
          styles.textInput,
          {
            backgroundColor: theme.colors.background,
            color: theme.colors.text,
            borderColor: theme.colors.border,
          },
        ]}
        value={message}
        onChangeText={setMessage}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.text + "80"}
        multiline
        maxLength={1000}
        editable={!disabled}
        onSubmitEditing={handleSend}
        returnKeyType="send"
      />

      {/* Send Button */}
      <TouchableOpacity
        style={[
          styles.sendButton,
          {
            backgroundColor: message.trim() || isUploading ? theme.colors.primary : theme.colors.border,
          },
          disabled && styles.disabledButton,
        ]}
        onPress={handleSend}
        disabled={disabled || (!message.trim() && !isUploading)}
      >
        <Text
          style={[
            styles.sendText,
            {
              color: message.trim() || isUploading ? "white" : theme.colors.text + "60",
            },
          ]}
        >
          {isUploading ? "..." : "Send"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.1)",
    gap: 12,
  },
  imageButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  textInput: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    fontSize: 16,
    lineHeight: 20,
  },
  sendButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    minWidth: 60,
  },
  sendText: {
    fontSize: 16,
    fontWeight: "600",
  },
  disabledButton: {
    opacity: 0.5,
  },
});
