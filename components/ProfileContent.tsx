import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView, Linking } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Achievement } from "../types";
import { ACHIEVEMENTS } from "../utils/achievements";
import AchievementBadge from "./AchievementBadge";

interface ProfileContentProps {
  displayName: string | null;
  email: string | null;
  photoURL?: string | null;
  streakDays: number;
  totalFocusMinutes: number;
  onToggleNotifications?: () => void;
  notificationsEnabled?: boolean;
  darkModeEnabled?: boolean;
  onToggleDarkMode?: () => void;
  achievements?: Achievement[];
}

const ProfileContent: React.FC<ProfileContentProps> = ({
  displayName,
  email,
  photoURL,
  streakDays,
  totalFocusMinutes,
  onToggleNotifications,
  notificationsEnabled,
  darkModeEnabled,
  onToggleDarkMode,
  achievements = [],
}) => {
  const minutesToHrs = (m: number) => {
    const hrs = Math.floor(m / 60);
    return `${hrs}`;
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 120 }}>
      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}>Profile</Text>
        <Ionicons name="settings-outline" size={22} color="#0f172a" />
      </View>

      <View style={styles.avatarBlock}>
        <View style={styles.avatarRing}>
          {photoURL ? (
            <Image source={{ uri: photoURL }} style={styles.avatarImg} />
          ) : (
            <View style={[styles.avatarImg, styles.avatarPlaceholder]} />
          )}
        </View>
        <Text style={styles.name}>{displayName || "User"}</Text>
        <Text style={styles.subtitle}>{email || ""}</Text>
      </View>

      <Text style={styles.sectionTitle}>Stats</Text>
      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: "#6d28d9" }]}> 
          <Ionicons name="flame" size={18} color="#fff" />
          <Text style={styles.statLabel}>Current Streak</Text>
          <Text style={styles.statValue}>{streakDays}</Text>
          <Text style={styles.statSub}>days</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: "#06b6d4" }]}> 
          <Ionicons name="time-outline" size={18} color="#fff" />
          <Text style={styles.statLabel}>Total Focus Time</Text>
          <Text style={styles.statValue}>{minutesToHrs(totalFocusMinutes)}</Text>
          <Text style={styles.statSub}>hours</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Achievements</Text>
      <View style={styles.achievementsGrid}>
        {achievements.length > 0 ? (
          achievements.map((achievement) => (
            <View key={achievement.id} style={styles.achCard}>
              <AchievementBadge achievement={achievement} size="small" />
            </View>
          ))
        ) : (
          // Display placeholder cards if no achievements
          ACHIEVEMENTS.slice(0, 6).map((achievement) => (
            <View key={achievement.id} style={styles.achCard}>
              <AchievementBadge 
                achievement={{
                  ...achievement,
                  userId: "placeholder",
                  unlockedAt: null
                }} 
                size="small" 
              />
            </View>
          ))
        )}
      </View>

      <Text style={styles.sectionTitle}>Settings</Text>
      <View style={styles.list}>
        <TouchableOpacity style={styles.listRow} onPress={onToggleNotifications}>
          <Text style={styles.listLeft}>Notifications</Text>
          <View style={[styles.switchFake, notificationsEnabled ? styles.switchOn : styles.switchOff]} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.listRow} onPress={onToggleDarkMode}>
          <Text style={styles.listLeft}>Dark Mode</Text>
          <View style={[styles.switchFake, darkModeEnabled ? styles.switchOn : styles.switchOff]} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.listRow}>
          <Text style={styles.listLeft}>Customize Theme</Text>
          <Ionicons name="chevron-forward" size={18} color="#64748b" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.listRow}>
          <Text style={styles.listLeft}>Feedback</Text>
          <Ionicons name="chevron-forward" size={18} color="#64748b" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.listRow}>
          <Text style={styles.listLeft}>Help</Text>
          <Ionicons name="chevron-forward" size={18} color="#64748b" />
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <Text style={styles.version}>Version 1.2.3</Text>
        <TouchableOpacity onPress={() => Linking.openURL("https://example.com/privacy") }>
          <Text style={styles.link}>Privacy Policy</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#e6eeff", paddingHorizontal: 16, paddingTop: 48 },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  headerTitle: { fontSize: 20, fontWeight: "800", color: "#0f172a" },
  avatarBlock: { alignItems: "center", marginTop: 16 },
  avatarRing: { width: 104, height: 104, borderRadius: 52, backgroundColor: "#fff", justifyContent: "center", alignItems: "center", elevation: 2 },
  avatarImg: { width: 92, height: 92, borderRadius: 46, backgroundColor: "#cbd5e1" },
  avatarPlaceholder: { alignItems: "center", justifyContent: "center" },
  name: { marginTop: 14, fontSize: 22, fontWeight: "800", color: "#0f172a" },
  subtitle: { marginTop: 6, fontSize: 14, color: "#475569" },
  sectionTitle: { marginTop: 24, marginBottom: 10, fontSize: 18, fontWeight: "800", color: "#0f172a" },
  statsRow: { flexDirection: "row", gap: 12 },
  statCard: { flex: 1, borderRadius: 16, padding: 14, elevation: 3 },
  statLabel: { color: "#fff", marginTop: 6 },
  statValue: { color: "#fff", fontSize: 32, fontWeight: "900", marginTop: 4 },
  statSub: { color: "#e2e8f0" },
  achievementsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12, justifyContent: "flex-start" },
  achCard: { width: "30%", aspectRatio: 1, backgroundColor: "#fff", borderRadius: 16, elevation: 2, justifyContent: "center", alignItems: "center", overflow: "hidden" },
  list: { backgroundColor: "#fff", borderRadius: 16, overflow: "hidden", elevation: 2 },
  listRow: { paddingHorizontal: 16, paddingVertical: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderBottomWidth: 1, borderBottomColor: "#e2e8f0" },
  listLeft: { color: "#0f172a", fontWeight: "700" },
  switchFake: { width: 46, height: 26, borderRadius: 13, backgroundColor: "#cbd5e1" },
  switchOn: { backgroundColor: "#4f46e5" },
  switchOff: { backgroundColor: "#cbd5e1" },
  footer: { alignItems: "center", marginTop: 16, marginBottom: 24 },
  version: { color: "#64748b" },
  link: { color: "#2563eb", fontWeight: "700", marginTop: 6 },
});

export default ProfileContent;


