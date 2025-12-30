import React, { useEffect, useMemo, useState } from "react";
import { View, Text, TouchableOpacity, Modal, StyleSheet, Image, Alert, TextInput, ScrollView, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { User, updateProfile } from "firebase/auth";
import * as ImagePicker from "expo-image-picker";
import { uploadToFirebaseStorage } from "../../utils/imageStorage";
import { doc, onSnapshot, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebase/firebaseConfig";
import { LinearGradient } from "expo-linear-gradient";
import { getUserAchievements } from "../../utils/achievements";
import AchievementBadge from "../AchievementBadge";
import { Achievement } from "../../types";
import StreaksScreen from "../../screens/StreaksScreen";
import AchievementsScreen from "../../screens/AchievementsScreen";

interface ProfileModalProps {
  visible: boolean;
  onClose: () => void;
  user: User | null;
  onLogout: () => Promise<void>;
  streak: number;
  totalFocusMinutes?: number;
  totalTasksCompleted?: number;
  achievements?: Achievement[];
}

const ProfileModal: React.FC<ProfileModalProps> = ({
  visible,
  onClose,
  user,
  onLogout,
  streak,
  totalFocusMinutes = 0,
  totalTasksCompleted = 0,
}) => {
  const [uploading, setUploading] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string | null>(user?.photoURL || null);
  const [displayName, setDisplayName] = useState<string>(user?.displayName || "");
  const [savingName, setSavingName] = useState(false);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loadingAchievements, setLoadingAchievements] = useState(false);
  const [showStreaksScreen, setShowStreaksScreen] = useState(false);
  const [showAchievementsScreen, setShowAchievementsScreen] = useState(false);

  // Hydrate profile data from Firestore and keep it in sync
  useEffect(() => {
    if (!user?.uid) return;
    const ref = doc(db, "users", user.uid);
    const unsub = onSnapshot(ref, (snap) => {
      const data = snap.data() as any;
      if (data?.photoURL) setPhotoUrl(data.photoURL);
      else if (user?.photoURL) setPhotoUrl(user.photoURL);
      if (typeof data?.displayName === "string" && data.displayName.length > 0) {
        setDisplayName(data.displayName);
      } else if (user?.displayName) {
        setDisplayName(user.displayName);
      }
    });
    return unsub;
  }, [user?.uid]);

  // Load user achievements when modal is visible
  useEffect(() => {
    const loadAchievements = async () => {
      if (!user?.uid || !visible) return;

      setLoadingAchievements(true);
      try {
        const userAchievements = await getUserAchievements(user.uid);
        setAchievements(userAchievements);
      } catch (error) {
        console.error("Failed to load achievements:", error);
      } finally {
        setLoadingAchievements(false);
      }
    };

    loadAchievements();
  }, [user?.uid, visible]);

  const handleChangeAvatar = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission", "Allow photo library access to change avatar");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, base64: true, quality: 0.9, allowsEditing: true, aspect: [1, 1] });
      if (result.canceled) return;
      const asset: any = result.assets[0];
      if (!asset?.base64) return;
      setUploading(true);
      const url = await uploadToFirebaseStorage(asset.base64, asset.mimeType || "image/jpeg", { folder: user ? `images/${user.uid}/avatars` : "images/avatars" });
      // Persist to Firebase Auth so it survives logout/login
      if (user) {
        try { await updateProfile(user, { photoURL: url }); } catch { }
        try { await setDoc(doc(db, 'users', user.uid), { photoURL: url, updatedAt: serverTimestamp() }, { merge: true }); } catch { }
      }
      setPhotoUrl(url);
      Alert.alert("Saved", "Profile picture updated.");
      // TODO: Persist to Firestore users collection if desired
    } catch (e) {
      Alert.alert("Error", "Failed to update avatar");
    } finally {
      setUploading(false);
    }
  };
  const totalFocusHours = useMemo(() => Math.floor((totalFocusMinutes || 0) / 60), [totalFocusMinutes]);
  const formatTotalTime = (m: number) => {
    if (m < 60) return `${m} min`;
    const h = Math.floor(m / 60);
    const mm = m % 60;
    return mm > 0 ? `${h}hr ${mm}min` : `${h}hr`;
  };
  const handleSaveName = async () => {
    if (!user) return;
    try {
      setSavingName(true);
      await updateProfile(user, { displayName });
      try { await setDoc(doc(db, 'users', user.uid), { displayName, updatedAt: serverTimestamp() }, { merge: true }); } catch { }
      Alert.alert("Saved", "Display name updated.");
    } catch {
      Alert.alert("Error", "Failed to update name");
    } finally {
      setSavingName(false);
    }
  };
  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="fade"
      onRequestClose={onClose}
    >
      <ScrollView style={styles.profileModalFull} contentContainerStyle={{ paddingBottom: 32 }}>
        <View style={styles.profileModalHeaderFull}>
          <View style={styles.profileModalHeader}>
            <Text style={styles.profileModalTitle}>User Profile</Text>
            <TouchableOpacity onPress={onClose} style={{ padding: 4 }}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>
          <View style={styles.avatarRow}>
            <View style={styles.avatarRing}>
              {photoUrl ? (
                <Image source={{ uri: photoUrl }} style={styles.avatarImg} />
              ) : (
                <View style={[styles.avatarImg, { backgroundColor: "#e5e7eb" }]} />
              )}
              <TouchableOpacity onPress={handleChangeAvatar} style={styles.editFab} disabled={uploading}>
                <Ionicons name="pencil" size={16} color="#fff" />
              </TouchableOpacity>
              {uploading ? (
                <View style={styles.uploadOverlay}><Text style={{ color: '#fff', fontWeight: '700', fontSize: 12 }}>Saving...</Text></View>
              ) : null}
            </View>
            <View style={{ flex: 1, marginLeft: 16 }}>
              <Text style={styles.sectionLabel}>Display Name</Text>
              <View style={styles.nameRow}>
                <TextInput
                  style={styles.nameInput}
                  placeholder="Enter your name"
                  value={displayName}
                  onChangeText={setDisplayName}
                />
                <TouchableOpacity onPress={handleSaveName} disabled={savingName} style={styles.smallSaveBtn}>
                  <Text style={styles.smallSaveText}>{savingName ? "Saving..." : "Save"}</Text>
                </TouchableOpacity>
              </View>
              <Text style={{ color: "#64748b", marginTop: 4 }}>{user?.email || ""}</Text>
            </View>
          </View>

          <Text style={styles.sectionHeading}>Stats</Text>
          <View style={styles.statsRow}>
            <TouchableOpacity
              style={{ flex: 1 }}
              onPress={() => setShowStreaksScreen(true)}
              activeOpacity={0.8}
            >
              <StatCard
                colors={["#7C3AED", "#3B82F6"] as const}
                icon={<Ionicons name="flame" size={22} color="#fff" />}
                title="Current Streak"
                value={`${streak}`}
                unit="days"
              />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <StatCard
                colors={["#06B6D4", "#34D399"] as const}
                icon={<Ionicons name="time" size={22} color="#fff" />}
                title="Total Focus Time"
                value={`${totalFocusHours}`}
                unit="hours"
                footerText={formatTotalTime(totalFocusMinutes)}
              />
            </View>
          </View>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionHeading}>Achievements</Text>
            <TouchableOpacity
              onPress={() => setShowAchievementsScreen(true)}
              style={styles.viewAllButton}
            >
              <Text style={styles.viewAllText}>View All</Text>
              <Ionicons name="chevron-forward" size={16} color="#6366F1" />
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={styles.achievementsContainer}
            onPress={() => setShowAchievementsScreen(true)}
            activeOpacity={0.8}
          >
            {loadingAchievements ? (
              <ActivityIndicator size="large" color="#7C3AED" style={styles.loadingIndicator} />
            ) : achievements.length > 0 ? (
              <View style={styles.achievementsGrid}>
                {achievements.slice(0, 6).map((achievement) => (
                  <AchievementBadge
                    key={achievement.id}
                    achievement={achievement}
                    size="medium"
                  />
                ))}
              </View>
            ) : (
              <Text style={styles.noAchievementsText}>
                No achievements unlocked yet. Keep using NoteSpark to earn badges!
              </Text>
            )}
            {achievements.length > 6 && (
              <View style={styles.moreAchievementsBadge}>
                <Text style={styles.moreAchievementsText}>
                  +{achievements.length - 6} more
                </Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Keep legacy rows minimal; core stats now highlighted above */}

          <TouchableOpacity style={styles.logoutButton} onPress={onLogout}>
            <Ionicons
              name="log-out-outline"
              size={20}
              color="white"
              style={{ marginRight: 8 }}
            />
            <Text style={styles.logoutButtonText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Streaks Screen Modal */}
      {showStreaksScreen && user && (
        <Modal
          visible={showStreaksScreen}
          animationType="slide"
          onRequestClose={() => setShowStreaksScreen(false)}
        >
          <StreaksScreen
            userId={user.uid}
            currentStreak={streak}
            onClose={() => setShowStreaksScreen(false)}
          />
        </Modal>
      )}

      {/* Achievements Screen Modal */}
      {showAchievementsScreen && user && (
        <Modal
          visible={showAchievementsScreen}
          animationType="slide"
          onRequestClose={() => setShowAchievementsScreen(false)}
        >
          <AchievementsScreen
            userId={user.uid}
            userAchievements={achievements}
            currentStreak={streak}
            totalFocusMinutes={totalFocusMinutes}
            totalTasksCompleted={totalTasksCompleted}
            onClose={() => setShowAchievementsScreen(false)}
          />
        </Modal>
      )}
    </Modal>
  );
};

