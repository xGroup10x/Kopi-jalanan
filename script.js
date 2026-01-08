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

// Fallback Menu (If Firebase is empty)
const menuItems = [
    { id: "kopi-o", name: "Kopi O", price: 3.50, category: "coffee", desc: "Kopi O je" },
    { id: "latte", name: "Latte", price: 5.00, category: "coffee", desc: "Smooth & Creamy" },
    { id: "cucur", name: "Cucur Udang", price: 5.70, category: "dessert", desc: "Crispy prawn fritters" }
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
    
    // Reduce gap by removing top margin
    grid.className = "flex flex-col gap-3 pb-20 mt-4"; 

    const dataSource = products.length ? products : menuItems;

    const filteredData = activeCategory === 'all' 
        ? dataSource 
        : dataSource.filter(p => p.category === activeCategory);

    if (filteredData.length === 0) {
        grid.innerHTML = '<p class="text-gray-500 text-center w-full mt-10">No items found.</p>';
        return;
    }

    // --- HORIZONTAL CARD LAYOUT (Matches Image 2) ---
    filteredData.forEach(item => {
        const imgUrl = item.imgUrl || "https://placehold.co/400x300/2c2c2c/FFAE00?text=Kopi+Jalanan";
        
        const card = document.createElement('div');
        // Horizontal Layout: Image Left, Content Middle, Button Right
        card.className = "flex gap-4 p-3 bg-zinc-900 border border-zinc-800 rounded-xl items-center shadow-md hover:border-street-yellow transition cursor-pointer";
        
        // Clicking the whole card opens details
        card.onclick = (e) => {
            // Prevent triggering if clicking the specific button (optional logic, but here we just open detail)
            viewDetail(item.id);
        };

        card.innerHTML = `
            <div class="w-20 h-20 md:w-24 md:h-24 flex-shrink-0 bg-black rounded-lg overflow-hidden">
                <img src="${imgUrl}" class="w-full h-full object-cover">
            </div>

            <div class="flex-1 min-w-0">
                <h3 class="font-oswald text-lg text-white uppercase truncate tracking-wide">${item.name}</h3>
                <p class="text-xs text-gray-400 line-clamp-2 leading-relaxed mt-0.5">${item.desc || "Delicious street brew."}</p>
                <div class="text-street-yellow font-bold mt-1 text-md">RM ${item.price.toFixed(2)}</div>
            </div>

            <div class="flex-shrink-0">
                <button class="w-8 h-8 md:w-10 md:h-10 rounded-full bg-zinc-800 border border-zinc-700 text-white flex items-center justify-center hover:bg-street-yellow hover:text-black hover:border-street-yellow transition shadow-lg">
                    <i class="fas fa-plus"></i>
                </button>
            </div>
        `;
        grid.appendChild(card);
    });
}

// ======================================================
// 7. PRODUCT DETAIL & CUSTOMIZATION (Matches Image 3)
// ======================================================

function viewDetail(id) {
    const prod = products.find(p => p.id === id) || menuItems.find(p => p.id === id);
    if (!prod) return;

    // Populate Info
    document.getElementById('detailImage').src = prod.imgUrl || "https://placehold.co/400x300/2c2c2c/FFAE00?text=Kopi+Jalanan";
    document.getElementById('detailName').innerText = prod.name;
    document.getElementById('detailPrice').innerText = `RM ${prod.price.toFixed(2)}`;
    document.getElementById('detailDesc').innerText = prod.desc || "";
    
    // Generate Options
    const container = document.getElementById('detailOptions');
    container.innerHTML = '';

    if (prod.category === 'coffee' || !prod.category) { // Default to coffee options
        container.innerHTML = `
            <div class="mb-5">
                <label class="block text-gray-400 text-xs font-bold mb-2 uppercase">Mood</label>
                <div class="flex gap-4">
                    ${createIconOption('mood', 'Hot', 'fas fa-fire')}
                    ${createIconOption('mood', 'Cold', 'fas fa-snowflake', true)}
                </div>
            </div>

            <div class="mb-5">
                <label class="block text-gray-400 text-xs font-bold mb-2 uppercase">Size</label>
                <div class="flex gap-4">
                    ${createCircleOption('size', 'S', 'S')}
                    ${createCircleOption('size', 'M', 'M', true)}
                    ${createCircleOption('size', 'L', 'L')}
                </div>
            </div>

            <div class="mb-5">
                <label class="block text-gray-400 text-xs font-bold mb-2 uppercase">Sugar</label>
                <div class="flex gap-4">
                    ${createCircleOption('sugar', '30%', '30%')}
                    ${createCircleOption('sugar', '50%', '50%', true)}
                    ${createCircleOption('sugar', '70%', '70%')}
                </div>
            </div>

            <div class="mb-5">
                <label class="block text-gray-400 text-xs font-bold mb-2 uppercase">Ice</label>
                <div class="flex gap-4">
                    ${createCircleOption('ice', '30%', '30%')}
                    ${createCircleOption('ice', '50%', '50%', true)}
                    ${createCircleOption('ice', '70%', '70%')}
                </div>
            </div>
        `;
    } else {
        // Dessert Options
        container.innerHTML = `
             <div class="mb-6">
                <label class="block text-gray-400 text-xs font-bold mb-3 uppercase">Add-ons</label>
                <div class="flex flex-col gap-3">
                    <label class="flex items-center justify-between p-3 border border-zinc-700 rounded-lg cursor-pointer hover:border-street-yellow transition bg-zinc-900/50">
                        <span class="text-white text-sm">Chocolate Sauce</span>
                        <input type="checkbox" value="Choco Sauce" class="opt-topping w-5 h-5 accent-street-yellow"> 
                    </label>
                    <label class="flex items-center justify-between p-3 border border-zinc-700 rounded-lg cursor-pointer hover:border-street-yellow transition bg-zinc-900/50">
                        <span class="text-white text-sm">Caramel Drizzle</span>
                        <input type="checkbox" value="Caramel" class="opt-topping w-5 h-5 accent-street-yellow"> 
                    </label>
                </div>
            </div>
        `;
    }

    // Update Add Button
    const addBtn = document.getElementById('detailAddBtn');
    addBtn.innerText = "ADD TO ORDER"; 
    addBtn.onclick = () => addCustomToCart(prod.id);

    showPage('detailPage');
}

