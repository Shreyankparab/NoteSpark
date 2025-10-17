import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";

interface StreaksScreenProps {
  userId: string;
  currentStreak: number;
  onClose: () => void;
}

interface StreakData {
  activeDays: string[]; // Array of dates in 'YYYY-MM-DD' format
}

const { width } = Dimensions.get("window");

const StreaksScreen: React.FC<StreaksScreenProps> = ({
  userId,
  currentStreak,
  onClose,
}) => {
  const [activeDays, setActiveDays] = useState<string[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [fadeAnim] = useState(new Animated.Value(0));
  const [scaleAnim] = useState(new Animated.Value(0.9));

  useEffect(() => {
    loadStreakData();
    // Entrance animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const loadStreakData = async () => {
    try {
      const userRef = doc(db, "users", userId);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const data = userSnap.data() as StreakData;
        setActiveDays(data.activeDays || []);
      }
    } catch (error) {
      console.error("Failed to load streak data:", error);
    }
  };

  const getMilestoneStatus = (days: number) => {
    if (currentStreak >= days) return "completed";
    return "locked";
  };

  const getMilestoneIcon = (days: number) => {
    const status = getMilestoneStatus(days);
    if (status === "completed") {
      if (days === 1) return require("../assets/icon.png");
      if (days === 3) return require("../assets/three-days-streak.jpg");
      if (days === 7) return require("../assets/seven-days-streak.jpg");
      if (days === 30) return require("../assets/adaptive-icon.png");
    }
    return null;
  };

  const renderCalendar = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const weeks: (number | null)[][] = [];
    let currentWeek: (number | null)[] = Array(startingDayOfWeek).fill(null);

    for (let day = 1; day <= daysInMonth; day++) {
      currentWeek.push(day);
      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
    }

    if (currentWeek.length > 0) {
      while (currentWeek.length < 7) {
        currentWeek.push(null);
      }
      weeks.push(currentWeek);
    }

    const monthNames = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];

    const isActiveDay = (day: number) => {
      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(
        day
      ).padStart(2, "0")}`;
      return activeDays.includes(dateStr);
    };

    const isToday = (day: number) => {
      const today = new Date();
      return (
        today.getDate() === day &&
        today.getMonth() === month &&
        today.getFullYear() === year
      );
    };

    const isPastDay = (day: number) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const checkDate = new Date(year, month, day);
      return checkDate < today;
    };

    return (
      <View style={styles.calendarContainer}>
        <View style={styles.calendarHeader}>
          <TouchableOpacity
            onPress={() =>
              setCurrentMonth(new Date(year, month - 1, 1))
            }
            style={styles.navButton}
          >
            <Ionicons name="chevron-back" size={20} color="#475569" />
          </TouchableOpacity>
          <Text style={styles.monthYear}>
            {monthNames[month]} {year}
          </Text>
          <TouchableOpacity
            onPress={() =>
              setCurrentMonth(new Date(year, month + 1, 1))
            }
            style={styles.navButton}
          >
            <Ionicons name="chevron-forward" size={20} color="#475569" />
          </TouchableOpacity>
        </View>

        <View style={styles.weekDaysRow}>
          {["S", "M", "T", "W", "T", "F", "S"].map((day, idx) => (
            <Text key={idx} style={styles.weekDayText}>
              {day}
            </Text>
          ))}
        </View>

        {weeks.map((week, weekIdx) => (
          <View key={weekIdx} style={styles.calendarWeek}>
            {week.map((day, dayIdx) => {
              if (day === null) {
                return <View key={dayIdx} style={styles.calendarDay} />;
              }

              const active = isActiveDay(day);
              const today = isToday(day);
              const past = isPastDay(day);

              return (
                <View key={dayIdx} style={styles.calendarDay}>
                  {active ? (
                    <LinearGradient
                      colors={today ? ["#6366F1", "#8B5CF6"] : ["#6366F1", "#818CF8"]}
                      style={[styles.activeDayCircle, today && styles.todayCircle]}
                    >
                      <Text style={styles.activeDayText}>{day}</Text>
                    </LinearGradient>
                  ) : (
                    <View style={[
                      styles.inactiveDayCircle, 
                      today && styles.todayBorder,
                      past && !active && styles.missedDayCircle
                    ]}>
                      <Text
                        style={[
                          styles.inactiveDayText,
                          today && styles.todayText,
                          past && !active && styles.missedDayText
                        ]}
                      >
                        {day}
                      </Text>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        ))}

        {/* Legend */}
        <View style={styles.legendContainer}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: "#6366F1" }]} />
            <Text style={styles.legendText}>Active Day</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: "#FEE2E2", borderWidth: 1, borderColor: "#FECACA" }]} />
            <Text style={styles.legendText}>Missed Day</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: "#F1F5F9" }]} />
            <Text style={styles.legendText}>Future Day</Text>
          </View>
        </View>
      </View>
    );
  };

  const milestones = [
    { days: 1, label: "1 Day Streak", icon: "🔥" },
    { days: 3, label: "3 Day Streak", icon: "⚡" },
    { days: 7, label: "7 Day Streak", icon: "💎" },
    { days: 30, label: "30 Day Streak", icon: "👑" },
  ];

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#0f172a" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Streaks & Achievements</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Hero Section */}
          <LinearGradient
            colors={["#6366F1", "#8B5CF6"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroCard}
          >
            <View style={styles.flameIconContainer}>
              <Ionicons name="flame" size={48} color="#FFF" />
            </View>
            <Text style={styles.heroTitle}>
              You're on a {currentStreak}-day streak!
            </Text>
            <Text style={styles.heroSubtitle}>
              Believe you can and you're halfway there.
            </Text>
          </LinearGradient>

          {/* Milestones */}
          <Text style={styles.sectionTitle}>Milestones</Text>
          <View style={styles.milestonesGrid}>
            {milestones.map((milestone, index) => {
              const status = getMilestoneStatus(milestone.days);
              const isCompleted = status === "completed";
              const isActive = currentStreak === milestone.days;

              return (
                <Animated.View
                  key={milestone.days}
                  style={[
                    styles.milestoneCard,
                    isCompleted && styles.milestoneCardCompleted,
                    isActive && styles.milestoneCardActive,
                  ]}
                >
                  <View
                    style={[
                      styles.milestoneIconContainer,
                      isCompleted && styles.milestoneIconCompleted,
                    ]}
                  >
                    {isCompleted ? (
                      <View style={styles.checkmarkContainer}>
                        <Ionicons name="checkmark" size={24} color="#fff" />
                      </View>
                    ) : (
                      <Text style={styles.milestoneEmoji}>{milestone.icon}</Text>
                    )}
                  </View>
                  <Text
                    style={[
                      styles.milestoneLabel,
                      isCompleted && styles.milestoneLabelCompleted,
                    ]}
                  >
                    {milestone.label}
                  </Text>
                  {isActive && (
                    <View style={styles.currentBadge}>
                      <Text style={styles.currentBadgeText}>Current</Text>
                    </View>
                  )}
                </Animated.View>
              );
            })}
          </View>

          {/* Streak Tracker Calendar */}
          <Text style={styles.sectionTitle}>Streak Tracker</Text>
          {renderCalendar()}

          {/* Motivational Footer */}
          <View style={styles.motivationCard}>
            <Ionicons name="trophy" size={32} color="#F59E0B" />
            <Text style={styles.motivationText}>
              Keep going! Every day counts towards your success.
            </Text>
          </View>
        </ScrollView>
      </Animated.View>
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
  heroCard: {
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    marginBottom: 24,
    elevation: 4,
    shadowColor: "#6366F1",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  flameIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#fff",
    marginBottom: 8,
    textAlign: "center",
  },
  heroSubtitle: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.9)",
    textAlign: "center",
    fontStyle: "italic",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0f172a",
    marginBottom: 16,
    marginTop: 8,
  },
  milestonesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 24,
  },
  milestoneCard: {
    width: (width - 48) / 2,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderWidth: 2,
    borderColor: "#E2E8F0",
  },
  milestoneCardCompleted: {
    backgroundColor: "#EEF2FF",
    borderColor: "#6366F1",
  },
  milestoneCardActive: {
    borderColor: "#8B5CF6",
    borderWidth: 3,
    elevation: 6,
  },
  milestoneIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  milestoneIconCompleted: {
    backgroundColor: "#6366F1",
  },
  checkmarkContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#6366F1",
    alignItems: "center",
    justifyContent: "center",
  },
  milestoneEmoji: {
    fontSize: 32,
  },
  milestoneLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#64748B",
    textAlign: "center",
  },
  milestoneLabelCompleted: {
    color: "#6366F1",
  },
  currentBadge: {
    marginTop: 8,
    backgroundColor: "#8B5CF6",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  currentBadgeText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
  },
  calendarContainer: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  calendarHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  navButton: {
    padding: 8,
  },
  monthYear: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0f172a",
  },
  weekDaysRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 12,
  },
  weekDayText: {
    width: 36,
    textAlign: "center",
    fontSize: 12,
    fontWeight: "700",
    color: "#64748B",
  },
  calendarWeek: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 8,
  },
  calendarDay: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  activeDayCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  todayCircle: {
    borderWidth: 2,
    borderColor: "#FFF",
    elevation: 4,
  },
  activeDayText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },
  inactiveDayCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  todayBorder: {
    borderWidth: 2,
    borderColor: "#6366F1",
  },
  inactiveDayText: {
    color: "#94A3B8",
    fontSize: 14,
  },
  todayText: {
    color: "#6366F1",
    fontWeight: "700",
  },
  missedDayCircle: {
    backgroundColor: "#FEE2E2",
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  missedDayText: {
    color: "#DC2626",
    fontSize: 14,
  },
  legendContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "600",
  },
  motivationCard: {
    backgroundColor: "#FFF7ED",
    borderRadius: 16,
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    borderWidth: 1,
    borderColor: "#FED7AA",
  },
  motivationText: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    color: "#78350F",
    lineHeight: 20,
  },
});

export default StreaksScreen;
