// ======================================================
// 1. BASIC PAGE & NAV LOGIC
// ======================================================
const pages = document.querySelectorAll('.page-section');
const navBtns = document.querySelectorAll('.nav-btn');

function showPage(pageId) {
    pages.forEach(p => p.classList.add('hidden'));
    const target = document.getElementById(pageId);
    if(target) target.classList.remove('hidden');

    navBtns.forEach(btn => btn.classList.remove('active-nav'));
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
// 4. GLOBAL STATE
// ======================================================
let cart = [];
let products = [];
let currentUser = null;
let isAdmin = false;
let activeCategory = "all";
let isProcessingOrder = false;
let editingProductId = null;

// Fallback Menu
const menuItems = [
    { id: "kopi-o", name: "Kopi O", price: 3.00, category: "coffee" },
    { id: "latte", name: "Latte", price: 5.00, category: "coffee" },
    { id: "mocha", name: "Mocha", price: 6.00, category: "coffee" }
];

// ======================================================
// 5. STARTUP LISTENERS
// ======================================================
document.addEventListener("DOMContentLoaded", () => {
    // Firebase products
    onSnapshot(collection(db, "products"), (snap) => {
        products = snap.docs.map(d => ({ ...d.data(), id: d.id }));
        renderMenu();
        renderAdminTable();
    });

    // Auth listener
    onAuthStateChanged(auth, async (user) => {
        currentUser = user;
        isAdmin = false;

        if (user) {
            try {
                const adminRef = doc(db, "admins", user.email);
                const snap = await getDoc(adminRef);
                if (snap.exists()) isAdmin = true;
            } catch (e) { console.log(e); }
        }
        updateNavUI(user);
    });

    renderMenu();
    updateCart();
});

// ======================================================
// 6. MENU & FILTERING
// ======================================================
function filterMenu(category) {
    activeCategory = category;
    
    const btnAll = document.getElementById('btn-all');
    const btnCoffee = document.getElementById('btn-coffee');
    const btnDessert = document.getElementById('btn-dessert');
    const slider = document.getElementById('tabSlider');

    [btnAll, btnCoffee, btnDessert].forEach(b => {
        if(b) {
            b.classList.remove('text-white');
            b.classList.add('text-gray-500');
        }
    });

    if(category === 'all' && btnAll) {
        btnAll.classList.replace('text-gray-500', 'text-white');
        if(slider) slider.style.transform = 'translateX(0%)';
    } 
    else if(category === 'coffee' && btnCoffee) {
        btnCoffee.classList.replace('text-gray-500', 'text-white');
        if(slider) slider.style.transform = 'translateX(100%)';
    } 
    else if(category === 'dessert' && btnDessert) {
        btnDessert.classList.replace('text-gray-500', 'text-white');
        if(slider) slider.style.transform = 'translateX(200%)';
    }

    renderMenu();
}

function renderMenu() {
    const grid = document.getElementById('menuGrid');
    if (!grid) return;
    grid.innerHTML = "";

    const dataSource = products.length ? products : menuItems;

    const filteredData = activeCategory === 'all' 
        ? dataSource 
        : dataSource.filter(p => p.category === activeCategory);

    if (filteredData.length === 0) {
        grid.innerHTML = '<p class="text-gray-500 text-center w-full mt-10">No items found.</p>';
        return;
    }

    filteredData.forEach(item => {
        const imgUrl = item.imgUrl || "https://placehold.co/400x300/2c2c2c/FFAE00?text=Kopi+Jalanan";
        
        const card = document.createElement('div');
        card.className = "bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-lg flex flex-col";
        card.innerHTML = `
            <div class="h-48 bg-black relative">
                <img src="${imgUrl}" class="w-full h-full object-cover">
            </div>
            <div class="p-4 flex flex-col flex-grow">
                <h3 class="font-oswald text-xl mb-1 text-white uppercase">${item.name}</h3>
                <p class="text-street-yellow font-bold mb-4">RM ${item.price.toFixed(2)}</p>
                <div class="mt-auto">
                    <button onclick="viewDetail('${item.id}')" class="w-full bg-street-yellow text-black font-bold py-3 uppercase hover:bg-white transition tracking-widest rounded-sm">
                        Customize
                    </button>
                </div>
            </div>
        `;
        grid.appendChild(card);
    });
}

// ======================================================
// 7. PRODUCT DETAIL & CUSTOMIZATION (NEW LOGIC)
// ======================================================

// Show the Detail Page and Populate Data
function viewDetail(id) {
    const prod = products.find(p => p.id === id) || menuItems.find(p => p.id === id);
    if (!prod) return;

    // Populate Info
    document.getElementById('detailImage').src = prod.imgUrl || "https://placehold.co/400x300/2c2c2c/FFAE00?text=Kopi+Jalanan";
    document.getElementById('detailName').innerText = prod.name;
    document.getElementById('detailPrice').innerText = `RM ${prod.price.toFixed(2)}`;
    document.getElementById('detailDesc').innerText = prod.desc || "A delicious street brew.";
    
    // Generate Options
    const container = document.getElementById('detailOptions');
    container.innerHTML = '';

    if (prod.category === 'coffee' || !prod.category) { // Default to coffee options
        container.innerHTML = `
            <div class="mb-6">
                <label class="block text-gray-400 text-xs uppercase tracking-widest mb-3">Temperature</label>
                <div class="flex gap-3">
                    ${createOptionHTML('mood', 'Hot', 'Hot')}
                    ${createOptionHTML('mood', 'Cold', 'Cold', true)}
                </div>
            </div>
            <div class="mb-6">
                <label class="block text-gray-400 text-xs uppercase tracking-widest mb-3">Size</label>
                <div class="flex gap-3">
                    ${createOptionHTML('size', 'S', 'Small')}
                    ${createOptionHTML('size', 'M', 'Medium', true)}
                    ${createOptionHTML('size', 'L', 'Large')}
                </div>
            </div>
            <div class="mb-6">
                <label class="block text-gray-400 text-xs uppercase tracking-widest mb-3">Sugar Level</label>
                <div class="flex gap-3">
                    ${createOptionHTML('sugar', '0%', '0%')}
                    ${createOptionHTML('sugar', '50%', '50%', true)}
                    ${createOptionHTML('sugar', '100%', '100%')}
                </div>
            </div>
        `;
    } else {
        // Dessert Options
        container.innerHTML = `
             <div class="mb-6">
                <label class="block text-gray-400 text-xs uppercase tracking-widest mb-3">Add-ons (+RM 0.50)</label>
                <div class="flex flex-wrap gap-3">
                    <label class="cursor-pointer border border-zinc-700 px-4 py-3 rounded hover:border-street-yellow has-[:checked]:bg-street-yellow has-[:checked]:text-black transition flex-1 text-center text-sm font-bold">
                        <input type="checkbox" value="Choco Sauce" class="hidden opt-topping"> Choco Sauce
                    </label>
                    <label class="cursor-pointer border border-zinc-700 px-4 py-3 rounded hover:border-street-yellow has-[:checked]:bg-street-yellow has-[:checked]:text-black transition flex-1 text-center text-sm font-bold">
                        <input type="checkbox" value="Caramel" class="hidden opt-topping"> Caramel
                    </label>
                </div>
            </div>
        `;
    }

    // Update the Add Button to call addCustomToCart
    const addBtn = document.getElementById('detailAddBtn');
    addBtn.onclick = () => addCustomToCart(prod.id);

    showPage('detailPage');
}

// Add the configured item to cart
function addCustomToCart(id) {
    const prod = products.find(p => p.id === id) || menuItems.find(p => p.id === id);
    let finalPrice = prod.price;
    let details = [];

    if (prod.category === 'coffee' || !prod.category) {
        // Read selected options
        const mood = document.querySelector('.mood-btn.bg-street-yellow')?.dataset.value || 'Cold';
        const size = document.querySelector('.size-btn.bg-street-yellow')?.dataset.value || 'M';
        const sugar = document.querySelector('.sugar-btn.bg-street-yellow')?.dataset.value || '50%';

        // Pricing Logic
        if(size === 'L') finalPrice += 2;
        if(size === 'M') finalPrice += 1;

        details.push(`${mood} | Size ${size} | Sugar ${sugar}`);
    } else {
        // Dessert Logic
        document.querySelectorAll('.opt-topping:checked').forEach(t => { 
            finalPrice += 0.5; 
            details.push(t.value); 
        });
    }

    const cartItem = {
        ...prod,
        finalPrice: finalPrice,
        customization: details.join(", "),
        cartId: Date.now() // Unique ID for cart item
    };

    cart.push(cartItem);
    updateCart();
    alert("Added to cart!");
    showPage('menuPage');
}

// Helper to create round selection buttons
function createOptionHTML(group, value, label, active=false) {
    const activeClass = active ? "bg-street-yellow text-black border-street-yellow" : "bg-transparent text-gray-400 border-zinc-700 hover:border-street-yellow";
    return `
        <div onclick="selectOption('${group}', this)" 
             data-value="${value}" 
             class="option-btn ${group}-btn flex-1 py-2 border rounded text-center text-sm font-bold cursor-pointer transition ${activeClass}">
             ${label}
        </div>`;
}

// Global function to handle button selection click
window.selectOption = function(group, el) {
    // 1. Reset all buttons in this group
    document.querySelectorAll(`.${group}-btn`).forEach(btn => {
        btn.classList.remove("bg-street-yellow", "text-black", "border-street-yellow");
        btn.classList.add("bg-transparent", "text-gray-400", "border-zinc-700");
    });
    
    // 2. Activate clicked button
    el.classList.remove("bg-transparent", "text-gray-400", "border-zinc-700");
    el.classList.add("bg-street-yellow", "text-black", "border-street-yellow");
};

// ======================================================
// 8. CART LOGIC
// ======================================================
function updateCart() {
    document.getElementById('cartCount').textContent = cart.length;
    const list = document.getElementById('cartList');
    if (!list) return;

    list.innerHTML = "";
    let total = 0;

    cart.forEach((item, index) => {
        total += item.finalPrice;
        list.innerHTML += `
            <div class="flex justify-between items-start border-b border-zinc-800 pb-3 mb-3">
                <div>
                    <div class="text-white font-bold">${item.name}</div>
                    <div class="text-xs text-gray-500 mt-1">${item.customization}</div>
                </div>
                <div class="text-right">
                    <div class="text-street-yellow font-bold">RM ${item.finalPrice.toFixed(2)}</div>
                    <button onclick="removeFromCart(${index})" class="text-xs text-red-500 hover:text-red-400 mt-1 underline">Remove</button>
                </div>
            </div>
        `;
    });

    const totalEl = document.getElementById('checkoutTotal');
    if(totalEl) totalEl.textContent = `RM ${total.toFixed(2)}`;
}

function removeFromCart(index) {
    cart.splice(index, 1);
    updateCart();
}

// ======================================================
// 9. CHECKOUT
// ======================================================
async function submitCheckout(event) {
    if(event) event.preventDefault();
    
    if (cart.length === 0) return alert("Cart is empty!");
    if (!currentUser) {
        alert("Please login first");
        showPage('authPage');
        return;
    }

    if(isProcessingOrder) return;
    isProcessingOrder = true;

    try {
        const totalText = document.getElementById('checkoutTotal').innerText;
        const custName = document.getElementById('custName').value || currentUser.email;
        const custPhone = document.getElementById('custPhone').value || "N/A";
        const custAddress = document.getElementById('custAddress').value || "Pickup";

        await addDoc(collection(db, "orders"), {
            userId: currentUser.uid,
            email: currentUser.email,
            customerName: custName,
            customerPhone: custPhone,
            deliveryAddress: custAddress,
            items: cart,
            total: totalText,
            createdAt: new Date().toISOString(),
            status: "Pending"
        });

        alert("Order confirmed ☕");
        cart = [];
        updateCart();
        showPage('homePage');

    } catch (e) {
        alert("Error: " + e.message);
    }
    isProcessingOrder = false;
}

// ======================================================
// 10. AUTH FUNCTIONS
// ======================================================
function updateNavUI(user) {
    const adminBtn = document.getElementById('navAdminBtn');
    const authBtn = document.getElementById('navAuthBtn');
    const mobileAdminBtn = document.getElementById('mobileAdminBtn');
    const mobileAuthBtn = document.getElementById('mobileAuthBtn');

    if (user) {
        if(authBtn) { authBtn.innerText = "Logout"; authBtn.classList.replace('bg-zinc-800', 'bg-red-600'); }
        if(mobileAuthBtn) { mobileAuthBtn.innerText = "Logout"; mobileAuthBtn.classList.add('text-red-500'); }

        if (isAdmin) {
            if(adminBtn) adminBtn.classList.remove('hidden');
            if(mobileAdminBtn) mobileAdminBtn.classList.remove('hidden');
        } else {
            if(adminBtn) adminBtn.classList.add('hidden');
            if(mobileAdminBtn) mobileAdminBtn.classList.add('hidden');
        }
    } else {
        if(authBtn) { authBtn.innerText = "Login"; authBtn.classList.replace('bg-red-600', 'bg-zinc-800'); }
        if(mobileAuthBtn) { mobileAuthBtn.innerText = "Login"; mobileAuthBtn.classList.remove('text-red-500'); }
        if(adminBtn) adminBtn.classList.add('hidden');
        if(mobileAdminBtn) mobileAdminBtn.classList.add('hidden');
    }
}

function handleAuthClick() {
    currentUser ? signOut(auth) : showPage('authPage');
}

function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const pass = document.getElementById('loginPass').value;
    signInWithEmailAndPassword(auth, email, pass)
        .then(() => showPage('homePage'))
        .catch(err => alert(err.message));
}