// Add Item Logic
function addCustomToCart(id) {
    const prod = products.find(p => p.id === id) || menuItems.find(p => p.id === id);
    let finalPrice = prod.price;
    let details = [];

    if (prod.category === 'coffee' || !prod.category) {
        const mood = document.querySelector('.mood-btn.bg-street-yellow')?.dataset.value || 'Cold';
        const size = document.querySelector('.size-btn.bg-street-yellow')?.dataset.value || 'M';
        const sugar = document.querySelector('.sugar-btn.bg-street-yellow')?.dataset.value || '50%';
        const ice = document.querySelector('.ice-btn.bg-street-yellow')?.dataset.value || '50%';

        // Price adjustments
        if(size === 'L') finalPrice += 2.00;
        if(size === 'M') finalPrice += 1.00;

        details.push(`${mood} | Size ${size}`);
        details.push(`Sugar ${sugar} | Ice ${ice}`);
    } else {
        document.querySelectorAll('.opt-topping:checked').forEach(t => { 
            finalPrice += 0.50; 
            details.push(t.value); 
        });
    }

    const cartItem = {
        ...prod,
        finalPrice: finalPrice,
        customization: details.join(", "),
        cartId: Date.now()
    };

    cart.push(cartItem);
    updateCart();
    // Go back to menu automatically
    showPage('menuPage');
}

// --- HELPERS FOR CIRCULAR BUTTONS ---

// 1. Text Circles (Size, Sugar, Ice)
function createCircleOption(group, value, label, active=false) {
    const activeClass = active 
        ? "bg-street-yellow text-black border-street-yellow" 
        : "bg-transparent text-gray-400 border-zinc-600 hover:border-gray-400";
    
    return `
        <div onclick="selectOption('${group}', this)" 
             data-value="${value}" 
             class="option-btn ${group}-btn w-12 h-12 rounded-full border flex items-center justify-center text-xs font-bold cursor-pointer transition ${activeClass}">
             ${label}
        </div>`;
}

// 2. Icon Circles (Mood)
function createIconOption(group, value, iconClass, active=false) {
    const activeClass = active 
        ? "bg-street-yellow text-black border-street-yellow" 
        : "bg-zinc-800 text-gray-400 border-zinc-600 hover:border-gray-400";

    return `
        <div onclick="selectOption('${group}', this)" 
             data-value="${value}" 
             class="option-btn ${group}-btn w-12 h-12 rounded-full border flex items-center justify-center text-lg cursor-pointer transition ${activeClass}">
             <i class="${iconClass}"></i>
        </div>`;
}

// Global Selector Logic
window.selectOption = function(group, el) {
    // Reset siblings
    document.querySelectorAll(`.${group}-btn`).forEach(btn => {
        btn.classList.remove("bg-street-yellow", "text-black", "border-street-yellow");
        btn.classList.add("bg-transparent", "text-gray-400", "border-zinc-600");
        if(group === 'mood') btn.classList.add("bg-zinc-800"); 
    });
    
    // Activate current
    el.classList.remove("bg-transparent", "text-gray-400", "border-zinc-600", "bg-zinc-800");
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
    viewDetail,
    addCustomToCart,
    selectOption,
    removeFromCart
});
