import React from "react";
import {
    Modal,
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

interface PostSessionModalProps {
    visible: boolean;
    onStartAnother: () => void;
    onEndSession: () => void;
}

const PostSessionModal: React.FC<PostSessionModalProps> = ({
    visible,
    onStartAnother,
    onEndSession,
}) => {
    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onEndSession} // Default behavior if back pressed
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContainer}>
                    <View style={styles.headerIcon}>
                        <Ionicons name="checkmark-circle" size={56} color="#6366F1" />
                    </View>

                    <Text style={styles.title}>Session Complete</Text>
                    <Text style={styles.subtitle}>What would you like to do next?</Text>

                    <View style={styles.buttonContainer}>
                        <TouchableOpacity onPress={onStartAnother} style={styles.mainButton}>
                            <LinearGradient
                                colors={["#6366F1", "#4F46E5"]}
                                style={styles.gradient}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                            >
                                <Ionicons name="refresh" size={20} color="white" />
                                <Text style={styles.mainButtonText}>Start Another Pomodoro</Text>
                            </LinearGradient>
                        </TouchableOpacity>

                        <TouchableOpacity onPress={onEndSession} style={styles.secondaryButton}>
                            <Ionicons name="stop-circle-outline" size={22} color="#EF4444" />
                            <Text style={styles.secondaryButtonText}>End Session</Text>
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
        backgroundColor: "rgba(0,0,0,0.7)",
        justifyContent: "center",
        alignItems: "center",
        padding: 24,
    },
    modalContainer: {
        backgroundColor: "white",
        borderRadius: 28,
        width: "100%",
        maxWidth: 360,
        padding: 32,
        alignItems: "center",
        elevation: 24,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.25,
        shadowRadius: 16,
    },
    headerIcon: {
        marginBottom: 20,
        backgroundColor: "#EEF2FF",
        padding: 16,
        borderRadius: 50,
    },
    title: {
        fontSize: 24,
        fontWeight: "800",
        color: "#1E293B",
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        color: "#64748B",
        textAlign: "center",
        marginBottom: 32,
    },
    buttonContainer: {
        width: "100%",
        gap: 16,
    },
    mainButton: {
        borderRadius: 16,
        overflow: "hidden",
        elevation: 4,
        shadowColor: "#6366F1",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    gradient: {
        paddingVertical: 18,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
    },
    mainButtonText: {
        color: "white",
        fontSize: 16,
        fontWeight: "700",
    },
    secondaryButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 16,
        backgroundColor: "#FEF2F2",
        borderRadius: 16,
        borderWidth: 1,
        borderColor: "#FEE2E2",
        gap: 8,
    },
    secondaryButtonText: {
        color: "#EF4444",
        fontSize: 16,
        fontWeight: "700",
    },
});

export default PostSessionModal;
