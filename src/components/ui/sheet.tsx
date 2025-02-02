import React from "react";
import {
  View,
  Modal,
  TouchableWithoutFeedback,
  Animated,
  StyleSheet,
  Dimensions,
  ScrollView,
} from "react-native";
import { BlurView } from "expo-blur";

interface SheetProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export const Sheet: React.FC<SheetProps> = ({ isOpen, onClose, children }) => {
  const [modalVisible, setModalVisible] = React.useState(false);
  const slideAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (isOpen) {
      setModalVisible(true);
      Animated.spring(slideAnim, {
        toValue: 1,
        useNativeDriver: true,
        damping: 20,
        mass: 1,
        stiffness: 100,
      }).start();
    } else {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        damping: 20,
        mass: 1,
        stiffness: 100,
      }).start(() => {
        setModalVisible(false);
      });
    }
  }, [isOpen]);

  const translateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [Dimensions.get("window").height, 0],
  });

  return (
    <Modal
      animationType="none"
      transparent={true}
      visible={modalVisible}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={StyleSheet.absoluteFill}>
            <BlurView intensity={20} style={StyleSheet.absoluteFill} />
          </View>
        </TouchableWithoutFeedback>

        <Animated.View
          style={[
            styles.content,
            {
              transform: [{ translateY }],
            },
          ]}
        >
          <View style={styles.handle} />
          <ScrollView
            style={styles.scrollView}
            bounces={false}
            showsVerticalScrollIndicator={false}
          >
            {children}
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0, 0, 0, 0.4)",
  },
  content: {
    backgroundColor: "white",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 8,
    maxHeight: "90%",
    minHeight: "50%",
  },
  handle: {
    width: 32,
    height: 4,
    backgroundColor: "#E5E5E5",
    borderRadius: 2,
    marginVertical: 8,
    alignSelf: "center",
  },
  scrollView: {
    maxHeight: "100%",
  },
});
