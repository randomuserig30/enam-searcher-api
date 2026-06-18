import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    updateProfile
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { auth } from "./firebase-config.js";

// ---------- Auth actions ----------
export async function registerUser(email, password) {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    return cred;
}

export async function setUsername(user, username) {
    return await updateProfile(user, { displayName: username });
}

export async function loginUser(email, password) {
    return await signInWithEmailAndPassword(auth, email, password);
}

export async function logoutUser() {
    await signOut(auth);
    window.location.replace('index.html');
}

// ---------- Route guards ----------
export function requireAuth() {
    return new Promise((resolve) => {
        const unsub = onAuthStateChanged(auth, (user) => {
            unsub();
            if (!user) {
                window.location.replace('index.html');
            } else {
                resolve(user);
            }
        });
    });
}

export function redirectIfAuth() {
    return new Promise((resolve) => {
        const unsub = onAuthStateChanged(auth, (user) => {
            unsub();
            if (user) {
                window.location.replace('dashboard.html');
            } else {
                resolve(null);
            }
        });
    });
}

export { auth, onAuthStateChanged };
