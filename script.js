// --- 1. FIREBASE IMPORTS ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, doc, setDoc, deleteDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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

// --- 3. GLOBAL STATE ---
let cart = [];
let products = []; // Starts empty, will load from database

// --- 4. LISTEN TO DATABASE (REAL-TIME) ---
document.addEventListener("DOMContentLoaded", () => {
    // This function runs automatically whenever the database changes
    const productsRef = collection(db, "products");
    
    onSnapshot(productsRef, (snapshot) => {
        products = []; // Clear current list
        snapshot.forEach((doc) => {
            products.push(doc.data()); // Add items from database
        });
        
        // Update the screen
        renderMenu();
        renderAdminTable();
        console.log("Menu updated from Database!");
    });
});

// --- 5. FUNCTIONS ---

// Add Product (Saves to Database)
window.addProduct = async function(event) {
    event.preventDefault();

    const name = document.getElementById('prodName').value;
    const price = parseFloat(document.getElementById('prodPrice').value);
    const desc = document.getElementById('prodDesc').value;
    const imgUrl = document.getElementById('prodImg').value || 'https://placehold.co/400x300/2c2c2c/FFAE00';

    // Create a clean ID (e.g., "Kopi O" -> "kopi-o")
    const newId = name.toLowerCase().replace(/ /g, '-');

    const newProduct = {
        id: newId,
        name,
        price,
        desc,
        imgUrl,
        createdAt: new Date().toISOString()
    };

    try {
        // Send to Firebase
        await setDoc(doc(db, "products", newId), newProduct);
        
        alert('Product Saved to Database!');
        document.getElementById('adminForm').reset();
    } catch (error) {
        console.error("Error saving:", error);
        alert("Failed to save. Check console (F12) for details.");
    }
};

// Delete Product (Removes from Database)
window.deleteProduct = async function(id) {
    if (!confirm("Delete this item permanently?")) return;

    try {
        await deleteDoc(doc(db, "products", id));
        // The screen will update automatically via onSnapshot
    } catch (error) {
        console.error("Error deleting:", error);
        alert("Failed to delete.");
    }
};

// --- EXISTING UI LOGIC (UNCHANGED) ---

function renderMenu() {
    const grid = document.getElementById('menuGrid');
    grid.innerHTML = '';

    if (products.length === 0) {
        grid.innerHTML = '<p class="text-center text-gray-400 col-span-full">Loading menu...</p>';
        return;
    }

    products.forEach(prod => {
        grid.innerHTML += `
            <div class="bg-zinc-800 border border-zinc-700 p-4">
                <div class="h-48 overflow-hidden mb-4 relative">
                    <img src="${prod.imgUrl}" class="w-full h-full object-cover">
                    <div class="absolute top-2 right-2 bg-street-yellow text-black font-bold px-2 py-1 text-sm">
                        RM ${prod.price.toFixed(2)}
                    </div>
                </div>
                <h3 class="text-2xl font-oswald uppercase mb-1 text-white">${prod.name}</h3>
                <p class="text-gray-400 text-sm mb-4">${prod.desc}</p>
                <div class="flex gap-2">
                    <button onclick="viewDetail('${prod.id}')" class="flex-1 border border-gray-500 text-gray-300 py-2 hover:bg-gray-700">Details</button>
                    <button onclick="addToCart('${prod.id}')" class="flex-1 bg-street-yellow text-black font-bold py-2">Add +</button>
                </div>
            </div>
        `;
    });
}

function renderAdminTable() {
    const tbody = document.getElementById('adminTableBody');
    tbody.innerHTML = '';

    products.forEach(prod => {
        tbody.innerHTML += `
            <tr class="border-b border-zinc-700">
                <td class="p-3">${prod.name}</td>
                <td class="p-3">RM ${prod.price.toFixed(2)}</td>
                <td class="p-3 text-right">
                    <button onclick="deleteProduct('${prod.id}')" class="text-red-500">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    });
}

// View Detail Page
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

// Cart Logic (Local only, does not save to DB)
window.addToCart = function(id) {
    const prod = products.find(p => p.id === id);
    cart.push(prod);
    updateCartUI();
};

window.removeFromCart = function(index) {
    cart.splice(index, 1);
    updateCartUI();
};

function updateCartUI() {
    document.getElementById('cartCount').innerText = cart.length;

    const list = document.getElementById('cartList');
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
                    <button onclick="removeFromCart(${index})" class="text-gray-500 hover:text-red-500">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            `;
        });
    }

    document.getElementById('cartTotal').innerText = `RM ${total.toFixed(2)}`;
    document.getElementById('checkoutTotal').innerText = `RM ${total.toFixed(2)}`;
}

// Navigation
window.showPage = function(pageId) {
    document.querySelectorAll('.page-section').forEach(el => el.classList.add('hidden'));
    document.getElementById(pageId).classList.remove('hidden');
    window.scrollTo(0, 0);
};

// Checkout
window.submitCheckout = function(e) {
    e.preventDefault();
    alert("Checkout successful! (Prototype only)");
    cart = [];
    updateCartUI();
    showPage('homePage');
};

// EXPORT FUNCTIONS (Required for type="module")
window.renderMenu = renderMenu;
window.renderAdminTable = renderAdminTable;
window.updateCartUI = updateCartUI;
