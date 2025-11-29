// --- 1. FIREBASE IMPORTS ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, doc, setDoc, deleteDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// --- 2. YOUR CONFIG ---
const firebaseConfig = {
  apiKey: "AIzaSyD4gnX77Hvu49WFwYl4HtJJOPk0SwRsj8s",
  authDomain: "kopi-jalanan.firebaseapp.com",
  projectId: "kopi-jalanan",
  storageBucket: "kopi-jalanan.firebasestorage.app",
  messagingSenderId: "793785054964",
  appId: "1:793785054964:web:acc8be94e1cdd38721d0a1"
};

// Initialize
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// --- 3. GLOBAL STATE ---
let cart = [];
let products = [];
let currentUser = null;
let activeCategory = 'all'; 

// ADMIN EMAIL
const ADMIN_EMAIL = "kopijalanan@gmail.com"; 

// --- 4. STARTUP LISTENERS ---
document.addEventListener("DOMContentLoaded", () => {
    
    // Database Listener
    const productsRef = collection(db, "products");
    onSnapshot(productsRef, (snapshot) => {
        products = [];
        snapshot.forEach((doc) => {
            // FIX: Ensure ID is always attached
            products.push({ ...doc.data(), id: doc.id });
        });
        renderMenu();
        renderAdminTable();
    });

    // Auth Listener
    onAuthStateChanged(auth, (user) => {
        currentUser = user;
        updateNavUI(user);
    });
});

// --- 5. CATEGORY FILTER ---
window.filterMenu = function(category) {
    activeCategory = category;
    renderMenu();
};

// --- 6. AUTH FUNCTIONS ---

function updateNavUI(user) {
    const adminBtn = document.getElementById('navAdminBtn');
    const authBtn = document.getElementById('navAuthBtn');

    if (user) {
        authBtn.innerText = "Logout";
        authBtn.classList.replace('bg-zinc-800', 'bg-red-600');
        if (user.email === ADMIN_EMAIL) adminBtn.classList.remove('hidden');
        else adminBtn.classList.add('hidden');
    } else {
        authBtn.innerText = "Login";
        authBtn.classList.replace('bg-red-600', 'bg-zinc-800');
        adminBtn.classList.add('hidden');
    }
}

window.handleAuthClick = function() {
    currentUser ? signOut(auth).then(() => showPage('homePage')) : showPage('authPage');
};

window.handleLogin = function(e) {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const pass = document.getElementById('loginPass').value;
    signInWithEmailAndPassword(auth, email, pass)
        .then(() => showPage('homePage'))
        .catch(err => alert("Login Error: " + err.message));
};

window.handleSignUp = function(e) {
    e.preventDefault();
    const email = document.getElementById('signupEmail').value;
    const pass = document.getElementById('signupPass').value;
    createUserWithEmailAndPassword(auth, email, pass)
        .then(() => showPage('homePage'))
        .catch(err => alert("Signup Error: " + err.message));
};

// --- 7. DATABASE FUNCTIONS ---

window.addProduct = async function(event) {
    event.preventDefault();
    if (!currentUser || currentUser.email !== ADMIN_EMAIL) return alert("Admins Only!");

    const name = document.getElementById('prodName').value;
    const price = parseFloat(document.getElementById('prodPrice').value);
    const desc = document.getElementById('prodDesc').value;
    const category = document.getElementById('prodCat').value; // Get Category
    const imgUrl = document.getElementById('prodImg').value || 'https://placehold.co/400x300/2c2c2c/FFAE00';
    const newId = name.toLowerCase().replace(/ /g, '-');

    try {
        await setDoc(doc(db, "products", newId), {
            id: newId, name, price, desc, category, imgUrl,
            createdAt: new Date().toISOString()
        });
        alert('Product Saved!');
        document.getElementById('adminForm').reset();
    } catch (error) {
        alert("Error: " + error.message);
    }
};

window.deleteProduct = async function(id) {
    if (!currentUser || currentUser.email !== ADMIN_EMAIL) return alert("Admins Only!");
    if (!confirm("Delete this item?")) return;
    try { await deleteDoc(doc(db, "products", id)); } catch (error) { console.error(error); }
};

// --- 8. UI RENDER FUNCTIONS ---

