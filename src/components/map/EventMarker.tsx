import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Text,
} from "react-native";

interface EventMarkerProps {
  imageUrl?: string;
  count?: number;
  isSelected?: boolean;
  onPress?: () => void;
  category?: string;
  type?: string;
  source?: string;
}

export const EventMarker = React.memo(function EventMarker({
  imageUrl,
  count = 1,
  isSelected = false,
  onPress,
  category,
  type,
  source,
}: EventMarkerProps) {
  const [imageLoading, setImageLoading] = useState(true);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [shouldLoadImage, setShouldLoadImage] = useState(true); // Start with true to load immediately
  const hasLoadedBefore = useRef<Set<string>>(new Set()); // Track which images have loaded before

  // Determine border color based on category/type
  const getBorderColor = () => {
    // Priority: source > category > type
    if (source === "ticketmaster" || source === "ticketed-events") {
      return "#e11d48"; // Red for ticketed events
    }
    if (source === "featured-events") {
      return "#f59e0b"; // Amber for featured events
    }
    if (category) {
      const categoryLower = category.toLowerCase();
      if (categoryLower.includes("music")) return "#8b5cf6"; // Purple for music
      if (categoryLower.includes("sports")) return "#059669"; // Green for sports
      if (categoryLower.includes("arts") || categoryLower.includes("theatre"))
        return "#dc2626"; // Red for arts
      if (categoryLower.includes("food") || categoryLower.includes("drink"))
        return "#ea580c"; // Orange for food
      if (categoryLower.includes("entertainment")) return "#7c3aed"; // Violet for entertainment
      if (categoryLower.includes("water") || categoryLower.includes("sports"))
        return "#0891b2"; // Cyan for water sports
    }
    if (type) {
      const typeLower = type.toLowerCase();
      if (typeLower.includes("event")) return "#3b82f6"; // Blue for events
      if (typeLower.includes("location")) return "#10b981"; // Emerald for locations
    }
    return "#6b7280"; // Default gray
  };

  // Reset states when imageUrl changes
  useEffect(() => {
    if (imageUrl) {
      // If this image has loaded before, use cached state
      if (hasLoadedBefore.current.has(imageUrl)) {
        setImageLoaded(true);
        setImageLoading(false);
        setImageError(false);
        setShouldLoadImage(true);
        return;
      }

      // Reset states for new image
      setImageError(false);
      setImageLoading(true);
      setImageLoaded(false);
      setShouldLoadImage(true);

      // Set a timeout to stop loading after 5 seconds
      const timeout = setTimeout(() => {
        setImageLoading(false);
        setImageError(true);
      }, 5000);

      return () => clearTimeout(timeout);
    } else {
      // No image URL - show error state
      setImageError(true);
      setImageLoading(false);
      setImageLoaded(false);
      setShouldLoadImage(false);
    }
  }, [imageUrl]);

  // REMOVED: Selected state handling to prevent image breaking

  // More robust image optimization - try multiple strategies
  const getOptimizedImageUrl = (url: string) => {
    if (!url) return null;

    // If URL already has optimization parameters, use as-is
    if (url.includes("?")) {
      return url;
    }

    // Try different optimization strategies based on the image service
    if (url.includes("supabase.co/storage")) {
      // Supabase Storage - NO transformation parameters (they don't work)
      // Just return the original URL - Supabase serves static files as-is
      // TODO: Backend should provide pre-optimized thumbnail URLs for better performance
      return url;
    } else if (url.includes("ticketmaster") || url.includes("tmstatic")) {
      // Ticketmaster images - use their optimization
      return `${url}?w=40&h=40&fit=crop&auto=format&q=60`;
    } else if (
      url.includes("googleapis") ||
      url.includes("googleusercontent")
    ) {
      // Google images - use their optimization
      return `${url}=w40-h40-c`;
    } else if (url.includes("cloudinary")) {
      // Cloudinary images - use their optimization
      return url.replace("/upload/", "/upload/w_40,h_40,c_fill,q_60,f_auto/");
    } else {
      // Generic optimization - try common parameters
      return `${url}?w=40&h=40&fit=crop&auto=format&q=60`;
    }
  };

  const optimizedImageUrl = imageUrl ? getOptimizedImageUrl(imageUrl) : null;


  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      style={{
        width: 40,
        height: 40,
        borderRadius: 8,
        backgroundColor: "white",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
        borderWidth: 2,
        borderColor: getBorderColor(),
        transform: isSelected ? [{ scale: 1.1 }] : undefined,
      }}
    >
      {optimizedImageUrl ? (
        <View
          style={{
            width: "100%",
            height: "100%",
            borderRadius: 8,
            position: "relative",
          }}
        >
          {/* Loading placeholder - much smaller and less intrusive */}
          {imageLoading && !imageLoaded && !imageError && (
            <View
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                width: "100%",
                height: "100%",
                borderRadius: 8,
                backgroundColor: "#f3f4f6",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <View
                style={{
                  width: 8,
                  height: 8,
                  backgroundColor: "#60a5fa",
                  borderRadius: 4,
                }}
              />
            </View>
          )}

          {/* Error fallback - show a simple icon instead of loading spinner */}
          {imageError && (
            <View
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                width: "100%",
                height: "100%",
                borderRadius: 8,
                backgroundColor: "#f9fafb",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <View
                style={{
                  width: 16,
                  height: 16,
                  backgroundColor: "#d1d5db",
                  borderRadius: 8,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text style={{ color: "#6b7280", fontSize: 10 }}>📍</Text>
              </View>
            </View>
          )}

          {/* Actual image */}
          <Image
            key={optimizedImageUrl} // Force new instance for each unique image URL
            source={{
              uri: optimizedImageUrl,
              cache: "force-cache", // Force caching for better performance
            }}
            style={{
              width: "100%",
              height: "100%",
              borderRadius: 8,
              opacity: imageLoaded ? 1 : 0, // Smooth fade-in when loaded
            }}
            onError={() => {
              setImageError(true);
              setImageLoading(false);
            }}
            onLoadStart={() => {
              setImageError(false);
              setImageLoading(true);
            }}
            onLoad={() => {
              setImageLoaded(true);
              setImageLoading(false);
              // Track that this image has loaded successfully
              if (optimizedImageUrl) {
                hasLoadedBefore.current.add(optimizedImageUrl);
              }
            }}
            resizeMode="cover"
            fadeDuration={200} // Smooth fade transition
          />
        </View>
      ) : (
        <View
          style={{
            width: "100%",
            height: "100%",
            borderRadius: 8,
            backgroundColor: "#f3e8ff",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <View
            style={{
              width: 24,
              height: 24,
              borderRadius: 12,
              backgroundColor: "#d8b4fe",
            }}
          />
        </View>
      )}
      {count > 1 && (
        <View
          style={{
            position: "absolute",
            alignItems: "center",
            justifyContent: "center",
            width: 20,
            height: 20,
            borderWidth: 1,
            borderColor: "white",
            borderRadius: 10,
            top: -4,
            right: -4,
            backgroundColor: "#8b5cf6",
          }}
        >
          <Text style={{ fontSize: 10, fontWeight: "bold", color: "white" }}>
            {count}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
});
