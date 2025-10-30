import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
  ActivityIndicator,
  Alert,
  Dimensions,
  Animated,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "~/src/components/ThemeProvider";
import { useAIDescription } from "~/src/hooks/useAIDescription";
import type {
  AIDescriptionRequest,
  AIRefineRequest,
} from "~/src/types/aiDescriptionTypes";
import {
  Sparkles,
  Wand2,
  RefreshCw,
  CheckCircle,
  X,
  PenTool,
} from "lucide-react-native";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

interface AIDescriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDescriptionGenerated: (description: string) => void;
  eventName: string;
  startDateTime: string;
  endDateTime?: string;
  venueName?: string;
  address?: string;
  city?: string;
  state?: string;
  locationId?: string;
}

export function AIDescriptionModal({
  isOpen,
  onClose,
  onDescriptionGenerated,
  eventName,
  startDateTime,
  endDateTime,
  venueName,
  address,
  city,
  state,
  locationId,
}: AIDescriptionModalProps) {
  const { theme, isDarkMode } = useTheme();
  const insets = useSafeAreaInsets();
  const [userDescription, setUserDescription] = useState("");
  const [refinementFeedback, setRefinementFeedback] = useState("");
  const [showRefinement, setShowRefinement] = useState(false);

  // Animation refs
  const rotateAnim = useRef(new Animated.Value(0)).current;

  const {
    isGenerating,
    isRefining,
    generatedDescription,
    isTyping,
    currentText,
    error,
    suggestions,
    generateDescription,
    refineDescription,
    clearDescription,
    stopTyping,
  } = useAIDescription();

  // Clear state when modal opens
  useEffect(() => {
    if (isOpen) {
      setUserDescription("");
      setRefinementFeedback("");
      setShowRefinement(false);
      clearDescription();
    }
  }, [isOpen, clearDescription]);

  // Start/stop rotation animation based on generating state
  useEffect(() => {
    if (isGenerating) {
      Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        { iterations: -1 }
      ).start();
    } else {
      rotateAnim.stopAnimation();
      rotateAnim.setValue(0);
    }
  }, [isGenerating, rotateAnim]);

  const handleGenerate = async () => {
    if (!userDescription.trim()) {
      Alert.alert("Error", "Please enter a description of your event");
      return;
    }

    if (!eventName.trim()) {
      Alert.alert("Error", "Please enter an event name first");
      return;
    }

    console.log("🔍 [AI Modal] Starting description generation with:", {
      userDescription: userDescription.substring(0, 50) + "...",
      eventName,
      startDateTime,
      hasLocation: !!locationId,
    });

    const request: AIDescriptionRequest = {
      userDescription: userDescription.trim(),
      eventName,
      startDateTime,
      endDateTime,
      venueName,
      address,
      city,
      state,
      locationId,
    };

    await generateDescription(request);
  };

  const handleRefine = async () => {
    if (!refinementFeedback.trim()) {
      Alert.alert("Error", "Please enter feedback for refinement");
      return;
    }

    if (!generatedDescription) {
      Alert.alert("Error", "No description to refine");
      return;
    }

    const request: AIRefineRequest = {
      originalDescription: generatedDescription,
      userFeedback: refinementFeedback.trim(),
      eventName,
      startDateTime,
      endDateTime,
      venueName,
      address,
      city,
      state,
      locationId,
    };

    await refineDescription(request);
    setRefinementFeedback("");
  };

  const handleUseDescription = () => {
    if (generatedDescription) {
      onDescriptionGenerated(generatedDescription);
      onClose();
    }
  };

  const handleStopTyping = () => {
    stopTyping();
    // Also stop the generation process if it's still running
    if (isGenerating) {
      clearDescription();
    }
  };

  const handleNewDescription = () => {
    setShowRefinement(false);
    setRefinementFeedback("");
    clearDescription();
  };

  return (
    <Modal
      visible={isOpen}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: theme.colors.background,
          paddingTop: insets.top,
        }}
      >
        {/* Header */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: 20,
            paddingVertical: 16,
            borderBottomWidth: 1,
            borderBottomColor: theme.colors.border,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: isDarkMode
                  ? "rgba(168, 85, 247, 0.2)"
                  : "rgba(168, 85, 247, 0.1)",
                alignItems: "center",
                justifyContent: "center",
                marginRight: 12,
              }}
            >
              <Sparkles size={20} color="#A855F7" />
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontSize: 20,
                  fontWeight: "bold",
                  color: theme.colors.text,
                }}
              >
                AI Event Description
              </Text>
              <Text
                style={{
                  fontSize: 14,
                  color: theme.colors.text,
                  opacity: 0.7,
                }}
              >
                Let AI create an engaging description for your event
              </Text>
            </View>
          </View>
          <TouchableOpacity
            onPress={onClose}
            style={{
              width: 32,
              height: 32,
              borderRadius: 16,
              backgroundColor: theme.colors.card,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <X size={18} color={theme.colors.text} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 20 }}
          showsVerticalScrollIndicator={false}
        >
          {/* User Input Section */}
          {!generatedDescription && (
            <View style={{ marginBottom: 24 }}>
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "600",
                  color: theme.colors.text,
                  marginBottom: 12,
                }}
              >
                Describe your event
              </Text>
              <TextInput
                placeholder="Tell us about your event... What will happen? Who should attend? What makes it special?"
                placeholderTextColor={theme.colors.text + "80"}
                value={userDescription}
                onChangeText={setUserDescription}
                multiline
                numberOfLines={4}
                style={{
                  backgroundColor: theme.colors.card,
                  borderRadius: 12,
                  padding: 16,
                  fontSize: 16,
                  color: theme.colors.text,
                  textAlignVertical: "top",
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                }}
              />
              <Text
                style={{
                  fontSize: 12,
                  color: theme.colors.text,
                  opacity: 0.6,
                  marginTop: 8,
                }}
              >
                Be as detailed or brief as you like. AI will enhance your
                description.
              </Text>

              <TouchableOpacity
                onPress={handleGenerate}
                disabled={!userDescription.trim() || !eventName.trim()}
                style={{
                  backgroundColor:
                    !userDescription.trim() || !eventName.trim()
                      ? theme.colors.border
                      : "#8B5CF6",
                  paddingVertical: 16,
                  paddingHorizontal: 24,
                  borderRadius: 12,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  marginTop: 20,
                }}
              >
                {isGenerating ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Wand2 size={20} color="white" style={{ marginRight: 8 }} />
                )}
                <Text
                  style={{
                    color: "white",
                    fontSize: 16,
                    fontWeight: "600",
                    marginLeft: 8,
                  }}
                >
                  {isGenerating ? "Generating..." : "Generate AI Description"}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Loading State */}
          {isGenerating && (
            <View
              style={{
                backgroundColor: theme.colors.card,
                borderRadius: 16,
                padding: 24,
                alignItems: "center",
                borderWidth: 1,
                borderColor: theme.colors.border,
                marginBottom: 24,
              }}
            >
              <Animated.View
                style={{
                  width: 60,
                  height: 60,
                  borderRadius: 30,
                  backgroundColor: "#8B5CF6",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 16,
                  transform: [
                    {
                      rotate: rotateAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: ["0deg", "360deg"],
                      }),
                    },
                  ],
                }}
              >
                <Animated.View
                  style={{
                    transform: [
                      {
                        rotate: rotateAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: ["0deg", "360deg"],
                        }),
                      },
                    ],
                  }}
                >
                  <Sparkles size={24} color="white" />
                </Animated.View>
              </Animated.View>
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: "600",
                  color: theme.colors.text,
                  marginBottom: 8,
                }}
              >
                AI is crafting your description...
              </Text>
              <Text
                style={{
                  fontSize: 14,
                  color: theme.colors.text,
                  opacity: 0.7,
                }}
              >
                This may take a few moments
              </Text>
            </View>
          )}

          {/* Generated Description */}
          {generatedDescription && (
            <View style={{ marginBottom: 24 }}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 16,
                }}
              >
                <Text
                  style={{
                    fontSize: 18,
                    fontWeight: "bold",
                    color: "#10B981",
                  }}
                >
                  Generated Description
                </Text>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <TouchableOpacity
                    onPress={() => setShowRefinement(!showRefinement)}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      backgroundColor: "#8B5CF6" + "20",
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      borderRadius: 8,
                    }}
                  >
                    <PenTool size={14} color="#8B5CF6" />
                    <Text
                      style={{
                        color: "#8B5CF6",
                        fontSize: 12,
                        fontWeight: "600",
                        marginLeft: 4,
                      }}
                    >
                      Refine
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleNewDescription}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      backgroundColor: theme.colors.card,
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: theme.colors.border,
                    }}
                  >
                    <RefreshCw size={14} color={theme.colors.text} />
                    <Text
                      style={{
                        color: theme.colors.text,
                        fontSize: 12,
                        fontWeight: "600",
                        marginLeft: 4,
                      }}
                    >
                      New
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View
                style={{
                  backgroundColor: theme.colors.card,
                  borderRadius: 12,
                  padding: 16,
                  borderWidth: 1,
                  borderColor: "#10B981" + "30",
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    marginBottom: 12,
                  }}
                >
                  <CheckCircle size={16} color="#10B981" />
                  <Text
                    style={{
                      color: "#10B981",
                      fontSize: 12,
                      fontWeight: "600",
                      marginLeft: 6,
                    }}
                  >
                    AI Generated
                  </Text>
                  {isTyping && (
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        marginLeft: 8,
                      }}
                    >
                      <View
                        style={{
                          width: 4,
                          height: 4,
                          borderRadius: 2,
                          backgroundColor: "#10B981",
                          marginRight: 2,
                        }}
                      />
                      <View
                        style={{
                          width: 4,
                          height: 4,
                          borderRadius: 2,
                          backgroundColor: "#10B981",
                          marginRight: 2,
                        }}
                      />
                      <View
                        style={{
                          width: 4,
                          height: 4,
                          borderRadius: 2,
                          backgroundColor: "#10B981",
                        }}
                      />
                    </View>
                  )}
                </View>

                <Text
                  style={{
                    fontSize: 16,
                    lineHeight: 24,
                    color: theme.colors.text,
                  }}
                >
                  {isTyping ? currentText : generatedDescription}
                  {isTyping && (
                    <Text
                      style={{
                        color: "#10B981",
                        fontWeight: "bold",
                      }}
                    >
                      |
                    </Text>
                  )}
                </Text>

                {isTyping && (
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginTop: 12,
                    }}
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                      }}
                    >
                      <View
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: 3,
                          backgroundColor: "#10B981",
                          marginRight: 6,
                        }}
                      />
                      <Text
                        style={{
                          color: "#10B981",
                          fontSize: 12,
                          fontWeight: "500",
                        }}
                      >
                        AI is typing...
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={handleStopTyping}
                      style={{
                        backgroundColor: theme.colors.card,
                        paddingHorizontal: 12,
                        paddingVertical: 4,
                        borderRadius: 6,
                        borderWidth: 1,
                        borderColor: theme.colors.border,
                      }}
                    >
                      <Text
                        style={{
                          color: theme.colors.text,
                          fontSize: 12,
                          fontWeight: "500",
                        }}
                      >
                        Stop
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              {/* Suggestions */}
              {suggestions.length > 0 && (
                <View style={{ marginTop: 16 }}>
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: "600",
                      color: theme.colors.text,
                      marginBottom: 8,
                    }}
                  >
                    Suggestions for improvement:
                  </Text>
                  <View
                    style={{
                      flexDirection: "row",
                      flexWrap: "wrap",
                      gap: 8,
                    }}
                  >
                    {suggestions.map((suggestion, index) => (
                      <View
                        key={index}
                        style={{
                          backgroundColor: "#F59E0B" + "20",
                          paddingHorizontal: 12,
                          paddingVertical: 6,
                          borderRadius: 16,
                          borderWidth: 1,
                          borderColor: "#F59E0B" + "30",
                        }}
                      >
                        <Text
                          style={{
                            color: "#F59E0B",
                            fontSize: 12,
                            fontWeight: "500",
                          }}
                        >
                          {suggestion}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Refinement Section */}
              {showRefinement && (
                <View
                  style={{
                    backgroundColor: "#8B5CF6" + "10",
                    borderRadius: 12,
                    padding: 16,
                    marginTop: 16,
                    borderWidth: 1,
                    borderColor: "#8B5CF6" + "20",
                  }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      marginBottom: 12,
                    }}
                  >
                    <PenTool size={16} color="#8B5CF6" />
                    <Text
                      style={{
                        color: "#8B5CF6",
                        fontSize: 14,
                        fontWeight: "600",
                        marginLeft: 6,
                      }}
                    >
                      Refine Description
                    </Text>
                  </View>

                  <TextInput
                    placeholder="What would you like to change? (e.g., 'Make it more exciting', 'Add more details about the venue', 'Focus more on the target audience')"
                    placeholderTextColor={theme.colors.text + "60"}
                    value={refinementFeedback}
                    onChangeText={setRefinementFeedback}
                    multiline
                    numberOfLines={3}
                    style={{
                      backgroundColor: theme.colors.background,
                      borderRadius: 8,
                      padding: 12,
                      fontSize: 14,
                      color: theme.colors.text,
                      textAlignVertical: "top",
                      borderWidth: 1,
                      borderColor: theme.colors.border,
                      marginBottom: 12,
                    }}
                  />

                  <View style={{ flexDirection: "row", gap: 8 }}>
                    <TouchableOpacity
                      onPress={handleRefine}
                      disabled={!refinementFeedback.trim()}
                      style={{
                        backgroundColor: !refinementFeedback.trim()
                          ? theme.colors.border
                          : "#8B5CF6",
                        paddingHorizontal: 16,
                        paddingVertical: 8,
                        borderRadius: 8,
                        flexDirection: "row",
                        alignItems: "center",
                        flex: 1,
                      }}
                    >
                      {isRefining ? (
                        <ActivityIndicator size="small" color="white" />
                      ) : (
                        <Wand2 size={14} color="white" />
                      )}
                      <Text
                        style={{
                          color: "white",
                          fontSize: 14,
                          fontWeight: "600",
                          marginLeft: 6,
                        }}
                      >
                        {isRefining ? "Refining..." : "Refine"}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => setShowRefinement(false)}
                      style={{
                        backgroundColor: theme.colors.card,
                        paddingHorizontal: 16,
                        paddingVertical: 8,
                        borderRadius: 8,
                        borderWidth: 1,
                        borderColor: theme.colors.border,
                      }}
                    >
                      <Text
                        style={{
                          color: theme.colors.text,
                          fontSize: 14,
                          fontWeight: "500",
                        }}
                      >
                        Cancel
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          )}

          {/* Error State */}
          {error && (
            <View
              style={{
                backgroundColor: "#EF4444" + "10",
                borderRadius: 12,
                padding: 16,
                borderWidth: 1,
                borderColor: "#EF4444" + "20",
                flexDirection: "row",
                alignItems: "center",
              }}
            >
              <View
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 10,
                  backgroundColor: "#EF4444",
                  alignItems: "center",
                  justifyContent: "center",
                  marginRight: 12,
                }}
              >
                <X size={12} color="white" />
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: "600",
                    color: "#EF4444",
                    marginBottom: 4,
                  }}
                >
                  Error
                </Text>
                <Text
                  style={{
                    fontSize: 12,
                    color: "#EF4444",
                    opacity: 0.8,
                  }}
                >
                  {error}
                </Text>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Footer */}
        <View
          style={{
            paddingHorizontal: 20,
            paddingVertical: 16,
            borderTopWidth: 1,
            borderTopColor: theme.colors.border,
            backgroundColor: theme.colors.background,
            paddingBottom: insets.bottom + 16,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              paddingBottom: 35,
            }}
          >
            <TouchableOpacity
              onPress={onClose}
              style={{
                backgroundColor: theme.colors.card,
                paddingHorizontal: 20,
                paddingVertical: 12,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: theme.colors.border,
              }}
            >
              <Text
                style={{
                  color: theme.colors.text,
                  fontSize: 16,
                  fontWeight: "500",
                }}
              >
                Cancel
              </Text>
            </TouchableOpacity>

            {generatedDescription && (
              <TouchableOpacity
                onPress={handleUseDescription}
                disabled={isTyping}
                style={{
                  backgroundColor: isTyping ? theme.colors.border : "#10B981",
                  paddingHorizontal: 20,
                  paddingVertical: 12,
                  borderRadius: 8,
                  flexDirection: "row",
                  alignItems: "center",
                }}
              >
                <CheckCircle size={16} color="white" />
                <Text
                  style={{
                    color: "white",
                    fontSize: 16,
                    fontWeight: "600",
                    marginLeft: 6,
                  }}
                >
                  Use This Description
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}
