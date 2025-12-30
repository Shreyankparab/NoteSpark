import React from "react";
import {
    Modal,
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

interface BreakPromptModalProps {
    visible: boolean;
    onStartBreak: () => void;
    onSkipBreak: () => void;
    breakDuration: number;
}

const BreakPromptModal: React.FC<BreakPromptModalProps> = ({
    visible,
    onStartBreak,
    onSkipBreak,
    breakDuration,
}) => {
    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onSkipBreak}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContainer}>
                    <View style={styles.iconContainer}>
                        <Ionicons name="cafe" size={48} color="#10B981" />
                    </View>
                    <Text style={styles.title}>Focus Session Complete!</Text>
                    <Text style={styles.message}>
                        Great job! You've earned a break.
                    </Text>
                    <Text style={styles.duration}>
                        Duration: {breakDuration} minutes
                    </Text>

                    <View style={styles.buttonContainer}>
                        <TouchableOpacity onPress={onSkipBreak} style={styles.skipButton}>
                            <Text style={styles.skipButtonText}>Skip Break</Text>
                        </TouchableOpacity>

                        <TouchableOpacity onPress={onStartBreak} style={styles.startButton}>
                            <LinearGradient
                                colors={["#10B981", "#059669"]}
                                style={styles.gradient}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                            >
                                <Text style={styles.startButtonText}>Start Break</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.6)",
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
    },
    modalContainer: {
        backgroundColor: "white",
        borderRadius: 24,
        width: "100%",
        maxWidth: 340,
        padding: 32,
        alignItems: "center",
        elevation: 8,
    },
    iconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: "#ECFDF5",
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 16,
    },
    title: {
        fontSize: 22,
        fontWeight: "800",
        color: "#1E293B",
        marginBottom: 8,
        textAlign: "center",
    },
    message: {
        fontSize: 16,
        color: "#64748B",
        textAlign: "center",
        marginBottom: 4,
    },
    duration: {
        fontSize: 16,
        fontWeight: "700",
        color: "#10B981",
        marginBottom: 32,
    },
    buttonContainer: {
        width: "100%",
        gap: 12,
    },
    startButton: {
        borderRadius: 14,
        overflow: "hidden",
        elevation: 2,
    },
    gradient: {
        paddingVertical: 14,
        alignItems: "center",
    },
    startButtonText: {
        color: "white",
        fontSize: 16,
        fontWeight: "700",
    },
    skipButton: {
        paddingVertical: 14,
        alignItems: "center",
    },
    skipButtonText: {
        color: "#64748B",
        fontSize: 16,
        fontWeight: "600",
    },
});

export default BreakPromptModal;
