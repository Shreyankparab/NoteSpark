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
  TextInput,
  Modal,
  Animated,
} from "react-native";
import {
  PinchGestureHandler,
  PanGestureHandler,
  TapGestureHandler,
  State,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import * as ImagePicker from "expo-image-picker";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  deleteDoc,
  doc,
  updateDoc,
  getDoc,
  getDocs,
} from "firebase/firestore";
import { auth, db } from "../firebase/firebaseConfig";
import { PomodoroNote, Subject } from "../types";
import CustomNoteModal from "./modals/CustomNoteModal";
import DrawingOverlay from "./DrawingOverlay";
import { aiService } from "../utils/aiService";
import { uploadToCloudinaryBase64 } from "../utils/imageStorage";
import { Ionicons } from "@expo/vector-icons";
import { Theme } from "../constants/themes";

interface NotesContentProps {
  onOpenProfile?: () => void;
  onOpenSettings?: () => void;
  onOpenAppearance?: () => void;
  onOpenTimeTable?: () => void;
  onOpenSubjects?: () => void;
  theme?: Theme;
}

const NotesContent: React.FC<NotesContentProps> = ({
  onOpenProfile,
  onOpenSettings,
  onOpenAppearance,
  onOpenTimeTable,
  onOpenSubjects,
  theme,
}) => {
  const [notes, setNotes] = useState<PomodoroNote[]>([]);
  const [userProfileImage, setUserProfileImage] = useState<string | null>(null);
  const [filteredNotes, setFilteredNotes] = useState<PomodoroNote[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showCustomNoteModal, setShowCustomNoteModal] = useState(false);
  const [processingNoteId, setProcessingNoteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [selectedNote, setSelectedNote] = useState<PomodoroNote | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editText, setEditText] = useState("");
  const [editImageUrl, setEditImageUrl] = useState<string | undefined>(
    undefined
  );
  const [isUploading, setIsUploading] = useState(false);
  const [showCreateOptions, setShowCreateOptions] = useState(false);
  const [newNoteImageUrl, setNewNoteImageUrl] = useState<string | undefined>(
    undefined
  );
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [zoomImageUrl, setZoomImageUrl] = useState<string | null>(null);
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [drawingData, setDrawingData] = useState<string | null>(null);

  const handleSummarizeCurrent = async () => {
    if (!selectedNote) return;
    try {
      setIsProcessing(true);
      const content = (isEditingNote ? editText : selectedNote.notes) || "";
      const summarized = await aiService.processText({
        content,
        type: "summarize",
      });

      if (isEditingNote) {
        setEditText(summarized);
      } else {
        setSelectedNote({ ...selectedNote, notes: summarized });
        // Update in Firestore
        const noteRef = doc(db, "notes", selectedNote.id);
        await updateDoc(noteRef, { notes: summarized });
      }
    } catch (error) {
      console.error("Error summarizing:", error);
      Alert.alert("Error", "Failed to summarize notes");
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleDrawingMode = () => {
    setIsDrawingMode(!isDrawingMode);
  };

  const handleDrawingChange = (data: string) => {
    setDrawingData(data || null);
  };

  const handleSaveDrawing = async () => {
    if (!selectedNote || !drawingData) return;
    try {
      // Update the selected note
      const updatedNote = { ...selectedNote, doodleData: drawingData };
      setSelectedNote(updatedNote);
      
      // Update in Firestore
      const noteRef = doc(db, "notes", selectedNote.id);
      await updateDoc(noteRef, { doodleData: drawingData });
      
      // Update local notes array
      setNotes(prevNotes => 
        prevNotes.map(note => 
          note.id === selectedNote.id 
            ? { ...note, doodleData: drawingData }
            : note
        )
      );
      
      console.log("✅ Drawing updated successfully");
    } catch (error) {
      console.error("❌ Error updating drawing:", error);
      Alert.alert("Error", "Failed to save drawing");
    }
  };

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      setIsLoading(false);
      return;
    }
    
    // Fetch user profile data to get profile image
    const fetchUserProfile = async () => {
      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          if (userData?.photoURL) {
            setUserProfileImage(userData.photoURL);
          } else if (user.photoURL) {
            setUserProfileImage(user.photoURL);
          }
        } else if (user.photoURL) {
          setUserProfileImage(user.photoURL);
        }
      } catch (error) {
        console.error("Error fetching user profile:", error);
      }
    };

    fetchUserProfile();

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
        console.log("📋 All notes with subjectIds:", notesData.map(n => ({
          id: n.id,
          title: n.taskTitle,
          subjectId: n.subjectId,
          hasSubjectId: !!n.subjectId
        })));
        setNotes(notesData);
        setFilteredNotes(notesData);
        setIsLoading(false);
      },
      (error) => {
        console.error("❌ Error loading notes:", error);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Auto-migrate notes without subjectId (one-time fix)
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const migrateNotesWithSubjectId = async () => {
      try {
        console.log('🔄 Checking for notes without subjectId...');
        
        // Get all notes without subjectId
        const notesQuery = query(
          collection(db, 'notes'),
          where('userId', '==', user.uid)
        );
        const notesSnapshot = await getDocs(notesQuery);
        
        // Get all tasks to match by title
        const tasksQuery = query(
          collection(db, 'tasks'),
          where('userId', '==', user.uid)
        );
        const tasksSnapshot = await getDocs(tasksQuery);
        
        // Create a map of task titles to subjectIds
        const taskSubjectMap = new Map<string, string>();
        tasksSnapshot.forEach((taskDoc) => {
          const taskData = taskDoc.data();
          if (taskData.title && taskData.subjectId) {
            taskSubjectMap.set(taskData.title, taskData.subjectId);
          }
        });
        
        console.log(`📋 Found ${taskSubjectMap.size} tasks with subjects`);
        
        // Update notes that don't have subjectId
        let updated = 0;
        for (const noteDoc of notesSnapshot.docs) {
          const noteData = noteDoc.data();
          
          // Skip if already has subjectId
          if (noteData.subjectId) continue;
          
          // Try to find matching task
          const matchingSubjectId = taskSubjectMap.get(noteData.taskTitle);
          
          if (matchingSubjectId) {
            await updateDoc(doc(db, 'notes', noteDoc.id), {
              subjectId: matchingSubjectId
            });
            console.log(`✅ Updated note "${noteData.taskTitle}" with subjectId: ${matchingSubjectId}`);
            updated++;
          }
        }
        
        if (updated > 0) {
          console.log(`🎉 Migration complete! Updated ${updated} notes with subjectIds`);
        } else {
          console.log('✅ All notes already have subjectIds or no matching tasks found');
        }
      } catch (error) {
        console.error('❌ Migration error:', error);
      }
    };
    
    // Run migration once on mount
    migrateNotesWithSubjectId();
  }, []);

  // Load subjects
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const subjectsQuery = query(
      collection(db, 'subjects'),
      where('userId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(subjectsQuery, (snapshot) => {
      const loadedSubjects: Subject[] = [];
      snapshot.forEach((doc) => {
        loadedSubjects.push({ id: doc.id, ...doc.data() } as Subject);
      });
      const sorted = loadedSubjects.sort((a, b) => a.name.localeCompare(b.name));
      console.log('📚 Loaded subjects:', sorted.map(s => ({ name: s.name, id: s.id, icon: s.icon })));
      setSubjects(sorted);
    });

    return () => unsubscribe();
  }, []);

  // Filter notes by search and subject
  useEffect(() => {
    let filtered = notes;

    console.log('🔍 Filtering notes:', {
      totalNotes: notes.length,
      selectedSubjectId,
      notesWithSubjects: notes.map(n => ({ 
        title: n.taskTitle, 
        subjectId: n.subjectId,
        hasSubjectId: !!n.subjectId,
        match: n.subjectId === selectedSubjectId
      }))
    });

    // Filter by subject
    if (selectedSubjectId) {
      const beforeFilter = filtered.length;
      filtered = filtered.filter(note => {
        const matches = note.subjectId === selectedSubjectId;
        console.log(`  Checking note "${note.taskTitle}": subjectId="${note.subjectId}" vs selected="${selectedSubjectId}" → ${matches ? '✅ MATCH' : '❌ NO MATCH'}`);
        return matches;
      });
      console.log(`📚 Filtered by subject ${selectedSubjectId}: ${beforeFilter} → ${filtered.length} notes`);
    }

    // Filter by search query
    if (searchQuery.trim() !== "") {
      filtered = filtered.filter(
        (note) =>
          note.taskTitle?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          note.notes?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredNotes(filtered);
    console.log('✅ Final filtered notes:', filtered.length);
  }, [searchQuery, notes, selectedSubjectId]);

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
    const today = new Date();
    const noteDate = new Date(timestamp);

    if (noteDate.toDateString() === today.toDateString()) {
      return "Today";
    }

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    if (noteDate.toDateString() === yesterday.toDateString()) {
      return "Yesterday";
    }

    return noteDate.toLocaleDateString("en-US", {
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
        type: "summarize",
      });

      // Update the note in Firestore
      await updateDoc(doc(db, "notes", noteId), {
        notes: summarizedContent,
        aiProcessed: true,
        processingType: "summarized",
        aiProvider: aiService.getCurrentProvider(), // Store which AI was used
      });

      Alert.alert(
        "Success",
        `Note has been summarized using ${aiService.getCurrentProvider()}!`
      );
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
        type: "enhance",
      });

      // Update the note in Firestore
      await updateDoc(doc(db, "notes", noteId), {
        notes: enhancedContent,
        aiProcessed: true,
        processingType: "enhanced",
        aiProvider: aiService.getCurrentProvider(), // Store which AI was used
      });

      Alert.alert(
        "Success",
        `Note has been enhanced using ${aiService.getCurrentProvider()}!`
      );
      setProcessingNoteId(null);
    } catch (error) {
      console.error("❌ Error enhancing note:", error);
      Alert.alert("Error", "Failed to enhance note. Please try again.");
      setProcessingNoteId(null);
    }
  };

  // Be defensive: some older notes stored duration in SECONDS.
  // If the value looks like seconds (<= 180), convert to minutes.
  const formatDuration = (raw: number): string => {
    const minutes =
      raw <= 180 ? Math.max(1, Math.round(raw / 60)) : Math.round(raw);
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
      const dateKey = formatDate(note.completedAt);
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

  const groupedNotes = groupNotesByDate(filteredNotes);

  return (
    <View style={styles.container}>
      {/* Header with tabs integrated */}
      <View style={styles.headerWithTabs}>
        <View style={styles.header}>
          <View style={styles.headerContent}>
          {!showSearch ? (
            <>
              <Text style={styles.title}>Notes</Text>
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 14 }}
              >
                <TouchableOpacity onPress={onOpenAppearance}>
                  <Ionicons name="color-palette-outline" size={24} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity onPress={onOpenTimeTable}>
                  <Ionicons name="calendar-outline" size={24} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity onPress={onOpenSubjects}>
                  <Ionicons name="folder-outline" size={24} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity onPress={onOpenProfile}>
                  {userProfileImage ? (
                    <Image
                      source={{ uri: userProfileImage }}
                      style={styles.profileImage}
                    />
                  ) : (
                    <Ionicons
                      name="person-circle-outline"
                      size={26}
                      color="#fff"
                    />
                  )}
                </TouchableOpacity>
                <TouchableOpacity onPress={onOpenSettings}>
                  <Ionicons name="settings-outline" size={24} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setShowSearch(true)}>
                  <Ionicons name="search" size={24} color="#fff" />
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <View style={styles.searchContainer}>
              <TextInput
                style={styles.searchInput}
                placeholder="Search notes..."
                placeholderTextColor="rgba(255,255,255,0.8)"
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoFocus
              />
              <TouchableOpacity
                onPress={() => {
                  setShowSearch(false);
                  setSearchQuery("");
                }}
                style={styles.searchCloseButton}
              >
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
          )}
          </View>
        </View>

        {/* Subject Filter Tabs - Now inside header */}
        <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.subjectFilterContainer}
        contentContainerStyle={styles.subjectFilterContent}
      >
        <TouchableOpacity
          style={[
            styles.subjectTab,
            !selectedSubjectId && styles.subjectTabActive
          ]}
          onPress={() => setSelectedSubjectId(null)}
        >
          <Text style={[
            styles.subjectTabText,
            !selectedSubjectId && styles.subjectTabTextActive
          ]}>
            All
          </Text>
          {!selectedSubjectId && (
            <View style={styles.activeIndicator} />
          )}
        </TouchableOpacity>

        {subjects.map((subject) => (
          <TouchableOpacity
            key={subject.id}
            style={[
              styles.subjectTab,
              selectedSubjectId === subject.id && styles.subjectTabActive
            ]}
            onPress={() => setSelectedSubjectId(subject.id)}
          >
            <Text style={styles.subjectTabIcon}>{subject.icon}</Text>
            <Text style={[
              styles.subjectTabText,
              selectedSubjectId === subject.id && styles.subjectTabTextActive
            ]}>
              {subject.name}
            </Text>
            {selectedSubjectId === subject.id && (
              <View style={[styles.activeIndicator, { backgroundColor: subject.color }]} />
            )}
          </TouchableOpacity>
        ))}
        </ScrollView>
      </View>

      {/* Notes List */}
      {filteredNotes.length === 0 && selectedSubjectId ? (
        <View style={styles.emptyFilterState}>
          <Text style={styles.emptyFilterIcon}>📭</Text>
          <Text style={styles.emptyFilterTitle}>No Notes Found</Text>
          <Text style={styles.emptyFilterText}>
            No notes for this subject yet.{' \n'}
            Complete a task with this subject to see notes here!
          </Text>
          <TouchableOpacity 
            style={styles.clearFilterButton}
            onPress={() => setSelectedSubjectId(null)}
          >
            <Text style={styles.clearFilterButtonText}>View All Notes</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView style={styles.scrollContainer}>
        {Object.entries(groupedNotes).map(([dateKey, dayNotes]) => (
          <View key={dateKey} style={styles.dateGroup}>
            <Text style={styles.dateHeader}>{dateKey}</Text>

            {dayNotes.map((note) => {
              // Find subject for this note
              const noteSubject = note.subjectId 
                ? subjects.find(s => s.id === note.subjectId)
                : null;

              return (
              <TouchableOpacity
                key={note.id}
                style={styles.noteCard}
                activeOpacity={0.9}
                onPress={() => {
                  setSelectedNote(note);
                  setEditTitle(note.taskTitle || "Untitled");
                  setEditText(note.notes || "");
                  setEditImageUrl(note.imageUrl || undefined);
                  setDrawingData(note.doodleData || null);
                  setIsEditingNote(false);
                  setIsDrawingMode(false);
                }}
              >
                <View style={styles.cardRow}>
                  <View style={styles.cardLeft}>
                    <View style={styles.timestampRow}>
                      <Text style={styles.timestamp}>
                        {formatTime(note.completedAt)}
                      </Text>
                      {noteSubject && (
                        <View style={[styles.subjectBadge, { backgroundColor: noteSubject.color || '#6366F1' }]}>
                          <Text style={styles.subjectBadgeIcon}>{noteSubject.icon}</Text>
                          <Text style={styles.subjectBadgeText}>{noteSubject.name}</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.taskTitle} numberOfLines={2}>
                      {note.taskTitle || "Untitled"}
                    </Text>
                    {note.notes?.trim() ? (
                      <Text style={styles.snippet} numberOfLines={2}>
                        {note.notes}
                      </Text>
                    ) : null}
                    {!!note.duration && (
                      <Text style={styles.duration}>
                        {formatDuration(note.duration)}
                      </Text>
                    )}
                    {/* Doodle indicator */}
                    {note.doodleData && (
                      <View style={styles.doodleIndicator}>
                        <Ionicons name="brush" size={12} color="#FF6B35" />
                        <Text style={styles.doodleIndicatorText}>Doodle</Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.cardRight}>
                    {note.imageUrl ? (
                      <Image
                        source={{ uri: note.imageUrl }}
                        style={styles.thumb}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={styles.thumbPlaceholder}>
                        <Ionicons
                          name="image-outline"
                          size={28}
                          color="#9ca3af"
                        />
                      </View>
                    )}
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => handleDeleteNote(note.id)}
                >
                  <Ionicons name="trash-outline" size={18} color="#ef4444" />
                </TouchableOpacity>
              </TouchableOpacity>
            );
            })}
          </View>
        ))}
        </ScrollView>
      )}

      <TouchableOpacity
        style={[
          styles.fab,
          { backgroundColor: theme?.accentColor || "#9333ea" }
        ]}
        onPress={() => setShowCreateOptions(true)}
      >
        <Ionicons name="add" size={30} color="white" />
      </TouchableOpacity>

      <CustomNoteModal
        visible={showCustomNoteModal}
        onClose={() => setShowCustomNoteModal(false)}
        initialImageUrl={newNoteImageUrl}
      />

      {/* Create options modal */}
      <Modal
        transparent
        visible={showCreateOptions}
        animationType="slide"
        onRequestClose={() => setShowCreateOptions(false)}
      >
        <View style={styles.optionsOverlay}>
          <TouchableOpacity 
            style={styles.optionsOverlayTouchable}
            activeOpacity={1}
            onPress={() => setShowCreateOptions(false)}
          />
          <View style={styles.optionsCard}>
            <View style={styles.optionsHandle} />
            <Text style={styles.optionsTitle}>✨ Create New Note</Text>
            <Text style={styles.optionsSubtitle}>Choose how you'd like to create your note</Text>
            
            <View style={styles.optionsGrid}>
              <TouchableOpacity
                style={styles.optionCard}
                onPress={() => {
                  setShowCreateOptions(false);
                  setNewNoteImageUrl(undefined);
                  setShowCustomNoteModal(true);
                }}
              >
                <View style={[styles.optionIconContainer, { backgroundColor: '#EEF2FF' }]}>
                  <Ionicons
                    name="document-text"
                    size={28}
                    color="#6366F1"
                  />
                </View>
                <Text style={styles.optionCardTitle}>Text Only</Text>
                <Text style={styles.optionCardDesc}>Create a simple text note</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.optionCard}
                onPress={async () => {
                  try {
                    setIsUploading(true);
                    const { status } =
                      await ImagePicker.requestMediaLibraryPermissionsAsync();
                    if (status !== "granted") {
                      Alert.alert("Permission", "Allow photo library access.");
                      return;
                    }
                    const result = await ImagePicker.launchImageLibraryAsync({
                      mediaTypes: ImagePicker.MediaTypeOptions.Images,
                      base64: true,
                      quality: 0.85,
                    });
                    if (!result.canceled) {
                      const asset: any = result.assets[0];
                      const url = await uploadToCloudinaryBase64(
                        asset.base64,
                        asset.mimeType || "image/jpeg",
                        {
                          folder: auth.currentUser
                            ? `notespark/${auth.currentUser.uid}`
                            : "notespark",
                        }
                      );
                      setNewNoteImageUrl(url);
                      setShowCreateOptions(false);
                      setShowCustomNoteModal(true);
                    }
                  } catch (e) {
                    Alert.alert("Image", "Failed to pick image.");
                  } finally {
                    setIsUploading(false);
                  }
                }}
              >
                <View style={[styles.optionIconContainer, { backgroundColor: '#DBEAFE' }]}>
                  <Ionicons name="images" size={28} color="#3B82F6" />
                </View>
                <Text style={styles.optionCardTitle}>Choose Image</Text>
                <Text style={styles.optionCardDesc}>Add image from gallery</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.optionCard}
                onPress={async () => {
                  try {
                    setIsUploading(true);
                    const { status } =
                      await ImagePicker.requestCameraPermissionsAsync();
                    if (status !== "granted") {
                      Alert.alert("Permission", "Allow camera access.");
                      return;
                    }
                    const result = await ImagePicker.launchCameraAsync({
                      mediaTypes: ImagePicker.MediaTypeOptions.Images,
                      base64: true,
                      quality: 0.85,
                    });
                    if (!result.canceled) {
                      const asset: any = result.assets[0];
                      const url = await uploadToCloudinaryBase64(
                        asset.base64,
                        asset.mimeType || "image/jpeg",
                        {
                          folder: auth.currentUser
                            ? `notespark/${auth.currentUser.uid}`
                            : "notespark",
                        }
                      );
                      setNewNoteImageUrl(url);
                      setShowCreateOptions(false);
                      setShowCustomNoteModal(true);
                    }
                  } catch (e) {
                    Alert.alert("Camera", "Failed to capture image.");
                  } finally {
                    setIsUploading(false);
                  }
                }}
              >
                <View style={[styles.optionIconContainer, { backgroundColor: '#DCFCE7' }]}>
                  <Ionicons name="camera" size={28} color="#10B981" />
                </View>
                <Text style={styles.optionCardTitle}>Capture Image</Text>
                <Text style={styles.optionCardDesc}>Take a photo with camera</Text>
              </TouchableOpacity>
            </View>

            {isUploading && (
              <View style={styles.uploadingIndicator}>
                <ActivityIndicator size="small" color="#6366F1" />
                <Text style={styles.uploadingText}>Processing...</Text>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Note Details Modal */}
      {selectedNote && (
        <Modal
          visible={!!selectedNote}
          animationType="slide"
          presentationStyle="fullScreen"
          onRequestClose={() => setSelectedNote(null)}
        >
          <DrawingOverlay
            isDrawingMode={isDrawingMode}
            onToggleDrawingMode={toggleDrawingMode}
            onDrawingChange={handleDrawingChange}
            initialDrawingData={drawingData}
          >
            <View style={styles.fsContainer}>
            <View style={styles.fsHeader}>
              <TouchableOpacity
                onPress={() => setSelectedNote(null)}
                style={styles.fsCloseButton}
              >
                <Ionicons name="close" size={24} color="#111827" />
              </TouchableOpacity>
              <Text style={styles.fsHeaderTitle}>Note Details</Text>
              <View style={{ width: 24 }} />
            </View>

            {/* Content */}
            <ScrollView
              style={styles.fsScroll}
              contentContainerStyle={{ paddingBottom: 120 }}
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.fsMeta}>
                {formatDate(selectedNote.completedAt)} •{" "}
                {formatTime(selectedNote.completedAt)}
              </Text>
              {editImageUrl ? (
                <TouchableOpacity
                  activeOpacity={0.9}
                  onPress={() => setZoomImageUrl(editImageUrl)}
                >
                  <Image
                    source={{ uri: editImageUrl }}
                    style={styles.fsImage}
                    resizeMode="cover"
                  />
                </TouchableOpacity>
              ) : (
                <View style={styles.fsImagePlaceholder}>
                  <Ionicons name="image-outline" size={48} color="#9ca3af" />
                </View>
              )}
              {isEditingNote ? (
                <TextInput
                  style={styles.fsBodyText}
                  multiline
                  placeholder="Write your note..."
                  value={editText}
                  onChangeText={setEditText}
                />
              ) : (
                <Text style={styles.fsBodyText}>{editText}</Text>
              )}
              
              
              {isEditingNote && (
                <View style={styles.fsEditRow}>
                  <TouchableOpacity
                    onPress={async () => {
                      try {
                        setIsUploading(true);
                        const { status } =
                          await ImagePicker.requestMediaLibraryPermissionsAsync();
                        if (status !== "granted") {
                          Alert.alert(
                            "Permission",
                            "Allow photo library access."
                          );
                          return;
                        }
                        const result =
                          await ImagePicker.launchImageLibraryAsync({
                            base64: true,
                            quality: 0.9,
                          });
                        if (!result.canceled) {
                          const asset: any = result.assets[0];
                          const url = await uploadToCloudinaryBase64(
                            asset.base64,
                            asset.mimeType || "image/jpeg",
                            {
                              folder: auth.currentUser
                                ? `notespark/${auth.currentUser.uid}`
                                : "notespark",
                            }
                          );
                          setEditImageUrl(url);
                        }
                      } finally {
                        setIsUploading(false);
                      }
                    }}
                    style={styles.detailActionBtn}
                  >
                    <Ionicons name="images-outline" size={18} color="#fff" />
                    <Text style={styles.detailActionText}>Choose</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={async () => {
                      try {
                        setIsUploading(true);
                        const { status } =
                          await ImagePicker.requestCameraPermissionsAsync();
                        if (status !== "granted") {
                          Alert.alert("Permission", "Allow camera access.");
                          return;
                        }
                        const result = await ImagePicker.launchCameraAsync({
                          base64: true,
                          quality: 0.9,
                        });
                        if (!result.canceled) {
                          const asset: any = result.assets[0];
                          const url = await uploadToCloudinaryBase64(
                            asset.base64,
                            asset.mimeType || "image/jpeg",
                            {
                              folder: auth.currentUser
                                ? `notespark/${auth.currentUser.uid}`
                                : "notespark",
                            }
                          );
                          setEditImageUrl(url);
                        }
                      } finally {
                        setIsUploading(false);
                      }
                    }}
                    style={styles.detailActionBtn}
                  >
                    <Ionicons name="camera-outline" size={18} color="#fff" />
                    <Text style={styles.detailActionText}>Capture</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setEditImageUrl(undefined)}
                    style={[
                      styles.detailActionBtn,
                      { backgroundColor: "#ef4444" },
                    ]}
                  >
                    <Ionicons name="trash-outline" size={18} color="#fff" />
                    <Text style={styles.detailActionText}>Remove</Text>
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>

            {/* Bottom bar */}
            <View style={styles.fsBottomBar}>
              {isEditingNote ? (
                <>
                  <TouchableOpacity
                    onPress={() => setIsEditingNote(false)}
                    style={[styles.bottomBtn, { backgroundColor: "#9ca3af" }]}
                  >
                    <Text style={styles.bottomBtnText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={async () => {
                      try {
                        if (!selectedNote) return;
                        await updateDoc(doc(db, "notes", selectedNote.id), {
                          taskTitle: editTitle.trim() || "Untitled",
                          notes: editText,
                          imageUrl: editImageUrl || "",
                        });
                        setSelectedNote(null);
                      } catch {
                        Alert.alert("Error", "Failed to save changes");
                      }
                    }}
                    style={[styles.bottomBtn, { backgroundColor: "#10b981" }]}
                  >
                    <Text style={styles.bottomBtnText}>Save</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <TouchableOpacity
                    onPress={() => setIsEditingNote(true)}
                    style={styles.bottomIconBtn}
                  >
                    <Ionicons name="pencil-outline" size={20} color="#111827" />
                    <Text style={styles.bottomIconText}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleSummarizeCurrent}
                    style={styles.bottomIconBtn}
                  >
                    {isProcessing ? (
                      <ActivityIndicator size="small" color="#111827" />
                    ) : (
                      <Ionicons
                        name="sparkles-outline"
                        size={20}
                        color="#111827"
                      />
                    )}
                    <Text style={styles.bottomIconText}>Summarize</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleSaveDrawing}
                    style={styles.bottomIconBtn}
                  >
                    <Ionicons name="save-outline" size={20} color="#111827" />
                    <Text style={styles.bottomIconText}>Save Drawing</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => Alert.alert("Flashcards", "Coming soon")}
                    style={styles.bottomIconBtn}
                  >
                    <Ionicons name="albums-outline" size={20} color="#111827" />
                    <Text style={styles.bottomIconText}>Flashcards</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
          </DrawingOverlay>
        </Modal>
      )}

      {/* Zoomable Image Viewer */}
      <Modal
        visible={!!zoomImageUrl}
        transparent
        onRequestClose={() => setZoomImageUrl(null)}
      >
        <GestureHandlerRootView style={styles.zoomOverlay}>
          <View style={styles.zoomHeader}>
            <TouchableOpacity onPress={() => setZoomImageUrl(null)}>
              <Ionicons name="close" size={26} color="#fff" />
            </TouchableOpacity>
          </View>
          {zoomImageUrl ? <ZoomableImage uri={zoomImageUrl} /> : null}
        </GestureHandlerRootView>
      </Modal>

    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "transparent",
    paddingTop: 40,
  },
  profileImage: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: "#fff",
  },
  scrollContainer: {
    flex: 1,
  },
  headerWithTabs: {
    backgroundColor: "transparent",
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: "transparent",
  },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  searchInput: {
    flex: 1,
    height: 40,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 20,
    paddingHorizontal: 15,
    fontSize: 16,
    color: "#fff",
  },
  searchCloseButton: {
    marginLeft: 10,
    padding: 5,
  },
  dateGroup: {
    marginBottom: 20,
  },
  dateHeader: {
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 12,
  },
  noteCard: {
    backgroundColor: "#ffffff",
    marginHorizontal: 16,
    marginBottom: 14,
    borderRadius: 18,
    padding: 16,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    position: "relative",
    minHeight: 112,
  },
  cardRow: { flexDirection: "row", alignItems: "center" },
  cardLeft: { flex: 1, paddingRight: 12 },
  cardRight: { width: 96, height: 96, borderRadius: 16, overflow: "hidden" },
  thumb: { width: "100%", height: "100%" },
  thumbPlaceholder: {
    width: "100%",
    height: "100%",
    backgroundColor: "#e5e7eb",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 20,
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
    fontSize: 17,
    fontWeight: "700",
    color: "#0f172a",
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
  timestampRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  timestamp: {
    fontSize: 12,
    color: "#6b7280",
  },
  subjectBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 4,
  },
  subjectBadgeIcon: {
    fontSize: 10,
  },
  subjectBadgeText: {
    fontSize: 10,
    color: "#FFF",
    fontWeight: "700",
  },
  snippet: { fontSize: 14, color: "#475569", marginTop: 6 },
  deleteButton: { position: "absolute", top: 10, right: 10, padding: 6 },
  noteContentContainer: {
    width: "100%",
  },
  imageContainer: {
    marginBottom: 10,
    borderRadius: 10,
    overflow: "hidden",
  },
  noteImage: {
    width: "100%",
    height: 180,
    borderRadius: 10,
    backgroundColor: "#eee",
  },
  notesContent: {
    borderTopWidth: 1,
    borderTopColor: "#eee",
    paddingTop: 12,
  },
  notesText: {
    fontSize: 16,
    color: "#374151",
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
  // Detail modal lightweight overlay
  detailOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.25)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  detailCard: {
    width: "100%",
    maxWidth: 520,
    maxHeight: "85%",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
  },
  detailHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  detailTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    flex: 1,
    marginRight: 12,
  },
  detailImage: {
    width: "100%",
    height: 200,
    borderRadius: 12,
    marginBottom: 12,
  },
  detailImagePlaceholder: {
    width: "100%",
    height: 200,
    borderRadius: 12,
    marginBottom: 12,
    backgroundColor: "#f1f5f9",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  detailText: { fontSize: 16, color: "#374151", lineHeight: 22 },
  detailFooterRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
  },
  detailMeta: { fontSize: 12, color: "#6b7280" },
  detailTitleInput: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    flex: 1,
    marginRight: 12,
    paddingVertical: 4,
  },
  detailActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#6366f1",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  detailActionText: { color: "#fff", fontWeight: "700", marginLeft: 6 },
  optionsOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  optionsOverlayTouchable: {
    flex: 1,
    width: "100%",
  },
  optionsCard: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 32,
  },
  optionsHandle: {
    width: 40,
    height: 4,
    backgroundColor: "#d1d5db",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 16,
  },
  optionsTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 6,
  },
  optionsSubtitle: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 20,
  },
  optionsGrid: {
    gap: 12,
  },
  optionCard: {
    backgroundColor: "#f9fafb",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#e5e7eb",
  },
  optionIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  optionCardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4,
  },
  optionCardDesc: {
    fontSize: 13,
    color: "#6b7280",
    textAlign: "center",
  },
  uploadingIndicator: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 16,
    paddingVertical: 12,
    backgroundColor: "#EEF2FF",
    borderRadius: 12,
  },
  uploadingText: {
    fontSize: 14,
    color: "#6366F1",
    fontWeight: "600",
  },
  // Fullscreen viewer styles
  fsContainer: { flex: 1, backgroundColor: "#fff" },
  fsHeader: {
    paddingTop: 48,
    paddingHorizontal: 16,
    paddingBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  fsHeaderTitle: {
    flex: 1,
    marginHorizontal: 12,
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
  },
  fsScroll: { flex: 1, paddingHorizontal: 16, paddingTop: 12 },
  fsMeta: { color: "#6b7280", fontSize: 12, marginBottom: 10 },
  fsImage: {
    width: "100%",
    height: 220,
    borderRadius: 12,
    backgroundColor: "#f1f5f9",
    marginBottom: 12,
  },
  fsImagePlaceholder: {
    width: "100%",
    height: 220,
    borderRadius: 12,
    backgroundColor: "#f1f5f9",
    marginBottom: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  fsBodyText: { fontSize: 16, color: "#374151", lineHeight: 22 },
  fsEditRow: { flexDirection: "row", gap: 10, marginTop: 12 },
  fsBottomBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    padding: 12,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
  },
  bottomIconBtn: { alignItems: "center" },
  bottomIconText: {
    marginTop: 4,
    fontSize: 12,
    color: "#111827",
    fontWeight: "700",
  },
  bottomBtn: {
    flex: 1,
    marginHorizontal: 8,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  bottomBtnText: { color: "#fff", fontWeight: "800" },
  // Zoom viewer
  zoomOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.95)" },
  zoomHeader: {
    paddingTop: 48,
    paddingHorizontal: 16,
    paddingBottom: 8,
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  zoomContent: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 12,
  },
  zoomImage: { width: "100%", height: "100%" },
  fab: {
    position: "absolute",
    width: 56,
    height: 56,
    alignItems: "center",
    justifyContent: "center",
    right: 20,
    bottom: 20,
    backgroundColor: "#9333ea",
    borderRadius: 28,
    elevation: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 12,
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  subjectFilterContainer: {
    backgroundColor: 'rgba(0,0,0,0.15)',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  subjectFilterContent: {
    paddingHorizontal: 12,
    gap: 6,
    alignItems: 'center',
  },
  subjectTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.1)',
    gap: 3,
    height: 24,
  },
  subjectTabActive: {
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  subjectTabIcon: {
    fontSize: 12,
  },
  subjectTabText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 11,
    fontWeight: '600',
  },
  subjectTabTextActive: {
    color: '#FFF',
    fontWeight: '700',
  },
  activeIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: '#FFF',
    borderRadius: 1,
  },
  emptyFilterState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingTop: 60,
  },
  emptyFilterIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyFilterTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyFilterText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  clearFilterButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  clearFilterButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  doodleContainer: {
    marginTop: 16,
    marginBottom: 8,
  },
  doodleLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  doodleIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    backgroundColor: 'rgba(255, 107, 53, 0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  doodleIndicatorText: {
    fontSize: 10,
    color: '#FF6B35',
    fontWeight: '600',
    marginLeft: 4,
  },
  drawingSection: {
    marginTop: 16,
    marginBottom: 8,
  },
  fsCloseButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
  },
});

