import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBvzb6AtJ9PSRuxbxYFApYMtimRFVEXPFs",
  authDomain: "chatbolt-28460.firebaseapp.com",
  projectId: "chatbolt-28460",
  storageBucket: "chatbolt-28460.firebasestorage.app",
  messagingSenderId: "138822215416",
  appId: "1:138822215416:web:4ab8a1adc99a74d08d7d0d",
  measurementId: "G-0BX5698BJX"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
