import React, { useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Animated, 
  Easing, 
  TouchableOpacity,
  Dimensions
} from 'react-native';
import { Achievement } from '../types';
import AchievementBadge from './AchievementBadge';
import { Ionicons } from '@expo/vector-icons';

interface AchievementToastProps {
  achievement: Achievement;
  onClose: () => void;
  visible: boolean;
}

const { width } = Dimensions.get('window');

const AchievementToast: React.FC<AchievementToastProps> = ({ 
  achievement, 
  onClose,
  visible 
}) => {
  const slideAnim = useRef(new Animated.Value(-width)).current;
  const scaleAnim = useRef(new Animated.Value(0.5)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Reset animations
      slideAnim.setValue(-width);
      scaleAnim.setValue(0.5);
      opacityAnim.setValue(0);
      rotateAnim.setValue(0);

      // Start animations
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
          easing: Easing.out(Easing.back(1.5)),
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
          easing: Easing.elastic(1.2),
        }),
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
          easing: Easing.elastic(1.5),
        }),
      ]).start();

      // Auto-hide after 5 seconds
      const timer = setTimeout(() => {
        hideToast();
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [visible]);

  const hideToast = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: width,
        duration: 300,
        useNativeDriver: true,
        easing: Easing.in(Easing.ease),
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
    });
  };

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  if (!achievement) return null;

  return (
    <Animated.View 
      style={[
        styles.container,
        {
          transform: [
            { translateX: slideAnim },
            { scale: scaleAnim }
          ],
          opacity: opacityAnim,
        }
      ]}
    >
      <View style={styles.content}>
        <Animated.View style={[styles.badgeContainer, { transform: [{ rotate: spin }] }]}>
          <AchievementBadge achievement={achievement} size="medium" />
        </Animated.View>
        
        <View style={styles.textContainer}>
          <Text style={styles.title}>🏆 Achievement Unlocked!</Text>
          <Text style={styles.achievementName}>{achievement.name}</Text>
          <Text style={styles.description}>{achievement.description}</Text>
        </View>
        
        <TouchableOpacity style={styles.closeButton} onPress={hideToast}>
          <Ionicons name="close-circle" size={24} color="#fff" />
        </TouchableOpacity>
      </View>
      
      <View style={styles.confetti}>
        {Array.from({ length: 20 }).map((_, i) => (
          <View 
            key={i} 
            style={[
              styles.confettiPiece, 
              { 
                backgroundColor: ['#FFD700', '#7C3AED', '#3B82F6', '#34D399', '#F87171'][i % 5],
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                transform: [
                  { rotate: `${Math.random() * 360}deg` },
                  { scale: Math.random() * 0.5 + 0.5 }
                ]
              }
            ]} 
          />
        ))}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 60,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.85)',
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    zIndex: 1000,
  },
  content: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'center',
  },
  badgeContainer: {
    marginRight: 16,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: '#FFD700',
    padding: 2,
    backgroundColor: 'rgba(255,215,0,0.1)',
  },
  textContainer: {
    flex: 1,
  },
  title: {
    color: '#FFD700',
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 4,
  },
  achievementName: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 18,
    marginBottom: 4,
  },
  description: {
    color: '#e5e7eb',
    fontSize: 14,
  },
  closeButton: {
    padding: 4,
  },
  confetti: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    zIndex: -1,
  },
  confettiPiece: {
    position: 'absolute',
    width: 8,
    height: 16,
    borderRadius: 4,
    opacity: 0.7,
  },
});

export default AchievementToast;