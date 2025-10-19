/**
 * Network Status Banner
 * Shows when app is offline
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNetworkStatus } from '../utils/networkManager';
import { getSyncQueueSize } from '../utils/offlineStorage';
import { processSyncQueue } from '../utils/syncManager';

export default function NetworkStatusBanner() {
  const isOnline = useNetworkStatus();
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    const checkPending = async () => {
      const count = await getSyncQueueSize();
      setPendingCount(count);
    };

    // Check immediately
    checkPending();

    // Check every 5 seconds
    const interval = setInterval(checkPending, 5000);

    return () => clearInterval(interval);
  }, []);

  const handleManualSync = async () => {
    if (!isOnline) return;

    setSyncing(true);
    try {
      await processSyncQueue();
      const count = await getSyncQueueSize();
      setPendingCount(count);
    } catch (error) {
      console.error('Manual sync failed:', error);
    } finally {
      setSyncing(false);
    }
  };

  if (isOnline && pendingCount === 0) {
    return null; // Don't show when online and nothing pending
  }

  return (
    <View style={[styles.banner, isOnline ? styles.bannerOnline : styles.bannerOffline]}>
      <View style={styles.leftContent}>
        <Ionicons 
          name={isOnline ? "cloud-done" : "cloud-offline"} 
          size={16} 
          color="#FFF" 
        />
        <Text style={styles.text}>
          {isOnline 
            ? `${pendingCount} pending sync${pendingCount !== 1 ? 's' : ''}`
            : 'Offline Mode - Changes will sync when online'
          }
        </Text>
      </View>

      {isOnline && pendingCount > 0 && (
        <TouchableOpacity 
          onPress={handleManualSync} 
          disabled={syncing}
          style={styles.syncButton}
        >
          <Ionicons 
            name={syncing ? "sync" : "cloud-upload"} 
            size={16} 
            color="#FFF" 
          />
          <Text style={styles.syncButtonText}>
            {syncing ? 'Syncing...' : 'Sync Now'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bannerOffline: {
    backgroundColor: '#F59E0B', // Orange for offline
  },
  bannerOnline: {
    backgroundColor: '#3B82F6', // Blue for syncing
  },
  leftContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  text: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  syncButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  syncButtonText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '700',
  },
});
