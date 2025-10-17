import React, { useState } from 'react';
import { View, Button, StyleSheet, ScrollView, Text, Alert } from 'react-native';
import { showAchievementNotification } from './utils/achievementNotification';
import { Achievement, AchievementType } from './types';
import { collection, query, where, getDocs, deleteDoc } from 'firebase/firestore';
import { db } from './firebase/firebaseConfig';

const TestAchievementToast = () => {
  const [userId] = useState('test-user-id'); // Change this to your actual user ID for testing
  // Define all 9 achievements for testing
  const achievements: Achievement[] = [
    {
      id: 'streak_3',
      type: AchievementType.STREAK,
      name: '3-Day Streak',
      description: 'Completed focus sessions for 3 consecutive days',
      imageFile: require('./assets/three-days-streak.jpg'),
      userId: 'test-user-id',
      unlockedAt: Date.now()
    },
    {
      id: 'streak_7',
      type: AchievementType.STREAK,
      name: '7-Day Streak',
      description: 'Completed focus sessions for 7 consecutive days',
      imageFile: require('./assets/seven-days-streak.jpg'),
      userId: 'test-user-id',
      unlockedAt: Date.now()
    },
    {
      id: 'streak_30',
      type: AchievementType.STREAK,
      name: '30-Day Streak',
      description: 'Completed focus sessions for 30 consecutive days',
      imageFile: require('./assets/thirty-days-streak.jpg'),
      userId: 'test-user-id',
      unlockedAt: Date.now()
    },
    {
      id: 'focus_60',
      type: AchievementType.FOCUS_TIME,
      name: '1 Hour Focus',
      description: 'Accumulated 60 minutes of focus time',
      imageFile: require('./assets/one-hr-focus-time.jpg'),
      userId: 'test-user-id',
      unlockedAt: Date.now()
    },
    {
      id: 'focus_300',
      type: AchievementType.FOCUS_TIME,
      name: '5 Hour Focus',
      description: 'Accumulated 300 minutes of focus time',
      imageFile: require('./assets/five-hour-focus.jpg'),
      userId: 'test-user-id',
      unlockedAt: Date.now()
    },
    {
      id: 'focus_1000',
      type: AchievementType.FOCUS_TIME,
      name: '1000 Minute Focus',
      description: 'Accumulated 1000 minutes of focus time',
      imageFile: require('./assets/one-thousand-minutes.jpg'), // Using placeholder
      userId: 'test-user-id',
      unlockedAt: Date.now()
    },
    {
      id: 'tasks_10',
      type: AchievementType.TASKS_COMPLETED,
      name: 'Task Starter',
      description: 'Completed 10 tasks',
      imageFile: require('./assets/ten-tasks-completed.jpg'),
      userId: 'test-user-id',
      unlockedAt: Date.now()
    },
    {
      id: 'tasks_25',
      type: AchievementType.TASKS_COMPLETED,
      name: 'Task Champion',
      description: 'Completed 25 tasks',
      imageFile: require('./assets/twenty-five-tasks-completed.jpg'),
      userId: 'test-user-id',
      unlockedAt: Date.now()
    },
    {
      id: 'tasks_50',
      type: AchievementType.TASKS_COMPLETED,
      name: 'Task Master',
      description: 'Completed 50 tasks',
      imageFile: require('./assets/fifty-tasks-completed.jpg'),
      userId: 'test-user-id',
      unlockedAt: Date.now()
    }
  ];

  const testAchievement = (achievement: Achievement) => {
    console.log(`🧪 Testing achievement: ${achievement.name}`);
    showAchievementNotification(achievement);
  };

  const clearAchievement = async (achievementId: string, achievementName: string) => {
    try {
      const achievementsRef = collection(db, "achievements");
      const q = query(
        achievementsRef,
        where("userId", "==", userId),
        where("id", "==", achievementId)
      );
      
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        Alert.alert('Not Found', `Achievement "${achievementName}" is not unlocked for this user.`);
        return;
      }
      
      // Delete all matching documents
      const deletePromises = querySnapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deletePromises);
      
      Alert.alert('Success', `Achievement "${achievementName}" has been cleared! You can now unlock it again.`);
      console.log(`✅ Cleared achievement: ${achievementName}`);
    } catch (error) {
      console.error('❌ Error clearing achievement:', error);
      Alert.alert('Error', 'Failed to clear achievement. Check console for details.');
    }
  };

  const clearAllAchievements = async () => {
    Alert.alert(
      'Clear All Achievements?',
      'This will delete all unlocked achievements for testing. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            try {
              const achievementsRef = collection(db, "achievements");
              const q = query(achievementsRef, where("userId", "==", userId));
              const querySnapshot = await getDocs(q);
              
              const deletePromises = querySnapshot.docs.map(doc => deleteDoc(doc.ref));
              await Promise.all(deletePromises);
              
              Alert.alert('Success', `Cleared ${querySnapshot.size} achievements!`);
              console.log(`✅ Cleared all ${querySnapshot.size} achievements`);
            } catch (error) {
              console.error('❌ Error clearing achievements:', error);
              Alert.alert('Error', 'Failed to clear achievements.');
            }
          }
        }
      ]
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <Text style={styles.title}>🏆 Achievement Toast Tester</Text>
      <Text style={styles.subtitle}>Test all 9 achievements</Text>

      {/* Instructions */}
      <View style={styles.instructionsBox}>
        <Text style={styles.instructionsTitle}>📖 How to Use:</Text>
        <Text style={styles.instructionsText}>
          1. Press any button to test the achievement toast{'\n'}
          2. If toast doesn't show, the achievement is already unlocked{'\n'}
          3. Use "Clear Achievement" to reset and test again{'\n'}
          4. Change userId at top of file to match your actual user ID
        </Text>
      </View>

      {/* Clear Achievements */}
      <View style={styles.dangerZone}>
        <Text style={styles.dangerTitle}>⚠️ Testing Tools</Text>
        <Button 
          title="Clear All Achievements (Reset for Testing)"
          onPress={clearAllAchievements}
          color="#DC2626"
        />
        <View style={styles.spacer} />
        <Button 
          title="Clear Task Champion (25 tasks)"
          onPress={() => clearAchievement('tasks_25', 'Task Champion')}
          color="#F59E0B"
        />
      </View>

      {/* Streak Achievements */}
      <Text style={styles.sectionTitle}>🔥 Streak Achievements</Text>
      {achievements.filter(a => a.type === AchievementType.STREAK).map((achievement, index) => (
        <View key={achievement.id}>
          <Button 
            title={`${achievement.name} - ${achievement.description}`}
            onPress={() => testAchievement(achievement)}
            color="#6366F1"
          />
          <View style={styles.spacer} />
        </View>
      ))}

      {/* Focus Time Achievements */}
      <Text style={styles.sectionTitle}>⏱️ Focus Time Achievements</Text>
      {achievements.filter(a => a.type === AchievementType.FOCUS_TIME).map((achievement, index) => (
        <View key={achievement.id}>
          <Button 
            title={`${achievement.name} - ${achievement.description}`}
            onPress={() => testAchievement(achievement)}
            color="#06B6D4"
          />
          <View style={styles.spacer} />
        </View>
      ))}

      {/* Task Completion Achievements */}
      <Text style={styles.sectionTitle}>✅ Task Completion Achievements</Text>
      {achievements.filter(a => a.type === AchievementType.TASKS_COMPLETED).map((achievement, index) => (
        <View key={achievement.id}>
          <Button 
            title={`${achievement.name} - ${achievement.description}`}
            onPress={() => testAchievement(achievement)}
            color="#10B981"
          />
          <View style={styles.spacer} />
        </View>
      ))}

      {/* Test Multiple Achievements */}
      <Text style={styles.sectionTitle}>🎯 Test Multiple</Text>
      <Button 
        title="Test All 9 Achievements (Queue)"
        onPress={() => {
          console.log('🧪 Testing all achievements in queue');
          achievements.forEach(achievement => {
            showAchievementNotification(achievement);
          });
        }}
        color="#F59E0B"
      />
      <View style={styles.spacer} />
      <Button 
        title="Test 3 Random Achievements"
        onPress={() => {
          const shuffled = [...achievements].sort(() => 0.5 - Math.random());
          const selected = shuffled.slice(0, 3);
          console.log('🧪 Testing 3 random achievements');
          selected.forEach(achievement => {
            showAchievementNotification(achievement);
          });
        }}
        color="#8B5CF6"
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  contentContainer: {
    padding: 20,
    paddingTop: 60,
    paddingBottom: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 24,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    marginTop: 16,
    marginBottom: 12,
  },
  instructionsBox: {
    backgroundColor: '#EEF2FF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#4338CA',
    marginBottom: 8,
  },
  instructionsText: {
    fontSize: 13,
    color: '#4338CA',
    lineHeight: 20,
  },
  dangerZone: {
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  dangerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#DC2626',
    marginBottom: 12,
  },
  spacer: {
    height: 12
  }
});

export default TestAchievementToast;