/**
 * EXAMPLE FILE: How to integrate Subjects feature into your existing TimerScreen
 * 
 * This is a reference/documentation file showing integration patterns.
 * Copy the relevant parts into your actual TimerScreen.tsx
 */

import React, { useState } from 'react';
import { View, TouchableOpacity, Text, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import SubjectsScreen from './screens/SubjectsScreen';

// EXAMPLE 1: Add Subjects Modal to TimerScreen
// Copy this pattern into your TimerScreen component:

export function TimerScreenWithSubjectsExample() {
  // ... your existing state ...
  
  // Add this new state:
  const [showSubjectsModal, setShowSubjectsModal] = useState(false);

  return (
    <View style={{ flex: 1 }}>
      {/* Your existing timer UI */}
      
      {/* Add Subjects button to your header/menu */}
      <View style={{ flexDirection: 'row', gap: 16, padding: 20 }}>
        
        {/* Subjects Button */}
        <TouchableOpacity
          onPress={() => setShowSubjectsModal(true)}
          style={{
            backgroundColor: '#6366F1',
            padding: 12,
            borderRadius: 12,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <Ionicons name="folder" size={20} color="#FFF" />
          <Text style={{ color: '#FFF', fontWeight: '600' }}>Subjects</Text>
        </TouchableOpacity>

        {/* You can add more buttons here */}
      </View>

      {/* Subjects Modal */}
      <Modal
        visible={showSubjectsModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={{ flex: 1 }}>
          {/* Close button */}
          <View style={{ 
            flexDirection: 'row', 
            justifyContent: 'flex-end', 
            padding: 16,
            paddingTop: 50,
          }}>
            <TouchableOpacity
              onPress={() => setShowSubjectsModal(false)}
              style={{
                backgroundColor: '#F1F5F9',
                padding: 8,
                borderRadius: 20,
              }}
            >
              <Ionicons name="close" size={24} color="#64748b" />
            </TouchableOpacity>
          </View>
          
          {/* Subjects Screen */}
          <SubjectsScreen />
        </View>
      </Modal>

      {/* Add more modals as needed */}
    </View>
  );
}

// EXAMPLE 2: Add to existing drawer/sidebar menu
// If you have a drawer navigation, add this screen:

/*
import { createDrawerNavigator } from '@react-navigation/drawer';

const Drawer = createDrawerNavigator();

function AppNavigator() {
  return (
    <Drawer.Navigator>
      <Drawer.Screen 
        name="Timer" 
        component={YourTimerScreen}  // Your actual TimerScreen component
        options={{
          drawerIcon: ({ color, size }) => (
            <Ionicons name="timer" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen 
        name="Subjects" 
        component={SubjectsScreen}  // The SubjectsScreen from this project
        options={{
          drawerIcon: ({ color, size }) => (
            <Ionicons name="folder" size={size} color={color} />
          ),
        }}
      />
    </Drawer.Navigator>
  );
}
*/

// EXAMPLE 3: Add to bottom tab navigation
// If you have tab navigation, add this screen:

/*
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

const Tab = createBottomTabNavigator();

function AppTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: '#6366F1',
        tabBarInactiveTintColor: '#94A3B8',
      }}
    >
      <Tab.Screen 
        name="Timer" 
        component={YourTimerScreen}  // Your actual TimerScreen component
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="timer" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen 
        name="Subjects" 
        component={SubjectsScreen}  // The SubjectsScreen from this project
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="folder" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen 
        name="Profile" 
        component={YourProfileScreen}  // Your actual ProfileScreen component
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}
*/

/**
 * NOTE: This is a documentation/example file.
 * 
 * The actual SubjectsScreen is already integrated into your app via:
 * - Bottom tab navigation (folder icon)
 * - Accessible from the main navigation
 * 
 * You don't need to implement these examples unless you want
 * alternative ways to access the Subjects feature.
 */
