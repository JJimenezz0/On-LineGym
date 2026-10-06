import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeFirestore, getFirestore } from 'firebase/firestore';
import { initializeAuth, getReactNativePersistence, getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: "AIzaSyCZY-wlkmCnKlBR0W5-oMTTci0MTZGyEEk",
  authDomain: "on-linegym.firebaseapp.com",
  projectId: "on-linegym",
  storageBucket: "on-linegym.firebasestorage.app",
  messagingSenderId: "1025456552844",
  appId: "1:1025456552844:web:25579cd33f6e871494f4a9",
  measurementId: "G-7S9GVE01Q7"
};

export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// Long polling evita que Firestore se quede "cargando" en Expo Go / React Native.
let database;
try {
  database = initializeFirestore(app, { experimentalForceLongPolling: true });
} catch (e) {
  database = getFirestore(app);
}
export const db = database;

// Auth con la sesión guardada en el teléfono (sigues dentro al reabrir la app).
let authInstance;
try {
  authInstance = initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) });
} catch (e) {
  authInstance = getAuth(app); // ya estaba inicializado (recarga en caliente)
}
export const auth = authInstance;

// Pon esto en true SOLO cuando Firebase Storage esté activado (ver README).
// En false: las imágenes se reducen y se guardan dentro del propio mensaje, y los videos no se pueden enviar.
export const USAR_STORAGE = false;

export const storage = getStorage(app);
// Si Storage falla, no reintentar durante minutos
storage.maxUploadRetryTime = 15000;
storage.maxOperationRetryTime = 15000;
