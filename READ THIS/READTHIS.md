# 💻 Codebase Walkthrough

## 1. Logic & State (`script.js`)

This is the core of the application. It handles Firebase connections, state management, and DOM updates.

### A. Global State
We use simple global variables to manage the app state without a complex framework like React or Vue.
* `cart`: An array holding the user's selected items.
* `products`: A local mirror of the Firestore database to avoid re-fetching data constantly.
* `currentUser`: Stores the Firebase User object after login.
* `ADMIN_EMAIL`: Hardcoded string (`kopijalanan@gmail.com`) used to gatekeep Admin features.

### B. Navigation (SPA Logic)
The app is a **Single Page Application (SPA)**. It doesn't actually load new HTML pages.
* **Function:** `showPage(pageId)`
* **How it works:** It grabs all elements with class `.page-section`, adds the `.hidden` class to them (hiding everything), and then removes the `.hidden` class only from the specific `pageId` you requested.

### C. The Menu System
1.  **Real-time Listener:** On startup, `onSnapshot` listens to the "products" collection. Whenever the database changes (e.g., admin updates stock), the `products` array updates immediately, and `renderMenu()` is called.
2.  **Rendering:** `renderMenu()` loops through the `products` array.
    * **Stock Check:** It checks `if (prod.stock <= 0)`. If true, it adds red "Out of Stock" badges and disables the button.
    * **Filtering:** Controlled by `activeCategory`. Clicking "Coffee" or "Dessert" buttons updates this variable and re-runs `renderMenu()`.

### D. Customization & Cart
* **Selection:** `viewDetail(id)` populates the detail view. It checks the category ('coffee' vs 'dessert') to decide whether to show "Sugar/Ice" options or "Topping" checkboxes.
* **Adding to Cart:** `addCustomToCart(id)` calculates the final price.
    * *Logic:* It reads the `data-value` from the highlighted buttons (those with class `.bg-street-yellow`).
    * *Price:* Adds +1 for Medium, +2 for Large, or +0.50 for toppings.
* **Checkout:** `submitCheckout()` creates a document in the `orders` collection.
    * **Critical:** It loops through the cart items and runs `updateDoc(productRef, { stock: increment(-1) })` to decrease inventory in real-time.

### E. Admin Security
There is no backend role management. Security is handled on the frontend (client-side):
* **UI Hiding:** The `updateNavUI` function checks `if (user.email === ADMIN_EMAIL)`. If it matches, the "Admin Panel" button is revealed.
* **Function Gating:** Functions like `addProduct` and `deleteProduct` check this email again before running. *Note: For true security, Firestore Rules should also enforce this on the server side.*

---

## 2. Structure (`index.html`)

The HTML file acts as a container for all the "screens".

* **Tailwind CSS:** Used for almost all styling (layout, colors, spacing).
* **Sections:** Every "page" is a `<section>` tag with a unique ID (e.g., `<section id="menuPage">`). By default, all except the home page have the class `hidden`.
* **Modularity:** The navigation bar relies on `onclick` events (like `onclick="showPage('cartPage')"`) rather than `href` links, preventing the page from refreshing.

---

## 3. Styling (`style.css`)

This file is minimal because we use Tailwind, but it handles specific overrides:

* **Dark Theme Base:** Sets the body background to `#1a1a1a`.
* **Scrollbar:** Customizes the webkit scrollbar to be thin and dark grey/yellow to match the "street" aesthetic.
* **Fonts:** Imports the "Oswald" font class used for headers.