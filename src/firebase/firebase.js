import { initializeApp } from "firebase/app";

import {
    getFirestore
} from "firebase/firestore";

import {
    getAuth
} from "firebase/auth";

const firebaseConfig = {
    apiKey: "AIzaSyA1ZoiIa-l_5448EV7MJMOpwAWQKlToa4w",
    authDomain: "suhang-20db6.firebaseapp.com",
    projectId: "suhang-20db6",
    storageBucket: "suhang-20db6.firebasestorage.app",
    messagingSenderId: "358735909030",
    appId: "1:358735909030:web:7f58fa5f2554508477e467"
};

const app = initializeApp(firebaseConfig);

console.log("Firebase App:", app);

export const db = getFirestore(app);

console.log("Project ID:", app.options.projectId);

console.log("Firestore DB:", db);

export const auth = getAuth(app);

console.log("Auth:", auth);