export default NotesContent;

// Simple zoomable image component using gesture-handler (supports Android/iOS)
const ZoomableImage: React.FC<{ uri: string }> = ({ uri }) => {
  // Scale handling with base + pinch delta
  const baseScale = React.useRef(new Animated.Value(1)).current;
  const pinchScale = React.useRef(new Animated.Value(1)).current;
  const scale = Animated.multiply(baseScale, pinchScale);
  const baseScaleNumber = React.useRef(1);
  const [containerSize, setContainerSize] = React.useState({
    width: 0,
    height: 0,
  });
  React.useEffect(() => {
    const id = baseScale.addListener(({ value }) => {
      baseScaleNumber.current = value as number;
    });
    return () => baseScale.removeListener(id);
  }, [baseScale]);

  // Panning with offset
  const translate = React.useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const lastOffset = React.useRef({ x: 0, y: 0 }).current;

  const onPinchEvent = (e: any) => {
    const s = e.nativeEvent.scale as number;
    // Prevent combined scale from going below 1 during gesture for a smooth clamp
    const combined = baseScaleNumber.current * s;
    const clamped = Math.max(1, Math.min(combined, 4));
    const effectivePinch = clamped / Math.max(0.0001, baseScaleNumber.current);
    pinchScale.setValue(effectivePinch);
  };

  const onPanEvent = Animated.event(
    [{ nativeEvent: { translationX: translate.x, translationY: translate.y } }],
    { useNativeDriver: true }
  );

  const handlePinchStateChange = (e: any) => {
    if (
      e.nativeEvent.state === State.END ||
      e.nativeEvent.oldState === State.ACTIVE
    ) {
      const currentPinch = (pinchScale as any)._value || 1;
      let nextBase = Math.max(
        1,
        Math.min(baseScaleNumber.current * currentPinch, 4)
      );
      (baseScale as any).setValue(nextBase);
      (pinchScale as any).setValue(1);
      baseScaleNumber.current = nextBase;
      // Clamp within bounds after zoom change
      clampAndApplyPan();
    }
  };

  const handlePanStateChange = (e: any) => {
    if (
      e.nativeEvent.state === State.END ||
      e.nativeEvent.oldState === State.ACTIVE
    ) {
      // Compute next offset from gesture deltas
      const dx = e.nativeEvent.translationX || 0;
      const dy = e.nativeEvent.translationY || 0;
      let nx = lastOffset.x + dx;
      let ny = lastOffset.y + dy;
      // Clamp within bounds
      const { maxX, maxY } = getBounds();
      nx = Math.max(-maxX, Math.min(maxX, nx));
      ny = Math.max(-maxY, Math.min(maxY, ny));
      lastOffset.x = nx;
      lastOffset.y = ny;
      translate.setOffset({ x: lastOffset.x, y: lastOffset.y });
      translate.setValue({ x: 0, y: 0 });
      // If fully zoomed out, reset
      const s = baseScaleNumber.current;
      if (s <= 1.01) {
        resetPan();
      }
    } else if (e.nativeEvent.state === State.BEGAN) {
      // Prepare offset so translation applies from current position
      translate.setOffset({ x: lastOffset.x, y: lastOffset.y });
      translate.setValue({ x: 0, y: 0 });
    }
  };

  const resetPan = () => {
    lastOffset.x = 0;
    lastOffset.y = 0;
    translate.setOffset({ x: 0, y: 0 });
    translate.setValue({ x: 0, y: 0 });
  };

  const getBounds = () => {
    const cw = containerSize.width || 0;
    const ch = (containerSize.height || 0) * 0.8; // image height used in style
    const s = baseScaleNumber.current;
    if (cw === 0 || ch === 0 || s <= 1.01) return { maxX: 0, maxY: 0 };
    const scaledW = cw * s;
    const scaledH = ch * s;
    const maxX = Math.max(0, (scaledW - cw) / 2);
    const maxY = Math.max(0, (scaledH - ch) / 2);
    return { maxX, maxY };
  };

  const clampAndApplyPan = () => {
    const { maxX, maxY } = getBounds();
    let nx = lastOffset.x;
    let ny = lastOffset.y;
    nx = Math.max(-maxX, Math.min(maxX, nx));
    ny = Math.max(-maxY, Math.min(maxY, ny));
    lastOffset.x = nx;
    lastOffset.y = ny;
    translate.setOffset({ x: nx, y: ny });
    translate.setValue({ x: 0, y: 0 });
    if (baseScaleNumber.current <= 1.01) {
      resetPan();
    }
  };

  // Double tap to zoom in/out
  const doubleTapRef = React.useRef<any>(null);
  const handleDoubleTap = (e: any) => {
    if (e.nativeEvent.state === State.ACTIVE) {
      const current = (baseScale as any)._value || 1;
      const next = current > 1.01 ? 1 : 2; // toggle between 1x and 2x
      Animated.spring(baseScale, {
        toValue: next,
        useNativeDriver: true,
      }).start(() => {
        if (next <= 1.01) {
          translate.setValue({ x: 0, y: 0 });
          translate.flattenOffset();
        }
        baseScaleNumber.current = next;
        clampAndApplyPan();
      });
    }
  };

  // Allow pinch and pan simultaneously to avoid gesture conflicts
  const panRef = React.useRef<any>(null);
  const pinchRef = React.useRef<any>(null);

  return (
    <TapGestureHandler
      ref={doubleTapRef}
      numberOfTaps={2}
      onHandlerStateChange={handleDoubleTap}
    >
      <Animated.View
        style={{ flex: 1 }}
        onLayout={(e) => setContainerSize(e.nativeEvent.layout)}
      >
        <PinchGestureHandler
          ref={pinchRef}
          simultaneousHandlers={panRef}
          onGestureEvent={onPinchEvent}
          onHandlerStateChange={handlePinchStateChange}
        >
          <Animated.View
            style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
          >
            <PanGestureHandler
              ref={panRef}
              simultaneousHandlers={pinchRef}
              enabled={true}
              onGestureEvent={onPanEvent}
              onHandlerStateChange={handlePanStateChange}
            >
              <Animated.Image
                source={{ uri }}
                style={{
                  width: "100%",
                  height: "80%",
                  transform: [
                    { translateX: translate.x },
                    { translateY: translate.y },
                    { scale },
                  ],
                }}
                resizeMode="contain"
              />
            </PanGestureHandler>
          </Animated.View>
        </PinchGestureHandler>
      </Animated.View>
    </TapGestureHandler>
  );
};
