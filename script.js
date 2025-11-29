// --- 1. FIREBASE IMPORTS ---
// We import the specific tools we need from Google's servers
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, doc, setDoc, deleteDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// --- 2. YOUR CONFIG (API Keys) ---
const firebaseConfig = {
  apiKey: "AIzaSyD4gnX77Hvu49WFwYl4HtJJOPk0SwRsj8s",
  authDomain: "kopi-jalanan.firebaseapp.com",
  projectId: "kopi-jalanan",
  storageBucket: "kopi-jalanan.firebasestorage.app",
  messagingSenderId: "793785054964",
  appId: "1:793785054964:web:acc8be94e1cdd38721d0a1"
};

// Initialize connection to Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app); // Database
const auth = getAuth(app);    // Authentication

// --- 3. GLOBAL STATE ---
let cart = [];
let products = [];
let currentUser = null; // Tracks who is currently logged in

// ⚠️ SECURITY: The email that is allowed to see the Admin Panel
const ADMIN_EMAIL = "admin@kopi.com"; 

// --- 4. STARTUP LISTENERS ---
document.addEventListener("DOMContentLoaded", () => {
    
    // A. Database Listener (Real-time Menu Updates)
    const productsRef = collection(db, "products");
    onSnapshot(productsRef, (snapshot) => {
        products = [];
        snapshot.forEach((doc) => {
            // FIX: Combine the data with the Document ID safely
            products.push({ ...doc.data(), id: doc.id });
        });
        
        renderMenu();
        renderAdminTable();
    });

    // B. Auth Listener (Checks if user logs in or out)
    onAuthStateChanged(auth, (user) => {
        currentUser = user;
        updateNavUI(user); // Update buttons based on who is logged in
    });
});

// --- 5. AUTHENTICATION FUNCTIONS ---

// Updates the Navbar buttons (Show/Hide Admin button)
function updateNavUI(user) {
    const adminBtn = document.getElementById('navAdminBtn');
    const authBtn = document.getElementById('navAuthBtn');

    if (user) {
        // User is logged in
        authBtn.innerText = "Logout";
        authBtn.classList.replace('bg-zinc-800', 'bg-red-600');
        
        // CHECK: Is this the Admin?
        if (user.email === ADMIN_EMAIL) {
            adminBtn.classList.remove('hidden'); // Show Admin Button
        } else {
            adminBtn.classList.add('hidden'); // Hide Admin Button (Regular user)
        }
    } else {
        // User is logged out
        authBtn.innerText = "Login";
        authBtn.classList.replace('bg-red-600', 'bg-zinc-800');
        adminBtn.classList.add('hidden'); // Always hide admin button
    }
}

// Handles clicking the Login/Logout button
window.handleAuthClick = function() {
    if (currentUser) {
        // If logged in, then LOGOUT
        signOut(auth).then(() => {
            alert("Logged out successfully!");
            showPage('homePage');
        });
    } else {
        // If logged out, go to LOGIN PAGE
        showPage('authPage');
    }
};

// Logic for Logging In
window.handleLogin = function(e) {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const pass = document.getElementById('loginPass').value;

    signInWithEmailAndPassword(auth, email, pass)
        .then((userCredential) => {
            alert("Welcome back!");
            showPage('homePage');
        })
        .catch((error) => {
            alert("Login Failed: " + error.message);
        });
};

// Logic for Signing Up
window.handleSignUp = function(e) {
    e.preventDefault();
    const email = document.getElementById('signupEmail').value;
    const pass = document.getElementById('signupPass').value;

    createUserWithEmailAndPassword(auth, email, pass)
        .then((userCredential) => {
            alert("Account created! You are now logged in.");
            showPage('homePage');
        })
        .catch((error) => {
            alert("Sign Up Failed: " + error.message);
        });
};

// --- 6. DATABASE FUNCTIONS (Admin Only) ---

// Add Product
window.addProduct = async function(event) {
    event.preventDefault();
    // Security Check: Is the current user the Admin?
    if (!currentUser || currentUser.email !== ADMIN_EMAIL) {
        return alert("Security Alert: Only Admins can add items.");
    }

    const name = document.getElementById('prodName').value;
    const price = parseFloat(document.getElementById('prodPrice').value);
    const desc = document.getElementById('prodDesc').value;
    const imgUrl = document.getElementById('prodImg').value || 'https://placehold.co/400x300/2c2c2c/FFAE00';
    const newId = name.toLowerCase().replace(/ /g, '-');

    try {
        await setDoc(doc(db, "products", newId), {
            id: newId, name, price, desc, imgUrl,
            createdAt: new Date().toISOString()
        });
        alert('Product Saved to Database!');
        document.getElementById('adminForm').reset();
    } catch (error) {
        alert("Error saving: " + error.message);
    }
};

