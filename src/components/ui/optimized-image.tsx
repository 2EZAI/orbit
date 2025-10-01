import React, { useState, useEffect } from "react";
import { View, ActivityIndicator } from "react-native";
import FastImage from "react-native-fast-image";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface OptimizedImageProps {
  uri: string;
  width: number;
  height: number;
  quality?: number;
  fallbackUri?: string;
  className?: string;
  style?: any;
  resizeMode?: "contain" | "cover" | "stretch" | "center";
  lazy?: boolean;
  thumbnail?: boolean;
}

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=600&q=80";
const CACHE_PREFIX = "orbit_image_cache_";

// Persistent cache management
class ImageCacheManager {
  static async markAsCached(uri: string) {
    try {
      await AsyncStorage.setItem(
        `${CACHE_PREFIX}${uri}`,
        Date.now().toString()
      );
    } catch (error) {
      console.warn("Failed to mark image as cached:", error);
    }
  }

  static async isCached(uri: string): Promise<boolean> {
    try {
      const cached = await AsyncStorage.getItem(`${CACHE_PREFIX}${uri}`);
      return cached !== null;
    } catch (error) {
      return false;
    }
  }

  static async clearOldCache() {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter((key) => key.startsWith(CACHE_PREFIX));
      const now = Date.now();
      const oneWeek = 7 * 24 * 60 * 60 * 1000; // 1 week in milliseconds

      for (const key of cacheKeys) {
        const timestamp = await AsyncStorage.getItem(key);
        if (timestamp && now - parseInt(timestamp) > oneWeek) {
          await AsyncStorage.removeItem(key);
        }
      }
    } catch (error) {
      console.warn("Failed to clear old cache:", error);
    }
  }
}

function isValidImage(url: string | undefined | null) {
  if (!url) return false;
  if (typeof url !== "string") return false;
  if (url.trim() === "") return false;
  if (url.includes("placehold.co") || url.includes("fpoimg.com")) return false;
  return true;
}

function getOptimizedUrl(
  uri: string,
  width: number,
  height: number,
  quality: number = 80,
  thumbnail: boolean = false
) {
  if (!uri) return FALLBACK_IMAGE;

  // For Supabase storage images, use transformation API
  if (uri.includes("supabase.co")) {
    const params = thumbnail
      ? `width=${Math.round(width * 0.5)}&height=${Math.round(
          height * 0.5
        )}&quality=${Math.max(quality - 20, 60)}`
      : `width=${width}&height=${height}&quality=${quality}`;
    return `${uri}?${params}`;
  }

  // For other images, try to append common optimization params
  if (uri.includes("unsplash.com")) {
    return `${uri}&w=${width}&h=${height}&q=${quality}&fit=crop`;
  }

  return uri;
}

export function OptimizedImage({
  uri,
  width,
  height,
  quality = 80,
  fallbackUri,
  className,
  style,
  resizeMode = "cover",
  lazy = false,
  thumbnail = false,
}: OptimizedImageProps) {
  const [imageError, setImageError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [shouldLoad, setShouldLoad] = useState(!lazy);
  const [isCached, setIsCached] = useState(false);

  useEffect(() => {
    setImageError(false);
    setIsLoading(true);
    if (!lazy) {
      setShouldLoad(true);
    }

    // Check if image is already cached
    const checkCache = async () => {
      const cached = await ImageCacheManager.isCached(uri);
      setIsCached(cached);
      if (cached) {
        setIsLoading(false);
      }
    };

    if (uri) {
      checkCache();
    }
  }, [uri, lazy]);

  useEffect(() => {
    if (lazy && !isCached) {
      // Slight delay for lazy loading if not cached
      const timer = setTimeout(() => setShouldLoad(true), 100);
      return () => clearTimeout(timer);
    } else if (lazy && isCached) {
      // Load immediately if cached
      setShouldLoad(true);
    }
  }, [lazy, isCached]);

  const imageUri = isValidImage(uri) ? uri : fallbackUri || FALLBACK_IMAGE;
  const optimizedUri = getOptimizedUrl(
    imageUri,
    width,
    height,
    quality,
    thumbnail
  );

  const fastImageResizeMode = {
    contain: FastImage.resizeMode.contain,
    cover: FastImage.resizeMode.cover,
    stretch: FastImage.resizeMode.stretch,
    center: FastImage.resizeMode.center,
  }[resizeMode];

  const handleImageLoad = async () => {
    setIsLoading(false);
    // Mark as cached for future reference
    await ImageCacheManager.markAsCached(uri);
  };

  const handleImageError = () => {
    setImageError(true);
    setIsLoading(false);
  };

  if (!shouldLoad) {
    return (
      <View
        className={className}
        style={[
          { 
            width: isNaN(width) ? 100 : width, 
            height: isNaN(height) ? 100 : height, 
            backgroundColor: "rgba(139, 92, 246, 0.05)" 
          },
          style,
        ]}
      />
    );
  }

  return (
    <View className={className} style={style}>
      <FastImage
        source={{
          uri: optimizedUri,
          priority: thumbnail
            ? FastImage.priority.low
            : FastImage.priority.high,
          cache: FastImage.cacheControl.immutable, // Most aggressive caching
        }}
        style={{ 
          width: isNaN(width) ? 100 : width, 
          height: isNaN(height) ? 100 : height 
        }}
        resizeMode={fastImageResizeMode}
        onError={handleImageError}
        onLoad={handleImageLoad}
        onLoadStart={() => !isCached && setIsLoading(true)}
      />

      {isLoading && !isCached && (
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: "rgba(139, 92, 246, 0.05)",
          }}
        >
          <ActivityIndicator size="small" color="#8B5CF6" />
        </View>
      )}

      {imageError && (
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(139, 92, 246, 0.05)",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <View
            style={{
              width: 20,
              height: 20,
              backgroundColor: "rgba(139, 92, 246, 0.15)",
              borderRadius: 4,
            }}
          />
        </View>
      )}
    </View>
  );
}

// Export cache manager for global use
export { ImageCacheManager };
