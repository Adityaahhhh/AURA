import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyD_d50QiUTEmd9gi9IvIpwhUTkzgYU06oo",
  authDomain: "aura-39432.firebaseapp.com",
  projectId: "aura-39432",
  storageBucket: "aura-39432.firebasestorage.app",
  messagingSenderId: "32664828451",
  appId: "1:32664828451:web:9e6da38c2243dfe57acf96",
  measurementId: "G-V5VBGNX84L",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

export default app;
