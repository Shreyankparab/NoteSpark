import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface PlaceholderContentProps {
  icon: string;
  title: string;
  subtitle: string;
}

const PlaceholderContent: React.FC<PlaceholderContentProps> = ({
  icon,
  title,
  subtitle,
}) => (
  <View style={styles.centerContent}>
    <Ionicons name={icon as any} size={64} color="rgba(255,255,255,0.4)" />
    <Text style={styles.placeholderText}>{title}</Text>
    <Text style={styles.placeholderSubText}>{subtitle}</Text>
  </View>
);

const styles = StyleSheet.create({
  centerContent: { flex: 1, justifyContent: "center", alignItems: "center" },
  placeholderText: {
    fontSize: 24,
    fontWeight: "700",
    color: "white",
    marginTop: 10,
  },
  placeholderSubText: { fontSize: 16, color: "rgba(255,255,255,0.8)" },
});

export default PlaceholderContent;
