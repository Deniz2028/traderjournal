// Offline Mock for Firebase
// This file replaces the actual Firebase SDK to allow the app to run completely offline.

console.log("Initializing Offline Mode (No Firebase)");

// Mock App
export const app = { name: "OfflineApp", options: {} };

// Mock Auth
export const auth = {
    currentUser: {
        uid: "offline-user",
        email: "offline@local.com",
        displayName: "Offline User",
        isAnonymous: false,
    },
    signOut: async () => console.log("Offline sign out"),
};

// Mock Firestore
export const db = {
    type: "firestore",
    app: app
};

// If any code tries to import functions directly from firebase/firestore or auth,
// they will fail at runtime if we don't handle them at the import site.
// But since we are modifying consumers (AuthContext, etc.), this file mainly serves
// as a safe import target for legacy files we might have missed.
