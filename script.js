document.addEventListener('DOMContentLoaded', () => {

    // --- BASE DE DATOS DE PRODUCTOS (importada) ---
    const products = window.DULCE_PRODUCTS || [];

    // --- ELEMENTOS DEL DOM ---
    const productGrid = document.getElementById('product-grid');
    const cartBadge = document.getElementById('cart-badge');
    const searchBar = document.getElementById('search-bar');
    const modal = document.getElementById('confirmation-modal');
    const closeModalBtn = document.querySelector('.close-btn');
    const modalMessage = document.getElementById('modal-message');

    // --- LÓGICA DEL CARRITO (localStorage) ---
    function getOrder() {
        return JSON.parse(localStorage.getItem('dulceNicobellaOrder')) || [];
    }

    function saveOrder(order) {
        localStorage.setItem('dulceNicobellaOrder', JSON.stringify(order));
    }

    function updateCartBadge() {
        const order = getOrder();
        const totalItems = order.reduce((sum, item) => sum + item.quantity, 0);
        if (cartBadge) {
            cartBadge.textContent = totalItems;
            cartBadge.classList.toggle('active', totalItems > 0);
        }
    }

    function addToOrder(productId, quantity) {
        const product = products.find(p => p.id === productId);
        if (!product) return;

        let order = getOrder();
        const existingOrderItem = order.find(item => item.id === productId);

        if (existingOrderItem) {
            existingOrderItem.quantity += quantity;
        } else {
            order.push({ ...product, quantity });
        }
        
        saveOrder(order);
        updateCartBadge();
        
        // Animación del carrito
        const cartIcon = document.querySelector('.cart-icon-link');
        if (cartIcon) {
            cartIcon.classList.add('shake');
            setTimeout(() => cartIcon.classList.remove('shake'), 500);
        }
        showToast('Agregado');
    }

    function slugify(text) {
        return normalizeText(text)
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '');
    }

    function checkImageExists(url) {
        return new Promise(resolve => {
            const img = new Image();
            img.onload = () => resolve(true);
            img.onerror = () => resolve(false);
            img.src = url;
        });
    }

    // --- Find all images for a product for the gallery view ---
    async function findAllProductImages(product) {
        const foundImages = [];
        const extensions = ['.jpg', '.jpeg', '.jfif', '.webp', '.png'];

        // This function was previously removed, re-implementing it.
        // It will find all images for a product to be displayed in the gallery.

        // Use the same robust logic as findHoverImage
        const baseNames = new Set();
        if (product.image) {
            baseNames.add(product.image.replace(/^images\//, '').replace(/\.svg$/, ''));
        }
        baseNames.add(slugify(product.name));

        for (const base of baseNames) {
            // Check for base image (e.g., postre-chaja.jpg)
            for (const ext of extensions) {
                const url = `images/${base}${ext}`;
                // eslint-disable-next-line no-await-in-loop
                if (await checkImageExists(url) && !foundImages.includes(url)) {
                    foundImages.push(url);
                }
            }
            // Check for numbered images (e.g., postre-chaja-2.jpg)
            for (let i = 2; i <= 10; i++) {
                for (const ext of extensions) {
                    const url = `images/${base}-${i}${ext}`;
                    // eslint-disable-next-line no-await-in-loop
                    if (await checkImageExists(url) && !foundImages.includes(url)) {
                        foundImages.push(url);
                    }
                }
            }
        }
        return foundImages;
    }

    // --- FUNCIÓN PARA FORMATEAR PRECIOS ---
    function formatPrice(price) {
        return `$${price.toLocaleString('es-AR')}`;
    }

    // --- FUNCIÓN PARA NORMALIZAR TEXTO (quitar tildes y a minúsculas) ---
    function normalizeText(text) {
        return text
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "");
    }

    // --- RENDERIZADO DE PRODUCTOS ---
    function renderProducts(searchTerm = '') {
        if (!productGrid) return;
        
        const normalizedSearchTerm = normalizeText(searchTerm);
        
        const filteredProducts = products.filter(product => {
            const productName = normalizeText(product.name);
            const productCategory = normalizeText(product.category);
            const productDescription = normalizeText(product.description);
            
            return productName.includes(normalizedSearchTerm) ||
                   productCategory.includes(normalizedSearchTerm) ||
                   productDescription.includes(normalizedSearchTerm);
        });

        const groupedProducts = filteredProducts.reduce((acc, product) => {
            const category = product.category || 'Sin categoría';
            if (!acc[category]) acc[category] = [];
            acc[category].push(product);
            return acc;
        }, {});

        productGrid.innerHTML = '';
        
        if (filteredProducts.length === 0) {
            productGrid.innerHTML = '<p class="no-results">No se encontraron productos que coincidan con tu búsqueda.</p>';
            return;
        }

        const categoryOrder = ['Tortas', 'Postres', 'Candy'];

        categoryOrder.forEach(category => {
            if (groupedProducts[category]) {
                const categoryTitle = document.createElement('h2');
                categoryTitle.textContent = category;
                productGrid.appendChild(categoryTitle);

                const categoryGrid = document.createElement('div');
                categoryGrid.className = 'product-grid-inner';
                
                groupedProducts[category].forEach(product => {
                    const card = document.createElement('div');
                    card.className = 'product-card';
                        card.innerHTML = `
                            <img src="${product.image}" alt="${product.name}">
                        <div class="product-card-content">
                            <h3>${product.name}</h3>
                            <div class="product-price">${formatPrice(product.price)}</div>
                            <p>${product.description}</p>
                            <div class="product-controls">
                                <input type="number" id="qty-${product.id}" value="1" min="1" class="product-quantity">
                                <button class="add-to-cart-btn" data-id="${product.id}">Agregar</button>
                            </div>
                        </div>
                    `;
                    // Make card clickable to open product detail (ignore clicks on controls)
                    card.addEventListener('click', async (ev) => {
                        if (ev.target.closest('.add-to-cart-btn') || ev.target.closest('.product-quantity')) return;
                        
                        // Find all images and store them for the product page
                        const galleryImages = await findAllProductImages(product);
                        localStorage.setItem(`productImages_${product.id}`, JSON.stringify(galleryImages));

                        // Apply fade-out transition before navigating
                        const href = `product.html?id=${product.id}`;
                        document.body.classList.add('is-rendering');
                        setTimeout(() => {
                            window.location.href = href;
                        }, 280); // 280ms to match CSS transition
                    });

                    categoryGrid.appendChild(card);
                });
                productGrid.appendChild(categoryGrid);
            }
        });
    }

    // --- MANEJO DE EVENTOS ---
    if (productGrid) {
        productGrid.addEventListener('click', (e) => {
            if (e.target.classList.contains('add-to-cart-btn')) {
                const productId = parseInt(e.target.dataset.id);
                const quantityInput = document.getElementById(`qty-${productId}`);
                const quantity = parseInt(quantityInput.value);
                if (quantity > 0) {
                    addToOrder(productId, quantity);
                }
            }
        });
    }
    
    if (searchBar) {
        searchBar.addEventListener('input', (e) => {
            renderProducts(e.target.value);
        });
    }

    // --- FUNCIONALIDAD DE NOTIFICACIONES TOAST ---
    function showToast(message) {
        const toastContainer = document.getElementById('toast-container');
        if (!toastContainer) return;

        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.setAttribute('role', 'status');
        toast.textContent = message;

        toastContainer.appendChild(toast);

        // Mostrar toast
        setTimeout(() => toast.classList.add('show'), 80);

        // Ocultar automáticamente después de 2 segundos (minimal)
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                if (toast.parentNode === toastContainer) toastContainer.removeChild(toast);
            }, 300);
        }, 2000);
    }

    // --- FUNCIONALIDAD DEL MODAL (para errores, etc.) ---
    function showModal(title, message) {
        if (!modal) return;
        const modalTitle = modal.querySelector('h2');
        modalTitle.textContent = title;
        modalMessage.innerHTML = message;
        modal.style.display = 'block';

        setTimeout(() => {
            if(modal) modal.style.display = 'none';
        }, 2500);
    }
    
    if (closeModalBtn) {
        closeModalBtn.onclick = () => { if (modal) modal.style.display = 'none'; }
    }
    
    window.onclick = (event) => {
        if (event.target == modal) { if (modal) modal.style.display = 'none'; }
        const productModal = document.getElementById('product-modal');
        const orderModal = document.getElementById('order-modal');
        if (productModal && event.target == productModal) productModal.style.display = 'none';
        if (orderModal && event.target == orderModal) orderModal.style.display = 'none';
    }

    // --- PRODUCT MODAL ---
    const productModal = document.getElementById('product-modal');
    const productModalBody = document.getElementById('product-modal-body');

    function openProductModal(productId) {
        const product = products.find(p => p.id === productId);
        if (!product || !productModalBody) return;

        // Use shared renderer to populate modal body
        if (window.renderProductTo) {
            window.renderProductTo(productModalBody, productId);
        }

        openModal(productModal);
    }

    // --- Render helpers exposed globally for DRY use on product/pedido pages ---
    window.renderProductTo = function(container, productId) {
        const product = products.find(p => p.id === productId);
        if (!product || !container) return;
        container.innerHTML = `
            <div class="product-detail-grid">
                <div class="product-detail-media">
                    <img src="${product.image}" alt="${product.name}">
                </div>
                <div class="product-detail-info">
                    <h1 id="product-modal-title">${product.name}</h1>
                    <div class="product-price-detail">${formatPrice(product.price)}</div>
                    <p>${product.description}</p>
                    <div class="product-controls">
                        <input id="modal-qty" type="number" min="1" value="1">
                        <button id="modal-add" class="add-to-cart-btn">Agregar al carrito</button>
                    </div>
                </div>
            </div>
        `;
    };

    window.renderOrderTo = function(container) {
        if (!container) return;
        const order = getOrder();
        if (order.length === 0) {
            container.innerHTML = '<p>Tu carrito está vacío.</p>';
            return;
        }
        const itemsHtml = order.map(item => `
            <li data-id="${item.id}">
                <span>${item.name} x <input class="order-qty" data-id="${item.id}" type="number" min="1" value="${item.quantity}"></span>
                <span>${formatPrice(item.price * item.quantity)}</span>
                <button class="remove-item" data-id="${item.id}" aria-label="Eliminar item">✕</button>
            </li>
        `).join('');
        const total = order.reduce((s,i) => s + i.price * i.quantity, 0);
        container.innerHTML = `
            <h2 id="order-modal-title">Tu Pedido</h2>
            <ul id="order-items" style="list-style:none;padding:0;">${itemsHtml}</ul>
            <div style="margin-top:12px;font-weight:bold;">Total: ${formatPrice(total)}</div>
            <div style="margin-top:16px;display:flex;gap:8px;">
                <button id="send-order" class="add-to-cart-btn">Enviar Pedido por WhatsApp</button>
                <a href="pedido.html">Ir a página de pedido</a>
            </div>
        `;
    };

    // --- Global function to generate and open WhatsApp link ---
    window.shareOrderViaWhatsapp = function(order, additionalText = '') {
        if (!order || order.length === 0) return;

        const lines = order.map(i => `${i.quantity} x ${i.name} - ${formatPrice(i.price * i.quantity)}`).join('\n');
        const total = order.reduce((s, i) => s + i.price * i.quantity, 0);

        let text = `Hola! Quisiera hacer un pedido:\n${lines}\nTotal: ${formatPrice(total)}`;
        if (additionalText) text += '\n\n' + additionalText;

        const whatsappUrl = `https://wa.me/5493456256330?text=${encodeURIComponent(text)}`;
        window.open(whatsappUrl, '_blank');
    }

    // --- Modal open/close + focus trap / accessibility helpers ---
    function getFocusableElements(container) {
        return Array.from(container.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'))
            .filter(el => el.offsetParent !== null);
    }

    function openModal(modalEl) {
        const main = document.querySelector('main');
        if (main) main.setAttribute('aria-hidden', 'true');
        modalEl.style.display = 'block';
        modalEl.setAttribute('aria-hidden', 'false');
        modalEl.classList.add('show');
        const focusables = getFocusableElements(modalEl);
        const previouslyFocused = document.activeElement;
        const first = focusables[0] || modalEl;
        first.focus();

        function onKey(e) {
            if (e.key === 'Escape') {
                closeModal(modalEl);
                return;
            }
            if (e.key === 'Tab') {
                const focusables = getFocusableElements(modalEl);
                if (!focusables.length) return;
                const idx = focusables.indexOf(document.activeElement);
                if (e.shiftKey) {
                    if (idx === 0) { focusables[focusables.length-1].focus(); e.preventDefault(); }
                } else {
                    if (idx === focusables.length - 1) { focusables[0].focus(); e.preventDefault(); }
                }
            }
        }

        modalEl.__onKey = onKey;
        document.addEventListener('keydown', onKey);
        modalEl.__previouslyFocused = previouslyFocused;
    }

    function closeModal(modalEl) {
        const main = document.querySelector('main');
        if (main) main.removeAttribute('aria-hidden');
        modalEl.style.display = 'none';
        modalEl.setAttribute('aria-hidden', 'true');
        modalEl.classList.remove('show');
        if (modalEl.__onKey) document.removeEventListener('keydown', modalEl.__onKey);
        if (modalEl.__previouslyFocused && modalEl.__previouslyFocused.focus) modalEl.__previouslyFocused.focus();
    }

    // Close buttons for product modal
    const productClose = document.querySelector('.product-close');
    if (productClose && productModal) productClose.onclick = () => { closeModal(productModal); };

    // --- ORDER MODAL ---
    const orderModal = document.getElementById('order-modal');
    const orderModalBody = document.getElementById('order-modal-body');

    // Use event delegation for order modal actions
    if (orderModalBody) {
        orderModalBody.addEventListener('click', (e) => {
            const target = e.target;
            let order = getOrder();

            // Remove item
            if (target.matches('.remove-item')) {
                const id = parseInt(target.dataset.id);
                order = order.filter(i => i.id !== id);
                saveOrder(order);
            }
            // Send order
            else if (target.matches('#send-order')) {
                if (window.shareOrderViaWhatsapp) window.shareOrderViaWhatsapp(order);
                return; // Don't re-render
            } else {
                return; // Exit if not a relevant click
            }

            // Re-render and update badge
            if (window.renderOrderTo) window.renderOrderTo(orderModalBody);
            updateCartBadge();
        });

        orderModalBody.addEventListener('change', (e) => {
            if (e.target.matches('.order-qty')) {
                const id = parseInt(e.target.dataset.id);
                const quantity = Math.max(1, parseInt(e.target.value) || 1);
                const order = getOrder();
                const item = order.find(i => i.id === id);
                if (item) item.quantity = quantity;
                saveOrder(order);
                if (window.renderOrderTo) window.renderOrderTo(orderModalBody);
                updateCartBadge();
            }
        });
    }

    // Close buttons for order modal
    const orderClose = document.querySelector('.order-close');
    if (orderClose && orderModal) orderClose.onclick = () => { closeModal(orderModal); };

    // Open cart modal when clicking cart icon (prevent navigation)
    const cartLink = document.querySelector('.cart-icon-link');
    if (cartLink) {
        cartLink.addEventListener('click', (e) => {
            e.preventDefault();
            if (window.renderOrderTo) window.renderOrderTo(orderModalBody); // Initial render
            openModal(orderModal);
        });
    }
    
    // --- INICIALIZACIÓN ---
    renderProducts();
    updateCartBadge();
});