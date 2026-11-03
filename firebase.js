import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js';
import { getFirestore, initializeFirestore, persistentLocalCache, persistentSingleTabManager } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js';
const firebaseConfig = { apiKey: 'AIzaSyBMc-XzrJbEaUPnHl5teoe_xY0uXUOjeBk', authDomain: 'yomak-9186b.firebaseapp.com', projectId: 'yomak-9186b', storageBucket: 'yomak-9186b.firebasestorage.app', messagingSenderId: '1025097363548', appId: '1:1025097363548:web:b888c8db5a40d2f2bb3699', measurementId: 'G-LGFTEX5RW1' };
export const fb = initializeApp(firebaseConfig);
export const auth = getAuth(fb);
/* كاش محلي دائم: الصفحات بتفتح فورًا من الجهاز وبعدين بتتزامن مع النت */
let _db;
try { _db = initializeFirestore(fb, { localCache: persistentLocalCache({ tabManager: persistentSingleTabManager() }), experimentalAutoDetectLongPolling: true }); }
catch (e) { _db = getFirestore(fb); }
export const db = _db;