window.renderMenu = function() {
    const grid = document.getElementById('menuGrid');
    if(!grid) return;
    grid.innerHTML = '';

    // Filter Logic
    const filteredProducts = activeCategory === 'all' 
        ? products 
        : products.filter(p => p.category === activeCategory);
    
    if (filteredProducts.length === 0) {
        grid.innerHTML = '<p class="col-span-full text-center text-gray-500">No items found.</p>';
        return;
    }
    
    filteredProducts.forEach(prod => {
        grid.innerHTML += `
            <div class="bg-zinc-800 border border-zinc-700 p-4 transition hover:border-street-yellow">
                <div class="h-48 overflow-hidden mb-4 relative">
                    <img src="${prod.imgUrl}" class="w-full h-full object-cover">
                    <div class="absolute top-2 right-2 bg-street-yellow text-black font-bold px-2 py-1 text-sm">RM ${prod.price.toFixed(2)}</div>
                </div>
                <h3 class="text-2xl font-oswald uppercase mb-1 text-white">${prod.name}</h3>
                <p class="text-gray-400 text-sm mb-4">${prod.desc}</p>
                <div class="flex gap-2">
                    <button onclick="viewDetail('${prod.id}')" class="flex-1 border border-gray-500 text-gray-300 py-2 hover:bg-gray-700 text-xs uppercase tracking-widest">Details</button>
                    <button onclick="addToCart('${prod.id}')" class="flex-1 bg-street-yellow text-black font-bold py-2 text-xs uppercase tracking-widest hover:bg-white">Add +</button>
                </div>
            </div>`;
    });
};

window.renderAdminTable = function() {
    const tbody = document.getElementById('adminTableBody');
    if(!tbody) return;
    tbody.innerHTML = '';
    products.forEach(prod => {
        tbody.innerHTML += `
            <tr class="border-b border-zinc-700">
                <td class="p-3">${prod.name} <span class="text-xs text-gray-500 block">${prod.category || 'No Cat'}</span></td>
                <td class="p-3">RM ${prod.price.toFixed(2)}</td>
                <td class="p-3 text-right"><button onclick="deleteProduct('${prod.id}')" class="text-red-500"><i class="fas fa-trash"></i></button></td>
            </tr>`;
    });
};

window.viewDetail = function(id) {
    const prod = products.find(p => p.id === id);
    if (!prod) return;
    document.getElementById('detailImage').src = prod.imgUrl;
    document.getElementById('detailName').innerText = prod.name;
    document.getElementById('detailPrice').innerText = `RM ${prod.price.toFixed(2)}`;
    document.getElementById('detailDesc').innerText = prod.desc;
    document.getElementById('detailAddBtn').onclick = () => addToCart(id);
    showPage('detailPage');
};

window.addToCart = function(id) {
    const prod = products.find(p => p.id === id);
    if(prod) { cart.push(prod); updateCartUI(); }
};

window.removeFromCart = function(index) { cart.splice(index, 1); updateCartUI(); };

window.updateCartUI = function() {
    document.getElementById('cartCount').innerText = cart.length;
    const list = document.getElementById('cartList');
    if(!list) return;
    list.innerHTML = '';
    let total = 0;
    if (cart.length === 0) list.innerHTML = '<p class="text-gray-500">Empty.</p>';
    else {
        cart.forEach((item, index) => {
            total += item.price;
            list.innerHTML += `<div class="flex justify-between items-center border-b border-zinc-700 py-3"><div><div class="font-bold text-white">${item.name}</div><div class="text-sm text-street-yellow">RM ${item.price.toFixed(2)}</div></div><button onclick="removeFromCart(${index})" class="text-gray-500 hover:text-red-500"><i class="fas fa-times"></i></button></div>`;
        });
    }
    document.getElementById('cartTotal').innerText = `RM ${total.toFixed(2)}`;
    document.getElementById('checkoutTotal').innerText = `RM ${total.toFixed(2)}`;
};

window.showPage = function(pageId) {
    document.querySelectorAll('.page-section').forEach(el => el.classList.add('hidden'));
    document.getElementById(pageId).classList.remove('hidden');
    window.scrollTo(0, 0);
};

window.submitCheckout = function(e) {
    e.preventDefault();
    alert("Checkout successful!");
    cart = [];
    updateCartUI();
    showPage('homePage');
};

// EXPORTS
window.handleAuthClick = handleAuthClick;
window.handleLogin = handleLogin;
window.handleSignUp = handleSignUp;
window.addProduct = addProduct;
window.deleteProduct = deleteProduct;
window.renderMenu = renderMenu;
window.renderAdminTable = renderAdminTable;
window.updateCartUI = updateCartUI;
window.viewDetail = viewDetail;
window.addToCart = addToCart;
window.removeFromCart = removeFromCart;
window.showPage = showPage;
window.submitCheckout = submitCheckout;
window.filterMenu = filterMenu;