const styles = StyleSheet.create({
  profileModalFull: { flex: 1, backgroundColor: "#fff", paddingTop: 48, paddingHorizontal: 16, paddingBottom: 24 },
  profileModalHeaderFull: {},
  profileModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  profileModalTitle: { fontSize: 22, fontWeight: "700", color: "#333" },
  sectionLabel: { color: "#64748b", fontSize: 12, fontWeight: "700" },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 6 },
  nameInput: { flex: 1, borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: "#f8fafc", color: "#111827" },
  avatarRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
  avatarRing: { width: 96, height: 96, borderRadius: 48, backgroundColor: "#f8fafc", justifyContent: "center", alignItems: "center" },
  avatarImg: { width: 88, height: 88, borderRadius: 44 },
  changeBtn: { flexDirection: "row", alignItems: "center", backgroundColor: "#4F46E5", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  changeBtnText: { color: "#fff", fontWeight: "700", marginLeft: 6 },
  editFab: { position: "absolute", right: -4, bottom: -4, backgroundColor: "#4F46E5", width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center", elevation: 3 },
  uploadOverlay: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.35)', borderRadius: 48, alignItems: 'center', justifyContent: 'center' },
  sectionHeading: { fontSize: 16, fontWeight: "800", color: "#0f172a", marginTop: 8, marginBottom: 10 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 8, marginBottom: 10 },
  viewAllButton: { flexDirection: "row", alignItems: "center", gap: 4 },
  viewAllText: { fontSize: 14, fontWeight: "700", color: "#6366F1" },
  statsRow: { flexDirection: "row", gap: 12, marginBottom: 8 },
  statCard: { flex: 1, borderRadius: 16, overflow: "hidden" },
  statInner: { padding: 14, height: 120, justifyContent: "space-between" },
  statHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  statTitle: { color: "#e2e8f0", fontWeight: "700", letterSpacing: 0.3 },
  statValueRow: { flexDirection: "row", alignItems: "baseline" },
  statValue: { color: "#fff", fontSize: 40, fontWeight: "800" },
  statUnit: { color: "#f1f5f9", marginLeft: 6, fontWeight: "700" },
  statFooter: { color: "#e2e8f0", marginTop: 4, fontSize: 12 },
  profileDetail: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  smallSaveBtn: { backgroundColor: "#10b981", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  smallSaveText: { color: "#fff", fontWeight: "700" },
  profileText: { fontSize: 16, color: "#555", fontWeight: "500" },
  achievementsContainer: { marginTop: 8, marginBottom: 16 },
  achievementsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 16, justifyContent: "flex-start" },
  noAchievementsText: { color: "#64748b", fontStyle: "italic", textAlign: "center", paddingVertical: 16 },
  moreAchievementsBadge: { marginTop: 12, alignItems: "center", backgroundColor: "#EEF2FF", paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, alignSelf: "center" },
  moreAchievementsText: { color: "#6366F1", fontWeight: "700", fontSize: 12 },
  loadingIndicator: { marginVertical: 16 },
  logoutButton: {
    backgroundColor: "#D9534F",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 25,
    flexDirection: "row",
    justifyContent: "center",
  },
  logoutButtonText: { color: "white", fontWeight: "700", fontSize: 16 },
});

interface StatCardProps {
  colors: readonly [string, string, ...string[]];
  icon: React.ReactNode;
  title: string;
  value: string;
  unit: string;
  footerText?: string;
}

const StatCard: React.FC<StatCardProps> = ({ colors, icon, title, value, unit, footerText }) => {
  return (
    <View style={styles.statCard}>
      <LinearGradient colors={colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        <View style={styles.statInner}>
          <View style={styles.statHeader}>
            <Text style={styles.statTitle}>{title}</Text>
            {icon}
          </View>
          <View>
            <View style={styles.statValueRow}>
              <Text style={styles.statValue}>{value}</Text>
              <Text style={styles.statUnit}>{unit}</Text>
            </View>
            {footerText ? <Text style={styles.statFooter}>{footerText}</Text> : null}
          </View>
        </View>
      </LinearGradient>
    </View>
  );
};

export default ProfileModal;
