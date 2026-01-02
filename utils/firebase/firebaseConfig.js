"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.functions = exports.storage = exports.db = exports.googleProvider = exports.auth = void 0;
// firebase/firebaseConfig.ts
var app_1 = require("firebase/app");
var auth_1 = require("firebase/auth");
var firestore_1 = require("firebase/firestore");
var storage_1 = require("firebase/storage");
var functions_1 = require("firebase/functions");
var react_native_1 = require("react-native");
// Firebase config
var firebaseConfig = {
    apiKey: "AIzaSyDS3nKSjG9S46vzTayEZz1fbda8AFtAAPc",
    authDomain: "notespark-new.firebaseapp.com",
    projectId: "notespark-new",
    storageBucket: "notespark-new.firebasestorage.app", // Fixed: was .appspot.com
    messagingSenderId: "189308470391",
    appId: "1:189308470391:web:cb678aec406cce9abf7272",
};
// Initialize Firebase
var app = (0, app_1.initializeApp)(firebaseConfig);
// Auth instance - getAuth works for both web and mobile
exports.auth = (0, auth_1.getAuth)(app);
// Set persistence for web
if (react_native_1.Platform.OS === 'web') {
    exports.auth.setPersistence(auth_1.browserLocalPersistence).catch(function (error) {
        console.error('Failed to set persistence:', error);
    });
}
// Google provider (for web usage)
exports.googleProvider = new auth_1.GoogleAuthProvider();
// Firestore
exports.db = (0, firestore_1.getFirestore)(app);
// Firebase Storage
exports.storage = (0, storage_1.getStorage)(app);
// Cloud Functions (default region)
exports.functions = (0, functions_1.getFunctions)(app);
