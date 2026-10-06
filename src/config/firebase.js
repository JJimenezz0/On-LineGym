import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeFirestore, getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCZY-wlkmCnKlBR0W5-oMTTci0MTZGyEEk",
  authDomain: "on-linegym.firebaseapp.com",
  projectId: "on-linegym",
  storageBucket: "on-linegym.firebasestorage.app",
  messagingSenderId: "1025456552844",
  appId: "1:1025456552844:web:25579cd33f6e871494f4a9",
  measurementId: "G-7S9GVE01Q7"
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// Long polling evita que Firestore se quede "cargando" en Expo Go / React Native.
let database;
try {
  database = initializeFirestore(app, { experimentalForceLongPolling: true });
} catch (e) {
  database = getFirestore(app);
}

export const db = database;
