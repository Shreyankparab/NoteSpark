import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Vibration,
  Animated,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Accelerometer } from "expo-sensors";
import * as Haptics from "expo-haptics";

interface FlipDeviceOverlayProps {
  isActive: boolean;
  flipDeviceEnabled: boolean;
  onFlipChange?: (isFlipped: boolean) => void;
  onTimeout: () => void; // Called when 10 seconds run out without flipping
}

const FlipDeviceOverlay: React.FC<FlipDeviceOverlayProps> = ({
  isActive,
  flipDeviceEnabled,
  onTimeout,
  onFlipChange,
}) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const [flipCountdown, setFlipCountdown] = useState(10);
  const [showWarning, setShowWarning] = useState(false);
  const flipTimerRef = useRef<NodeJS.Timeout | null>(null);
  const vibrationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const accelerometerSubscription = useRef<any>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Detect device flip using accelerometer
  useEffect(() => {
    if (!flipDeviceEnabled || !isActive) {
      // Clean up accelerometer subscription
      if (accelerometerSubscription.current) {
        accelerometerSubscription.current.remove();
        accelerometerSubscription.current = null;
      }
      setShowWarning(false);
      setIsFlipped(false);
      if (onFlipChange) onFlipChange(false);
      return;
    }

    // Subscribe to accelerometer
    Accelerometer.setUpdateInterval(100);
    accelerometerSubscription.current = Accelerometer.addListener((data) => {
      // Check if device is face down (flipped)
      // z-axis will be negative when face down
      const isFaceDown = data.z < -0.7;
      const isFaceUp = data.z > 0.7;

      if (isFaceDown && !isFlipped) {
        setIsFlipped(true);
        if (onFlipChange) onFlipChange(true);
        setShowWarning(false);
        setFlipCountdown(10);

        // Haptic feedback
        if (Platform.OS === "ios") {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      } else if (isFaceUp && isFlipped) {
        setIsFlipped(false);
        if (onFlipChange) onFlipChange(false);
        setShowWarning(true);
        setFlipCountdown(10);

        // Haptic feedback
        if (Platform.OS === "ios") {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        }
      }
    });

    return () => {
      if (accelerometerSubscription.current) {
        accelerometerSubscription.current.remove();
        accelerometerSubscription.current = null;
      }
    };
  }, [flipDeviceEnabled, isActive, isFlipped]);

  // Flip countdown timer
  useEffect(() => {
    if (!flipDeviceEnabled || !isActive || isFlipped) {
      // Clear timers if not needed
      if (flipTimerRef.current) {
        clearInterval(flipTimerRef.current);
        flipTimerRef.current = null;
      }
      if (vibrationIntervalRef.current) {
        clearInterval(vibrationIntervalRef.current);
        vibrationIntervalRef.current = null;
      }
      setShowWarning(false);
      return;
    }

    // Start countdown when device is not flipped
    setShowWarning(true);

    flipTimerRef.current = setInterval(() => {
      setFlipCountdown((prev) => {
        if (prev <= 1) {
          // Time's up! Call onTimeout
          onTimeout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Vibrate every second
    vibrationIntervalRef.current = setInterval(() => {
      Vibration.vibrate(200);
    }, 1000);

    return () => {
      if (flipTimerRef.current) {
        clearInterval(flipTimerRef.current);
        flipTimerRef.current = null;
      }
      if (vibrationIntervalRef.current) {
        clearInterval(vibrationIntervalRef.current);
        vibrationIntervalRef.current = null;
      }
    };
  }, [flipDeviceEnabled, isActive, isFlipped, onTimeout]);

  // Fade in/out animation
  useEffect(() => {
    if (showWarning && !isFlipped) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [showWarning, isFlipped]);

  if (!flipDeviceEnabled || !isActive) {
    return null;
  }

  return (
    <>
      {/* Flip Warning Banner */}
      {showWarning && !isFlipped && flipCountdown > 0 && (
        <Animated.View style={[styles.warningBanner, { opacity: fadeAnim }]}>
          <View style={styles.warningContent}>
            <Ionicons name="phone-portrait-outline" size={24} color="#FFF" />
            <View style={styles.warningTextContainer}>
              <Text style={styles.warningTitle}>Flip Device!</Text>
              <Text style={styles.warningSubtitle}>
                {flipCountdown} seconds remaining
              </Text>
            </View>
          </View>
          <View style={styles.countdownCircle}>
            <Text style={styles.countdownText}>{flipCountdown}</Text>
          </View>
        </Animated.View>
      )}

      {/* Success Banner */}
      {isFlipped && (
        <Animated.View style={[styles.successBanner, { opacity: fadeAnim }]}>
          <Ionicons name="checkmark-circle" size={24} color="#FFF" />
          <Text style={styles.successText}>Device flipped! Keep it face down</Text>
        </Animated.View>
      )}

      {/* Status Indicator (always visible when flip mode is on) */}
      <View style={styles.statusIndicator}>
        <Ionicons
          name={isFlipped ? "phone-portrait" : "phone-portrait-outline"}
          size={16}
          color={isFlipped ? "#10B981" : "rgba(255,255,255,0.5)"}
        />
        <Text style={styles.statusText}>
          Flip Mode: {isFlipped ? "Active" : "Inactive"}
        </Text>
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  warningBanner: {
    position: "absolute",
    top: Platform.OS === "ios" ? 60 : 40,
    left: 16,
    right: 16,
    backgroundColor: "rgba(239, 68, 68, 0.95)",
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    zIndex: 1000,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  warningContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  warningTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  warningTitle: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "800",
  },
  warningSubtitle: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 13,
    fontWeight: "600",
    marginTop: 2,
  },
  countdownCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FFF",
  },
  countdownText: {
    color: "#FFF",
    fontSize: 18,
    fontWeight: "800",
  },
  successBanner: {
    position: "absolute",
    top: Platform.OS === "ios" ? 60 : 40,
    left: 16,
    right: 16,
    backgroundColor: "rgba(16, 185, 129, 0.95)",
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    zIndex: 1000,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  successText: {
    color: "#FFF",
    fontSize: 15,
    fontWeight: "700",
    marginLeft: 12,
  },
  statusIndicator: {
    position: "absolute",
    bottom: 100,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.3)",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    zIndex: 100,
  },
  statusText: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 13,
    fontWeight: "600",
    marginLeft: 8,
  },
});

export default FlipDeviceOverlay;
