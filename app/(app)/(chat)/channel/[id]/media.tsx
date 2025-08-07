import {
  View,
  FlatList,
  TouchableOpacity,
  Image,
  Dimensions,
  ActivityIndicator,
} from "react-native";
import { useState, useEffect, useCallback } from "react";
import { Stack, useRouter, useLocalSearchParams } from "expo-router";
import { useChat } from "~/src/lib/chat";
import { Text } from "~/src/components/ui/text";
import { X } from "lucide-react-native";
import * as Linking from "expo-linking";
import { useTheme } from "~/src/components/ThemeProvider";

const MEDIA_TYPES = ["image/*", "video/*"];

export default function MediaGalleryScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { client } = useChat();
  const { theme } = useTheme();
  const [media, setMedia] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const windowWidth = Dimensions.get("window").width;
  const imageSize = (windowWidth - 48) / 3; // 3 columns with 16px padding

  useEffect(() => {
    const loadMedia = async () => {
      try {
        if (!client || !id) return;

        const channel = client.channel("messaging", id as string);
        const response = await channel.query({
          messages: {
            limit: 100,
          },
        });

        const mediaAttachments = response.messages
          .flatMap((message) => message.attachments || [])
          .filter((attachment) =>
            MEDIA_TYPES.some(
              (type) =>
                type.replace("/*", "") === attachment.type?.split("/")[0]
            )
          );

        setMedia(mediaAttachments);
      } catch (error) {
        console.error("Failed to load media:", error);
      } finally {
        setLoading(false);
      }
    };

    loadMedia();
  }, [client, id]);

  const handleMediaPress = useCallback((url: string) => {
    Linking.openURL(url);
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.card }}>
      <Stack.Screen
        options={{
          title: "Media Gallery",
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => router.back()}
              style={{ marginLeft: 16 }}
            >
              <X size={24} color={theme.colors.primary} />
            </TouchableOpacity>
          ),
        }}
      />

      {loading ? (
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <ActivityIndicator size="large" />
        </View>
      ) : media.length === 0 ? (
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <Text style={{ color: theme.colors.text + "80" }}>
            No media found in this chat
          </Text>
        </View>
      ) : (
        <FlatList
          data={media}
          numColumns={3}
          contentContainerStyle={{ padding: 16 }}
          columnWrapperStyle={{ gap: 8 }}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          keyExtractor={(item, index) => `${item.asset_url}-${index}`}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => handleMediaPress(item.asset_url)}
              style={{
                width: imageSize,
                height: imageSize,
                borderRadius: 8,
                overflow: "hidden",
              }}
            >
              <Image
                source={{ uri: item.thumb_url || item.asset_url }}
                style={{ width: "100%", height: "100%" }}
                resizeMode="cover"
              />
              {item.type?.startsWith("video") && (
                <View
                  style={{
                    position: "absolute",
                    top: 4,
                    right: 4,
                    backgroundColor: theme.colors.background + "80",
                    borderRadius: 12,
                    padding: 4,
                  }}
                >
                  <Text style={{ color: theme.colors.text, fontSize: 12 }}>
                    Video
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}
