import React, { useState, useEffect } from 'react';
import {
  View, Text, Modal, TouchableOpacity, StyleSheet, TextInput,
  ScrollView, KeyboardAvoidingView, Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
      loadEntries();
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

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1 }}
          >
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Timetable</Text>
              <View style={{ width: 24 }} />
            </View>
            
            <View style={styles.dateSelector}>
              <TouchableOpacity onPress={() => changeDate(-1)} style={styles.dateArrow}>
                <Ionicons name="chevron-back" size={24} color="#fff" />
              </TouchableOpacity>
              <View style={styles.dateTextContainer}>
                <Text style={styles.dateText}>
                  {new Date(selectedDate).toLocaleDateString('en-US', { 
                    weekday: 'short', 
                    month: 'short', 
                    day: 'numeric' 
                  })}
                </Text>
                {isPastDate() && (
                  <Text style={styles.pastDateIndicator}>(Past)</Text>
                )}
              </View>
              <TouchableOpacity onPress={() => changeDate(1)} style={styles.dateArrow}>
                <Ionicons name="chevron-forward" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.entriesContainer}>
              {entries.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="calendar-outline" size={64} color="rgba(255,255,255,0.5)" />
                  <Text style={styles.emptyStateText}>No tasks scheduled for this day</Text>
                  <Text style={styles.emptyStateSubtext}>Add a task below to get started</Text>
                </View>
              ) : (
                entries.map(entry => (
                  <View key={entry.id} style={styles.entryItem}>
                    <View style={styles.entryContent}>
                      <TouchableOpacity 
                        onPress={() => toggleComplete(entry.id)}
                        style={[
                          styles.checkbox,
                          entry.completed && styles.checkboxChecked
                        ]}
                      >
                        {entry.completed && (
                          <Ionicons name="checkmark" size={16} color="#fff" />
                        )}
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
                        <Text style={styles.entryDuration}>
                          {entry.duration} {entry.duration === 1 ? 'hour' : 'hours'}
                        </Text>
                      </View>
                      <TouchableOpacity 
                        onPress={() => deleteEntry(entry.id)}
                        style={styles.deleteButton}
                      >
                        <Ionicons name="trash-outline" size={20} color="#ff6b6b" />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              )}
            </ScrollView>
            
            {!isPastDate() ? (
              <View style={styles.addEntryContainer}>
                <TextInput
                  style={styles.input}
                  placeholder="Task name"
                  placeholderTextColor="rgba(255,255,255,0.5)"
                  value={newTitle}
                  onChangeText={setNewTitle}
                />
                <TextInput
                  style={[styles.input, styles.durationInput]}
                  placeholder="Hours"
                  placeholderTextColor="rgba(255,255,255,0.5)"
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
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
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
    width: '90%',
    height: '80%',
    backgroundColor: '#546bab',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#475a96',
  },
  closeButton: {
    padding: 4,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  dateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    backgroundColor: '#5d74b3',
  },
  dateArrow: {
    padding: 8,
  },
  dateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginHorizontal: 16,
  },
  entriesContainer: {
    flex: 1,
    padding: 16,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 8,
  },
  entryItem: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
  },
  entryContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  checkboxChecked: {
    backgroundColor: '#4cd964',
    borderColor: '#4cd964',
  },
  entryTextContainer: {
    flex: 1,
  },
  entryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  entryTitleCompleted: {
    textDecorationLine: 'line-through',
    color: 'rgba(255,255,255,0.6)',
  },
  entryDuration: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
  },
  deleteButton: {
    padding: 8,
  },
  addEntryContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#475a96',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 8,
    padding: 12,
    color: '#fff',
    marginRight: 8,
  },
  durationInput: {
    flex: 0.3,
  },
  addButton: {
    backgroundColor: '#5d74b3',
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default TimeTableModal;