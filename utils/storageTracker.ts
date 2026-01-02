import { db, storage } from "../firebase/firebaseConfig";
import { doc, getDoc, collection, query, where, getDocs, updateDoc } from "firebase/firestore";
import { ref, getMetadata } from "firebase/storage";

// Default Limit: 10 MB
export const DEFAULT_STORAGE_LIMIT = 10 * 1024 * 1024;

export const isStorageFull = (currentBytes: number, limitBytes: number = DEFAULT_STORAGE_LIMIT): boolean => {
    return currentBytes >= limitBytes;
};

export const formatBytes = (bytes: number, decimals = 2) => {
    if (!+bytes) return '0 Bytes';

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
};

/**
 * Helper to get size of a file from Firebase Storage URL.
 * Returns 0 if URL is not from our Firebase Storage or if fetch fails.
 */
const getFileSizeFromUrl = async (url: string | null | undefined): Promise<number> => {
    if (!url) return 0;

    // Check if it's a firebase storage URL
    if (!url.includes("firebasestorage")) {
        // External URL (e.g., Google Profile Pic) - Doesn't count towards our storage quota
        return 0;
    }

    try {
        // Extract path from URL or use refFromURL logic
        // The ref(storage, url) works with download URLs
        const storageRef = ref(storage, url);
        const metadata = await getMetadata(storageRef);
        return metadata.size;
    } catch (error) {
        console.warn(`Failed to get metadata for ${url}:`, error);
        return 0;
    }
};

/**
 * Scans all user data (Profile + Notes) to calculate total storage used.
 * Updates the 'storageUsed' field in the user document.
 */
export const calculateTotalStorage = async (userId: string): Promise<number> => {
    try {
        let totalBytes = 0;

        // 1. Check User Profile Picture
        const userRef = doc(db, "users", userId);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
            const userData = userSnap.data();
            const photoURL = userData.photoURL;
            const profileSize = await getFileSizeFromUrl(photoURL);
            totalBytes += profileSize;
        }

        // 2. Check Notes Images
        // Assuming 'imageUrl' field in 'notes' collection
        const notesRef = collection(db, "notes");
        const q = query(notesRef, where("userId", "==", userId));
        const querySnapshot = await getDocs(q);

        const notePromises = querySnapshot.docs.map(async (doc) => {
            const noteData = doc.data();
            if (noteData.imageUrl) {
                return getFileSizeFromUrl(noteData.imageUrl);
            }
            return 0;
        });

        const noteSizes = await Promise.all(notePromises);
        const notesTotal = noteSizes.reduce((acc, size) => acc + size, 0);
        totalBytes += notesTotal;

        // 3. Update User Document
        await updateDoc(userRef, {
            storageUsed: totalBytes
        });

        return totalBytes;

    } catch (error) {
        console.error("Error calculating total storage:", error);
        // Return 0 or rethrow? returning 0 is safer for UI
        return 0;
    }
};
