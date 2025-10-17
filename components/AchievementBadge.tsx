import React from "react";
import { View, Text, Image, StyleSheet, TouchableOpacity } from "react-native";
import { Achievement } from "../types";

interface AchievementBadgeProps {
  achievement: Achievement;
  onPress?: () => void;
  size?: "small" | "medium" | "large";
}

const AchievementBadge: React.FC<AchievementBadgeProps> = ({
  achievement,
  onPress,
  size = "medium",
}) => {
  // Determine if the achievement is locked or unlocked
  const isUnlocked = !!achievement.unlockedAt;

  // Set size dimensions based on the size prop
  const getDimensions = () => {
    switch (size) {
      case "small":
        return { width: 60, height: 60 };
      case "large":
        return { width: 100, height: 100 };
      default:
        return { width: 80, height: 80 }; // medium
    }
  };

  const dimensions = getDimensions();

  // Placeholder image for locked achievements
  const placeholderImage = require("../assets/adaptive-icon.png");

  // Directly use the achievement image based on ID
  const getImageSource = () => {
    if (isUnlocked) {
      // Map achievement IDs to their respective image assets
      switch (achievement.id) {
        case "streak_3":
          return require("../assets/three-days-streak.jpg");
        case "streak_7":
          return require("../assets/seven-days-streak.jpg");
        case "streak_30":
          return require("../assets/adaptive-icon.png");
        case "focus_60":
          return require("../assets/one-hour-focus.jpg");
        case "focus_300":
          return require("../assets/five-hour-focus.jpg");
        case "focus_1000":
          return require("../assets/adaptive-icon.png");
        default:
          console.log(`Using default image for achievement: ${achievement.id}`);
          return placeholderImage;
      }
    } else {
      return require("../assets/locked-achievement.jpg");
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.container,
        { width: dimensions.width, height: dimensions.height },
      ]}
      onPress={onPress}
      disabled={!onPress}
    >
      <Image
        source={getImageSource()}
        style={[
          styles.image,
          { width: dimensions.width, height: dimensions.height },
          !isUnlocked && styles.locked,
        ]}
      />
      {!isUnlocked && (
        <View style={styles.lockOverlay}>
          <Text style={styles.lockText}>🔒</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 40,
    overflow: "hidden",
    margin: 5,
  },
  image: {
    resizeMode: "contain",
  },
  locked: {
    opacity: 0.5,
  },
  lockOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.2)",
  },
  lockText: {
    fontSize: 20,
  },
});

export default AchievementBadge;
