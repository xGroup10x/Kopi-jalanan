// ======================================================
// 1. BASIC PAGE & NAV LOGIC
// ======================================================
const pages = document.querySelectorAll('.page-section');

function showPage(pageId) {
    // --- SECURITY GUARD ---
    // Prevent access to Admin Page if not logged in as Admin
    if (pageId === 'adminPage' && !isAdmin) {
        alert("Access Denied: Admins Only.");
        showPage('homePage'); 
        return; 
    }

    pages.forEach(p => p.classList.add('hidden'));
    const target = document.getElementById(pageId);
    if(target) target.classList.remove('hidden');

    updateActiveNav(pageId);
    window.scrollTo(0, 0);
}

function updateActiveNav(pageId) {
    const allNavBtns = document.querySelectorAll('.nav-btn, #mobileMenu button');
    
    allNavBtns.forEach(btn => {
        const onclickVal = btn.getAttribute('onclick');
        btn.classList.remove('text-white', 'font-bold'); 
        btn.classList.add('text-gray-400'); 
        
        if (onclickVal && onclickVal.includes(pageId)) {
            btn.classList.remove('text-gray-400');
            btn.classList.add('text-white', 'font-bold');
        }
    });
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

const menuItems = [
    { id: "americano", name: "Americano", price: 6.00, category: "coffee", imgUrl: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?q=80&w=200&auto=format&fit=crop", desc: "Bold & Robust" },
    { id: "caramel-mac", name: "Caramel Macchiato", price: 8.00, category: "coffee", imgUrl: "https://images.unsplash.com/photo-1485808191679-5f8c7c8606f4?q=80&w=200&auto=format&fit=crop", desc: "Sweet & Creamy" },
    { id: "cucur", name: "Cucur Udang", price: 5.70, category: "dessert", imgUrl: "https://resepichenom.com/media/Cucur_Udang_Kuah_Kacang.jpg", desc: "Traditional crispy prawn fritters." }
];

// ======================================================
// 5. STARTUP LISTENERS
// ======================================================
document.addEventListener("DOMContentLoaded", () => {
    // Firebase products
    onSnapshot(collection(db, "products"), (snap) => {
        const firebaseData = snap.docs.map(d => ({ ...d.data(), id: d.id }));
        if(firebaseData.length > 0) {
            products = firebaseData;
        } else {
            products = menuItems;
        }
        renderMenu();
        renderAdminTable();
    });

    // Auth listener (Database Check Method)
    onAuthStateChanged(auth, async (user) => {
        currentUser = user;
        isAdmin = false; 

        if (user) {
            try {
                // Check if this user exists in the 'admins' collection
                const adminRef = doc(db, "admins", user.email);
                const snap = await getDoc(adminRef);
                if (snap.exists()) {
                    isAdmin = true;
                }
            } catch (e) { console.log("Admin check failed", e); }
        }
        updateNavUI(user);
    });

    renderMenu();
    updateCart();
    updateActiveNav('homePage'); 
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
    grid.className = "flex flex-col gap-3 pb-20 mt-4 px-1"; 

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
        card.className = "flex gap-4 p-3 bg-zinc-900 border border-zinc-800 rounded-xl items-center shadow-md hover:border-street-yellow transition cursor-pointer";
        card.onclick = (e) => {
            if(!e.target.closest('button')) viewDetail(item.id);
        };

        card.innerHTML = `
            <div class="w-20 h-20 md:w-24 md:h-24 flex-shrink-0 bg-black rounded-lg overflow-hidden">
                <img src="${imgUrl}" class="w-full h-full object-cover">
            </div>
            <div class="flex-1 min-w-0">
                <h3 class="font-oswald text-lg text-white uppercase truncate tracking-wide">${item.name}</h3>
                <p class="text-xs text-gray-400 line-clamp-2 leading-relaxed mt-0.5">${item.desc || ""}</p>
                <div class="text-street-yellow font-bold mt-1 text-md">RM ${item.price.toFixed(2)}</div>
            </div>
            <div class="flex-shrink-0">
                <button onclick="viewDetail('${item.id}')" class="w-9 h-9 rounded-full bg-zinc-800 border border-zinc-700 text-white flex items-center justify-center hover:bg-street-yellow hover:text-black hover:border-street-yellow transition shadow-lg">
                    <i class="fas fa-plus"></i>
                </button>
            </div>
        `;
        grid.appendChild(card);
    });
}

// ======================================================
// 7. PRODUCT DETAIL & CUSTOMIZATION
// ======================================================

function viewDetail(id) {
    const prod = products.find(p => p.id === id) || menuItems.find(p => p.id === id);
    if (!prod) return;

    document.getElementById('detailImage').src = prod.imgUrl || "https://placehold.co/400x300/2c2c2c/FFAE00?text=Kopi+Jalanan";
    document.getElementById('detailName').innerText = prod.name;
    document.getElementById('detailPrice').innerText = `RM ${prod.price.toFixed(2)}`;
    document.getElementById('detailDesc').innerText = prod.desc || "";
    
    const container = document.getElementById('detailOptions');
    container.innerHTML = ''; 

    if (prod.category === 'coffee') { 
        container.innerHTML = `
            <div class="mb-5"><label class="block text-gray-400 text-xs font-bold mb-2 uppercase">Mood</label><div class="flex gap-4">${createIconOption('mood', 'Hot', 'fas fa-fire')}${createIconOption('mood', 'Cold', 'fas fa-snowflake', true)}</div></div>
            <div class="mb-5"><label class="block text-gray-400 text-xs font-bold mb-2 uppercase">Size</label><div class="flex gap-4">${createCircleOption('size', 'S', 'S')}${createCircleOption('size', 'M', 'M', true)}${createCircleOption('size', 'L', 'L')}</div></div>
            <div class="mb-5"><label class="block text-gray-400 text-xs font-bold mb-2 uppercase">Sugar</label><div class="flex gap-4">${createCircleOption('sugar', '30%', '30%')}${createCircleOption('sugar', '50%', '50%', true)}${createCircleOption('sugar', '70%', '70%')}</div></div>
            <div class="mb-5"><label class="block text-gray-400 text-xs font-bold mb-2 uppercase">Ice</label><div class="flex gap-4">${createCircleOption('ice', '30%', '30%')}${createCircleOption('ice', '50%', '50%', true)}${createCircleOption('ice', '70%', '70%')}</div></div>
        `;
    } else if (prod.category === 'dessert') {
        container.innerHTML = ``; 
    }

    const addBtn = document.getElementById('detailAddBtn');
    addBtn.innerText = "ADD TO ORDER"; 
    addBtn.onclick = () => addCustomToCart(prod.id);

    showPage('detailPage');
}

function addCustomToCart(id) {
    const prod = products.find(p => p.id === id) || menuItems.find(p => p.id === id);
    let finalPrice = prod.price;
    let details = [];

    if (prod.category === 'coffee') {
        const mood = document.querySelector('.mood-btn.bg-street-yellow')?.dataset.value || 'Cold';
        const size = document.querySelector('.size-btn.bg-street-yellow')?.dataset.value || 'M';
        const sugar = document.querySelector('.sugar-btn.bg-street-yellow')?.dataset.value || '50%';
        const ice = document.querySelector('.ice-btn.bg-street-yellow')?.dataset.value || '50%';

        if(size === 'L') finalPrice += 2.00;
        if(size === 'M') finalPrice += 1.00;

        details.push(`${mood} | Size ${size}`);
        details.push(`Sugar ${sugar} | Ice ${ice}`);
    } 

    const cartItem = {
        ...prod,
        finalPrice: finalPrice,
        customization: details.length > 0 ? details.join(", ") : "Standard",
        cartId: Date.now()
    };

    cart.push(cartItem);
    updateCart();
    showPage('menuPage');
}

// Helpers
function createCircleOption(group, value, label, active=false) {
    const activeClass = active ? "bg-street-yellow text-black border-street-yellow" : "bg-transparent text-gray-400 border-zinc-600 hover:border-gray-400";
    return `<div onclick="selectOption('${group}', this)" data-value="${value}" class="option-btn ${group}-btn w-12 h-12 rounded-full border-2 flex items-center justify-center text-xs font-bold cursor-pointer transition ${activeClass}">${label}</div>`;
}
function createIconOption(group, value, iconClass, active=false) {
    const activeClass = active ? "bg-street-yellow text-black border-street-yellow" : "bg-zinc-800 text-gray-400 border-zinc-600 hover:border-gray-400";
    return `<div onclick="selectOption('${group}', this)" data-value="${value}" class="option-btn ${group}-btn w-12 h-12 rounded-full border-2 flex items-center justify-center text-lg cursor-pointer transition ${activeClass}"><i class="${iconClass}"></i></div>`;
}
window.selectOption = function(group, el) {
    document.querySelectorAll(`.${group}-btn`).forEach(btn => {
        btn.classList.remove("bg-street-yellow", "text-black", "border-street-yellow");
        btn.classList.add("bg-transparent", "text-gray-400", "border-zinc-600");
        if(group === 'mood') btn.classList.add("bg-zinc-800"); 
    });
    el.classList.remove("bg-transparent", "text-gray-400", "border-zinc-600", "bg-zinc-800");
    el.classList.add("bg-street-yellow", "text-black", "border-street-yellow");
};

// ======================================================
// 8. CART & CHECKOUT
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
                    <div class="text-white font-bold text-sm">${item.name}</div>
                    <div class="text-xs text-gray-500 mt-1">${item.customization}</div>
                </div>
                <div class="text-right">
                    <div class="text-street-yellow font-bold text-sm">RM ${item.finalPrice.toFixed(2)}</div>
                    <button onclick="removeFromCart(${index})" class="text-[10px] text-red-500 hover:text-red-400 mt-1 uppercase tracking-wider">Remove</button>
                </div>
            </div>
        `;
    });
    document.getElementById('checkoutTotal').textContent = `RM ${total.toFixed(2)}`;
}

function removeFromCart(index) {
    cart.splice(index, 1);
    updateCart();
}

function togglePayment(method) {
    const qrDiv = document.getElementById('qrSection');
    if (method === 'QR') { qrDiv.classList.remove('hidden'); } else { qrDiv.classList.add('hidden'); }
}

async function submitCheckout(event) {
    if(event) event.preventDefault();
    if (cart.length === 0) return alert("Cart is empty!");
    if (!currentUser) { alert("Please login first"); showPage('authPage'); return; }
    if(isProcessingOrder) return;
    isProcessingOrder = true;

    try {
        const totalText = document.getElementById('checkoutTotal').innerText;
        const custName = document.getElementById('custName').value || currentUser.email;
        const custPhone = document.getElementById('custPhone').value || "N/A";
        const custAddress = document.getElementById('custAddress').value || "Pickup";
        const paymentMethod = document.querySelector('input[name="payment"]:checked').value;

        await addDoc(collection(db, "orders"), {
            userId: currentUser.uid,
            email: currentUser.email,
            customerName: custName,
            customerPhone: custPhone,
            deliveryAddress: custAddress,
            paymentMethod: paymentMethod,
            items: cart,
            total: totalText,
            createdAt: new Date().toISOString(),
            status: "Pending"
        });
        alert(`Order confirmed (${paymentMethod}) ☕`);
        cart = []; updateCart(); showPage('homePage');
    } catch (e) { alert("Error: " + e.message); }
    isProcessingOrder = false;
}

// ======================================================
// 10. AUTH & ADMIN FUNCTIONS
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

function handleAuthClick() { currentUser ? signOut(auth) : showPage('authPage'); }
function handleLogin(e) { e.preventDefault(); signInWithEmailAndPassword(auth, document.getElementById('loginEmail').value, document.getElementById('loginPass').value).then(() => showPage('homePage')).catch(err => alert(err.message)); }
function handleSignUp(e) { e.preventDefault(); createUserWithEmailAndPassword(auth, document.getElementById('signupEmail').value, document.getElementById('signupPass').value).then(() => { alert("Account created!"); showPage('homePage'); }).catch(err => alert(err.message)); }

// ======================================================
// 11. ADMIN CRUD (SECURED)
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
            await updateDoc(doc(db, "products", editingProductId), { name, price, stock, category, desc, imgUrl });
            alert("Product Updated!"); editingProductId = null; document.querySelector('#adminForm button[type="submit"]').innerText = "ADD ITEM";
        } else {
            await setDoc(doc(db, "products", name.toLowerCase().replace(/[^a-z0-9]/g, '-')), { name, price, stock, category, desc, imgUrl, createdAt: new Date().toISOString() });
            alert("Product Added!");
        }
        document.getElementById('adminForm').reset();
    } catch (e) { alert("Error: " + e.message); }
}

function editProduct(id) {
    if (!currentUser || !isAdmin) return alert("Admins Only!");
    const p = products.find(prod => prod.id === id);
    if(!p) return;
    document.getElementById('prodName').value = p.name; document.getElementById('prodPrice').value = p.price; document.getElementById('prodStock').value = p.stock;
    document.getElementById('prodCat').value = p.category; document.getElementById('prodDesc').value = p.desc; document.getElementById('prodImg').value = p.imgUrl;
    editingProductId = id; document.querySelector('#adminForm button[type="submit"]').innerText = "UPDATE ITEM"; document.getElementById('adminForm').scrollIntoView({ behavior: 'smooth' });
}

async function deleteProduct(id) { if (!currentUser || !isAdmin) return alert("Admins Only!"); if(confirm("Delete this item?")) await deleteDoc(doc(db, "products", id)); }

function renderAdminTable() {
    const tbody = document.getElementById('adminTableBody');
    if(!tbody) return;
    tbody.innerHTML = '';
    products.forEach(p => {
        const stockColor = (p.stock < 10) ? 'text-red-500' : 'text-street-yellow';
        tbody.innerHTML += `<tr class="border-b border-zinc-700"><td class="p-3">${p.name}<div class="text-xs text-gray-500">${p.category || 'No Cat'}</div></td><td class="p-3">Qty: <span class="${stockColor} font-bold">${p.stock || 0}</span></td><td class="p-3 text-right whitespace-nowrap"><button onclick="editProduct('${p.id}')" class="text-blue-500 hover:text-blue-400 mr-4"><i class="fas fa-edit"></i> Edit</button><button onclick="deleteProduct('${p.id}')" class="text-red-500 hover:text-red-400"><i class="fas fa-trash"></i></button></td></tr>`;
    });
}

function toggleMobileMenu() { const menu = document.getElementById('mobileMenu'); menu.classList.toggle('hidden'); menu.classList.toggle('flex'); }
function mobileNavClick(pageId) { showPage(pageId); toggleMobileMenu(); }

// ======================================================
// 13. EXPORTS
// ======================================================
Object.assign(window, {
    showPage, submitCheckout, handleAuthClick, handleLogin, handleSignUp, filterMenu, addProduct, deleteProduct, editProduct, renderMenu, renderAdminTable, toggleMobileMenu, mobileNavClick, viewDetail, addCustomToCart, selectOption, removeFromCart, togglePayment
});
