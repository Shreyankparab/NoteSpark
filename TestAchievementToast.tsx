import React from 'react';
import { View, Button, StyleSheet } from 'react-native';
import { showAchievementNotification } from './utils/achievementNotification';
import { Achievement, AchievementType } from './types';

const TestAchievementToast = () => {
  const testAchievement: Achievement = {
    id: 'focus_300',
    type: AchievementType.FOCUS_TIME,
    name: 'Focus Master',
    description: 'Completed 5 hours of focused work',
    imageFile: '../assets/five-hour-focus.jpg',
    userId: 'test-user-id',
    unlockedAt: Date.now()
  };

  const testAchievement2: Achievement = {
    id: 'streak_7',
    type: AchievementType.STREAK,
    name: 'Weekly Warrior',
    description: 'Maintained a 7-day streak',
    imageFile: '../assets/seven-days-streak.jpg',
    userId: 'test-user-id',
    unlockedAt: Date.now()
  };

  return (
    <View style={styles.container}>
      <Button 
        title="Test Achievement 1" 
        onPress={() => showAchievementNotification(testAchievement)}
      />
      <View style={styles.spacer} />
      <Button 
        title="Test Achievement 2" 
        onPress={() => showAchievementNotification(testAchievement2)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    marginTop: 50,
  },
  spacer: {
    height: 20
  }
});

export default TestAchievementToast;