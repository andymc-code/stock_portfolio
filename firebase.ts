import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyD2_KAsX-o-reGqsoBWIpMaSxaro1LT6K0",
  authDomain: "stockportfolio-2a336.firebaseapp.com",
  projectId: "stockportfolio-2a336",
  storageBucket: "stockportfolio-2a336.firebasestorage.app",
  messagingSenderId: "71458748611",
  appId: "1:71458748611:web:adda840fad961baa5fca76",
  measurementId: "G-97TEQEJMJ7"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
