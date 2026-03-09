


import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyBvsn9hLvi4Tq9mLvoo1-YL1uzbB_ntL7s",
    authDomain: "pos-and-sales-monitoring.firebaseapp.com",
    projectId: "pos-and-sales-monitoring",
    storageBucket: "pos-and-sales-monitoring.firebasestorage.app",
    messagingSenderId: "516453934117",
    appId: "1:516453934117:web:1783067b8aa6b37373cbcc",
    measurementId: "G-FT1G64DB9N"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

async function getUserData(uid) {
    try {
        const snap = await getDoc(doc(db, "users", uid));
        if (snap.exists()) return snap.data();
        return null;
    } catch (e) {
        console.error("Error fetching user:", e);
        return null;
    }
}

// --- 1. LOGIN ---
window.addEventListener('load', () => {
    const loginForm = document.getElementById('login-form') || document.getElementById('loginForm');
    if (!loginForm) return;

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = loginForm.querySelector('button[type="submit"]');
        const errorMsg  = document.getElementById('error-msg');
        if (submitBtn) submitBtn.innerText = "Logging in...";

        const email = (document.getElementById('email') || document.getElementById('username')).value.trim();
        const pass  = document.getElementById('password').value;

        try {
            const cred     = await signInWithEmailAndPassword(auth, email, pass);
            const userData = await getUserData(cred.user.uid);
            const role     = userData?.role || null;

            // ✅ CHECK: disabled or archived
            if (userData?.status === 'disabled' || userData?.archived === true) {
                await signOut(auth);
                if (submitBtn) submitBtn.innerText = "Login";
                if (typeof window.showDisabledModal === 'function') { window.showDisabledModal(); } else { alert('Your account has been disabled by the administrator.'); }
                return;
            }

            if (role === 'cashier') {
                window.location.href = 'pos.html';
            } else {
                await signOut(auth);
                if (submitBtn) submitBtn.innerText = "Login";
                const msg = "Access Denied: This panel is for cashiers only.";
                if (errorMsg) { errorMsg.style.display = 'block'; errorMsg.textContent = msg; }
                else alert(msg);
            }

        } catch (err) {
            if (submitBtn) submitBtn.innerText = "Login";
            const msg = "Login failed: " + err.message;
            if (errorMsg) { errorMsg.style.display = 'block'; errorMsg.textContent = msg; }
            else alert(msg);
        }
    });
});

// --- 2. AUTH STATE GUARD ---
onAuthStateChanged(auth, async (user) => {
    const page = window.location.pathname.split('/').pop() || 'index.html';

    if (!user) {
        if (page !== 'index.html') window.location.href = 'index.html';
        return;
    }

    const userData = await getUserData(user.uid);
    const role     = userData?.role || null;

    // ✅ CHECK: kick out disabled/archived users from any page
    if (userData?.status === 'disabled' || userData?.archived === true) {
        await signOut(auth);
        window.location.href = 'index.html';
        return;
    }

    if (page === 'index.html') {
        if (role === 'cashier') {
            window.location.href = 'pos.html';
        } else {
            await signOut(auth);
        }
        return;
    }

    if (role !== 'cashier') {
        await signOut(auth);
        window.location.href = 'index.html';
        return;
    }

    window.dispatchEvent(new CustomEvent('cashier-ready', { detail: { role: 'cashier' } }));

    const allowed = ['pos', 'transactions', 'sales'];
    if (!allowed.some(p => page.includes(p))) {
        window.location.href = 'pos.html';
    }
});

// --- Logout ---
window.logout = async function () {
    await signOut(auth);
    window.location.href = 'index.html';
};
