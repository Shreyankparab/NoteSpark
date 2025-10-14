import React from "react";
import { StatusBar } from "expo-status-bar";
import TimerScreen from "./screens/TimerScreen";

export default function App() {
  return (
    <>
      <TimerScreen />
      <StatusBar style="light" />
    </>
  );
}
