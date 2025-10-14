import React from "react";
import { TouchableOpacity, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ScreenName } from "../types";

interface NavButtonProps {
  icon: string;
  label: ScreenName;
  active: boolean;
  onPress: (screen: ScreenName) => void;
}

const NavButton: React.FC<NavButtonProps> = ({
  icon,
  label,
  active,
  onPress,
}) => (
  <TouchableOpacity
    style={[styles.navItem, active && styles.navItemActive]}
    onPress={() => onPress(label)}
  >
    <Ionicons
      name={active ? (icon.replace("-outline", "") as any) : (icon as any)}
      size={24}
      color="white"
    />
    <Text style={styles.navText}>{label}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  navItem: {
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  navItemActive: { backgroundColor: "rgba(255,255,255,0.2)" },
  navText: { color: "white", marginTop: 4, fontWeight: "600" },
});

export default NavButton;
