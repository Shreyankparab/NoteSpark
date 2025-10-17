import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  Dimensions,
  Modal,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { ACHIEVEMENTS } from "../utils/achievements";
import { Achievement, AchievementType } from "../types";

interface AchievementsScreenProps {
  userId: string;
  userAchievements: Achievement[];
  currentStreak: number;
  totalFocusMinutes: number;
  totalTasksCompleted: number;
  onClose: () => void;
}

type FilterType = "all" | "unlocked" | "locked";

const { width } = Dimensions.get("window");
const CARD_WIDTH = (width - 48) / 2;

const AchievementsScreen: React.FC<AchievementsScreenProps> = ({
  userId,
  userAchievements,
  currentStreak,
  totalFocusMinutes,
  totalTasksCompleted,
  onClose,
}) => {
  const [filter, setFilter] = useState<FilterType>("all");
  const [selectedAchievement, setSelectedAchievement] = useState<any>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(50));

  useEffect(() => {
    // Entrance animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const isAchievementUnlocked = (achievementId: string) => {
    return userAchievements.some((a) => a.id === achievementId);
  };

  const getProgress = (achievement: any) => {
    if (achievement.type === AchievementType.STREAK) {
      const progress = Math.min((currentStreak / achievement.threshold) * 100, 100);
      return {
        percentage: progress,
        current: currentStreak,
        target: achievement.threshold,
      };
    } else if (achievement.type === AchievementType.FOCUS_TIME) {
      const progress = Math.min((totalFocusMinutes / achievement.threshold) * 100, 100);
      return {
        percentage: progress,
        current: totalFocusMinutes,
        target: achievement.threshold,
      };
    } else if (achievement.type === AchievementType.TASKS_COMPLETED) {
      const progress = Math.min((totalTasksCompleted / achievement.threshold) * 100, 100);
      return {
        percentage: progress,
        current: totalTasksCompleted,
        target: achievement.threshold,
      };
    }
    return { percentage: 0, current: 0, target: 0 };
  };

  const getUnlockedDate = (achievementId: string) => {
    const achievement = userAchievements.find((a) => a.id === achievementId);
    if (achievement?.unlockedAt) {
      const date = achievement.unlockedAt.toDate
        ? achievement.unlockedAt.toDate()
        : new Date(achievement.unlockedAt);
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    }
    return null;
  };

  const filteredAchievements = ACHIEVEMENTS.filter((achievement) => {
    const isUnlocked = isAchievementUnlocked(achievement.id);
    if (filter === "unlocked") return isUnlocked;
    if (filter === "locked") return !isUnlocked;
    return true;
  });

  const unlockedCount = ACHIEVEMENTS.filter((a) =>
    isAchievementUnlocked(a.id)
  ).length;

  const handleAchievementPress = (achievement: any) => {
    const isUnlocked = isAchievementUnlocked(achievement.id);
    const progress = getProgress(achievement);
    const unlockedDate = getUnlockedDate(achievement.id);

    setSelectedAchievement({
      ...achievement,
      isUnlocked,
      progress,
      unlockedDate,
    });
    setShowDetailModal(true);
  };

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#0f172a" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Achievements</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Stats Card */}
          <LinearGradient
            colors={["#F59E0B", "#F97316"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.statsCard}
          >
            <View style={styles.statsIconContainer}>
              <Ionicons name="trophy" size={40} color="#FFF" />
            </View>
            <View style={styles.statsTextContainer}>
              <Text style={styles.statsNumber}>
                {unlockedCount}/{ACHIEVEMENTS.length}
              </Text>
              <Text style={styles.statsLabel}>Achievements Unlocked</Text>
            </View>
            <View style={styles.progressBarContainer}>
              <View style={styles.progressBarBg}>
                <View
                  style={[
                    styles.progressBarFill,
                    {
                      width: `${(unlockedCount / ACHIEVEMENTS.length) * 100}%`,
                    },
                  ]}
                />
              </View>
              <Text style={styles.progressText}>
                {Math.round((unlockedCount / ACHIEVEMENTS.length) * 100)}%
                Complete
              </Text>
            </View>
          </LinearGradient>

          {/* Filter Tabs */}
          <View style={styles.filterContainer}>
            <TouchableOpacity
              style={[styles.filterTab, filter === "all" && styles.filterTabActive]}
              onPress={() => setFilter("all")}
            >
              <Text
                style={[
                  styles.filterTabText,
                  filter === "all" && styles.filterTabTextActive,
                ]}
              >
                All ({ACHIEVEMENTS.length})
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.filterTab,
                filter === "unlocked" && styles.filterTabActive,
              ]}
              onPress={() => setFilter("unlocked")}
            >
              <Text
                style={[
                  styles.filterTabText,
                  filter === "unlocked" && styles.filterTabTextActive,
                ]}
              >
                Unlocked ({unlockedCount})
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.filterTab,
                filter === "locked" && styles.filterTabActive,
              ]}
              onPress={() => setFilter("locked")}
            >
              <Text
                style={[
                  styles.filterTabText,
                  filter === "locked" && styles.filterTabTextActive,
                ]}
              >
                Locked ({ACHIEVEMENTS.length - unlockedCount})
              </Text>
            </TouchableOpacity>
          </View>

          {/* Achievements Grid */}
          <View style={styles.achievementsGrid}>
            {filteredAchievements.map((achievement, index) => {
              const isUnlocked = isAchievementUnlocked(achievement.id);
              const progress = getProgress(achievement);

              return (
                <TouchableOpacity
                  key={achievement.id}
                  style={[
                    styles.achievementCard,
                    !isUnlocked && styles.achievementCardLocked,
                  ]}
                  onPress={() => handleAchievementPress(achievement)}
                  activeOpacity={0.7}
                >
                  <View style={styles.achievementImageContainer}>
                    {isUnlocked ? (
                      <>
                        <Image
                          source={achievement.imageFile}
                          style={styles.achievementImage}
                        />
                        <View style={styles.unlockedBadge}>
                          <Ionicons name="checkmark-circle" size={24} color="#10B981" />
                        </View>
                      </>
                    ) : (
                      <View style={styles.lockedOverlay}>
                        <Ionicons name="lock-closed" size={32} color="#94A3B8" />
                      </View>
                    )}
                  </View>

                  <View style={styles.achievementInfo}>
                    <Text
                      style={[
                        styles.achievementName,
                        !isUnlocked && styles.achievementNameLocked,
                      ]}
                      numberOfLines={1}
                    >
                      {achievement.name}
                    </Text>
                    <Text
                      style={[
                        styles.achievementDescription,
                        !isUnlocked && styles.achievementDescriptionLocked,
                      ]}
                      numberOfLines={2}
                    >
                      {achievement.description}
                    </Text>

                    {!isUnlocked && (
                      <View style={styles.progressContainer}>
                        <View style={styles.progressBarSmall}>
                          <View
                            style={[
                              styles.progressBarSmallFill,
                              { width: `${progress.percentage}%` },
                            ]}
                          />
                        </View>
                        <Text style={styles.progressTextSmall}>
                          {progress.current}/{progress.target}
                        </Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          {filteredAchievements.length === 0 && (
            <View style={styles.emptyState}>
              <Ionicons name="ribbon-outline" size={64} color="#CBD5E1" />
              <Text style={styles.emptyStateText}>No achievements found</Text>
            </View>
          )}
        </ScrollView>
      </Animated.View>

      {/* Achievement Detail Modal */}
      {showDetailModal && selectedAchievement && (
        <Modal
          visible={showDetailModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowDetailModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowDetailModal(false)}
              >
                <Ionicons name="close-circle" size={32} color="#64748B" />
              </TouchableOpacity>

              <View style={styles.modalImageContainer}>
                {selectedAchievement.isUnlocked ? (
                  <Image
                    source={selectedAchievement.imageFile}
                    style={styles.modalImage}
                  />
                ) : (
                  <View style={styles.modalLockedImage}>
                    <Ionicons name="lock-closed" size={64} color="#94A3B8" />
                  </View>
                )}
              </View>

              <View style={styles.modalBody}>
                <Text style={styles.modalTitle}>{selectedAchievement.name}</Text>
                <Text style={styles.modalDescription}>
                  {selectedAchievement.description}
                </Text>

                {selectedAchievement.isUnlocked ? (
                  <View style={styles.modalUnlockedSection}>
                    <LinearGradient
                      colors={["#10B981", "#059669"]}
                      style={styles.modalUnlockedBadge}
                    >
                      <Ionicons name="checkmark-circle" size={24} color="#FFF" />
                      <Text style={styles.modalUnlockedText}>Unlocked!</Text>
                    </LinearGradient>
                    {selectedAchievement.unlockedDate && (
                      <Text style={styles.modalUnlockedDate}>
                        Achieved on {selectedAchievement.unlockedDate}
                      </Text>
                    )}
                  </View>
                ) : (
                  <View style={styles.modalLockedSection}>
                    <View style={styles.modalProgressHeader}>
                      <Text style={styles.modalProgressTitle}>Your Progress</Text>
                      <Text style={styles.modalProgressPercentage}>
                        {Math.round(selectedAchievement.progress.percentage)}%
                      </Text>
                    </View>

                    <View style={styles.modalProgressBar}>
                      <View
                        style={[
                          styles.modalProgressBarFill,
                          {
                            width: `${selectedAchievement.progress.percentage}%`,
                          },
                        ]}
                      />
                    </View>

                    <Text style={styles.modalProgressText}>
                      {selectedAchievement.progress.current} /{" "}
                      {selectedAchievement.progress.target}{" "}
                      {selectedAchievement.type === AchievementType.STREAK
                        ? "days"
                        : selectedAchievement.type === AchievementType.FOCUS_TIME
                        ? "minutes"
                        : "tasks"}
                    </Text>

                    <View style={styles.modalTipContainer}>
                      <Ionicons name="bulb" size={20} color="#F59E0B" />
                      <Text style={styles.modalTipText}>
                        {selectedAchievement.type === AchievementType.STREAK
                          ? "Keep using the app daily to build your streak!"
                          : selectedAchievement.type === AchievementType.FOCUS_TIME
                          ? "Complete more focus sessions to increase your total focus time!"
                          : "Complete more tasks to unlock this achievement!"}
                      </Text>
                    </View>
                  </View>
                )}
              </View>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 48,
    paddingBottom: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0f172a",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  statsCard: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    elevation: 4,
    shadowColor: "#F59E0B",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  statsIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  statsTextContainer: {
    marginBottom: 16,
  },
  statsNumber: {
    fontSize: 32,
    fontWeight: "800",
    color: "#fff",
  },
  statsLabel: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.9)",
    fontWeight: "600",
  },
  progressBarContainer: {
    marginTop: 8,
  },
  progressBarBg: {
    height: 8,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    borderRadius: 4,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: "#fff",
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    color: "#fff",
    fontWeight: "700",
    marginTop: 6,
  },
  filterContainer: {
    flexDirection: "row",
    backgroundColor: "#E2E8F0",
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 8,
  },
  filterTabActive: {
    backgroundColor: "#fff",
    elevation: 2,
  },
  filterTabText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#64748B",
  },
  filterTabTextActive: {
    color: "#6366F1",
    fontWeight: "700",
  },
  achievementsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  achievementCard: {
    width: CARD_WIDTH,
    backgroundColor: "#fff",
    borderRadius: 16,
    overflow: "hidden",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderWidth: 2,
    borderColor: "#E2E8F0",
  },
  achievementCardLocked: {
    opacity: 0.7,
  },
  achievementImageContainer: {
    width: "100%",
    height: CARD_WIDTH * 0.7,
    backgroundColor: "#F1F5F9",
    position: "relative",
  },
  achievementImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  lockedOverlay: {
    width: "100%",
    height: "100%",
    backgroundColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
  },
  unlockedBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "#fff",
    borderRadius: 12,
    elevation: 2,
  },
  achievementInfo: {
    padding: 12,
  },
  achievementName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 4,
  },
  achievementNameLocked: {
    color: "#64748B",
  },
  achievementDescription: {
    fontSize: 11,
    color: "#64748B",
    lineHeight: 14,
  },
  achievementDescriptionLocked: {
    color: "#94A3B8",
  },
  progressContainer: {
    marginTop: 8,
  },
  progressBarSmall: {
    height: 4,
    backgroundColor: "#E2E8F0",
    borderRadius: 2,
    overflow: "hidden",
    marginBottom: 4,
  },
  progressBarSmallFill: {
    height: "100%",
    backgroundColor: "#6366F1",
    borderRadius: 2,
  },
  progressTextSmall: {
    fontSize: 10,
    color: "#6366F1",
    fontWeight: "700",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 16,
    color: "#94A3B8",
    marginTop: 16,
    fontWeight: "600",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    width: "100%",
    maxWidth: 400,
    backgroundColor: "#fff",
    borderRadius: 24,
    overflow: "hidden",
    elevation: 8,
  },
  modalCloseButton: {
    position: "absolute",
    top: 16,
    right: 16,
    zIndex: 10,
    backgroundColor: "#fff",
    borderRadius: 16,
    elevation: 4,
  },
  modalImageContainer: {
    width: "100%",
    height: 200,
    backgroundColor: "#F1F5F9",
  },
  modalImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  modalLockedImage: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E2E8F0",
  },
  modalBody: {
    padding: 24,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#0f172a",
    marginBottom: 8,
  },
  modalDescription: {
    fontSize: 14,
    color: "#64748B",
    lineHeight: 20,
    marginBottom: 20,
  },
  modalUnlockedSection: {
    alignItems: "center",
    paddingTop: 12,
  },
  modalUnlockedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    marginBottom: 12,
  },
  modalUnlockedText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
  },
  modalUnlockedDate: {
    fontSize: 12,
    color: "#64748B",
    fontStyle: "italic",
  },
  modalLockedSection: {
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    padding: 16,
  },
  modalProgressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  modalProgressTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0f172a",
  },
  modalProgressPercentage: {
    fontSize: 18,
    fontWeight: "800",
    color: "#6366F1",
  },
  modalProgressBar: {
    height: 12,
    backgroundColor: "#E2E8F0",
    borderRadius: 6,
    overflow: "hidden",
    marginBottom: 8,
  },
  modalProgressBarFill: {
    height: "100%",
    backgroundColor: "#6366F1",
    borderRadius: 6,
  },
  modalProgressText: {
    fontSize: 14,
    color: "#64748B",
    fontWeight: "600",
    marginBottom: 16,
  },
  modalTipContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "#FFF7ED",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FED7AA",
  },
  modalTipText: {
    flex: 1,
    fontSize: 12,
    color: "#78350F",
    lineHeight: 16,
    fontWeight: "600",
  },
});

export default AchievementsScreen;
