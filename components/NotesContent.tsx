import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
} from "react-native";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  deleteDoc,
  doc,
  updateDoc,
} from "firebase/firestore";
import { auth, db } from "../firebase/firebaseConfig";
import { PomodoroNote } from "../types";
import CustomNoteModal from "./modals/CustomNoteModal";
import { aiService } from "../utils/aiService";

interface NotesContentProps {
  // Add any props if needed
}

const NotesContent: React.FC<NotesContentProps> = () => {
  const [notes, setNotes] = useState<PomodoroNote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCustomNoteModal, setShowCustomNoteModal] = useState(false);
  const [processingNoteId, setProcessingNoteId] = useState<string | null>(null);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      setIsLoading(false);
      return;
    }

    console.log("🔥 Setting up Firestore listener for notes, user:", user.uid);

    const notesQuery = query(
      collection(db, "notes"),
      where("userId", "==", user.uid),
      orderBy("completedAt", "desc")
    );

    const unsubscribe = onSnapshot(
      notesQuery,
      (querySnapshot) => {
        const notesData: PomodoroNote[] = [];
        querySnapshot.forEach((doc) => {
          notesData.push({
            id: doc.id,
            ...doc.data(),
          } as PomodoroNote);
        });

        console.log("✅ Notes loaded from Firestore:", notesData.length);
        setNotes(notesData);
        setIsLoading(false);
      },
      (error) => {
        console.error("❌ Error loading notes:", error);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const handleDeleteNote = async (noteId: string) => {
    Alert.alert(
      "Delete Note",
      "Are you sure you want to delete this note? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteDoc(doc(db, "notes", noteId));
              console.log("✅ Note deleted successfully");
            } catch (error) {
              console.error("❌ Error deleting note:", error);
              Alert.alert("Error", "Failed to delete note. Please try again.");
            }
          },
        },
      ]
    );
  };
  
  const formatDate = (timestamp: number): string => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };
  const handleAISummarize = async (noteId: string, noteContent: string) => {
    try {
      setProcessingNoteId(noteId);
      
      // Process with AI service (will use OpenAI or fallback to Gemini)
      const summarizedContent = await aiService.processText({
        content: noteContent,
        type: 'summarize'
      });
      
      // Update the note in Firestore
      await updateDoc(doc(db, "notes", noteId), {
        notes: summarizedContent,
        aiProcessed: true,
        processingType: "summarized",
        aiProvider: aiService.getCurrentProvider() // Store which AI was used
      });
      
      Alert.alert("Success", `Note has been summarized using ${aiService.getCurrentProvider()}!`);
      setProcessingNoteId(null);
    } catch (error) {
      console.error("❌ Error summarizing note:", error);
      Alert.alert("Error", "Failed to summarize note. Please try again.");
      setProcessingNoteId(null);
    }
  };

  const handleAIEnhance = async (noteId: string, noteContent: string) => {
    try {
      setProcessingNoteId(noteId);
      
      // Process with AI service (will use OpenAI or fallback to Gemini)
      const enhancedContent = await aiService.processText({
        content: noteContent,
        type: 'enhance'
      });
      
      // Update the note in Firestore
      await updateDoc(doc(db, "notes", noteId), {
        notes: enhancedContent,
        aiProcessed: true,
        processingType: "enhanced",
        aiProvider: aiService.getCurrentProvider() // Store which AI was used
      });
      
      Alert.alert("Success", `Note has been enhanced using ${aiService.getCurrentProvider()}!`);
      setProcessingNoteId(null);
    } catch (error) {
      console.error("❌ Error enhancing note:", error);
      Alert.alert("Error", "Failed to enhance note. Please try again.");
      setProcessingNoteId(null);
    }
  };

  const formatDuration = (minutes: number): string => {
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    }
    return `${minutes}m`;
  };

  const formatTime = (timestamp: number): string => {
    return new Date(timestamp).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const groupNotesByDate = (
    notes: PomodoroNote[]
  ): { [date: string]: PomodoroNote[] } => {
    return notes.reduce((groups, note) => {
      const dateKey = new Date(note.completedAt).toDateString();
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(note);
      return groups;
    }, {} as { [date: string]: PomodoroNote[] });
  };

  if (!auth.currentUser) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>🔐 Sign In Required</Text>
          <Text style={styles.emptyText}>
            Please sign in to view your Pomodoro session notes.
          </Text>
        </View>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>📝 Loading Notes...</Text>
        </View>
      </View>
    );
  }

  if (notes.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>📝 No Notes Yet</Text>
          <Text style={styles.emptyText}>
            Complete a Pomodoro session and add notes to see them here!
          </Text>
        </View>
      </View>
    );
  }

  const groupedNotes = groupNotesByDate(notes);

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollContainer}>
        <View style={styles.header}>
          <Text style={styles.title}>📝 Session Notes</Text>
          <View>
            <Text style={styles.subtitle}>{notes.length} total sessions</Text>
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => setShowCustomNoteModal(true)}
            >
              <Text
                style={{ color: "#6C63FF", fontSize: 16, fontWeight: "600" }}
              >
                + New Note
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {Object.entries(groupedNotes).map(([dateKey, dayNotes]) => (
          <View key={dateKey} style={styles.dateGroup}>
            <Text style={styles.dateHeader}>
              {formatDate(dayNotes[0].completedAt)}
            </Text>

            {dayNotes.map((note) => (
              <View key={note.id} style={styles.noteCard}>
                <View style={styles.noteHeader}>
                  <View style={styles.noteInfo}>
                    <Text style={styles.taskTitle}>{note.taskTitle}</Text>
                    <Text style={styles.duration}>
                      {formatDuration(note.duration)}
                    </Text>
                  </View>
                  <View style={styles.noteActions}>
                    <Text style={styles.timestamp}>
                      {formatTime(note.completedAt)}
                    </Text>
                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={() => handleDeleteNote(note.id)}
                    >
                      <Text style={styles.deleteButtonText}>🗑️</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {note.imageUrl ? (
                  <TouchableOpacity
                    onPress={() => {
                      Alert.alert(
                        note.taskTitle || 'Image',
                        'Open image in browser?',
                        [
                          { text: 'Cancel', style: 'cancel' },
                          { text: 'Open', onPress: () => {
                              // open URL using Linking
                              import('react-native').then(({ Linking }) => Linking.openURL(note.imageUrl!));
                            } },
                        ]
                      );
                    }}
                    style={{ marginBottom: 10 }}
                  >
                    <Image source={{ uri: note.imageUrl }} style={{ width: '100%', height: 180, borderRadius: 10, backgroundColor: '#eee' }} resizeMode="cover" />
                  </TouchableOpacity>
                ) : null}

                {note.notes.trim() && (
                  <View style={styles.notesContent}>
                    <Text style={styles.notesText}>{note.notes}</Text>
                    <View style={styles.aiActions}>
                      {processingNoteId === note.id ? (
                        <View style={styles.aiButton}>
                          <ActivityIndicator size="small" color="white" />
                        </View>
                      ) : (
                        <>
                          {note.notes.length > 100 && (
                            <TouchableOpacity 
                              style={styles.aiButton}
                              onPress={() => handleAISummarize(note.id, note.notes)}
                            >
                              <Text style={styles.aiButtonText}>AI Summarize</Text>
                            </TouchableOpacity>
                          )}
                          {note.notes.length <= 100 && (
                            <TouchableOpacity 
                              style={styles.aiButton}
                              onPress={() => handleAIEnhance(note.id, note.notes)}
                            >
                              <Text style={styles.aiButtonText}>AI Enhance</Text>
                            </TouchableOpacity>
                          )}
                        </>
                      )}
                    </View>
                  </View>
                )}
              </View>
            ))}
          </View>
        ))}
      </ScrollView>
      <CustomNoteModal
        visible={showCustomNoteModal}
        onClose={() => setShowCustomNoteModal(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  scrollContainer: {
    flex: 1,
  },
  header: {
    padding: 20,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
  },
  dateGroup: {
    marginBottom: 20,
  },
  dateHeader: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 12,
  },
  noteCard: {
    backgroundColor: "white",
    marginHorizontal: 20,
    marginBottom: 12,
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  noteHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  noteInfo: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  duration: {
    fontSize: 14,
    color: "#6C63FF",
    fontWeight: "500",
  },
  noteActions: {
    alignItems: "flex-end",
  },
  timestamp: {
    fontSize: 12,
    color: "#999",
    marginBottom: 8,
  },
  deleteButton: {
    padding: 4,
  },
  deleteButtonText: {
    fontSize: 16,
  },
  notesContent: {
    borderTopWidth: 1,
    borderTopColor: "#eee",
    paddingTop: 12,
  },
  notesText: {
    fontSize: 16,
    color: "#555",
    lineHeight: 22,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 12,
    textAlign: "center",
  },
  emptyText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    lineHeight: 24,
  },
  aiActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  aiButton: {
    backgroundColor: "#6C63FF",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginLeft: 8,
  },
  aiButtonText: {
    color: "white",
    fontWeight: "600",
    fontSize: 12,
  },
});

export default NotesContent;
