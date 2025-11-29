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

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// --- 3. GLOBAL STATE ---
let cart = [];
let products = [];
let currentUser = null;
let activeCategory = 'all'; 

const ADMIN_EMAIL = "kopijalanan@gmail.com"; 

// --- 4. STARTUP LISTENERS ---
document.addEventListener("DOMContentLoaded", () => {
    const productsRef = collection(db, "products");
    onSnapshot(productsRef, (snapshot) => {
        products = [];
        snapshot.forEach((doc) => {
            products.push({ ...doc.data(), id: doc.id });
        });
        renderMenu();
        renderAdminTable();
    });

    onAuthStateChanged(auth, (user) => {
        currentUser = user;
        updateNavUI(user);
    });
});

// --- 5. CATEGORY FILTER ---
function filterMenu(category) {
    activeCategory = category;
    renderMenu();
}

// --- 6. UI RENDER FUNCTIONS ---
function renderMenu() {
    const grid = document.getElementById('menuGrid');
    if(!grid) return;
    grid.innerHTML = '';

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
                    <button onclick="viewDetail('${prod.id}')" class="flex-1 bg-white text-black font-bold py-2 text-xs uppercase tracking-widest hover:bg-street-yellow">Customize</button>
                    <button onclick="addDefaultToCart('${prod.id}')" class="flex-1 border border-zinc-600 text-gray-400 font-bold py-2 text-xs uppercase tracking-widest hover:bg-zinc-700">Quick Add</button>
                </div>
            </div>`;
    });
}

// --- 7. DETAILS & CUSTOMIZATION LOGIC (UPDATED) ---

function viewDetail(id) {
    const prod = products.find(p => p.id === id);
    if (!prod) return;

    // Fill Basic Info
    document.getElementById('detailImage').src = prod.imgUrl;
    document.getElementById('detailName').innerText = prod.name;
    document.getElementById('detailPrice').innerText = `RM ${prod.price.toFixed(2)}`;
    document.getElementById('detailDesc').innerText = prod.desc;

    // GENERATE OPTIONS BASED ON CATEGORY
    const optionsContainer = document.getElementById('detailOptions');
    optionsContainer.innerHTML = ''; // Clear previous options

    if (prod.category === 'coffee') {
        // COFFEE OPTIONS: Sugar & Shots
        optionsContainer.innerHTML = `
            <div>
                <label class="block text-street-yellow text-sm font-bold mb-2">Sugar Level</label>
                <div class="grid grid-cols-3 gap-2">
                    <label class="cursor-pointer"><input type="radio" name="sugar" value="Normal" checked class="accent-street-yellow"> Normal</label>
                    <label class="cursor-pointer"><input type="radio" name="sugar" value="Less" class="accent-street-yellow"> Less</label>
                    <label class="cursor-pointer"><input type="radio" name="sugar" value="None" class="accent-street-yellow"> None</label>
                </div>
            </div>
            <div>
                <label class="block text-street-yellow text-sm font-bold mb-2">Extra Shot</label>
                <select id="optShots" class="w-full bg-black border border-zinc-700 text-white p-2">
                    <option value="0">Normal</option>
                    <option value="1">+1 Shot (RM 1.00)</option>
                    <option value="2">+2 Shots (RM 2.00)</option>
                </select>
            </div>
        `;
    } else if (prod.category === 'dessert') {
        // DESSERT OPTIONS: Toppings
        optionsContainer.innerHTML = `
            <div>
                <label class="block text-street-yellow text-sm font-bold mb-2">Toppings (RM 0.50 each)</label>
                <div class="flex flex-col gap-2">
                    <label class="cursor-pointer"><input type="checkbox" value="Chocolate Sauce" class="opt-topping accent-street-yellow"> Chocolate Sauce</label>
                    <label class="cursor-pointer"><input type="checkbox" value="Caramel Drizzle" class="opt-topping accent-street-yellow"> Caramel Drizzle</label>
                    <label class="cursor-pointer"><input type="checkbox" value="Oreo Crumbs" class="opt-topping accent-street-yellow"> Oreo Crumbs</label>
                </div>
            </div>
        `;
    } else {
        optionsContainer.innerHTML = '<p class="text-gray-500 text-sm">No customization available.</p>';
    }

    // Attach function to the "Add Customized Order" button
    document.getElementById('detailAddBtn').onclick = () => addCustomToCart(prod.id);
    
    showPage('detailPage');
}

// Add with CUSTOM options
function addCustomToCart(id) {
    const prod = products.find(p => p.id === id);
    let finalPrice = prod.price;
    let customizationText = [];

    // 1. Check Coffee Options
    if (prod.category === 'coffee') {
        // Sugar
        const sugar = document.querySelector('input[name="sugar"]:checked').value;
        if(sugar !== 'Normal') customizationText.push(`${sugar} Sugar`);

        // Shots
        const shotSelect = document.getElementById('optShots');
        const extraShots = parseInt(shotSelect.value);
        if (extraShots > 0) {
            finalPrice += (extraShots * 1.00); // RM 1 per shot
            customizationText.push(`+${extraShots} Shot(s)`);
        }
    }

    // 2. Check Dessert Options
    if (prod.category === 'dessert') {
        const toppings = document.querySelectorAll('.opt-topping:checked');
        toppings.forEach(t => {
            finalPrice += 0.50; // RM 0.50 per topping
            customizationText.push(t.value);
        });
    }

    // Add to cart with specific details
    cart.push({
        ...prod,
        price: finalPrice, // Save the new higher price
        customization: customizationText.join(", ") // Save string like "Less Sugar, +1 Shot"
    });

    alert("Added to cart!");
    updateCartUI();
    showPage('menuPage'); // Go back to menu
}

// Add DEFAULT (Quick Add)
function addDefaultToCart(id) {
    const prod = products.find(p => p.id === id);
    cart.push({
        ...prod,
        customization: "Regular"
    });
    updateCartUI();
}

// --- 8. CART & ADMIN FUNCTIONS ---

function updateCartUI() {
    document.getElementById('cartCount').innerText = cart.length;
    const list = document.getElementById('cartList');
    if(!list) return;
    list.innerHTML = '';
    let total = 0;

    if (cart.length === 0) list.innerHTML = '<p class="text-gray-500">Your basket is empty.</p>';
    else {
        cart.forEach((item, index) => {
            total += item.price;
            list.innerHTML += `
                <div class="flex justify-between items-center border-b border-zinc-700 py-3">
                    <div>
                        <div class="font-bold text-white">${item.name}</div>
                        <div class="text-xs text-gray-400 italic">${item.customization}</div>
                        <div class="text-sm text-street-yellow">RM ${item.price.toFixed(2)}</div>
                    </div>
                    <button onclick="removeFromCart(${index})" class="text-gray-500 hover:text-red-500"><i class="fas fa-times"></i></button>
                </div>`;
        });
    }
    document.getElementById('cartTotal').innerText = `RM ${total.toFixed(2)}`;
    document.getElementById('checkoutTotal').innerText = `RM ${total.toFixed(2)}`;
}

function removeFromCart(index) { cart.splice(index, 1); updateCartUI(); }

// --- ADMIN & AUTH (Standard) ---
function addProduct(event) { /* (Keep your existing addProduct code) */ } // Re-paste from previous if needed, but the logic above is the main change.
async function deleteProduct(id) { /* (Keep existing) */ }

// (I am abbreviating standard functions to save space, but ensure you include them)
// RE-PASTE your addProduct, deleteProduct, auth functions here exactly as they were.

// --- 9. HELPERS ---
function showPage(pageId) {
    document.querySelectorAll('.page-section').forEach(el => el.classList.add('hidden'));
    document.getElementById(pageId).classList.remove('hidden');
    window.scrollTo(0, 0);
}
function submitCheckout(e) {
    e.preventDefault();
    alert("Checkout successful!");
    cart = [];
    updateCartUI();
    showPage('homePage');
}

// --- EXPORTS ---
window.filterMenu = filterMenu;
window.viewDetail = viewDetail;
window.addCustomToCart = addCustomToCart;
window.addDefaultToCart = addDefaultToCart;
window.removeFromCart = removeFromCart;
window.showPage = showPage;
window.submitCheckout = submitCheckout;
// Don't forget Admin/Auth exports if you didn't paste the full blocks above
