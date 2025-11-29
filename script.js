// ==========================================
// 1. FIREBASE SETUP & IMPORTS
// ==========================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, doc, setDoc, deleteDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// YOUR FIREBASE CONFIGURATION
const firebaseConfig = {
  apiKey: "AIzaSyD4gnX77Hvu49WFwYl4HtJJOPk0SwRsj8s",
  authDomain: "kopi-jalanan.firebaseapp.com",
  projectId: "kopi-jalanan",
  storageBucket: "kopi-jalanan.firebasestorage.app",
  messagingSenderId: "793785054964",
  appId: "1:793785054964:web:acc8be94e1cdd38721d0a1"
};

// INITIALIZE SERVICES
const app = initializeApp(firebaseConfig);
const db = getFirestore(app); // Database
const auth = getAuth(app);    // Authentication

// ==========================================
// 2. GLOBAL VARIABLES
// ==========================================
let cart = [];
let products = [];
let currentUser = null; // Stores the logged-in user object

// ⚠️ IMPORTANT: Set this to the exact email you want to have Admin powers
const ADMIN_EMAIL = "kopijalanan@gmail.com"; 

// ==========================================
// 3. EVENT LISTENERS (ON LOAD)
// ==========================================
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
        console.log("Database updated: ", products.length, " items.");
    });

    // B. Listen for Login/Logout Status
    onAuthStateChanged(auth, (user) => {
        currentUser = user;
        updateNavUI(user); // Update the buttons in the navbar
        
        if (user) {
            console.log("User logged in:", user.email);
        } else {
            console.log("User logged out.");
        }
    });
});

// ==========================================
// 4. AUTHENTICATION FUNCTIONS
// ==========================================

// Updates the "Login" button and "Admin" button based on who is logged in
function updateNavUI(user) {
    const adminBtn = document.getElementById('navAdminBtn');
    const authBtn = document.getElementById('navAuthBtn');

    if (user) {
        // User is LOGGED IN
        authBtn.innerText = "Logout";
        authBtn.classList.replace('bg-zinc-800', 'bg-red-600'); // Change button color to red
        authBtn.classList.replace('border-zinc-700', 'border-red-800');
        
        // Check if the user is the Admin
        if (user.email === ADMIN_EMAIL) {
            adminBtn.classList.remove('hidden'); // Show Admin Panel button
        } else {
            adminBtn.classList.add('hidden'); // Hide it for normal users
        }
    } else {
        // User is LOGGED OUT
        authBtn.innerText = "Login";
        authBtn.classList.replace('bg-red-600', 'bg-zinc-800'); // Change color back to grey
        authBtn.classList.replace('border-red-800', 'border-zinc-700');
        adminBtn.classList.add('hidden'); // Hide Admin button
    }
}

// Handles the click on the "Login/Logout" button
window.handleAuthClick = function() {
    if (currentUser) {
        // If logged in, perform LOGOUT
        signOut(auth).then(() => {
            alert("Logged out successfully.");
            showPage('homePage');
        });
    } else {
        // If logged out, go to LOGIN PAGE
        showPage('authPage');
    }
};

// Process Login Form
window.handleLogin = function(e) {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const pass = document.getElementById('loginPass').value;

    signInWithEmailAndPassword(auth, email, pass)
        .then((userCredential) => {
            alert("Welcome back, " + userCredential.user.email);
            showPage('homePage'); // Redirect to home on success
        })
        .catch((error) => {
            alert("Login Failed: " + error.message);
        });
};

// Process Sign Up Form
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

// ==========================================
// 5. DATABASE FUNCTIONS (ADMIN ONLY)
// ==========================================

// Add New Product to Firestore
window.addProduct = async function(event) {
    event.preventDefault();
    
    // Security Check: Prevent non-admins from adding items via Console
    if (!currentUser || currentUser.email !== ADMIN_EMAIL) {
        return alert("Access Denied: Admins Only!");
    }

    const name = document.getElementById('prodName').value;
    const price = parseFloat(document.getElementById('prodPrice').value);
    const desc = document.getElementById('prodDesc').value;
    const imgUrl = document.getElementById('prodImg').value || 'https://placehold.co/400x300/2c2c2c/FFAE00';
    
    // Create a URL-friendly ID (e.g., "Kopi O" -> "kopi-o")
    const newId = name.toLowerCase().replace(/ /g, '-');

    try {
        await setDoc(doc(db, "products", newId), {
            id: newId,
            name: name,
            price: price,
            desc: desc,
            imgUrl: imgUrl,
            createdAt: new Date().toISOString()
        });
        alert('Product Saved to Database!');
        document.getElementById('adminForm').reset();
    } catch (error) {
        alert("Error saving: " + error.message);
    }
};

// Delete Product from Firestore
window.deleteProduct = async function(id) {
    if (!currentUser || currentUser.email !== ADMIN_EMAIL) {
        return alert("Access Denied: Admins Only!");
    }
    
    if (!confirm("Are you sure you want to delete this item?")) return;

    try {
        await deleteDoc(doc(db, "products", id));
        // UI updates automatically because of onSnapshot
    } catch (error) {
        console.error(error);
        alert("Error deleting item.");
    }
};

// ==========================================
// 6. UI RENDER FUNCTIONS
// ==========================================

