// --- 1. FIREBASE IMPORTS (Added Auth) ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, doc, setDoc, deleteDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// --- 2. YOUR CONFIG ---
const firebaseConfig = {
  apiKey: "AIzaSyD4gnX77Hvu49WFwYl4HtJJOPk0SwRsj8s",
  authDomain: "kopi-jalanan.firebaseapp.com",
  projectId: "kopi-jalanan",
  storageBucket: "kopi-jalanan.firebasestorage.app",
  messagingSenderId: "793785054964",
  appId: "1:793785054964:web:acc8be94e1cdd38721d0a1"
};

// Initialize connection
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app); // New: Auth System

// --- 3. GLOBAL STATE ---
let cart = [];
let products = [];
let isAdmin = false; // New: Tracks if you are logged in

// --- 4. LISTEN TO DATABASE ---
document.addEventListener("DOMContentLoaded", () => {
    // Listen for Menu Changes
    const productsRef = collection(db, "products");
    onSnapshot(productsRef, (snapshot) => {
        products = [];
        snapshot.forEach((doc) => {
            products.push(doc.data());
        });
        renderMenu();
        renderAdminTable();
    });

    // New: Listen for Login Status
    auth.onAuthStateChanged((user) => {
        if (user) {
            isAdmin = true;
            console.log("Logged in as:", user.email);
            // Show logout button or visual indicator if you want
        } else {
            isAdmin = false;
            console.log("Logged out");
        }
    });
});

// --- 5. FUNCTIONS ---

// Add Product
window.addProduct = async function(event) {
    event.preventDefault();
    if (!isAdmin) return alert("You must be logged in!");

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
        alert('Product Saved!');
        document.getElementById('adminForm').reset();
    } catch (error) {
        console.error("Error:", error);
        alert("Error: You probably don't have permission.");
    }
};

// Delete Product
window.deleteProduct = async function(id) {
    if (!isAdmin) return alert("Login required to delete.");
    if (!confirm("Delete this item permanently?")) return;

    try {
        await deleteDoc(doc(db, "products", id));
    } catch (error) {
        console.error("Error:", error);
        alert("Error: Permission denied.");
    }
};

// --- NAVIGATION & LOGIN LOGIC ---

window.showPage = function(pageId) {
    // SECURITY CHECK: If trying to open Admin Page
    if (pageId === 'adminPage') {
        if (!isAdmin) {
            // Simple Prompt Login System
            const email = prompt("Admin Email:");
            if (!email) return; // Cancelled
            const password = prompt("Password:");
            
            signInWithEmailAndPassword(auth, email, password)
                .then(() => {
                    alert("Welcome back, Boss!");
                    isAdmin = true;
                    // Actually show the page now
                    document.querySelectorAll('.page-section').forEach(el => el.classList.add('hidden'));
                    document.getElementById(pageId).classList.remove('hidden');
                })
                .catch((error) => {
                    alert("Wrong email or password!");
                    console.error(error);
                });
            return; // Stop here, don't show page yet
        }
    }

    // Standard Navigation
    document.querySelectorAll('.page-section').forEach(el => el.classList.add('hidden'));
    document.getElementById(pageId).classList.remove('hidden');
    window.scrollTo(0, 0);
};

// --- UI HELPERS (Unchanged) ---
window.renderMenu = function() {
    const grid = document.getElementById('menuGrid');
    grid.innerHTML = '';
    if (products.length === 0) { grid.innerHTML = '<p class="col-span-full text-center">Loading...</p>'; return; }
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

window.renderAdminTable = function() {
    const tbody = document.getElementById('adminTableBody');
    tbody.innerHTML = '';
    products.forEach(prod => {
        tbody.innerHTML += `
            <tr class="border-b border-zinc-700">
                <td class="p-3">${prod.name}</td>
                <td class="p-3">RM ${prod.price.toFixed(2)}</td>
                <td class="p-3 text-right">
                    <button onclick="deleteProduct('${prod.id}')" class="text-red-500"><i class="fas fa-trash"></i></button>
                </td>
            </tr>`;
    });
};

// ... (Keep viewDetail, addToCart, removeFromCart, updateCartUI, submitCheckout same as before) ...
// (I have omitted them to save space, but make sure you keep the ones from the previous code block!)

// View Detail
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
    list.innerHTML = '';
    let total = 0;
    if (cart.length === 0) { list.innerHTML = '<p class="text-gray-500">Your basket is empty.</p>'; } 
    else {
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

window.submitCheckout = function(e) {
    e.preventDefault();
    alert("Checkout successful! (Prototype only)");
    cart = [];
    updateCartUI();
    showPage('homePage');
};
