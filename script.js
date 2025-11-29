// --- 1. FIREBASE IMPORTS ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, doc, setDoc, addDoc, deleteDoc, updateDoc, increment, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// --- 2. CONFIGURATION ---
const firebaseConfig = {
  apiKey: "AIzaSyD4gnX77Hvu49WFwYl4HtJJOPk0SwRsj8s",
  authDomain: "kopi-jalanan.firebaseapp.com",
  projectId: "kopi-jalanan",
  storageBucket: "kopi-jalanan.firebasestorage.app",
  messagingSenderId: "793785054964",
  appId: "1:793785054964:web:acc8be94e1cdd38721d0a1"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// --- 3. GLOBAL STATE ---
let cart = [];
let products = [];
let currentUser = null;
let activeCategory = 'all'; 

// ⚠️ ADMIN EMAIL (Must match the one you log in with)
const ADMIN_EMAIL = "kopijalanan@gmail.com"; 

// --- 4. STARTUP LISTENERS ---
document.addEventListener("DOMContentLoaded", () => {
    
    // A. Listen for Product Updates (Real-time)
    const productsRef = collection(db, "products");
    onSnapshot(productsRef, (snapshot) => {
        products = [];
        snapshot.forEach((doc) => {
            // Combine data with ID safely
            products.push({ ...doc.data(), id: doc.id });
        });
        renderMenu();
        renderAdminTable();
    });

    // B. Listen for Auth Changes (Login/Logout)
    onAuthStateChanged(auth, (user) => {
        currentUser = user;
        updateNavUI(user);
    });
});

// --- 5. AUTHENTICATION FUNCTIONS ---

function updateNavUI(user) {
    const adminBtn = document.getElementById('navAdminBtn');
    const authBtn = document.getElementById('navAuthBtn');

    if (user) {
        authBtn.innerText = "Logout";
        authBtn.classList.replace('bg-zinc-800', 'bg-red-600');
        
        // Only show Admin Panel button if email matches
        if (user.email === ADMIN_EMAIL) {
            adminBtn.classList.remove('hidden');
        } else {
            adminBtn.classList.add('hidden');
        }
    } else {
        authBtn.innerText = "Login";
        authBtn.classList.replace('bg-red-600', 'bg-zinc-800');
        adminBtn.classList.add('hidden');
    }
}

function handleAuthClick() {
    if (currentUser) {
        signOut(auth).then(() => {
            alert("Logged out successfully!");
            showPage('homePage');
        });
    } else {
        showPage('authPage');
    }
}

function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const pass = document.getElementById('loginPass').value;

    signInWithEmailAndPassword(auth, email, pass)
        .then(() => showPage('homePage'))
        .catch(err => alert("Login Failed: " + err.message));
}

function handleSignUp(e) {
    e.preventDefault();
    const email = document.getElementById('signupEmail').value;
    const pass = document.getElementById('signupPass').value;

    createUserWithEmailAndPassword(auth, email, pass)
        .then(() => {
            alert("Account created!");
            showPage('homePage');
        })
        .catch(err => alert("Sign Up Failed: " + err.message));
}

// --- 6. MENU & FILTER FUNCTIONS ---

function filterMenu(category) {
    activeCategory = category;
    renderMenu();
}

function renderMenu() {
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
        // Stock Logic
        const isSoldOut = prod.stock < 1;
        const btnText = isSoldOut ? "SOLD OUT" : "Customize";
        const btnClass = isSoldOut 
            ? "bg-zinc-700 text-gray-500 cursor-not-allowed" 
            : "bg-white text-black hover:bg-street-yellow";
        const clickAction = isSoldOut ? "" : `onclick="viewDetail('${prod.id}')"`;

        grid.innerHTML += `
            <div class="bg-zinc-800 border border-zinc-700 p-4 transition hover:border-street-yellow group relative">
                <div class="absolute top-2 left-2 bg-black/80 text-white text-xs px-2 py-1 rounded border border-zinc-700">
                    ${prod.stock || 0} left
                </div>

                <div class="h-48 overflow-hidden mb-4 relative">
                    <img src="${prod.imgUrl}" class="w-full h-full object-cover group-hover:scale-110 transition duration-500 ${isSoldOut ? 'grayscale opacity-50' : ''}">
                    <div class="absolute top-2 right-2 bg-street-yellow text-black font-bold px-2 py-1 text-sm">RM ${prod.price.toFixed(2)}</div>
                </div>
                <h3 class="text-2xl font-oswald uppercase mb-1 text-white">${prod.name}</h3>
                <p class="text-gray-400 text-sm mb-4 truncate">${prod.desc}</p>
                
                <button ${clickAction} class="w-full font-bold py-2 text-xs uppercase tracking-widest transition ${btnClass}">
                    ${btnText}
                </button>
            </div>`;
    });
}

// --- 7. DETAILS & CUSTOMIZATION (App-Style) ---

