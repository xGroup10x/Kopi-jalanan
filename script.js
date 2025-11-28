// Global State
let cart = [];
let products = [
    { id: 'kopi-o', name: 'Kopi-O Special', price: 3.50, desc: 'Our signature strong black coffee.', imgUrl:'https://github.com/xGroup10x/Kopi-jalanan/blob/main/main/icedMatchaLatte.jpg'},
    { id: 'kopi-susu', name: 'Kopi Susu Kaw', price: 5.00, desc: 'Creamy, sweet, and strong.', imgUrl:'https://github.com/2ce3b16d-075d-4d40-8100-4bb93a91fefc'},
    { id: 'matcha', name: 'Iced Matcha Latte', price: 7.00, desc: 'Fresh iced matcha latte.', imgUrl:'https://github.com/xGroup10x/Kopi-jalanan/blob/main/main/icedMatchaLatte.jpg'},
    { id: 'americano', name: 'Iced Americano', price: 4.50, desc: 'Strong Americano.', imgUrl:'https://github.com/4107cb39-6369-4fcc-9849-f333849497d2'},
];

// When page loads
document.addEventListener("DOMContentLoaded", () => {
    renderMenu();
    renderAdminTable();
});

// Refresh UI
function refreshProductLists() {
    renderMenu();
    renderAdminTable();
}

// Add Product
window.addProduct = function(event) {
    event.preventDefault();

    const name = document.getElementById('prodName').value;
    const price = parseFloat(document.getElementById('prodPrice').value);
    const desc = document.getElementById('prodDesc').value;
    const imgUrl = document.getElementById('prodImg').value || 'https://placehold.co/400x300/2c2c2c/FFAE00';

    const newId = name.toLowerCase().replace(/ /g, '-');

    products.push({
        id: newId,
        name,
        price,
        desc,
        imgUrl,
        createdAt: new Date().toISOString()
    });

    alert('Product Added!');
    document.getElementById('adminForm').reset();
    refreshProductLists();
};

// Delete Product
window.deleteProduct = function(id) {
    if (!confirm("Delete this item?")) return;
    products = products.filter(prod => prod.id !== id);
    refreshProductLists();
};

// Render Menu
function renderMenu() {
    const grid = document.getElementById('menuGrid');
    grid.innerHTML = '';

    if (products.length === 0) {
        grid.innerHTML = '<p class="text-center text-gray-400 col-span-full">No items yet.</p>';
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

// Render Admin Table
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

// Cart Logic
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