// Display the Grid of Products
window.renderMenu = function() {
    const grid = document.getElementById('menuGrid');
    if(!grid) return;
    
    grid.innerHTML = '';
    
    if (products.length === 0) { 
        grid.innerHTML = '<p class="col-span-full text-center text-gray-500">No items available. Admin needs to add coffee!</p>'; 
        return; 
    }
    
    products.forEach(prod => {
        grid.innerHTML += `
            <div class="bg-zinc-800 border border-zinc-700 p-4 hover:border-street-yellow transition duration-300 group">
                <div class="h-48 overflow-hidden mb-4 relative">
                    <img src="${prod.imgUrl}" class="w-full h-full object-cover group-hover:scale-105 transition duration-500">
                    <div class="absolute top-2 right-2 bg-street-yellow text-black font-bold px-2 py-1 text-sm shadow-md">
                        RM ${prod.price.toFixed(2)}
                    </div>
                </div>
                <h3 class="text-2xl font-oswald uppercase mb-1 text-white">${prod.name}</h3>
                <p class="text-gray-400 text-sm mb-4 h-10 overflow-hidden">${prod.desc}</p>
                <div class="flex gap-2">
                    <button onclick="viewDetail('${prod.id}')" class="flex-1 border border-zinc-600 text-zinc-300 py-2 hover:bg-zinc-700 text-sm uppercase font-bold tracking-wider">Details</button>
                    <button onclick="addToCart('${prod.id}')" class="flex-1 bg-street-yellow text-black font-bold py-2 hover:bg-white transition text-sm uppercase tracking-wider">Add +</button>
                </div>
            </div>`;
    });
};

// Display the Admin Table
window.renderAdminTable = function() {
    const tbody = document.getElementById('adminTableBody');
    if(!tbody) return;
    
    tbody.innerHTML = '';
    
    products.forEach(prod => {
        tbody.innerHTML += `
            <tr class="border-b border-zinc-700 hover:bg-zinc-800">
                <td class="p-3 text-white">${prod.name}</td>
                <td class="p-3 text-street-yellow">RM ${prod.price.toFixed(2)}</td>
                <td class="p-3 text-right">
                    <button onclick="deleteProduct('${prod.id}')" class="text-red-500 hover:text-red-400 transition">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>`;
    });
};

// Show Single Product Details
window.viewDetail = function(id) {
    const prod = products.find(p => p.id === id);
    if (!prod) return;
    
    document.getElementById('detailImage').src = prod.imgUrl;
    document.getElementById('detailName').innerText = prod.name;
    document.getElementById('detailPrice').innerText = `RM ${prod.price.toFixed(2)}`;
    document.getElementById('detailDesc').innerText = prod.desc;
    
    // Update the "Add to Order" button to add THIS specific product
    document.getElementById('detailAddBtn').onclick = () => {
        addToCart(id);
        alert(prod.name + " added to cart!");
    };
    
    showPage('detailPage');
};

// ==========================================
// 7. CART LOGIC (LOCAL STATE ONLY)
// ==========================================

window.addToCart = function(id) {
    const prod = products.find(p => p.id === id);
    if (!prod) return;
    
    cart.push(prod);
    updateCartUI();
    
    // Optional: Visual feedback
    const btn = event.target;
    const originalText = btn.innerText;
    btn.innerText = "Added!";
    setTimeout(() => btn.innerText = originalText, 1000);
};

window.removeFromCart = function(index) {
    cart.splice(index, 1);
    updateCartUI();
};

window.updateCartUI = function() {
    // Update Badge
    document.getElementById('cartCount').innerText = cart.length;
    
    const list = document.getElementById('cartList');
    if(!list) return;
    
    list.innerHTML = '';
    let total = 0;
    
    if (cart.length === 0) { 
        list.innerHTML = '<p class="text-gray-500 italic">Your basket is empty. Go get some caffeine!</p>'; 
    } else {
        cart.forEach((item, index) => {
            total += item.price;
            list.innerHTML += `
                <div class="flex justify-between items-center border-b border-zinc-700 py-3 animate-fade-in">
                    <div>
                        <div class="font-bold text-white">${item.name}</div>
                        <div class="text-sm text-street-yellow">RM ${item.price.toFixed(2)}</div>
                    </div>
                    <button onclick="removeFromCart(${index})" class="text-zinc-500 hover:text-red-500 transition">
                        <i class="fas fa-times"></i>
                    </button>
                </div>`;
        });
    }
    
    document.getElementById('cartTotal').innerText = `RM ${total.toFixed(2)}`;
    document.getElementById('checkoutTotal').innerText = `RM ${total.toFixed(2)}`;
};

// ==========================================
// 8. NAVIGATION & CHECKOUT
// ==========================================

// Switch between pages (Tabs)
window.showPage = function(pageId) {
    // Hide all sections
    document.querySelectorAll('.page-section').forEach(el => el.classList.add('hidden'));
    
    // Show the requested section
    document.getElementById(pageId).classList.remove('hidden');
    
    // Scroll to top
    window.scrollTo(0, 0);
};

// Checkout Form Submission (Mock)
window.submitCheckout = function(e) {
    e.preventDefault();
    
    if (cart.length === 0) return alert("Your cart is empty!");
    
    alert("Checkout successful! (Prototype Mode)\nWe will contact you shortly.");
    
    cart = [];
    updateCartUI();
    showPage('homePage');
};

// ==========================================
// 9. EXPORT HELPERS TO WINDOW
// ==========================================
// This is necessary because we are using <script type="module">
// Modules do not create global variables by default.
// We must manually attach functions to 'window' so HTML onclick="" can see them.

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

