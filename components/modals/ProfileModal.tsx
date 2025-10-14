import React from "react";
import { View, Text, TouchableOpacity, Modal, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { User } from "firebase/auth";

interface ProfileModalProps {
  visible: boolean;
  onClose: () => void;
  user: User | null;
  onLogout: () => Promise<void>;
  streak: number;
}

const ProfileModal: React.FC<ProfileModalProps> = ({
  visible,
  onClose,
  user,
  onLogout,
  streak,
}) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.profileModalOverlay}>
        <View style={styles.profileModalContainer}>
          <View style={styles.profileModalHeader}>
            <Text style={styles.profileModalTitle}>User Profile</Text>
            <TouchableOpacity onPress={onClose} style={{ padding: 4 }}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          <View style={styles.profileDetail}>
            <Ionicons
              name="mail-outline"
              size={20}
              color="#4F46E5"
              style={{ marginRight: 8 }}
            />
            <Text style={styles.profileText}>
              Email: {user?.email || "N/A"}
            </Text>
          </View>

          <View style={styles.profileDetail}>
            <Ionicons
              name="person-outline"
              size={20}
              color="#4F46E5"
              style={{ marginRight: 8 }}
            />
            <Text style={styles.profileText}>
              User ID: {user?.uid.substring(0, 10)}...
            </Text>
          </View>

          <View style={styles.profileDetail}>
            <Ionicons
              name="flame-outline"
              size={20}
              color="#FF6347"
              style={{ marginRight: 8 }}
            />
            <Text style={styles.profileText}>Streak: {streak} days</Text>
          </View>

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
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  profileModalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  profileModalContainer: {
    width: "85%",
    backgroundColor: "white",
    borderRadius: 15,
    padding: 20,
  },
  profileModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  profileModalTitle: { fontSize: 22, fontWeight: "700", color: "#333" },
  profileDetail: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  profileText: { fontSize: 16, color: "#555", fontWeight: "500" },
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

export default ProfileModal;
