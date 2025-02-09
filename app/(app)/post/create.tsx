import React, { useState } from "react";
import {
  View,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  useWindowDimensions,
} from "react-native";
import { Text } from "~/src/components/ui/text";
import { Button } from "~/src/components/ui/button";
import { router } from "expo-router";
import { Image as ImageIcon, X, MapPin, ArrowLeft } from "lucide-react-native";
import * as ImagePicker from "expo-image-picker";
import { supabase } from "~/src/lib/supabase";
import { useAuth } from "~/src/lib/auth";
import { Stack } from "expo-router";
import { useUser } from "~/hooks/useUserData";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function CreatePost() {
  const { session } = useAuth();
  const { user } = useUser();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const [content, setContent] = useState("");
  const [mediaFiles, setMediaFiles] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsMultipleSelection: true,
      quality: 0.8,
      selectionLimit: 4,
    });

    if (!result.canceled) {
      setMediaFiles([
        ...mediaFiles,
        ...result.assets.map((asset) => asset.uri),
      ]);
    }
  };

  const removeMedia = (index: number) => {
    setMediaFiles(mediaFiles.filter((_, i) => i !== index));
  };

  const uploadMedia = async (uri: string): Promise<string> => {
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      const fileExt = uri.split(".").pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${session?.user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("post_media")
        .upload(filePath, blob);

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("post_media").getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.error("Error uploading media:", error);
      throw error;
    }
  };

  const createPost = async () => {
    if (!content.trim() && mediaFiles.length === 0) {
      Alert.alert("Error", "Please add some content or media to your post");
      return;
    }

    setLoading(true);
    try {
      const mediaUrls = await Promise.all(mediaFiles.map(uploadMedia));

      const { error } = await supabase.from("posts").insert([
        {
          user_id: session?.user.id,
          content: content.trim(),
          media_urls: mediaUrls,
        },
      ]);

      if (error) throw error;
      router.back();
    } catch (error) {
      console.error("Error creating post:", error);
      Alert.alert("Error", "Failed to create post. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      className="flex-1 bg-background"
    >
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />

      {/* Custom Header */}
      <SafeAreaView className="bg-background">
        <View className="flex-row items-center justify-between p-4 border-b border-border">
          <TouchableOpacity onPress={() => router.back()}>
            <ArrowLeft size={24} className="text-foreground" />
          </TouchableOpacity>
          <Button
            variant="default"
            className="px-6 rounded-full bg-primary"
            disabled={loading || (!content.trim() && mediaFiles.length === 0)}
            onPress={createPost}
          >
            <Text className="font-medium text-primary-foreground">
              {loading ? "Posting..." : "Post"}
            </Text>
          </Button>
        </View>
      </SafeAreaView>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingBottom: insets.bottom + 80, // Add extra padding for tab bar
        }}
      >
        <View className="flex-row p-4">
          <Image
            source={
              user?.avatar_url
                ? { uri: user.avatar_url }
                : require("~/assets/favicon.png")
            }
            className="w-10 h-10 rounded-full bg-muted"
          />
          <View className="flex-1 ml-3">
            <TextInput
              className="text-base text-foreground"
              placeholder="What's happening?"
              placeholderTextColor="#666"
              multiline
              value={content}
              onChangeText={setContent}
              autoFocus
              style={{ maxHeight: height * 0.2 }} // Limit height to 20% of screen
            />

            {/* Media Preview */}
            {mediaFiles.length > 0 && (
              <View className="flex-row flex-wrap mt-4">
                {mediaFiles.map((uri, index) => (
                  <View key={uri} className="relative w-1/2 p-1 aspect-square">
                    <Image
                      source={{ uri }}
                      className="w-full h-full rounded-xl"
                      resizeMode="cover"
                    />
                    <TouchableOpacity
                      className="absolute p-1.5 rounded-full top-3 right-3 bg-black/50"
                      onPress={() => removeMedia(index)}
                    >
                      <X size={16} color="white" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            {/* Action Buttons - Moved inside scroll view */}
            <View className="flex-row items-center pt-4 mt-4 border-t border-border">
              <TouchableOpacity
                className="flex-row items-center mr-6"
                onPress={pickImage}
                disabled={mediaFiles.length >= 4}
              >
                <ImageIcon
                  size={24}
                  className={
                    mediaFiles.length >= 4
                      ? "text-muted-foreground"
                      : "text-primary"
                  }
                />
              </TouchableOpacity>

              <TouchableOpacity
                className="flex-row items-center"
                onPress={() => {
                  // Handle location selection
                }}
              >
                <MapPin size={24} className="text-primary" />
              </TouchableOpacity>

              {loading && (
                <View className="flex-row items-center ml-auto">
                  <ActivityIndicator size="small" className="text-primary" />
                  <Text className="ml-2 text-muted-foreground">Posting...</Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
