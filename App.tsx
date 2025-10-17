import React, { useEffect, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { StatusBar } from "expo-status-bar";
import TimerScreen from "./screens/TimerScreen";
import { View, Text, Image, StyleSheet } from "react-native";
import { auth } from "./firebase/firebaseConfig";
import AchievementToastManager from "./components/AchievementToastManager";
import TestAchievementToast from "./TestAchievementToast";

export default function App() {
  const [isSplashVisible, setIsSplashVisible] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged((u) => setIsLoggedIn(!!u));
    const t = setTimeout(() => setIsSplashVisible(false), 3200);
    return () => {
      unsub();
      clearTimeout(t);
    };
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      {isSplashVisible || isLoggedIn === null ? (
        <View style={styles.splashContainer}>
          <Image
            source={require("./assets/splash-icon.png")}
            style={styles.splashLogo}
          />
          <Text style={styles.splashTitle}>NoteSpark</Text>
          <Text style={styles.splashSubtitle}>Focus. Capture. Grow.</Text>
        </View>
      ) : (
        <>
          <TimerScreen />
          {/* <TestAchievementToast /> */}
          <StatusBar style="light" />
          <AchievementToastManager />
        </>
      )}
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  splashContainer: {
    flex: 1,
    backgroundColor: "#6A85B6",
    alignItems: "center",
    justifyContent: "center",
  },
  splashLogo: {
    width: 140,
    height: 140,
    marginBottom: 16,
    resizeMode: "contain",
  },
  splashTitle: { color: "#fff", fontSize: 28, fontWeight: "800" },
  splashSubtitle: { color: "#e2e8f0", marginTop: 6, fontWeight: "600" },
});
