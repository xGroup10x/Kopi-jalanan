// --- 1. FIREBASE IMPORTS ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, doc, setDoc, addDoc, deleteDoc, updateDoc, increment, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
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

// --- 5. RENDER MENU ---
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
        const isSoldOut = prod.stock < 1;
        const btnText = isSoldOut ? "SOLD OUT" : "Customize";
        const btnClass = isSoldOut 
            ? "bg-zinc-700 text-gray-500 cursor-not-allowed" 
            : "bg-white text-black hover:bg-street-yellow";
        const clickAction = isSoldOut ? "" : `onclick="viewDetail('${prod.id}')"`;

        grid.innerHTML += `
            <div class="bg-zinc-800 border border-zinc-700 p-4 transition hover:border-street-yellow group relative">
                <div class="absolute top-2 left-2 bg-black/80 text-white text-xs px-2 py-1 rounded">
                    ${prod.stock} left
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

// --- 6. CHECKOUT WITH ADDRESS ---
async function submitCheckout(e) {
    e.preventDefault();

    // 1. CHECK IF LOGGED IN
    if (!currentUser) {
        alert("Please Login or Sign Up to place an order!");
        showPage('authPage');
        return;
    }

    // 2. CHECK CART
    if(cart.length === 0) return alert("Cart is empty!");

    // 3. GET ADDRESS DETAILS
    const name = document.getElementById('custName').value;
    const phone = document.getElementById('custPhone').value;
    const address = document.getElementById('custAddress').value;

    if (!name || !phone || !address) {
        return alert("Please fill in all delivery details (Name, Phone, Address).");
    }

    const confirmOrder = confirm(`Confirm order for RM ${document.getElementById('checkoutTotal').innerText.replace('RM ', '')}?`);
    if(!confirmOrder) return;

    try {
        // 4. SAVE ORDER TO DATABASE (New 'orders' collection)
        await addDoc(collection(db, "orders"), {
            userId: currentUser.uid,
            userEmail: currentUser.email,
            customerName: name,
            customerPhone: phone,
            deliveryAddress: address,
            items: cart,
            total: document.getElementById('checkoutTotal').innerText,
            createdAt: new Date().toISOString(),
            status: "Pending"
        });

        // 5. UPDATE STOCK
        for (const item of cart) {
            const productRef = doc(db, "products", item.id);
            await updateDoc(productRef, { stock: increment(-1) });
        }

        alert("Order Placed Successfully! We will deliver to: " + address);
        cart = [];
        updateCartUI();
        document.getElementById('checkoutForm').reset();
        showPage('homePage');

    } catch (error) {
        console.error("Order Error: ", error);
        alert("Something went wrong. Please try again.");
    }
}

// --- 7. ADMIN & AUTH ---
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
        await setDoc(doc(db, "products", newId), { id: newId, name, price, stock, desc, category, imgUrl, createdAt: new Date().toISOString() });
        alert('Product Saved!'); document.getElementById('adminForm').reset();
    } catch (e) { alert(e.message); }
}

async function deleteProduct(id) {
    if (!currentUser || currentUser.email !== ADMIN_EMAIL) return alert("Admins Only!");
    if(confirm("Delete?")) await deleteDoc(doc(db, "products", id));
}

function updateNavUI(user) {
    const ab = document.getElementById('navAdminBtn');
    const lb = document.getElementById('navAuthBtn');
    if(user){ 
        lb.innerText="Logout"; 
        lb.classList.replace('bg-zinc-800', 'bg-red-600');
        if(user.email===ADMIN_EMAIL) ab.classList.remove('hidden'); 
    } else { 
        lb.innerText="Login"; 
        lb.classList.replace('bg-red-600', 'bg-zinc-800');
        ab.classList.add('hidden'); 
    }
}

// --- 8. HELPERS ---
function filterMenu(category) { activeCategory = category; renderMenu(); }

function viewDetail(id) {
    const prod = products.find(p => p.id === id);
    if (!prod || prod.stock < 1) return alert("Sold Out!");

    document.getElementById('detailImage').src = prod.imgUrl;
    document.getElementById('detailName').innerText = prod.name;
    document.getElementById('detailPrice').innerText = `RM ${prod.price.toFixed(2)}`;
    document.getElementById('detailDesc').innerText = prod.desc;
    
    const container = document.getElementById('detailOptions');
    container.innerHTML = '';

    if (prod.category === 'coffee') {
        container.innerHTML = `
            <div><label class="block text-white font-bold mb-2">Mood</label><div class="flex gap-3">${createMoodHTML('Hot', 'fas fa-fire')}${createMoodHTML('Cold', 'fas fa-snowflake', true)}</div></div>
            <div><label class="block text-white font-bold mb-2 mt-4">Size</label><div class="flex gap-3">${createOptionHTML('size','S','S')}${createOptionHTML('size','M','M',true)}${createOptionHTML('size','L','L')}</div></div>
            <div><label class="block text-white font-bold mb-2 mt-4">Sugar</label><div class="flex gap-3">${createOptionHTML('sugar','30%','30%')}${createOptionHTML('sugar','50%','50%',true)}${createOptionHTML('sugar','70%','70%')}</div></div>
        `;
    } else {
        container.innerHTML = `<div><label class="block text-white font-bold mb-3">Toppings (+RM 0.50)</label><div class="flex gap-3"><label class="cursor-pointer border border-zinc-700 px-4 py-2 rounded-full hover:border-street-yellow has-[:checked]:bg-street-yellow has-[:checked]:text-black transition"><input type="checkbox" value="Choco" class="hidden opt-topping"> Choco</label><label class="cursor-pointer border border-zinc-700 px-4 py-2 rounded-full hover:border-street-yellow has-[:checked]:bg-street-yellow has-[:checked]:text-black transition"><input type="checkbox" value="Oreo" class="hidden opt-topping"> Oreo</label></div></div>`;
    }

    document.getElementById('detailAddBtn').onclick = () => addCustomToCart(prod.id);
    showPage('detailPage');
}

function createOptionHTML(grp, val, lbl, active=false) { return `<div onclick="selectOption('${grp}', this)" data-value="${val}" class="option-btn ${grp}-btn w-12 h-12 rounded-full border flex items-center justify-center cursor-pointer transition ${active?'bg-street-yellow text-black border-street-yellow font-bold':'border-zinc-700 text-gray-400'}">${lbl}</div>`; }
function createMoodHTML(val, icon, active=false) { return `<div onclick="selectOption('mood', this)" data-value="${val}" class="option-btn mood-btn w-12 h-12 rounded-full border flex items-center justify-center cursor-pointer transition ${active?'bg-street-yellow text-black border-street-yellow':'bg-zinc-800 border-zinc-700 text-gray-500'}"><i class="${icon}"></i></div>`; }

window.selectOption = function(grp, el) {
    document.querySelectorAll(`.${grp}-btn`).forEach(e => {
        e.classList.remove("bg-street-yellow","text-black","border-street-yellow","font-bold");
        e.classList.add("border-zinc-700","text-gray-400");
        if(grp==='mood') e.classList.add("bg-zinc-800");
    });
    el.classList.remove("border-zinc-700","text-gray-400","bg-zinc-800");
    el.classList.add("bg-street-yellow","text-black","border-street-yellow","font-bold");
};

function addCustomToCart(id) {
    const prod = products.find(p => p.id === id);
    let finalPrice = prod.price;
    let details = [];
    if (prod.category === 'coffee') {
        details.push(document.querySelector('.mood-btn.bg-street-yellow')?.dataset.value || 'Cold');
        const size = document.querySelector('.size-btn.bg-street-yellow')?.dataset.value || 'M';
        if(size === 'L') finalPrice += 2;
        details.push(`Size ${size}`);
        details.push((document.querySelector('.sugar-btn.bg-street-yellow')?.dataset.value || '50%') + ' Sugar');
    } else {
        document.querySelectorAll('.opt-topping:checked').forEach(t => { finalPrice += 0.5; details.push(t.value); });
    }
    cart.push({ ...prod, price: finalPrice, customization: details.join(" • ") });
    alert("Added!"); updateCartUI(); showPage('menuPage');
}

function updateCartUI() {
    document.getElementById('cartCount').innerText = cart.length;
    const list = document.getElementById('cartList'); if(!list) return; list.innerHTML = '';
    let total = 0;
    if (cart.length === 0) list.innerHTML = '<p class="text-gray-500">Basket empty.</p>';
    else {
        cart.forEach((item, index) => {
            total += item.price;
            list.innerHTML += `<div class="flex justify-between items-center border-b border-zinc-700 py-3"><div><div class="font-bold text-white">${item.name}</div><div class="text-xs text-gray-400 italic">${item.customization}</div><div class="text-sm text-street-yellow">RM ${item.price.toFixed(2)}</div></div><button onclick="removeFromCart(${index})" class="text-gray-500 hover:text-red-500"><i class="fas fa-times"></i></button></div>`;
        });
    }
    document.getElementById('cartTotal').innerText = `RM ${total.toFixed(2)}`;
    document.getElementById('checkoutTotal').innerText = `RM ${total.toFixed(2)}`;
}

function removeFromCart(index) { cart.splice(index, 1); updateCartUI(); }
function showPage(pageId) { document.querySelectorAll('.page-section').forEach(el => el.classList.add('hidden')); document.getElementById(pageId).classList.remove('hidden'); window.scrollTo(0, 0); }
function handleAuthClick(){ currentUser ? signOut(auth).then(()=>showPage('homePage')) : showPage('authPage'); }
function handleLogin(e){ e.preventDefault(); signInWithEmailAndPassword(auth, document.getElementById('loginEmail').value, document.getElementById('loginPass').value).then(()=>showPage('homePage')).catch(e=>alert(e.message)); }
function handleSignUp(e){ e.preventDefault(); createUserWithEmailAndPassword(auth, document.getElementById('signupEmail').value, document.getElementById('signupPass').value).then(()=>showPage('homePage')).catch(e=>alert(e.message)); }
function renderAdminTable() {
    const tbody = document.getElementById('adminTableBody'); if(!tbody) return; tbody.innerHTML = '';
    products.forEach(p => { tbody.innerHTML += `<tr class="border-b border-zinc-700"><td class="p-3">${p.name}</td><td class="p-3">Qty: <span class="text-street-yellow">${p.stock||0}</span></td><td class="p-3 text-right"><button onclick="deleteProduct('${p.id}')" class="text-red-500"><i class="fas fa-trash"></i></button></td></tr>`; });
}

// EXPORTS
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
