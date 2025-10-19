import React, { useState, useEffect } from 'react';
import {
  View, Text, Modal, TouchableOpacity, StyleSheet, TextInput,
  ScrollView, KeyboardAvoidingView, Platform, Animated
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';

// Define the TimeTable entry type
interface TimeTableEntry {
  id: string;
  title: string;
  duration: number; // in hours
  completed: boolean;
  date: string; // ISO date string
}

interface TimeTableModalProps {
  visible: boolean;
  onClose: () => void;
  userId: string | null;
}

const TIMETABLE_STORAGE_KEY = 'notespark_timetable';

const TimeTableModal: React.FC<TimeTableModalProps> = ({ visible, onClose, userId }) => {
  const [entries, setEntries] = useState<TimeTableEntry[]>([]);
  const [newTitle, setNewTitle] = useState('');
  const [newDuration, setNewDuration] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const fadeAnim = useState(new Animated.Value(0))[0];
  const slideAnim = useState(new Animated.Value(50))[0];
  
  // Check if selected date is in the past
  const isPastDate = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selected = new Date(selectedDate);
    selected.setHours(0, 0, 0, 0);
    return selected < today;
  };
  
  // Load timetable entries from storage
  useEffect(() => {
    if (visible) {
      console.log('📅 TimeTable Modal opened');
      loadEntries();
      // Animate in
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Reset animation
      fadeAnim.setValue(0);
      slideAnim.setValue(50);
    }
  }, [visible, selectedDate]);

  const loadEntries = async () => {
    try {
      const storageKey = userId ? `${TIMETABLE_STORAGE_KEY}_${userId}` : TIMETABLE_STORAGE_KEY;
      const storedEntries = await AsyncStorage.getItem(storageKey);
      if (storedEntries) {
        const parsedEntries = JSON.parse(storedEntries) as TimeTableEntry[];
        // Filter entries for the selected date
        const filteredEntries = parsedEntries.filter(entry => entry.date === selectedDate);
        setEntries(filteredEntries);
      }
    } catch (error) {
      console.error('Failed to load timetable entries:', error);
    }
  };

  const saveEntries = async (updatedEntries: TimeTableEntry[]) => {
    try {
      const storageKey = userId ? `${TIMETABLE_STORAGE_KEY}_${userId}` : TIMETABLE_STORAGE_KEY;
      // Get all entries first
      const storedEntries = await AsyncStorage.getItem(storageKey);
      let allEntries: TimeTableEntry[] = storedEntries ? JSON.parse(storedEntries) : [];
      
      // Remove entries for the selected date
      allEntries = allEntries.filter(entry => entry.date !== selectedDate);
      
      // Add the updated entries for the selected date
      allEntries = [...allEntries, ...updatedEntries];
      
      await AsyncStorage.setItem(storageKey, JSON.stringify(allEntries));
    } catch (error) {
      console.error('Failed to save timetable entries:', error);
    }
  };

  const addEntry = () => {
    if (newTitle.trim() === '' || newDuration.trim() === '') return;
    
    const duration = parseFloat(newDuration);
    if (isNaN(duration) || duration <= 0) {
      alert('Please enter a valid duration');
      return;
    }
    
    const newEntry: TimeTableEntry = {
      id: Date.now().toString(),
      title: newTitle,
      duration,
      completed: false,
      date: selectedDate
    };
    
    const updatedEntries = [...entries, newEntry];
    setEntries(updatedEntries);
    saveEntries(updatedEntries);
    
    // Clear input fields
    setNewTitle('');
    setNewDuration('');
  };

  const toggleComplete = (id: string) => {
    const updatedEntries = entries.map(entry => 
      entry.id === id ? { ...entry, completed: !entry.completed } : entry
    );
    setEntries(updatedEntries);
    saveEntries(updatedEntries);
  };

  const deleteEntry = (id: string) => {
    const updatedEntries = entries.filter(entry => entry.id !== id);
    setEntries(updatedEntries);
    saveEntries(updatedEntries);
  };

  const changeDate = (daysToAdd: number) => {
    const date = new Date(selectedDate);
    date.setDate(date.getDate() + daysToAdd);
    setSelectedDate(date.toISOString().split('T')[0]);
  };

  // Calculate statistics
  const totalHours = entries.reduce((sum, entry) => sum + entry.duration, 0);
  const completedHours = entries.filter(e => e.completed).reduce((sum, entry) => sum + entry.duration, 0);
  const completionPercentage = entries.length > 0 ? (entries.filter(e => e.completed).length / entries.length) * 100 : 0;
  
  const isToday = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selected = new Date(selectedDate);
    selected.setHours(0, 0, 0, 0);
    return selected.getTime() === today.getTime();
  };

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <Animated.View 
          style={[
            styles.modalContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            }
          ]}
        >
          <LinearGradient
            colors={['#ffffff', '#f0f4ff', '#e8f0fe']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.gradientContainer}
          >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1 }}
          >
            {/* Header with close button */}
            <View style={styles.modalHeader}>
              <View style={styles.headerContent}>
                <View style={styles.headerIcon}>
                  <Ionicons name="calendar" size={28} color="#667eea" />
                </View>
                <View>
                  <Text style={styles.modalTitle}>My Timetable</Text>
                  <Text style={styles.modalSubtitle}>Plan your productive day</Text>
                </View>
              </View>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Ionicons name="close-circle" size={32} color="#64748b" />
              </TouchableOpacity>
            </View>
            
            {/* Date Selector with Status Badge */}
            <View style={styles.dateSelector}>
              <TouchableOpacity onPress={() => changeDate(-1)} style={styles.dateArrow}>
                <Ionicons name="chevron-back-circle" size={36} color="#667eea" />
              </TouchableOpacity>
              <View style={styles.dateTextContainer}>
                <Text style={styles.dateText}>
                  {new Date(selectedDate).toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </Text>
                <View style={styles.dateBadge}>
                  {isToday() ? (
                    <View style={[styles.statusBadge, { backgroundColor: '#4cd964' }]}>
                      <Ionicons name="today" size={12} color="#fff" />
                      <Text style={styles.badgeText}>Today</Text>
                    </View>
                  ) : isPastDate() ? (
                    <View style={[styles.statusBadge, { backgroundColor: '#ff6b6b' }]}>
                      <Ionicons name="time" size={12} color="#fff" />
                      <Text style={styles.badgeText}>Past</Text>
                    </View>
                  ) : (
                    <View style={[styles.statusBadge, { backgroundColor: '#5ac8fa' }]}>
                      <Ionicons name="calendar-outline" size={12} color="#fff" />
                      <Text style={styles.badgeText}>Upcoming</Text>
                    </View>
                  )}
                </View>
              </View>
              <TouchableOpacity onPress={() => changeDate(1)} style={styles.dateArrow}>
                <Ionicons name="chevron-forward-circle" size={36} color="#667eea" />
              </TouchableOpacity>
            </View>
            
            {/* Statistics Card */}
            {entries.length > 0 && (
              <View style={styles.statsCard}>
                <View style={styles.statItem}>
                  <Ionicons name="list" size={20} color="#667eea" />
                  <Text style={styles.statValue}>{entries.length}</Text>
                  <Text style={styles.statLabel}>Tasks</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Ionicons name="time" size={20} color="#f59e0b" />
                  <Text style={styles.statValue}>{totalHours.toFixed(1)}h</Text>
                  <Text style={styles.statLabel}>Total</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Ionicons name="checkmark-circle" size={20} color="#10b981" />
                  <Text style={styles.statValue}>{completionPercentage.toFixed(0)}%</Text>
                  <Text style={styles.statLabel}>Done</Text>
                </View>
              </View>
            )}
            
            {/* Tasks List */}
            <ScrollView 
              style={styles.entriesContainer}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {entries.length === 0 ? (
                <View style={styles.emptyState}>
                  <View style={styles.emptyIconContainer}>
                    <Ionicons name="calendar-outline" size={80} color="#cbd5e1" />
                  </View>
                  <Text style={styles.emptyStateText}>No tasks scheduled</Text>
                  <Text style={styles.emptyStateSubtext}>
                    {isPastDate() 
                      ? "This day has passed" 
                      : "Start planning your day by adding tasks below"}
                  </Text>
                </View>
              ) : (
                entries.map((entry, index) => (
                  <Animated.View 
                    key={entry.id} 
                    style={[
                      styles.entryItem,
                      entry.completed && styles.entryItemCompleted
                    ]}
                  >
                    <View style={styles.entryHeader}>
                      <TouchableOpacity 
                        onPress={() => toggleComplete(entry.id)}
                        style={styles.checkboxContainer}
                        activeOpacity={0.7}
                      >
                        <View style={[
                          styles.checkbox,
                          entry.completed && styles.checkboxChecked
                        ]}>
                          {entry.completed && (
                            <Ionicons name="checkmark" size={18} color="#fff" />
                          )}
                        </View>
                      </TouchableOpacity>
                      
                      <View style={styles.entryTextContainer}>
                        <Text 
                          style={[
                            styles.entryTitle,
                            entry.completed && styles.entryTitleCompleted
                          ]}
                        >
                          {entry.title}
                        </Text>
                        <View style={styles.entryMeta}>
                          <View style={styles.durationBadge}>
                            <Ionicons name="time-outline" size={14} color="#667eea" />
                            <Text style={styles.entryDuration}>
                              {entry.duration} {entry.duration === 1 ? 'hr' : 'hrs'}
                            </Text>
                          </View>
                          {entry.completed && (
                            <View style={styles.completedBadge}>
                              <Ionicons name="checkmark-circle" size={14} color="#10b981" />
                              <Text style={styles.completedText}>Completed</Text>
                            </View>
                          )}
                        </View>
                      </View>
                      
                      <TouchableOpacity 
                        onPress={() => deleteEntry(entry.id)}
                        style={styles.deleteButton}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="trash" size={22} color="#ff6b6b" />
                      </TouchableOpacity>
                    </View>
                    
                    {/* Progress indicator for incomplete tasks */}
                    {!entry.completed && (
                      <View style={styles.progressIndicator}>
                        <View style={styles.progressBar} />
                      </View>
                    )}
                  </Animated.View>
                ))
              )}
            </ScrollView>
            
            {!isPastDate() ? (
              <View style={styles.addEntryContainer}>
                <TextInput
                  style={styles.input}
                  placeholder="Task name"
                  placeholderTextColor="#94a3b8"
                  value={newTitle}
                  onChangeText={setNewTitle}
                />
                <TextInput
                  style={[styles.input, styles.durationInput]}
                  placeholder="Hours"
                  placeholderTextColor="#94a3b8"
                  keyboardType="numeric"
                  value={newDuration}
                  onChangeText={setNewDuration}
                />
                <TouchableOpacity 
                  style={styles.addButton}
                  onPress={addEntry}
                >
                  <Ionicons name="add" size={24} color="#fff" />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.pastDateMessage}>
                <Text style={styles.pastDateText}>Cannot add tasks to past dates</Text>
              </View>
            )}
          </KeyboardAvoidingView>
          </LinearGradient>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pastDateMessage: {
    padding: 16,
    backgroundColor: 'rgba(255, 107, 107, 0.2)',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 107, 107, 0.3)',
  },
  pastDateText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  dateTextContainer: {
    alignItems: 'center',
  },
  pastDateIndicator: {
    color: '#ff6b6b',
    fontSize: 12,
    marginTop: 2,
    fontWeight: '500',
  },
  modalContainer: {
    width: '100%',
    height: '100%',
    borderRadius: 0,
    overflow: 'hidden',
  },
  gradientContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    paddingTop: 24,
    backgroundColor: 'rgba(102, 126, 234, 0.05)',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f0f4ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButton: {
    padding: 4,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1e293b',
    letterSpacing: 0.5,
  },
  modalSubtitle: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
  dateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 20,
    paddingHorizontal: 16,
    backgroundColor: '#fafbff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  dateArrow: {
    padding: 4,
  },
  dateText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
    letterSpacing: 0.3,
    textAlign: 'center',
  },
  dateBadge: {
    marginTop: 6,
    alignItems: 'center',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
  },
  statsCard: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1e293b',
  },
  statLabel: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statDivider: {
    width: 1,
    backgroundColor: '#e2e8f0',
    marginHorizontal: 8,
  },
  entriesContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 8,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  emptyIconContainer: {
    marginBottom: 20,
    opacity: 0.5,
  },
  emptyStateText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 20,
  },
  entryItem: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    marginBottom: 12,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  entryItemCompleted: {
    backgroundColor: '#f0fdf4',
    borderColor: '#86efac',
  },
  entryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  checkboxContainer: {
    marginRight: 12,
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2.5,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
  },
  checkboxChecked: {
    backgroundColor: '#10b981',
    borderColor: '#10b981',
  },
  entryTextContainer: {
    flex: 1,
  },
  entryTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 8,
    letterSpacing: 0.2,
  },
  entryTitleCompleted: {
    textDecorationLine: 'line-through',
    color: '#94a3b8',
    fontWeight: '600',
  },
  entryMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  durationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f0f4ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  entryDuration: {
    fontSize: 12,
    color: '#667eea',
    fontWeight: '600',
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#d1fae5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  completedText: {
    fontSize: 11,
    color: '#10b981',
    fontWeight: '700',
  },
  deleteButton: {
    padding: 8,
    marginLeft: 8,
  },
  progressIndicator: {
    height: 3,
    backgroundColor: '#e2e8f0',
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    width: '30%',
    backgroundColor: '#667eea',
  },
  addEntryContainer: {
    flexDirection: 'row',
    padding: 16,
    paddingBottom: Platform.OS === 'android' ? 16 : 20,
    backgroundColor: '#fafbff',
    alignItems: 'center',
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  input: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    color: '#1e293b',
    fontSize: 15,
    fontWeight: '500',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
  },
  durationInput: {
    flex: 0.35,
  },
  addButton: {
    backgroundColor: '#667eea',
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
});

export default TimeTableModal;