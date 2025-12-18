// --- FUNCIONES GLOBALES DEL CARRITO Y UTILIDADES ---
// Definidas fuera de DOMContentLoaded para que estén disponibles inmediatamente para otros scripts.

window.getOrder = function() {
    return JSON.parse(localStorage.getItem('dulceNicobellaOrder')) || [];
};

window.saveOrder = function(order) {
    localStorage.setItem('dulceNicobellaOrder', JSON.stringify(order));
};

window.clearOrder = function() {
    localStorage.removeItem('dulceNicobellaOrder');
    // La actualización visual del badge se hará dentro del DOMContentLoaded.
};

window.formatPrice = function(price) {
    return `$${price.toLocaleString('es-AR')}`;
};

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
    
    // Sobrescribimos clearOrder para que también actualice el badge
    const originalClearOrder = window.clearOrder;
    window.clearOrder = function() {
        originalClearOrder();
        updateCartBadge();
    }

    function updateCartBadge() {
        const order = getOrder();
        const totalItems = order.reduce((sum, item) => sum + item.quantity, 0);
        if (cartBadge) {
            cartBadge.textContent = totalItems;
            cartBadge.classList.toggle('active', totalItems > 0);
        }
    }

    window.addToOrder = function(productId, quantity) {
        const product = products.find(p => p.id === productId);
        if (!product) return;

        let order = window.getOrder();
        const existingOrderItem = order.find(item => item.id === productId);

        if (existingOrderItem) {
            existingOrderItem.quantity += quantity;
        } else {
            order.push({ ...product, quantity: quantity });
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
    };

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
                            <img src="${product.image.replace('.svg', '.jfif')}" alt="${product.name}" loading="lazy" width="300" height="200">
                        <div class="product-card-content">
                            <h3>${product.name}</h3>
                            <div class="product-price">${window.formatPrice(product.price)}</div>
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
                    window.addToOrder(productId, quantity);
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
                    <img src="${product.image.replace('.svg', '.jfif')}" alt="${product.name}" loading="lazy" width="500" height="500">
                </div>
                <div class="product-detail-info">
                    <h1 id="product-modal-title">${product.name}</h1>
                    <div class="product-price-detail">${window.formatPrice(product.price)}</div>
                    <p>${product.description}</p>
                    <div class="product-controls">
                        <input id="detail-qty" type="number" min="1" value="1">
                        <button id="detail-add" class="add-to-cart-btn">Agregar al carrito</button>
                    </div>
                </div>
            </div>
        `;
    };

    window.renderOrderTo = function(container, options = {}) {
        if (!container) return;
        const order = getOrder();
        const { isPage = false } = options;

        // En la página de pedido, también controlamos la visibilidad del formulario
        if (isPage) {
            const formContainer = document.getElementById('form-fields-container');
            const submitButton = document.getElementById('submit-pedido');
            const showForm = order.length > 0;
            if (formContainer) formContainer.style.display = showForm ? '' : 'none';
            if (submitButton) submitButton.style.display = showForm ? '' : 'none';
        }

        if (order.length === 0) {
            // En la página de pedido, el título ya existe, solo ponemos el mensaje.
            // En el modal, sí reemplazamos todo.
            container.innerHTML = isPage 
                ? '<p>Tu carrito está vacío.</p>' 
                : '<p>Tu carrito está vacío.</p>';
            return;
        }
        const itemsHtml = order.map(item => `
            <li data-id="${item.id}" class="cart-item">
                <img src="${item.image.replace('.svg', '.jfif')}" alt="${item.name}" class="cart-item-thumbnail" loading="lazy" width="60" height="60">
                <div class="cart-item-info">
                    <div class="cart-item-name">${item.name}</div>
                    <div class="cart-item-controls">
                        <input class="order-qty" data-id="${item.id}" type="number" min="1" value="${item.quantity}" aria-label="Cantidad de ${item.name}">
                        <span class="cart-item-price">${window.formatPrice(item.price * item.quantity)}</span>
                    </div>
                </div>
            </li>
        `).join('');
        const total = order.reduce((s,i) => s + i.price * i.quantity, 0);

        const buttonsHtml = isPage ? '' : `
            <div style="margin-top:16px;display:flex;gap:8px;">
                <button id="send-order" class="add-to-cart-btn">Enviar Pedido por WhatsApp</button>
                <a href="pedido.html">Ir a página de pedido</a>
            </div>
        `;

        // Si es la página de pedido, solo insertamos la lista y el total.
        // Si es el modal, reemplazamos todo el contenido con el título y los botones.
        if (isPage) {
            container.innerHTML = `
                <ul id="order-items">${itemsHtml}</ul>
                <div style="margin-top:12px;font-weight:bold;">Total: ${window.formatPrice(total)}</div>
            `;
        } else {
            container.innerHTML = `
                <h2 id="order-modal-title">Tu Pedido</h2>
                <ul id="order-items">${itemsHtml}</ul>
                <div style="margin-top:12px;font-weight:bold;">Total: ${window.formatPrice(total)}</div>
                ${buttonsHtml}
            `;
        }
    };

    // --- Global function to generate and open WhatsApp link ---
    window.shareOrderViaWhatsapp = function(order, additionalText = '') {
        if (!order || order.length === 0) return;

        const lines = order.map(i => `${i.quantity} x ${i.name} - ${window.formatPrice(i.price * i.quantity)}`).join('\n');
        const total = order.reduce((s, i) => s + i.price * i.quantity, 0);

        let text = `Hola! Quisiera hacer un pedido:\n${lines}\nTotal: ${window.formatPrice(total)}`;
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

            // Send order
            if (target.matches('#send-order')) {
                if (window.shareOrderViaWhatsapp) window.shareOrderViaWhatsapp(order);
                return; // Don't re-render
            } else {
                return; // Exit if not a relevant click
            }

            // Re-render and update badge
            // (La lógica de eliminación ha sido removida)
        });

        orderModalBody.addEventListener('change', (e) => {
            if (e.target.matches('.order-qty')) {
                const id = parseInt(e.target.dataset.id);
                const quantity = Math.max(1, parseInt(e.target.value) || 1);
                const order = getOrder();
                const item = order.find(i => i.id === id);
                if (item) item.quantity = quantity;
                saveOrder(order);
                // Re-render para actualizar el total y el subtotal del item
                // No es lo más eficiente, pero es simple y efectivo para este caso.
                // Una mejora sería solo actualizar los textos de precio.
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