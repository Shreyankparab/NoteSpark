import { useState, useEffect, useCallback, useRef } from 'react';
import {
    collection,
    query,
    where,
    onSnapshot,
    getDoc,
    doc,
    updateDoc,
    serverTimestamp,
    setDoc,
    orderBy,
    limit,
    startAfter,
    getDocs,
    QueryDocumentSnapshot,
    DocumentData
} from 'firebase/firestore';
import { User } from 'firebase/auth';
import { db } from '../firebase/firebaseConfig';
import { Task, Subject, Note } from '../types';
import { checkTasksCompletedAchievements } from '../utils/achievements';

const TASKS_PAGE_SIZE = 20;

export const useUserData = (user: User | null) => {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [currentTask, setCurrentTask] = useState<Task | null>(null);
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [notes, setNotes] = useState<Note[]>([]);
    const [loading, setLoading] = useState(true);

    // Pagination state
    const [lastVisibleDoc, setLastVisibleDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
    const [hasMoreTasks, setHasMoreTasks] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);

    // Ref to track if we've done initial load
    const initialLoadDone = useRef(false);

    // Setup Firestore real-time listener for tasks with pagination
    useEffect(() => {
        if (!user) {
            setTasks([]);
            setCurrentTask(null);
            setLastVisibleDoc(null);
            setHasMoreTasks(true);
            initialLoadDone.current = false;
            return;
        }

        console.log("🔥 Setting up Firestore listener for user:", user.uid);

        // Listen to the first batch of tasks, ordered by createdAt descending
        const tasksQuery = query(
            collection(db, "tasks"),
            where("userId", "==", user.uid),
            orderBy("createdAt", "desc"),
            limit(TASKS_PAGE_SIZE)
        );

        const unsubscribe = onSnapshot(
            tasksQuery,
            (snapshot) => {
                const fetchedTasks: Task[] = [];
                snapshot.forEach((doc) => {
                    const data = doc.data();
                    fetchedTasks.push({
                        id: doc.id,
                        title: data.title,
                        duration: data.duration,
                        createdAt: data.createdAt,
                        completedAt: data.completedAt,
                        status: data.status,
                        userId: data.userId,
                        subjectId: data.subjectId,
                        subSubjectId: data.subSubjectId,
                    });
                });

                console.log("✅ Tasks loaded from Firestore:", fetchedTasks.length);

                // For the initial listener, we replace tasks (handles real-time updates)
                // But we need to be careful not to lose tasks loaded via pagination
                if (!initialLoadDone.current) {
                    setTasks(fetchedTasks);
                    initialLoadDone.current = true;

                    // Store the last document for pagination
                    if (snapshot.docs.length > 0) {
                        setLastVisibleDoc(snapshot.docs[snapshot.docs.length - 1]);
                    }

                    // Check if there might be more tasks
                    setHasMoreTasks(snapshot.docs.length >= TASKS_PAGE_SIZE);
                } else {
                    // For subsequent updates, merge with existing paginated tasks
                    // Keep recent tasks from listener, preserve older paginated tasks
                    setTasks(prevTasks => {
                        // Get IDs of tasks from the listener
                        const listenerTaskIds = new Set(fetchedTasks.map(t => t.id));

                        // Keep older tasks that weren't in this batch (loaded via pagination)
                        const olderTasks = prevTasks.filter(t => !listenerTaskIds.has(t.id));

                        // Filter out tasks that are older than the newest paginated task
                        // to avoid duplicates when real-time updates come in
                        const lastListenerTask = fetchedTasks[fetchedTasks.length - 1];
                        const filteredOlderTasks = lastListenerTask
                            ? olderTasks.filter(t => t.createdAt < lastListenerTask.createdAt)
                            : olderTasks;

                        // Combine: listener tasks (newest) + filtered older paginated tasks
                        const combined = [...fetchedTasks, ...filteredOlderTasks];

                        // Sort by createdAt descending to maintain order
                        return combined.sort((a, b) => b.createdAt - a.createdAt);
                    });
                }

                // Check for task completion achievements when tasks are loaded
                const completedTasksCount = fetchedTasks.filter(t => t.status === "completed").length;
                if (completedTasksCount > 0) {
                    checkTasksCompletedAchievements(user.uid, completedTasksCount).catch(console.error);
                }

                // Find active task
                const activeTask = fetchedTasks.find((t) => t.status === "active");
                if (activeTask) {
                    setCurrentTask(activeTask);
                } else if (
                    currentTask &&
                    !fetchedTasks.find((t) => t.id === currentTask.id)
                ) {
                    setCurrentTask(null);
                }
            },
            (error) => {
                console.error("❌ Error listening to tasks:", error);
            }
        );

        return () => {
            unsubscribe();
            initialLoadDone.current = false;
        };
    }, [user]);

    // Function to load more tasks (pagination)
    const loadMoreTasks = useCallback(async () => {
        if (!user || !lastVisibleDoc || !hasMoreTasks || loadingMore) {
            console.log("📋 loadMoreTasks: Skipping", {
                hasUser: !!user,
                hasLastDoc: !!lastVisibleDoc,
                hasMoreTasks,
                loadingMore
            });
            return;
        }

        console.log("📋 Loading more tasks...");
        setLoadingMore(true);

        try {
            const nextQuery = query(
                collection(db, "tasks"),
                where("userId", "==", user.uid),
                orderBy("createdAt", "desc"),
                startAfter(lastVisibleDoc),
                limit(TASKS_PAGE_SIZE)
            );

            const snapshot = await getDocs(nextQuery);
            const newTasks: Task[] = [];

            snapshot.forEach((doc) => {
                const data = doc.data();
                newTasks.push({
                    id: doc.id,
                    title: data.title,
                    duration: data.duration,
                    createdAt: data.createdAt,
                    completedAt: data.completedAt,
                    status: data.status,
                    userId: data.userId,
                    subjectId: data.subjectId,
                    subSubjectId: data.subSubjectId,
                });
            });

            console.log("✅ Loaded more tasks:", newTasks.length);

            if (newTasks.length > 0) {
                // Append new tasks, avoiding duplicates
                setTasks(prevTasks => {
                    const existingIds = new Set(prevTasks.map(t => t.id));
                    const uniqueNewTasks = newTasks.filter(t => !existingIds.has(t.id));
                    return [...prevTasks, ...uniqueNewTasks];
                });

                // Update last visible document
                setLastVisibleDoc(snapshot.docs[snapshot.docs.length - 1]);
            }

            // Check if there are more tasks
            setHasMoreTasks(snapshot.docs.length >= TASKS_PAGE_SIZE);

        } catch (error) {
            console.error("❌ Error loading more tasks:", error);
        } finally {
            setLoadingMore(false);
        }
    }, [user, lastVisibleDoc, hasMoreTasks, loadingMore]);

    // Setup Firestore real-time listener for subjects
    useEffect(() => {
        if (!user) {
            setSubjects([]);
            return;
        }

        const subjectsQuery = query(
            collection(db, "subjects"),
            where("userId", "==", user.uid)
        );

        const unsubscribeSubjects = onSnapshot(
            subjectsQuery,
            (snapshot) => {
                const fetchedSubjects: Subject[] = [];
                snapshot.forEach((doc) => {
                    const data = doc.data();
                    fetchedSubjects.push({
                        id: doc.id,
                        name: data.name,
                        color: data.color,
                        icon: data.icon,
                        createdAt: data.createdAt,
                        userId: data.userId,
                    });
                });
                setSubjects(fetchedSubjects);
            },
            (error) => {
                console.error("❌ Error listening to subjects:", error);
            }
        );

        return () => unsubscribeSubjects();
    }, [user]);

    // Setup Firestore real-time listener for notes
    useEffect(() => {
        if (!user) {
            setNotes([]);
            setLoading(false);
            return;
        }

        const notesQuery = query(
            collection(db, "notes"),
            where("userId", "==", user.uid)
        );

        const unsubscribeNotes = onSnapshot(
            notesQuery,
            (snapshot) => {
                const fetchedNotes: Note[] = [];
                snapshot.forEach((doc) => {
                    const data = doc.data();
                    fetchedNotes.push({
                        id: doc.id,
                        title: data.title,
                        content: data.content,
                        createdAt: data.createdAt,
                        updatedAt: data.updatedAt,
                        pinned: data.pinned,
                        userId: data.userId,
                        taskId: data.taskId,
                        duration: data.duration,
                        imageUrl: data.imageUrl,
                    });
                });
                setNotes(fetchedNotes);
                setLoading(false);
            },
            (error) => {
                console.error("❌ Error listening to notes:", error);
                setLoading(false);
            }
        );

        return () => unsubscribeNotes();
    }, [user]);

    return {
        tasks,
        subjects,
        notes,
        currentTask,
        setCurrentTask,
        loading,
        // Pagination exports
        loadMoreTasks,
        hasMoreTasks,
        loadingMore
    };
};