function handleSignUp(e) {
    e.preventDefault();
    const email = document.getElementById('signupEmail').value;
    const pass = document.getElementById('signupPass').value;
    createUserWithEmailAndPassword(auth, email, pass)
        .then(() => { alert("Account created!"); showPage('homePage'); })
        .catch(err => alert(err.message));
}

// ======================================================
// 11. ADMIN FUNCTIONS
// ======================================================
async function addProduct(event) {
    event.preventDefault();
    if (!currentUser || !isAdmin) return alert("Admins Only!");

    const name = document.getElementById('prodName').value;
    const price = parseFloat(document.getElementById('prodPrice').value);
    const stock = parseInt(document.getElementById('prodStock').value);
    const category = document.getElementById('prodCat').value;
    const desc = document.getElementById('prodDesc').value;
    const imgUrl = document.getElementById('prodImg').value;

    try {
        if (editingProductId) {
            const productRef = doc(db, "products", editingProductId);
            await updateDoc(productRef, { name, price, stock, category, desc, imgUrl });
            alert("Product Updated!");
            editingProductId = null;
            document.querySelector('#adminForm button[type="submit"]').innerText = "ADD ITEM";
        } else {
            const newId = name.toLowerCase().replace(/[^a-z0-9]/g, '-');
            await setDoc(doc(db, "products", newId), {
                id: newId, name, price, stock, category, desc, imgUrl,
                createdAt: new Date().toISOString()
            });
            alert("Product Added!");
        }
        document.getElementById('adminForm').reset();
    } catch (e) {
        alert("Error: " + e.message);
    }
}

