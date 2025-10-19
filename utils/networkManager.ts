/**
 * Network Manager
 * Handles network connectivity detection and status
 */

import NetInfo from '@react-native-community/netinfo';
import { useState, useEffect } from 'react';

let isOnline = true;
let listeners: Array<(online: boolean) => void> = [];

/**
 * Initialize network monitoring
 */
export function initializeNetworkMonitoring(): void {
  NetInfo.addEventListener(state => {
    const online = state.isConnected === true && state.isInternetReachable === true;
    
    if (online !== isOnline) {
      isOnline = online;
      console.log(`📡 Network status changed: ${online ? 'ONLINE' : 'OFFLINE'}`);
      
      // Notify all listeners
      listeners.forEach(listener => listener(online));
    }
  });
}

/**
 * Check if currently online
 */
export async function checkIsOnline(): Promise<boolean> {
  try {
    const state = await NetInfo.fetch();
    return state.isConnected === true && state.isInternetReachable === true;
  } catch (error) {
    console.error('❌ Error checking network status:', error);
    return false;
  }
}

/**
 * Get current online status (synchronous)
 */
export function getOnlineStatus(): boolean {
  return isOnline;
}

/**
 * Subscribe to network status changes
 */
export function subscribeToNetworkChanges(callback: (online: boolean) => void): () => void {
  listeners.push(callback);
  
  // Return unsubscribe function
  return () => {
    listeners = listeners.filter(l => l !== callback);
  };
}

/**
 * React hook for network status
 */
export function useNetworkStatus() {
  const [online, setOnline] = useState(isOnline);

  useEffect(() => {
    // Set initial status
    checkIsOnline().then(setOnline);

    // Subscribe to changes
    const unsubscribe = subscribeToNetworkChanges(setOnline);

    return unsubscribe;
  }, []);

  return online;
}

/**
 * Wait for online connection
 */
export function waitForOnline(timeoutMs: number = 30000): Promise<boolean> {
  return new Promise((resolve) => {
    if (isOnline) {
      resolve(true);
      return;
    }

    const timeout = setTimeout(() => {
      unsubscribe();
      resolve(false);
    }, timeoutMs);

    const unsubscribe = subscribeToNetworkChanges((online) => {
      if (online) {
        clearTimeout(timeout);
        unsubscribe();
        resolve(true);
      }
    });
  });
}
