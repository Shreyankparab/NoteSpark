// firebase/firebaseConfig.ts
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getFunctions } from "firebase/functions";

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyDS3nKSjG9S46vzTayEZz1fbda8AFtAAPc",
  authDomain: "notespark-new.firebaseapp.com",
  projectId: "notespark-new",
  storageBucket: "notespark-new.appspot.com",
  messagingSenderId: "189308470391",
  appId: "1:189308470391:web:cb678aec406cce9abf7272",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Auth instance
export const auth = getAuth(app);

// Google provider (for web usage)
export const googleProvider = new GoogleAuthProvider();

// Firestore
export const db = getFirestore(app);

// Firebase Storage
export const storage = getStorage(app);

// Cloud Functions (default region)
export const functions = getFunctions(app);
