import React, { useEffect, useState } from "react";
import { Modal, TouchableOpacity, View } from "react-native";
import { Wallet, X, Minus, Plus } from "lucide-react-native";
import { useTheme } from "../ThemeProvider";
import { Text } from "../ui/text";

interface PurchaseTicketsModalProps {
  visible: boolean;
  onClose: () => void;
  eventName: string;
  maxPerUser?: number;
  onContinue: (quantity: number) => void;
}

export const PurchaseTicketsModal: React.FC<PurchaseTicketsModalProps> = ({
  visible,
  onClose,
  eventName,
  maxPerUser = 5,
  onContinue,
}) => {
  const { theme } = useTheme();
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    if (visible) {
      setQuantity(1);
    }
  }, [visible]);

  const handleDecrease = () => {
    setQuantity((prev) => Math.max(1, prev - 1));
  };

  const handleIncrease = () => {
    setQuantity((prev) => Math.min(maxPerUser, prev + 1));
  };

  const handleContinue = () => {
    onContinue(quantity);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.7)",
          justifyContent: "center",
          alignItems: "center",
          padding: 16,
        }}
      >
        <View
          style={{
            width: "100%",
            maxWidth: 420,
            borderRadius: 24,
            backgroundColor: theme.colors.card,
            overflow: "hidden",
          }}
        >
          {/* Header */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingHorizontal: 20,
              paddingVertical: 18,
              borderBottomWidth: 1,
              borderBottomColor: theme.colors.border,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: theme.colors.primary + "20",
                  justifyContent: "center",
                  alignItems: "center",
                  marginRight: 12,
                }}
              >
                <Wallet
                  size={20}
                  color={theme.colors.primary}
                  strokeWidth={2.5}
                />
              </View>
              <View>
                <Text
                  style={{
                    fontSize: 18,
                    fontWeight: "800",
                    color: theme.colors.text,
                    marginBottom: 2,
                  }}
                >
                  Purchase Tickets
                </Text>
                <Text
                  style={{
                    fontSize: 14,
                    color: theme.colors.text + "80",
                  }}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {eventName}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={onClose}
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: theme.colors.background,
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <X size={18} color={theme.colors.text} />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <View
            style={{
              paddingHorizontal: 20,
              paddingVertical: 24,
            }}
          >
            <Text
              style={{
                fontSize: 16,
                fontWeight: "700",
                color: theme.colors.text,
                marginBottom: 16,
              }}
            >
              Number of Tickets
            </Text>

            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                }}
              >
                {/* Minus button */}
                <TouchableOpacity
                  onPress={handleDecrease}
                  disabled={quantity <= 1}
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: theme.colors.border,
                    justifyContent: "center",
                    alignItems: "center",
                    backgroundColor:
                      quantity <= 1
                        ? theme.colors.background
                        : theme.colors.card,
                    opacity: quantity <= 1 ? 0.6 : 1,
                    marginRight: 12,
                  }}
                >
                  <Minus
                    size={18}
                    color={theme.colors.text}
                    strokeWidth={2.5}
                  />
                </TouchableOpacity>

                {/* Quantity display */}
                <View
                  style={{
                    minWidth: 64,
                    height: 44,
                    borderRadius: 12,
                    backgroundColor: theme.colors.background,
                    justifyContent: "center",
                    alignItems: "center",
                    marginRight: 12,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 18,
                      fontWeight: "700",
                      color: theme.colors.text,
                    }}
                  >
                    {quantity}
                  </Text>
                </View>

                {/* Plus button */}
                <TouchableOpacity
                  onPress={handleIncrease}
                  disabled={quantity >= maxPerUser}
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: theme.colors.border,
                    justifyContent: "center",
                    alignItems: "center",
                    backgroundColor:
                      quantity >= maxPerUser
                        ? theme.colors.background
                        : theme.colors.card,
                    opacity: quantity >= maxPerUser ? 0.6 : 1,
                  }}
                >
                  <Plus size={18} color={theme.colors.text} strokeWidth={2.5} />
                </TouchableOpacity>
              </View>

              <Text
                style={{
                  fontSize: 14,
                  color: theme.colors.text + "80",
                }}
              >
                Max {maxPerUser} per user
              </Text>
            </View>
          </View>

          {/* Footer buttons */}
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              paddingHorizontal: 20,
              paddingVertical: 16,
              borderTopWidth: 1,
              borderTopColor: theme.colors.border,
            }}
          >
            <TouchableOpacity onPress={onClose} style={{ paddingVertical: 8 }}>
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "600",
                  color: theme.colors.text + "CC",
                }}
              >
                Cancel
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleContinue}
              style={{
                paddingHorizontal: 24,
                paddingVertical: 12,
                borderRadius: 999,
                backgroundColor: theme.colors.primary,
              }}
            >
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "700",
                  color: "white",
                }}
              >
                Continue to Checkout
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};
