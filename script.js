// --- 1. FIREBASE IMPORTS ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, doc, setDoc, deleteDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// --- 2. CONFIG ---
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

// --- 3. STATE ---
let cart = [];
let products = [];
let currentUser = null;
let activeCategory = 'all'; 
const ADMIN_EMAIL = "kopijalanan@gmail.com"; 

// --- 4. LISTENERS ---
document.addEventListener("DOMContentLoaded", () => {
    const productsRef = collection(db, "products");
    onSnapshot(productsRef, (snapshot) => {
        products = [];
        snapshot.forEach((doc) => products.push({ ...doc.data(), id: doc.id }));
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

// --- 6. RENDER MENU ---
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
            <div class="bg-zinc-800 border border-zinc-700 p-4 transition hover:border-street-yellow group">
                <div class="h-48 overflow-hidden mb-4 relative">
                    <img src="${prod.imgUrl}" class="w-full h-full object-cover group-hover:scale-110 transition duration-500">
                    <div class="absolute top-2 right-2 bg-street-yellow text-black font-bold px-2 py-1 text-sm">RM ${prod.price.toFixed(2)}</div>
                </div>
                <h3 class="text-2xl font-oswald uppercase mb-1 text-white">${prod.name}</h3>
                <p class="text-gray-400 text-sm mb-4 truncate">${prod.desc}</p>
                <button onclick="viewDetail('${prod.id}')" class="w-full bg-white text-black font-bold py-2 text-xs uppercase tracking-widest hover:bg-street-yellow">
                    Customize & Add
                </button>
            </div>`;
    });
}

// --- 7. NEW: DETAILS UI LOGIC ---

// Helper to create a circular button
function createOptionHTML(groupName, value, label, isSelected = false) {
    const activeClass = isSelected ? "bg-street-yellow text-black border-street-yellow font-bold" : "border-zinc-700 text-gray-400 hover:border-gray-500";
    // We add 'data-group' and 'data-value' to read them later
    return `
        <div onclick="selectOption('${groupName}', this)" 
             data-value="${value}" 
             class="option-btn ${groupName}-btn w-12 h-12 rounded-full border flex items-center justify-center cursor-pointer transition ${activeClass}">
            ${label}
        </div>
    `;
}

// Helper to create Mood (Hot/Cold) Icons
function createMoodHTML(value, iconClass, isSelected = false) {
    const activeClass = isSelected ? "bg-street-yellow text-black border-street-yellow" : "bg-zinc-800 border-zinc-700 text-gray-500";
    return `
        <div onclick="selectOption('mood', this)" 
             data-value="${value}"
             class="option-btn mood-btn w-14 h-14 rounded-full border flex items-center justify-center cursor-pointer transition text-xl ${activeClass}">
            <i class="${iconClass}"></i>
        </div>
    `;
}

// Function called when user clicks a button
window.selectOption = function(group, element) {
    // 1. Remove active style from all buttons in this group
    document.querySelectorAll(`.${group}-btn`).forEach(el => {
        el.classList.remove("bg-street-yellow", "text-black", "border-street-yellow", "font-bold");
        el.classList.add("border-zinc-700", "text-gray-400");
        // Reset Mood specific styles
        if(group === 'mood') {
            el.classList.remove("bg-street-yellow", "text-black");
            el.classList.add("bg-zinc-800", "text-gray-500");
        }
    });

    // 2. Add active style to the clicked button
    element.classList.remove("border-zinc-700", "text-gray-400", "bg-zinc-800", "text-gray-500");
    element.classList.add("bg-street-yellow", "text-black", "border-street-yellow", "font-bold");
};

function viewDetail(id) {
    const prod = products.find(p => p.id === id);
    if (!prod) return;

    // Basic Info
    document.getElementById('detailImage').src = prod.imgUrl;
    document.getElementById('detailName').innerText = prod.name;
    document.getElementById('detailPrice').innerText = `RM ${prod.price.toFixed(2)}`;
    document.getElementById('detailDesc').innerText = prod.desc;

    const container = document.getElementById('detailOptions');
    container.innerHTML = '';

    if (prod.category === 'coffee') {
        // --- MOOD ROW (Hot/Cold) ---
        container.innerHTML += `
            <div>
                <label class="block text-white font-bold mb-3">Mood</label>
                <div class="flex gap-4">
                    ${createMoodHTML('Hot', 'fas fa-fire', false)}
                    ${createMoodHTML('Cold', 'fas fa-snowflake', true)} </div>
            </div>
        `;

        // --- SIZE ROW ---
        container.innerHTML += `
            <div>
                <label class="block text-white font-bold mb-3">Size</label>
                <div class="flex gap-4">
                    ${createOptionHTML('size', 'S', 'S', false)}
                    ${createOptionHTML('size', 'M', 'M', true)} ${createOptionHTML('size', 'L', 'L', false)}
                </div>
            </div>
        `;

        // --- SUGAR ROW ---
        container.innerHTML += `
            <div>
                <label class="block text-white font-bold mb-3">Sugar</label>
                <div class="flex gap-4">
                    ${createOptionHTML('sugar', '30%', '30%')}
                    ${createOptionHTML('sugar', '50%', '50%', true)}
                    ${createOptionHTML('sugar', '70%', '70%')}
                </div>
            </div>
        `;

        // --- ICE ROW ---
        container.innerHTML += `
            <div>
                <label class="block text-white font-bold mb-3">Ice</label>
                <div class="flex gap-4">
                    ${createOptionHTML('ice', '30%', '30%')}
                    ${createOptionHTML('ice', '50%', '50%', true)}
                    ${createOptionHTML('ice', '70%', '70%')}
                </div>
            </div>
        `;
    } else {
        // Simple Dessert Options (Checkboxes style for variety)
        container.innerHTML = `
             <div>
                <label class="block text-white font-bold mb-3">Extra Toppings (+RM 0.50)</label>
                <div class="flex flex-wrap gap-3">
                    <label class="cursor-pointer border border-zinc-700 px-4 py-2 rounded-full hover:border-street-yellow has-[:checked]:bg-street-yellow has-[:checked]:text-black transition">
                        <input type="checkbox" value="Choco Sauce" class="hidden opt-topping"> Chocolate Sauce
                    </label>
                    <label class="cursor-pointer border border-zinc-700 px-4 py-2 rounded-full hover:border-street-yellow has-[:checked]:bg-street-yellow has-[:checked]:text-black transition">
                        <input type="checkbox" value="Caramel" class="hidden opt-topping"> Caramel
                    </label>
                    <label class="cursor-pointer border border-zinc-700 px-4 py-2 rounded-full hover:border-street-yellow has-[:checked]:bg-street-yellow has-[:checked]:text-black transition">
                        <input type="checkbox" value="Oreo" class="hidden opt-topping"> Oreo Crumbs
                    </label>
                </div>
            </div>
        `;
    }

    // Attach Click Handler
    document.getElementById('detailAddBtn').onclick = () => addCustomToCart(prod.id);
    showPage('detailPage');
}

// 8. ADD TO CART (SCRAPE THE SELECTED BUTTONS)
function addCustomToCart(id) {
    const prod = products.find(p => p.id === id);
    let finalPrice = prod.price;
    let details = [];

    if (prod.category === 'coffee') {
        // Find the "Active" button in each group
        const mood = document.querySelector('.mood-btn.bg-street-yellow')?.dataset.value || 'Cold';
        const size = document.querySelector('.size-btn.bg-street-yellow')?.dataset.value || 'M';
        const sugar = document.querySelector('.sugar-btn.bg-street-yellow')?.dataset.value || '50%';
        const ice = document.querySelector('.ice-btn.bg-street-yellow')?.dataset.value || '50%';

        details.push(`${mood}`);
        details.push(`Size ${size}`);
        details.push(`${sugar} Sugar`);
        details.push(`${ice} Ice`);

        // Price Logic (Example: L is +RM 2, M is +RM 1)
        if(size === 'L') finalPrice += 2;
        if(size === 'M') finalPrice += 1;
    } 
    else if (prod.category === 'dessert') {
        const toppings = document.querySelectorAll('.opt-topping:checked');
        toppings.forEach(t => {
            finalPrice += 0.50;
            details.push(t.value);
        });
    }

    cart.push({
        ...prod,
        price: finalPrice,
        customization: details.join(" • ")
    });

    alert("Added!");
    updateCartUI();
    showPage('menuPage');
}

// --- 9. HELPERS (Standard) ---
function updateCartUI() {
    document.getElementById('cartCount').innerText = cart.length;
    const list = document.getElementById('cartList');
    if(!list) return;
    list.innerHTML = '';
    let total = 0;
    if (cart.length === 0) list.innerHTML = '<p class="text-gray-500">Basket empty.</p>';
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

async function addProduct(event) {
    event.preventDefault();
    if (!currentUser || currentUser.email !== ADMIN_EMAIL) return alert("Admins Only!");
    const name = document.getElementById('prodName').value;
    const price = parseFloat(document.getElementById('prodPrice').value);
    const desc = document.getElementById('prodDesc').value;
    const category = document.getElementById('prodCat').value;
    const imgUrl = document.getElementById('prodImg').value || 'https://placehold.co/400x300/2c2c2c/FFAE00';
    const newId = name.toLowerCase().replace(/ /g, '-');
    try {
        await setDoc(doc(db, "products", newId), { id: newId, name, price, desc, category, imgUrl, createdAt: new Date().toISOString() });
        alert('Saved!'); document.getElementById('adminForm').reset();
    } catch (e) { alert(e.message); }
}

async function deleteProduct(id) {
    if (!currentUser || currentUser.email !== ADMIN_EMAIL) return alert("Admins Only!");
    if(confirm("Delete?")) await deleteDoc(doc(db, "products", id));
}

function showPage(pageId) {
    document.querySelectorAll('.page-section').forEach(el => el.classList.add('hidden'));
    document.getElementById(pageId).classList.remove('hidden');
    window.scrollTo(0, 0);
}
function submitCheckout(e) { e.preventDefault(); alert("Checkout successful!"); cart=[]; updateCartUI(); showPage('homePage'); }

// AUTH HELPERS
function updateNavUI(user) {
    const adminBtn = document.getElementById('navAdminBtn');
    const authBtn = document.getElementById('navAuthBtn');
    if (user) {
        authBtn.innerText = "Logout"; authBtn.classList.replace('bg-zinc-800', 'bg-red-600');
        if (user.email === ADMIN_EMAIL) adminBtn.classList.remove('hidden'); else adminBtn.classList.add('hidden');
    } else {
        authBtn.innerText = "Login"; authBtn.classList.replace('bg-red-600', 'bg-zinc-800'); adminBtn.classList.add('hidden');
    }
}
function handleAuthClick() { currentUser ? signOut(auth).then(()=>showPage('homePage')) : showPage('authPage'); }
function handleLogin(e) { e.preventDefault(); signInWithEmailAndPassword(auth, document.getElementById('loginEmail').value, document.getElementById('loginPass').value).then(()=>showPage('homePage')).catch(e=>alert(e.message)); }
function handleSignUp(e) { e.preventDefault(); createUserWithEmailAndPassword(auth, document.getElementById('signupEmail').value, document.getElementById('signupPass').value).then(()=>showPage('homePage')).catch(e=>alert(e.message)); }
function renderAdminTable() {
    const tbody = document.getElementById('adminTableBody'); if(!tbody) return; tbody.innerHTML = '';
    products.forEach(p => { tbody.innerHTML += `<tr class="border-b border-zinc-700"><td class="p-3">${p.name}</td><td class="p-3">RM ${p.price}</td><td class="p-3 text-right"><button onclick="deleteProduct('${p.id}')" class="text-red-500"><i class="fas fa-trash"></i></button></td></tr>`; });
}

// --- EXPORTS ---
window.filterMenu = filterMenu;
window.viewDetail = viewDetail;
window.addCustomToCart = addCustomToCart;
window.removeFromCart = removeFromCart;
window.showPage = showPage;
window.submitCheckout = submitCheckout;
window.handleAuthClick = handleAuthClick;
window.handleLogin = handleLogin;
window.handleSignUp = handleSignUp;
window.addProduct = addProduct;
window.deleteProduct = deleteProduct;
window.renderMenu = renderMenu;
window.renderAdminTable = renderAdminTable;
window.updateCartUI = updateCartUI;
