import React from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { StatusBar } from "expo-status-bar";
import TimerScreen from "./screens/TimerScreen";

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <TimerScreen />
      <StatusBar style="light" />
    </GestureHandlerRootView>
  );
}
