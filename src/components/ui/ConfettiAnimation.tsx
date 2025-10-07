import React, { useState, useEffect } from 'react';
import { View, Text, Animated, Dimensions } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface ConfettiAnimationProps {
  isActive: boolean;
  onComplete?: () => void;
  colors?: string[];
  shapes?: string[];
  pieceCount?: number;
  duration?: number;
}

export const ConfettiAnimation: React.FC<ConfettiAnimationProps> = ({
  isActive,
  onComplete,
  colors = ['#8B5CF6', '#A855F7', '#D4AF37', '#FFD700', '#B8860B', '#DAA520', '#8B5CF6', '#A855F7', '#D4AF37', '#FFD700'],
  shapes = ['■', '●', '▲', '♦', '◆', '◊', '■', '●', '▲', '♦', '◆', '◊'],
  pieceCount = 80,
  duration = 5000,
}) => {
  const [confettiPieces, setConfettiPieces] = useState<any[]>([]);

  const triggerConfetti = () => {
    const pieces = [];
    
    // Create confetti pieces with realistic physics
    for (let i = 0; i < pieceCount; i++) {
      const startX = SCREEN_WIDTH / 2 + (Math.random() - 0.5) * 100;
      const piece = {
        id: i,
        x: startX,
        y: -20,
        rotation: Math.random() * 360,
        scale: 0.5 + Math.random() * 1.2,
        color: colors[Math.floor(Math.random() * colors.length)],
        shape: shapes[Math.floor(Math.random() * shapes.length)],
        velocity: {
          x: (Math.random() - 0.5) * 8,
          y: 2 + Math.random() * 6,
          rotation: (Math.random() - 0.5) * 20,
        },
        opacity: new Animated.Value(1),
        translateX: new Animated.Value(0),
        translateY: new Animated.Value(0),
        rotate: new Animated.Value(0),
      };
      pieces.push(piece);
    }
    
    setConfettiPieces(pieces);

    // Animate each piece with realistic physics
    pieces.forEach((piece, index) => {
      const delay = index * 8; // Staggered animation
      
      setTimeout(() => {
        Animated.parallel([
          // Gravity and movement
          Animated.timing(piece.translateY, {
            toValue: SCREEN_HEIGHT + 200,
            duration: 3000 + Math.random() * 2000,
            useNativeDriver: true,
          }),
          // Horizontal drift
          Animated.timing(piece.translateX, {
            toValue: piece.velocity.x * 200,
            duration: 3000 + Math.random() * 2000,
            useNativeDriver: true,
          }),
          // Multiple rotations
          Animated.timing(piece.rotate, {
            toValue: piece.rotation + 1080 + Math.random() * 720,
            duration: 2500 + Math.random() * 1500,
            useNativeDriver: true,
          }),
          // Fade out sequence
          Animated.sequence([
            Animated.delay(800 + Math.random() * 1200),
            Animated.timing(piece.opacity, {
              toValue: 0,
              duration: 1500 + Math.random() * 1000,
              useNativeDriver: true,
            }),
          ]),
        ]).start();
      }, delay);
    });

    // Hide confetti after animation completes
    setTimeout(() => {
      setConfettiPieces([]);
      onComplete?.();
    }, duration);
  };

  useEffect(() => {
    if (isActive) {
      triggerConfetti();
    }
  }, [isActive]);

  if (!isActive || confettiPieces.length === 0) {
    return null;
  }

  return (
    <View
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 10000,
        pointerEvents: 'none',
      }}
    >
      {confettiPieces.map((piece) => (
        <Animated.View
          key={piece.id}
          style={{
            position: 'absolute',
            left: piece.x,
            top: piece.y,
            transform: [
              { translateX: piece.translateX },
              { translateY: piece.translateY },
              { 
                rotate: piece.rotate.interpolate({
                  inputRange: [0, 360],
                  outputRange: ['0deg', '360deg'],
                })
              },
              { scale: piece.scale },
            ],
            opacity: piece.opacity,
          }}
        >
          <Text 
            style={{ 
              fontSize: 16 + Math.random() * 12, 
              color: piece.color,
              textShadowColor: 'rgba(0,0,0,0.3)',
              textShadowOffset: { width: 1, height: 1 },
              textShadowRadius: 2,
              fontWeight: 'bold',
            }}
          >
            {piece.shape}
          </Text>
        </Animated.View>
      ))}
    </View>
  );
};
