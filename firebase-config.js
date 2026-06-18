// Firebase configuration — replace with your own project credentials
// Get these from your Firebase Console → Project Settings → General → Your apps → Web app
const firebaseConfig = {
    apiKey: "AIzaSyCgxWHbxSyC_xpOxGT1ZxrvjfcthuyQel0",
    authDomain: "enamsearcher.firebaseapp.com",
    projectId: "enamsearcher",
    storageBucket: "enamsearcher.firebasestorage.app",
    messagingSenderId: "777471249345",
    appId: "1:777471249345:web:daa910080f2c6316a6bd40"
};

// Initialize Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, browserLocalPersistence, setPersistence } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Set persistent session (keeps user logged in until explicit logout)
setPersistence(auth, browserLocalPersistence).catch(() => {});

export { auth };
