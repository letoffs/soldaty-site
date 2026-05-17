// firebase-config.js
const firebaseConfig = {
    apiKey: "AIzaSyAgqZ6HCmcRf1ZjoYEdqrF58c11E_V3MVI",
    authDomain: "soldaty-site-id.firebaseapp.com",
    projectId: "soldaty-site-id",
    storageBucket: "soldaty-site-id.firebasestorage.app",
    messagingSenderId: "30979760423",
    appId: "1:30979760423:web:85d5d11bf6f4f5edcbc902",
    measurementId: "G-ZDYC97Y4F4",
    databaseURL: "https://soldaty-site-id-default-rtdb.firebaseio.com/"
};

// Инициализация Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.database();

console.log("✅ Firebase инициализирован");