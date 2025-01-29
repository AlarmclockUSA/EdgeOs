'use client'

import { initializeApp, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getAnalytics, Analytics } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: "AIzaSyCFSGgEjVpWHA30EwpdFLXawzuHZ8y3Z9I",
  authDomain: "edge-6ac40.firebaseapp.com",
  projectId: "edge-6ac40",
  storageBucket: "edge-6ac40.firebasestorage.app",
  messagingSenderId: "690211980202",
  appId: "1:690211980202:web:82f509cccf46f3d74ca1d3",
  measurementId: "G-P9C3H89TCL"
};

function createFirebaseApp(config: typeof firebaseConfig) {
  try {
    return getApp();
  } catch {
    return initializeApp(config);
  }
}

// Initialize Firebase
const app = createFirebaseApp(firebaseConfig);

// Initialize Firebase services
const auth = getAuth(app);
const db = getFirestore(app);

// Initialize analytics only on client side
let analytics: Analytics | null = null;
if (typeof window !== 'undefined') {
  analytics = getAnalytics(app);
}

export { app, auth, db, analytics };