function editProduct(id) {
    const p = products.find(prod => prod.id === id);
    if(!p) return;
    document.getElementById('prodName').value = p.name;
    document.getElementById('prodPrice').value = p.price;
    document.getElementById('prodStock').value = p.stock;
    document.getElementById('prodCat').value = p.category;
    document.getElementById('prodDesc').value = p.desc;
    document.getElementById('prodImg').value = p.imgUrl;
    editingProductId = id;
    const submitBtn = document.querySelector('#adminForm button[type="submit"]');
    if(submitBtn) submitBtn.innerText = "UPDATE ITEM";
    document.getElementById('adminForm').scrollIntoView({ behavior: 'smooth' });
}

async function deleteProduct(id) {
    if (!currentUser || !isAdmin) return alert("Admins Only!");
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
                <td class="p-3">Qty: <span class="${stockColor} font-bold">${p.stock || 0}</span></td>
                <td class="p-3 text-right whitespace-nowrap">
                    <button onclick="editProduct('${p.id}')" class="text-blue-500 hover:text-blue-400 mr-4"><i class="fas fa-edit"></i> Edit</button>
                    <button onclick="deleteProduct('${p.id}')" class="text-red-500 hover:text-red-400"><i class="fas fa-trash"></i></button>
                </td>
            </tr>`;
    });
}

// ======================================================
// 12. MOBILE MENU FUNCTIONS
// ======================================================
function toggleMobileMenu() {
    const menu = document.getElementById('mobileMenu');
    menu.classList.toggle('hidden');
    menu.classList.toggle('flex');
}

function mobileNavClick(pageId) {
    showPage(pageId);
    toggleMobileMenu();
}

// ======================================================
// 13. EXPORTS
// ======================================================
Object.assign(window, {
    showPage,
    submitCheckout,
    handleAuthClick,
    handleLogin,
    handleSignUp,
    filterMenu,
    addProduct,
    deleteProduct,
    editProduct,
    renderMenu,
    renderAdminTable,
    toggleMobileMenu,
    mobileNavClick,
    viewDetail,         // NEW: For menu buttons
    addCustomToCart,    // NEW: For detail page button
    selectOption,       // NEW: For round buttons
    removeFromCart      // NEW: For cart
});
