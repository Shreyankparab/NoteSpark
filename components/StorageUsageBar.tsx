import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from "react-native";
import { formatBytes, DEFAULT_STORAGE_LIMIT } from "../utils/storageTracker";
import { Ionicons } from "@expo/vector-icons";

interface StorageUsageBarProps {
    usedBytes?: number;
    limitBytes?: number;
    containerStyle?: any;
    onRefresh?: () => void;
    isRefreshing?: boolean;
}

const StorageUsageBar: React.FC<StorageUsageBarProps> = ({
    usedBytes = 0,
    limitBytes = DEFAULT_STORAGE_LIMIT,
    containerStyle,
    onRefresh,
    isRefreshing = false
}) => {
    const percentage = Math.min((usedBytes / limitBytes) * 100, 100);

    // Color logic
    let barColor = "#22c55e"; // Green (Tailwind green-500)
    if (percentage > 90) {
        barColor = "#ef4444"; // Red (Tailwind red-500)
    } else if (percentage > 75) {
        barColor = "#eab308"; // Yellow (Tailwind yellow-500)
    }

    return (
        <View style={[styles.container, containerStyle]}>
            <View style={styles.header}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={styles.title}>Storage</Text>
                    {onRefresh && (
                        <TouchableOpacity
                            onPress={onRefresh}
                            disabled={isRefreshing}
                            style={styles.refreshButton}
                        >
                            {isRefreshing ? (
                                <ActivityIndicator size="small" color="#6366F1" />
                            ) : (
                                <Ionicons name="refresh" size={16} color="#64748b" />
                            )}
                        </TouchableOpacity>
                    )}
                </View>
                <Text style={styles.usageText}>
                    {usedBytes >= limitBytes ? (
                        <Text style={[styles.usageText, { color: '#ef4444' }]}>size full</Text>
                    ) : (
                        <>{formatBytes(usedBytes)} <Text style={styles.limitText}>of {formatBytes(limitBytes)}</Text></>
                    )}
                </Text>
            </View>

            <View style={styles.track}>
                <View
                    style={[
                        styles.fill,
                        {
                            width: `${percentage}%`,
                            backgroundColor: barColor
                        }
                    ]}
                />
            </View>

            <Text style={styles.footerText}>
                {percentage > 90 ? "Storage almost full!" : `${percentage.toFixed(0)}% used`}
            </Text>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: "#fff",
        borderRadius: 16,
        padding: 16,
        elevation: 2,
        marginBottom: 16,
    },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 10,
    },
    title: {
        fontSize: 16,
        fontWeight: "700",
        color: "#0f172a",
    },
    refreshButton: {
        padding: 4,
        backgroundColor: '#f1f5f9',
        borderRadius: 12,
    },
    usageText: {
        fontSize: 14,
        fontWeight: "600",
        color: "#0f172a",
    },
    limitText: {
        color: "#64748b",
        fontSize: 12,
    },
    track: {
        height: 8,
        backgroundColor: "#f1f5f9",
        borderRadius: 4,
        overflow: "hidden",
    },
    fill: {
        height: "100%",
        borderRadius: 4,
    },
    footerText: {
        marginTop: 8,
        fontSize: 12,
        color: "#64748b",
        textAlign: "right",
    }
});

export default StorageUsageBar;
