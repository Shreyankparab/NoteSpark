import React, { useState } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatBytes } from '../../utils/storageTracker';

interface StorageWarningModalProps {
    visible: boolean;
    onClose: () => void;
    onWatchAd: () => void;
    currentUsage: number;
    limit: number;
}

const StorageWarningModal: React.FC<StorageWarningModalProps> = ({
    visible,
    onClose,
    onWatchAd,
    currentUsage,
    limit
}) => {
    const [isLoadingAd, setIsLoadingAd] = useState(false);

    const handleWatchAd = () => {
        setIsLoadingAd(true);
        // Simulate Ad loading
        setTimeout(() => {
            setIsLoadingAd(false);
            onWatchAd();
        }, 2000);
    };

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <View style={styles.modalContainer}>
                    <View style={styles.iconContainer}>
                        <Ionicons name="cloud-offline" size={48} color="#EF4444" />
                    </View>

                    <Text style={styles.title}>Storage Limit Reached</Text>

                    <Text style={styles.message}>
                        You have used <Text style={styles.bold}>{formatBytes(currentUsage)}</Text> of <Text style={styles.bold}>{formatBytes(limit)}</Text>.
                        To save this image, you can watch a short video to upload it for free.
                    </Text>

                    <TouchableOpacity
                        style={styles.watchAdButton}
                        onPress={handleWatchAd}
                        disabled={isLoadingAd}
                    >
                        {isLoadingAd ? (
                            <ActivityIndicator color="#fff" size="small" />
                        ) : (
                            <>
                                <Ionicons name="play-circle" size={20} color="#fff" />
                                <Text style={styles.watchAdText}>Watch Video (Free Upload)</Text>
                            </>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.cancelButton}
                        onPress={onClose}
                        disabled={isLoadingAd}
                    >
                        <Text style={styles.cancelText}>Cancel</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContainer: {
        backgroundColor: 'white',
        borderRadius: 24,
        padding: 24,
        alignItems: 'center',
        width: '100%',
        maxWidth: 340,
        elevation: 5,
    },
    iconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#FEE2E2',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16
    },
    title: {
        fontSize: 20,
        fontWeight: '800',
        color: '#1F2937',
        marginBottom: 12,
        textAlign: 'center',
    },
    message: {
        fontSize: 15,
        color: '#4B5563',
        textAlign: 'center',
        marginBottom: 24,
        lineHeight: 22,
    },
    bold: {
        fontWeight: '700',
        color: '#111827',
    },
    watchAdButton: {
        backgroundColor: '#8B5CF6',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        paddingVertical: 14,
        borderRadius: 14,
        gap: 8,
        marginBottom: 12,
        elevation: 2,
    },
    watchAdText: {
        color: 'white',
        fontWeight: '700',
        fontSize: 16,
    },
    cancelButton: {
        paddingVertical: 12,
        paddingHorizontal: 24,
    },
    cancelText: {
        color: '#6B7280',
        fontWeight: '600',
        fontSize: 15,
    },
});

export default StorageWarningModal;
