// ======================================================
// 1. BASIC PAGE & NAV LOGIC (FROM YOUR SCRIPT)
// ======================================================
const pages = document.querySelectorAll('.page-section');
const navBtns = document.querySelectorAll('.nav-btn');

function showPage(pageId) {
    pages.forEach(p => p.classList.add('hidden'));
    document.getElementById(pageId)?.classList.remove('hidden');

    navBtns.forEach(btn => btn.classList.remove('active-nav'));
    const active = document.querySelector(`[onclick="showPage('${pageId}')"]`);
    if (active) active.classList.add('active-nav');

    window.scrollTo(0, 0);
}

// ======================================================
// 2. FIREBASE IMPORTS
// ======================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
    getFirestore, collection, doc, setDoc, addDoc,
    deleteDoc, updateDoc, increment, onSnapshot, getDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import {
    getAuth, signInWithEmailAndPassword,
    createUserWithEmailAndPassword, signOut, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// ======================================================
// 3. FIREBASE CONFIG
// ======================================================
const firebaseConfig = {
    apiKey: "AIzaSyD4gnX77Hvu49WFwYl4HtJJOPk0SwRsj8s",
    authDomain: "kopi-jalanan.firebaseapp.com",
    projectId: "kopi-jalanan",
    storageBucket: "kopi-jalanan.firebasestorage.app",
    messagingSenderId: "793785054964",
    appId: "1:793785054964:web:acc8be94e1cdd38721d0a1"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// ======================================================
// 4. GLOBAL STATE (MERGED)
// ======================================================
let cart = [];
let products = [];
let currentUser = null;
let isAdmin = false;
let activeCategory = "all";
let isProcessingOrder = false;

// ======================================================
// 5. SIMPLE STATIC MENU (YOUR CODE – KEPT)
// ======================================================
const menuItems = [
    { id: "kopi-o", name: "Kopi O", price: 3.00 },
    { id: "latte", name: "Latte", price: 5.00 },
    { id: "mocha", name: "Mocha", price: 6.00 }
];

// ======================================================
// 6. STARTUP LISTENERS
// ======================================================
document.addEventListener("DOMContentLoaded", () => {

    // Firebase products (override static menu if exists)
    onSnapshot(collection(db, "products"), (snap) => {
        products = snap.docs.map(d => ({ ...d.data(), id: d.id }));
        if (products.length > 0) renderMenu();
    });

    // Auth listener
    onAuthStateChanged(auth, async (user) => {
        currentUser = user;
        isAdmin = false;

        if (user) {
            const adminRef = doc(db, "admins", user.email);
            const snap = await getDoc(adminRef);
            if (snap.exists()) isAdmin = true;
        }
        updateNavUI(user);
    });

    renderMenu(); // fallback static menu
    updateCart();
});

// ======================================================
// 7. MENU RENDER (STATIC + FIREBASE COMPATIBLE)
// ======================================================
function renderMenu() {
    const grid = document.getElementById('menuGrid');
    if (!grid) return;

    grid.innerHTML = "";
    const dataSource = products.length ? products : menuItems;

    dataSource.forEach(item => {
        const card = document.createElement('div');
        card.className = "menu-card";
        card.innerHTML = `
            <h3 class="font-oswald text-xl mb-2">${item.name}</h3>
            <p class="text-gray-400 mb-4">RM ${item.price.toFixed(2)}</p>
            <button onclick="addToCart('${item.id}')" 
                class="bg-street-yellow text-black font-bold px-4 py-2 uppercase">
                Add to Cart
            </button>
        `;
        grid.appendChild(card);
    });
}

// ======================================================
// 8. CART LOGIC (YOUR CODE – IMPROVED)
// ======================================================
function addToCart(id) {
    const source = products.length ? products : menuItems;
    const item = source.find(i => i.id == id);
    if (!item) return;

    cart.push({
        ...item,
        finalPrice: item.price
    });

    updateCart();
}

function updateCart() {
    document.getElementById('cartCount').textContent = cart.length;

    const list = document.getElementById('cartList');
    if (!list) return;

    list.innerHTML = "";
    let total = 0;

    cart.forEach((item, i) => {
        total += item.finalPrice;
        list.innerHTML += `
            <div class="flex justify-between border-b border-zinc-800 pb-2">
                <span>${item.name}</span>
                <span>RM ${item.finalPrice.toFixed(2)}</span>
            </div>
        `;
    });

    document.getElementById('checkoutTotal').textContent = `RM ${total.toFixed(2)}`;

    const btn = document.getElementById('checkoutBtn');
    if (!btn) return;

    if (cart.length === 0) {
        btn.disabled = true;
        btn.textContent = "Add items to cart";
        btn.classList.add("opacity-50", "cursor-not-allowed");
    } else {
        btn.disabled = false;
        btn.textContent = "Confirm Order";
        btn.classList.remove("opacity-50", "cursor-not-allowed");
    }
}

// ======================================================
// 9. CHECKOUT (STATIC + FIREBASE)
// ======================================================
async function submitCheckout() {
    if (cart.length === 0 || isProcessingOrder) return;
    isProcessingOrder = true;

    if (!currentUser) {
        alert("Please login first");
        showPage('authPage');
        isProcessingOrder = false;
        return;
    }

    try {
        await addDoc(collection(db, "orders"), {
            userId: currentUser.uid,
            email: currentUser.email,
            items: cart,
            total: document.getElementById('checkoutTotal').innerText,
            createdAt: new Date().toISOString(),
            status: "Pending"
        });

        alert("Order confirmed ☕");
        cart = [];
        updateCart();
        showPage('homePage');

    } catch (e) {
        alert(e.message);
    }
    isProcessingOrder = false;
}

// ======================================================
// 10. AUTH UI
// ======================================================
function updateNavUI(user) {
    const adminBtn = document.getElementById('navAdminBtn');
    const authBtn = document.getElementById('navAuthBtn');

    if (!authBtn) return;

    if (user) {
        authBtn.innerText = "Logout";
        authBtn.classList.replace('bg-zinc-800', 'bg-red-600');
        isAdmin ? adminBtn?.classList.remove('hidden') : adminBtn?.classList.add('hidden');
    } else {
        authBtn.innerText = "Login";
        authBtn.classList.replace('bg-red-600', 'bg-zinc-800');
        adminBtn?.classList.add('hidden');
    }
}

function handleAuthClick() {
    currentUser ? signOut(auth) : showPage('authPage');
}

// ======================================================
// 11. EXPORTS
// ======================================================
Object.assign(window, {
    showPage,
    addToCart,
    submitCheckout,
    handleAuthClick
});