function viewDetail(id) {
    const prod = products.find(p => p.id === id);
    if (!prod || prod.stock < 1) return alert("Sorry, this item is sold out!");

    // Populate Basic Info
    document.getElementById('detailImage').src = prod.imgUrl;
    document.getElementById('detailName').innerText = prod.name;
    document.getElementById('detailPrice').innerText = `RM ${prod.price.toFixed(2)}`;
    document.getElementById('detailDesc').innerText = prod.desc;
    
    // Generate Dynamic Options
    const container = document.getElementById('detailOptions');
    container.innerHTML = '';

    if (prod.category === 'coffee') {
        // COFFEE: Show Mood, Size, Sugar, Ice
        container.innerHTML = `
            <div>
                <label class="block text-white font-bold mb-3">Mood</label>
                <div class="flex gap-4">
                    ${createMoodHTML('Hot', 'fas fa-fire')}
                    ${createMoodHTML('Cold', 'fas fa-snowflake', true)}
                </div>
            </div>
            <div>
                <label class="block text-white font-bold mb-3">Size</label>
                <div class="flex gap-4">
                    ${createOptionHTML('size','S','S')}
                    ${createOptionHTML('size','M','M',true)}
                    ${createOptionHTML('size','L','L')}
                </div>
            </div>
            <div>
                <label class="block text-white font-bold mb-3">Sugar Level</label>
                <div class="flex gap-4">
                    ${createOptionHTML('sugar','30%','30%')}
                    ${createOptionHTML('sugar','50%','50%',true)}
                    ${createOptionHTML('sugar','70%','70%')}
                </div>
            </div>
            <div>
                <label class="block text-white font-bold mb-3">Ice Level</label>
                <div class="flex gap-4">
                    ${createOptionHTML('ice','None','0%')}
                    ${createOptionHTML('ice','Normal','50%',true)}
                    ${createOptionHTML('ice','Extra','100%')}
                </div>
            </div>
        `;
    } else {
        // DESSERT: Show Toppings Checkboxes
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

    // Attach "Add" Button Logic
    document.getElementById('detailAddBtn').onclick = () => addCustomToCart(prod.id);
    showPage('detailPage');
}

// Helpers for creating circular buttons
function createOptionHTML(group, value, label, active=false) {
    const activeClass = active ? "bg-street-yellow text-black border-street-yellow font-bold" : "border-zinc-700 text-gray-400";
    return `<div onclick="selectOption('${group}', this)" data-value="${value}" class="option-btn ${group}-btn w-12 h-12 rounded-full border flex items-center justify-center cursor-pointer transition ${activeClass}">${label}</div>`;
}

function createMoodHTML(value, icon, active=false) {
    const activeClass = active ? "bg-street-yellow text-black border-street-yellow" : "bg-zinc-800 border-zinc-700 text-gray-500";
    return `<div onclick="selectOption('mood', this)" data-value="${value}" class="option-btn mood-btn w-14 h-14 rounded-full border flex items-center justify-center cursor-pointer transition text-xl ${activeClass}"><i class="${icon}"></i></div>`;
}

// Handle Button Selection (Switching colors)
window.selectOption = function(group, el) {
    // Reset all in group
    document.querySelectorAll(`.${group}-btn`).forEach(e => {
        e.classList.remove("bg-street-yellow","text-black","border-street-yellow","font-bold");
        e.classList.add("border-zinc-700","text-gray-400");
        if(group === 'mood') {
            e.classList.remove("bg-street-yellow", "text-black");
            e.classList.add("bg-zinc-800", "text-gray-500");
        }
    });
    // Activate clicked one
    el.classList.remove("border-zinc-700","text-gray-400","bg-zinc-800","text-gray-500");
    el.classList.add("bg-street-yellow","text-black","border-street-yellow","font-bold");
};

// --- 8. CART & CHECKOUT FUNCTIONS ---

function addCustomToCart(id) {
    const prod = products.find(p => p.id === id);
    let finalPrice = prod.price;
    let details = [];

    if (prod.category === 'coffee') {
        // Scrape selected coffee options
        const mood = document.querySelector('.mood-btn.bg-street-yellow')?.dataset.value || 'Cold';
        const size = document.querySelector('.size-btn.bg-street-yellow')?.dataset.value || 'M';
        const sugar = document.querySelector('.sugar-btn.bg-street-yellow')?.dataset.value || '50%';
        const ice = document.querySelector('.ice-btn.bg-street-yellow')?.dataset.value || 'Normal';

        // Price Logic
        if(size === 'L') finalPrice += 2;
        if(size === 'M') finalPrice += 1;

        details.push(`${mood} • Size ${size}`);
        details.push(`${sugar} Sugar • ${ice} Ice`);
    } else {
        // Scrape dessert toppings
        document.querySelectorAll('.opt-topping:checked').forEach(t => { 
            finalPrice += 0.5; 
            details.push(t.value); 
        });
    }

    cart.push({
        ...prod,
        price: finalPrice,
        customization: details.join(" | ")
    });

    alert("Added to cart!");
    updateCartUI();
    showPage('menuPage');
}

function updateCartUI() {
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
                        <div class="text-xs text-gray-400 italic">${item.customization}</div>
                        <div class="text-sm text-street-yellow">RM ${item.price.toFixed(2)}</div>
                    </div>
                    <button onclick="removeFromCart(${index})" class="text-gray-500 hover:text-red-500">
                        <i class="fas fa-times"></i>
                    </button>
                </div>`;
        });
    }
    
    document.getElementById('cartTotal').innerText = `RM ${total.toFixed(2)}`;
    document.getElementById('checkoutTotal').innerText = `RM ${total.toFixed(2)}`;
}

function removeFromCart(index) {
    cart.splice(index, 1);
    updateCartUI();
}

async function submitCheckout(e) {
    e.preventDefault();

    // 1. Check Login
    if (!currentUser) {
        alert("Please Login or Sign Up to place an order!");
        showPage('authPage');
        return;
    }

    // 2. Check Cart
    if(cart.length === 0) return alert("Cart is empty!");

    // 3. Get Address Info
    const name = document.getElementById('custName').value;
    const phone = document.getElementById('custPhone').value;
    const address = document.getElementById('custAddress').value;

    if (!name || !phone || !address) {
        return alert("Please fill in Name, Phone, and Address.");
    }

    if(!confirm(`Confirm Order for RM ${document.getElementById('checkoutTotal').innerText.replace('RM ', '')}?`)) return;

    try {
        // 4. Save Order to Database
        await addDoc(collection(db, "orders"), {
            userId: currentUser.uid,
            email: currentUser.email,
            customerName: name,
            customerPhone: phone,
            deliveryAddress: address,
            items: cart,
            total: document.getElementById('checkoutTotal').innerText,
            createdAt: new Date().toISOString(),
            status: "Pending"
        });

        // 5. Deduct Stock for each item
        for (const item of cart) {
            const productRef = doc(db, "products", item.id);
            await updateDoc(productRef, { stock: increment(-1) });
        }

        alert("Order Placed! Delivery to: " + address);
        cart = [];
        updateCartUI();
        document.getElementById('checkoutForm').reset();
        showPage('homePage');

    } catch (error) {
        console.error(error);
        alert("Error placing order: " + error.message);
    }
}

// --- 9. ADMIN FUNCTIONS ---

async function addProduct(event) {
    event.preventDefault();
    if (!currentUser || currentUser.email !== ADMIN_EMAIL) return alert("Admins Only!");

    const name = document.getElementById('prodName').value;
    const price = parseFloat(document.getElementById('prodPrice').value);
    const stock = parseInt(document.getElementById('prodStock').value);
    const desc = document.getElementById('prodDesc').value;
    const category = document.getElementById('prodCat').value;
    const imgUrl = document.getElementById('prodImg').value || 'https://placehold.co/400x300/2c2c2c/FFAE00';
    const newId = name.toLowerCase().replace(/ /g, '-');

    try {
        await setDoc(doc(db, "products", newId), {
            id: newId, name, price, stock, desc, category, imgUrl,
            createdAt: new Date().toISOString()
        });
        alert('Product Saved!');
        document.getElementById('adminForm').reset();
    } catch (e) { alert(e.message); }
}

async function deleteProduct(id) {
    if (!currentUser || currentUser.email !== ADMIN_EMAIL) return alert("Admins Only!");
    if(confirm("Delete this item?")) await deleteDoc(doc(db, "products", id));
}

function renderAdminTable() {
    const tbody = document.getElementById('adminTableBody');
    if(!tbody) return;
    tbody.innerHTML = '';

    products.forEach(p => {
        const stockColor = (p.stock < 10) ? 'text-red-500' : 'text-street-yellow';
        tbody.innerHTML += `
            <tr class="border-b border-zinc-700">
                <td class="p-3">
                    ${p.name}
                    <div class="text-xs text-gray-500">${p.category || 'No Cat'}</div>
                </td>
                <td class="p-3">
                    Qty: <span class="${stockColor} font-bold">${p.stock || 0}</span>
                </td>
                <td class="p-3 text-right">
                    <button onclick="deleteProduct('${p.id}')" class="text-red-500 hover:text-red-400">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>`;
    });
}

// --- 10. NAVIGATION ---
function showPage(pageId) {
    document.querySelectorAll('.page-section').forEach(el => el.classList.add('hidden'));
    document.getElementById(pageId).classList.remove('hidden');
    window.scrollTo(0, 0);
}

// --- EXPORTS (Window Binding) ---
window.handleAuthClick = handleAuthClick;
window.handleLogin = handleLogin;
window.handleSignUp = handleSignUp;
window.addProduct = addProduct;
window.deleteProduct = deleteProduct;
window.renderMenu = renderMenu;
window.renderAdminTable = renderAdminTable;
window.updateCartUI = updateCartUI;
window.viewDetail = viewDetail;
window.addToCart = addCustomToCart; // Ensure logic uses custom add
window.addCustomToCart = addCustomToCart;
window.removeFromCart = removeFromCart;
window.showPage = showPage;
window.submitCheckout = submitCheckout;
window.filterMenu = filterMenu;
window.selectOption = selectOption; // Don't forget this for UI buttons!