// Delete Product
window.deleteProduct = async function(id) {
    // Security Check
    if (!currentUser || currentUser.email !== ADMIN_EMAIL) {
        return alert("Security Alert: Only Admins can delete items.");
    }
    if (!confirm("Delete this item permanently?")) return;

    try {
        await deleteDoc(doc(db, "products", id));
    } catch (error) {
        console.error(error);
        alert("Error deleting item.");
    }
};

// --- 7. UI HELPER FUNCTIONS ---

// Render Menu Grid
window.renderMenu = function() {
    const grid = document.getElementById('menuGrid');
    if(!grid) return;
    grid.innerHTML = '';
    
    if (products.length === 0) {
        grid.innerHTML = '<p class="col-span-full text-center text-gray-500">No items available.</p>';
        return;
    }
    
    products.forEach(prod => {
        grid.innerHTML += `
            <div class="bg-zinc-800 border border-zinc-700 p-4">
                <div class="h-48 overflow-hidden mb-4 relative">
                    <img src="${prod.imgUrl}" class="w-full h-full object-cover">
                    <div class="absolute top-2 right-2 bg-street-yellow text-black font-bold px-2 py-1 text-sm">RM ${prod.price.toFixed(2)}</div>
                </div>
                <h3 class="text-2xl font-oswald uppercase mb-1 text-white">${prod.name}</h3>
                <p class="text-gray-400 text-sm mb-4">${prod.desc}</p>
                <div class="flex gap-2">
                    <button onclick="viewDetail('${prod.id}')" class="flex-1 border border-gray-500 text-gray-300 py-2 hover:bg-gray-700">Details</button>
                    <button onclick="addToCart('${prod.id}')" class="flex-1 bg-street-yellow text-black font-bold py-2">Add +</button>
                </div>
            </div>`;
    });
};

// Render Admin Table
window.renderAdminTable = function() {
    const tbody = document.getElementById('adminTableBody');
    if(!tbody) return;
    tbody.innerHTML = '';
    
    products.forEach(prod => {
        tbody.innerHTML += `
            <tr class="border-b border-zinc-700">
                <td class="p-3">${prod.name}</td>
                <td class="p-3">RM ${prod.price.toFixed(2)}</td>
                <td class="p-3 text-right">
                    <button onclick="deleteProduct('${prod.id}')" class="text-red-500 hover:text-red-400"><i class="fas fa-trash"></i></button>
                </td>
            </tr>`;
    });
};

// View Detail Overlay
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

// --- CART LOGIC ---
window.addToCart = function(id) {
    const prod = products.find(p => p.id === id);
    cart.push(prod);
    updateCartUI();
};

window.removeFromCart = function(index) {
    cart.splice(index, 1);
    updateCartUI();
};

window.updateCartUI = function() {
    document.getElementById('cartCount').innerText = cart.length;
    const list = document.getElementById('cartList');
    if(!list) return;
    
    list.innerHTML = '';
    let total = 0;
    
    if (cart.length === 0) { 
        list.innerHTML = '<p class="text-gray-500">Your basket is empty.</p>'; 
    } else {
        cart.forEach((item, index) => {
            total += item.price;
            list.innerHTML += `
                <div class="flex justify-between items-center border-b border-zinc-700 py-3">
                    <div>
                        <div class="font-bold text-white">${item.name}</div>
                        <div class="text-sm text-street-yellow">RM ${item.price.toFixed(2)}</div>
                    </div>
                    <button onclick="removeFromCart(${index})" class="text-gray-500 hover:text-red-500"><i class="fas fa-times"></i></button>
                </div>`;
        });
    }
    
    document.getElementById('cartTotal').innerText = `RM ${total.toFixed(2)}`;
    document.getElementById('checkoutTotal').innerText = `RM ${total.toFixed(2)}`;
};

// --- NAVIGATION ---
window.showPage = function(pageId) {
    // Hide all pages
    document.querySelectorAll('.page-section').forEach(el => el.classList.add('hidden'));
    
    // Show requested page
    const page = document.getElementById(pageId);
    if(page) page.classList.remove('hidden');
    
    window.scrollTo(0, 0);
};

window.submitCheckout = function(e) {
    e.preventDefault();
    if(cart.length === 0) return alert("Cart is empty!");
    
    alert("Checkout successful! (This is a prototype).");
    cart = [];
    updateCartUI();
    showPage('homePage');
};

// --- EXPORTS ---
// Required because type="module" makes functions private by default.
// We attach them to 'window' so HTML onclick="" can find them.
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

