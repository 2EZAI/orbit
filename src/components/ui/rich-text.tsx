import React from "react";
import { Text, TouchableOpacity, Linking } from "react-native";
import { router } from "expo-router";
import { useTheme } from "~/src/components/ThemeProvider";

interface RichTextProps {
  children: string;
  style?: any;
  numberOfLines?: number;
}

interface ParsedTextPart {
  type: string;
  content: string;
  data?: string;
  start: number;
  end: number;
}

export function RichText({ children, style, numberOfLines }: RichTextProps) {
  const { theme } = useTheme();

  const parseText = (text: string) => {
    if (!text) return [{ type: "text", content: text }];

    const parts = [];
    let currentIndex = 0;

    // Regex patterns for different content types
    const patterns = [
      {
        type: "url",
        regex: /(https?:\/\/[^\s]+)/g,
      },
      {
        type: "mention",
        regex: /@([a-zA-Z0-9_]+)/g,
      },
      {
        type: "hashtag",
        regex: /#([a-zA-Z0-9_]+)/g,
      },
    ];

    // Find all matches and their positions
    const matches: ParsedTextPart[] = [];
    patterns.forEach((pattern) => {
      let match;
      while ((match = pattern.regex.exec(text)) !== null) {
        matches.push({
          type: pattern.type,
          content: match[0],
          data: match[1], // The captured group (without @ or #)
          start: match.index,
          end: match.index + match[0].length,
        });
      }
    });

    // Sort matches by position
    matches.sort((a, b) => a.start - b.start);

    // Build parts array
    matches.forEach((match) => {
      // Add text before the match
      if (currentIndex < match.start) {
        parts.push({
          type: "text",
          content: text.substring(currentIndex, match.start),
        });
      }

      // Add the match
      parts.push(match);
      currentIndex = match.end;
    });

    // Add remaining text
    if (currentIndex < text.length) {
      parts.push({
        type: "text",
        content: text.substring(currentIndex),
      });
    }

    return parts;
  };

  const handlePress = (type: string, data: string) => {
    switch (type) {
      case "url":
        Linking.openURL(data);
        break;
      case "mention":
        // Navigate to user profile by username
        // TODO: This would need a search function to find user by username
        console.log("Navigate to user:", data);
        // router.push(`/(app)/profile/${data}`);
        break;
      case "hashtag":
        // Navigate to search with hashtag
        console.log("Search hashtag:", data);
        // Could open search sheet with the hashtag
        break;
    }
  };

  const renderPart = (part: any, index: number) => {
    const baseStyle = {
      ...style,
      color: style?.color || theme.colors.text,
    };

    switch (part.type) {
      case "url":
        return (
          <TouchableOpacity
            key={index}
            onPress={() => handlePress("url", part.content)}
          >
            <Text
              style={{
                ...baseStyle,
                color: theme.colors.primary,
                textDecorationLine: "underline",
              }}
            >
              {part.content}
            </Text>
          </TouchableOpacity>
        );

      case "mention":
        return (
          <TouchableOpacity
            key={index}
            onPress={() => handlePress("mention", part.data)}
          >
            <Text
              style={{
                ...baseStyle,
                color: theme.colors.primary,
                fontWeight: "600",
              }}
            >
              {part.content}
            </Text>
          </TouchableOpacity>
        );

      case "hashtag":
        return (
          <TouchableOpacity
            key={index}
            onPress={() => handlePress("hashtag", part.data)}
          >
            <Text
              style={{
                ...baseStyle,
                color: theme.colors.primary,
                fontWeight: "500",
              }}
            >
              {part.content}
            </Text>
          </TouchableOpacity>
        );

      default:
        return (
          <Text key={index} style={baseStyle}>
            {part.content}
          </Text>
        );
    }
  };

  const parts = parseText(children);

  return (
    <Text numberOfLines={numberOfLines} style={style}>
      {parts.map(renderPart)}
    </Text>
  );
}
