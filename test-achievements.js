// Test script to verify achievement system
// Run this in the browser console or as a Node.js script

const testAchievementSystem = async () => {
  console.log('🧪 Testing Achievement System...');
  
  // Test data
  const testUserId = 'test-user-123';
  const testStreak = 3;
  
  try {
    // Import the achievement functions (adjust import path as needed)
    const { checkStreakAchievements, getUserAchievements } = require('./utils/achievements');
    
    console.log('1. Testing streak achievement check...');
    const newAchievements = await checkStreakAchievements(testUserId, testStreak);
    console.log('✅ New achievements:', newAchievements);
    
    console.log('2. Testing get user achievements...');
    const userAchievements = await getUserAchievements(testUserId);
    console.log('✅ User achievements:', userAchievements);
    
    console.log('3. Testing 3-day streak specifically...');
    const threeDayAchievement = userAchievements.find(a => a.id === 'streak_3');
    if (threeDayAchievement) {
      console.log('✅ 3-Day Streak achievement found:', threeDayAchievement);
    } else {
      console.log('❌ 3-Day Streak achievement not found');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
};

// Uncomment to run the test
// testAchievementSystem();
