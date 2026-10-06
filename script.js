(() => {
    'use strict';

    const ORDER_KEY = 'dulceNicobellaOrder';
    const PRODUCT_IMAGES_PREFIX = 'productImages_';
    const products = Array.isArray(window.DULCE_PRODUCTS) ? window.DULCE_PRODUCTS : [];

    const parseJsonSafely = (value, fallback) => {
        if (!value) return fallback;
        try {
            return JSON.parse(value);
        } catch (_error) {
            return fallback;
        }
    };

    const toSafeNumber = (value, fallback = 1) => {
        const parsed = Number.parseInt(value, 10);
        return Number.isFinite(parsed) ? parsed : fallback;
    };

    const getProductById = (productId) => products.find((product) => product.id === productId);

    window.getQuantityUnit = function getQuantityUnit(item) {
        const product = getProductById(Number(item?.id));
        return product?.quantityUnit || item?.quantityUnit || 'unidad';
    };

    window.formatOrderQuantity = function formatOrderQuantity(item) {
        const quantity = Number(item?.quantity) || 1;
        const unit = window.getQuantityUnit(item);
        return unit === 'kg'
            ? `${quantity} kg`
            : `${quantity} ${quantity === 1 ? 'unidad' : 'unidades'}`;
    };

    window.renderQuantityStepper = function renderQuantityStepper({
        id = '',
        inputClass,
        productId = '',
        value = 1,
        label,
        stepUnit = 'unidad',
        displayUnit = ''
    }) {
        const safeLabel = String(label).replace(/[&"<>']/g, (character) => ({
            '&': '&amp;',
            '"': '&quot;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;'
        })[character]);
        const safeId = id ? `id="${id}"` : '';
        const safeProductId = productId ? `data-id="${productId}"` : '';

        return `
            <div class="quantity-input-group">
                <div class="quantity-stepper">
                    <button class="quantity-stepper-button" data-quantity-step="-1" type="button" aria-label="Disminuir ${stepUnit} de ${safeLabel}" ${value <= 1 ? 'disabled' : ''}>−</button>
                    <input ${safeId} class="${inputClass}" ${safeProductId} type="number" min="1" step="1" inputmode="numeric" value="${value}" aria-label="${safeLabel}">
                    <button class="quantity-stepper-button" data-quantity-step="1" type="button" aria-label="Aumentar ${stepUnit} de ${safeLabel}">+</button>
                </div>
                ${displayUnit ? `<span class="quantity-unit">${displayUnit}</span>` : ''}
            </div>
        `;
    };

    function setupQuantitySteppers() {
        document.addEventListener('click', (event) => {
            const button = event.target.closest('.quantity-stepper-button');
            if (!button) return;

            const stepper = button.closest('.quantity-stepper');
            const input = stepper?.querySelector('input[type="number"]');
            if (!input) return;

            const minimum = Number(input.min) || 1;
            const currentValue = Math.max(minimum, toSafeNumber(input.value, minimum));
            const step = Number.parseInt(button.dataset.quantityStep, 10);
            input.value = String(Math.max(minimum, currentValue + step));
            input.dispatchEvent(new Event('input', { bubbles: true }));

            if (input.classList.contains('order-qty')) {
                input.dispatchEvent(new Event('change', { bubbles: true }));
            } else {
                const decrementButton = stepper.querySelector('[data-quantity-step="-1"]');
                if (decrementButton) decrementButton.disabled = Number(input.value) <= minimum;
            }
        });

        document.addEventListener('input', (event) => {
            const input = event.target.closest('.quantity-stepper input[type="number"]');
            if (!input) return;

            const minimum = Number(input.min) || 1;
            const decrementButton = input.closest('.quantity-stepper').querySelector('[data-quantity-step="-1"]');
            if (decrementButton) {
                decrementButton.disabled = Number(input.value) <= minimum;
            }
        });
    }

    window.getOrder = function getOrder() {
        return parseJsonSafely(localStorage.getItem(ORDER_KEY), []);
    };

    window.saveOrder = function saveOrder(order) {
        localStorage.setItem(ORDER_KEY, JSON.stringify(order));
    };

    window.clearOrder = function clearOrder() {
        localStorage.removeItem(ORDER_KEY);
    };

    window.formatPrice = function formatPrice(price) {
        return `$${Number(price || 0).toLocaleString('es-AR')}`;
    };

    function normalizeText(text = '') {
        return String(text)
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '');
    }

    function slugify(text = '') {
        return normalizeText(text)
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '');
    }

    function checkImageExists(url) {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => resolve(true);
            img.onerror = () => resolve(false);
            img.src = url;
        });
    }

    async function findAllProductImages(product) {
        if (!product) return [];

        const foundImages = [];
        const extensions = ['.jpg', '.jpeg', '.jfif', '.webp', '.png'];
        const baseNames = new Set();

        if (product.image) {
            baseNames.add(product.image.replace(/^images\//, '').replace(/\.svg$/, ''));
        }

        const cleanedName = String(product.name || '').replace(/\s*\(.*\)/g, '');
        if (cleanedName) {
            baseNames.add(slugify(cleanedName));
        }

        for (const baseName of baseNames) {
            for (const extension of extensions) {
                const candidate = `images/${baseName}${extension}`;
                if (await checkImageExists(candidate) && !foundImages.includes(candidate)) {
                    foundImages.push(candidate);
                }
            }

            for (let index = 2; index <= 10; index += 1) {
                for (const extension of extensions) {
                    const candidate = `images/${baseName}-${index}${extension}`;
                    if (await checkImageExists(candidate) && !foundImages.includes(candidate)) {
                        foundImages.push(candidate);
                    }
                }
            }
        }

        if (foundImages.length) {
            return foundImages;
        }

        return product.image ? [product.image.replace(/\.svg$/, '.jfif')] : [];
    }

    function updateCartBadge() {
        const cartBadge = document.getElementById('cart-badge');
        if (!cartBadge) return;

        const order = window.getOrder();
        const totalItems = order.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
        cartBadge.textContent = String(totalItems);
        cartBadge.classList.toggle('active', totalItems > 0);
    }

    window.updateCartBadge = updateCartBadge;

    function showToast(message) {
        const toastContainer = document.getElementById('toast-container');
        if (!toastContainer) return;

        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.setAttribute('role', 'status');
        toast.textContent = message;

        toastContainer.appendChild(toast);
        setTimeout(() => toast.classList.add('show'), 80);
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                if (toast.parentNode === toastContainer) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, 2000);
    }

    function openModal(modalElement) {
        if (!modalElement) return;

        const main = document.querySelector('main');
        if (main) main.setAttribute('aria-hidden', 'true');

        modalElement.style.display = 'block';
        modalElement.setAttribute('aria-hidden', 'false');
        modalElement.classList.add('show');

        const focusables = Array.from(
            modalElement.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])')
        ).filter((element) => element.offsetParent !== null);

        const previouslyFocused = document.activeElement;
        const firstFocusable = focusables[0] || modalElement;
        firstFocusable.focus();

        const handleKeydown = (event) => {
            if (event.key === 'Escape') {
                closeModal(modalElement);
                return;
            }

            if (event.key === 'Tab' && focusables.length) {
                const currentIndex = focusables.indexOf(document.activeElement);
                if (event.shiftKey && currentIndex === 0) {
                    focusables[focusables.length - 1].focus();
                    event.preventDefault();
                } else if (!event.shiftKey && currentIndex === focusables.length - 1) {
                    focusables[0].focus();
                    event.preventDefault();
                }
            }
        };

        modalElement.__onKey = handleKeydown;
        modalElement.__previouslyFocused = previouslyFocused;
        document.addEventListener('keydown', handleKeydown);
    }

    function closeModal(modalElement) {
        if (!modalElement) return;

        const main = document.querySelector('main');
        if (main) main.removeAttribute('aria-hidden');

        modalElement.style.display = 'none';
        modalElement.setAttribute('aria-hidden', 'true');
        modalElement.classList.remove('show');

        if (modalElement.__onKey) {
            document.removeEventListener('keydown', modalElement.__onKey);
        }

        if (modalElement.__previouslyFocused && typeof modalElement.__previouslyFocused.focus === 'function') {
            modalElement.__previouslyFocused.focus();
        }
    }

    window.showModal = function showModal(title, message, options = {}) {
        const modal = document.getElementById('confirmation-modal');
        if (!modal) return;

        const modalTitle = modal.querySelector('h2');
        const modalBody = modal.querySelector('#modal-message');
        if (modalTitle) modalTitle.textContent = title;
        if (modalBody) modalBody.innerHTML = message;

        const existingActions = modal.querySelector('.modal-actions');
        if (existingActions) existingActions.remove();

        if (options.onConfirm) {
            const actions = document.createElement('div');
            actions.className = 'modal-actions';

            const cancelButton = document.createElement('button');
            cancelButton.textContent = options.cancelText || 'Cancelar';
            cancelButton.className = 'button-secondary';
            cancelButton.onclick = () => closeModal(modal);

            const confirmButton = document.createElement('button');
            confirmButton.textContent = options.confirmText || 'Aceptar';
            confirmButton.className = 'button-primary';
            confirmButton.onclick = () => {
                options.onConfirm();
                closeModal(modal);
            };

            actions.append(cancelButton, confirmButton);
            modal.querySelector('.modal-content').appendChild(actions);
        }

        openModal(modal);
    };

    function renderProducts(searchTerm = '') {
        const productGrid = document.getElementById('product-grid');
        if (!productGrid) return;

        const normalizedTerm = normalizeText(searchTerm).trim();
        const filteredProducts = products.filter((product) => {
            if (!normalizedTerm) return true;
            const productName = normalizeText(product.name);
            const productCategory = normalizeText(product.category);
            const productDescription = normalizeText(product.description);

            return productName.includes(normalizedTerm)
                || productCategory.includes(normalizedTerm)
                || productDescription.includes(normalizedTerm);
        });

        const groupedProducts = filteredProducts.reduce((grouped, product) => {
            const category = product.category || 'Sin categoría';
            if (!grouped[category]) grouped[category] = [];
            grouped[category].push(product);
            return grouped;
        }, {});

        productGrid.innerHTML = '';

        if (!filteredProducts.length) {
            productGrid.innerHTML = '<p class="no-results">No se encontraron productos que coincidan con tu búsqueda.</p>';
            return;
        }

        const categoryOrder = ['Tortas', 'Postres', 'Candy'];
        const fragment = document.createDocumentFragment();

        categoryOrder.forEach((category) => {
            const items = groupedProducts[category];
            if (!items || !items.length) return;

            const categoryTitle = document.createElement('h2');
            categoryTitle.textContent = category;
            fragment.appendChild(categoryTitle);

            const cardsWrapper = document.createElement('div');
            cardsWrapper.className = 'product-grid-inner';

            items.forEach((product) => {
                const card = document.createElement('div');
                card.className = 'product-card';
                card.innerHTML = `
                    <img src="${String(product.image || '').replace(/\.svg$/, '.jfif')}" alt="${product.name}" loading="lazy" width="300" height="200">
                    <div class="product-card-content">
                        <h3>${product.name}</h3>
                        <div class="product-price">${window.formatPrice(product.price)}${product.quantityUnit === 'kg' ? ' / kg' : ''}</div>
                        <p>${product.description}</p>
                        <div class="product-controls">
                            ${window.renderQuantityStepper({
                                id: `qty-${product.id}`,
                                inputClass: 'product-quantity',
                                value: 1,
                                label: product.name,
                                stepUnit: product.quantityUnit === 'kg' ? 'kilos' : 'unidades',
                                displayUnit: product.quantityUnit === 'kg' ? 'kg' : ''
                            })}
                            <button class="add-to-cart-btn" data-id="${product.id}" type="button">Agregar</button>
                        </div>
                    </div>
                `;
                cardsWrapper.appendChild(card);
            });

            fragment.appendChild(cardsWrapper);
        });

        productGrid.appendChild(fragment);
    }

    function setupCatalogInteractions() {
        const productGrid = document.getElementById('product-grid');
        const searchBar = document.getElementById('search-bar');

        if (searchBar) {
            searchBar.addEventListener('input', (event) => renderProducts(event.target.value));
        }

        if (!productGrid) return;

        productGrid.addEventListener('click', async (event) => {
            if (event.target.closest('.quantity-stepper-button')) return;

            const addButton = event.target.closest('.add-to-cart-btn');
            if (addButton) {
                const productId = Number.parseInt(addButton.dataset.id, 10);
                const input = document.getElementById(`qty-${productId}`);
                const quantity = toSafeNumber(input ? input.value : 1, 1);
                if (quantity > 0) {
                    window.addToOrder(productId, quantity);
                }
                return;
            }

            if (event.target.closest('.product-controls')) return;

            const card = event.target.closest('.product-card');
            if (!card) return;

            const productId = Number.parseInt(card.querySelector('.add-to-cart-btn')?.dataset.id || '0', 10);
            if (!productId) return;

            const selectedProduct = getProductById(productId);
            if (!selectedProduct) return;

            const galleryImages = await findAllProductImages(selectedProduct);
            localStorage.setItem(`${PRODUCT_IMAGES_PREFIX}${selectedProduct.id}`, JSON.stringify(galleryImages));

            document.body.classList.add('is-rendering');
            setTimeout(() => {
                window.location.href = `product.html?id=${selectedProduct.id}`;
            }, 280);
        });
    }

    window.addToOrder = function addToOrder(productId, quantity) {
        const product = getProductById(productId);
        if (!product) return;

        const nextQuantity = Math.max(1, toSafeNumber(quantity, 1));
        const order = window.getOrder();
        const existingItem = order.find((item) => item.id === productId);

        if (existingItem) {
            existingItem.quantity += nextQuantity;
        } else {
            order.push({ ...product, quantity: nextQuantity });
        }

        window.saveOrder(order);
        updateCartBadge();

        const cartIcon = document.querySelector('.cart-icon-link');
        if (cartIcon) {
            cartIcon.classList.remove('shake');
            void cartIcon.offsetWidth;
            cartIcon.classList.add('shake');
            setTimeout(() => cartIcon.classList.remove('shake'), 500);
        }

        showToast('Agregado');
    };

    function setupCartModal() {
        const cartLink = document.querySelector('.cart-icon-link');
        const orderModal = document.getElementById('order-modal');
        const orderModalBody = document.getElementById('order-modal-body');
        const orderClose = document.querySelector('.order-close');
        const productModal = document.getElementById('product-modal');
        const productClose = document.querySelector('.product-close');
        const confirmationModal = document.getElementById('confirmation-modal');

        if (confirmationModal) {
            const confirmationClose = confirmationModal.querySelector('.close-btn');
            if (confirmationClose) confirmationClose.onclick = () => closeModal(confirmationModal);
        }

        if (productClose && productModal) {
            productClose.onclick = () => closeModal(productModal);
        }

        if (orderClose && orderModal) {
            orderClose.onclick = () => closeModal(orderModal);
        }

        window.renderOrderTo = function renderOrderTo(container, options = {}) {
            if (!container) return;

            const order = window.getOrder();
            const { isPage = false } = options;

            if (order.length === 0) {
                container.innerHTML = isPage ? '<p>Tu carrito está vacío.</p>' : '<p>Tu carrito está vacío.</p>';
                return;
            }

            const itemsHtml = order.map((item) => `
                <li data-id="${item.id}" class="cart-item">
                    <img src="${String(item.image || '').replace(/\.svg$/, '.jfif')}" alt="${item.name}" class="cart-item-thumbnail" loading="lazy" width="60" height="60">
                    <div class="cart-item-info">
                        <div class="cart-item-name">${item.name}</div>
                        <div class="cart-item-controls">
                            ${window.renderQuantityStepper({
                                inputClass: 'order-qty',
                                productId: item.id,
                                value: item.quantity,
                                label: item.name,
                                stepUnit: window.getQuantityUnit(item) === 'kg' ? 'kilos' : 'unidades',
                                displayUnit: window.getQuantityUnit(item) === 'kg' ? 'kg' : 'unid.'
                            })}
                            <span class="cart-item-price">${window.formatPrice(item.price * item.quantity)}</span>
                        </div>
                    </div>
                    <button class="remove-item-btn" data-id="${item.id}" aria-label="Quitar ${item.name}" type="button">&times;</button>
                </li>
            `).join('');

            const total = order.reduce((sum, item) => sum + item.price * item.quantity, 0);

            if (isPage) {
                container.innerHTML = `
                    <ul id="order-items">${itemsHtml}</ul>
                    <div class="page-order-total"><span>Total</span> <span>${window.formatPrice(total)}</span></div>
                `;
                return;
            }

            container.innerHTML = `
                <h2 id="order-modal-title">Tu Pedido</h2>
                <ul id="order-items">${itemsHtml}</ul>
                <div style="margin-top:12px;font-weight:bold;">Total: ${window.formatPrice(total)}</div>
                <div style="margin-top:16px;display:flex;gap:8px;">
                    <button id="send-order" class="add-to-cart-btn" type="button">Enviar Pedido por WhatsApp</button>
                    <a href="pedido.html">Ir a página de pedido</a>
                </div>
            `;
        };

        if (cartLink && orderModal && orderModalBody) {
            cartLink.addEventListener('click', (event) => {
                event.preventDefault();
                window.renderOrderTo(orderModalBody);
                openModal(orderModal);
            });
        }

        if (orderModalBody) {
            orderModalBody.addEventListener('click', (event) => {
                const sendOrderButton = event.target.closest('#send-order');
                if (sendOrderButton) {
                    const order = window.getOrder();
                    if (order.length === 0) return;

                    const lines = order
                        .map((item) => `${window.formatOrderQuantity(item)} de ${item.name} - ${window.formatPrice(item.price * item.quantity)}`)
                        .join('\n');
                    const total = order.reduce((sum, item) => sum + item.price * item.quantity, 0);
                    const text = `Hola! Quisiera hacer un pedido:\n${lines}\nTotal: ${window.formatPrice(total)}`;
                    const whatsappUrl = `https://wa.me/5493456256330?text=${encodeURIComponent(text)}`;
                    window.open(whatsappUrl, '_blank');
                    return;
                }

                const removeButton = event.target.closest('.remove-item-btn');
                if (removeButton) {
                    const productId = Number.parseInt(removeButton.dataset.id, 10);
                    const currentOrder = window.getOrder();
                    const updatedOrder = currentOrder.filter((item) => item.id !== productId);
                    window.saveOrder(updatedOrder);
                    updateCartBadge();
                    window.renderOrderTo(orderModalBody);
                }
            });

            orderModalBody.addEventListener('change', (event) => {
                const quantityInput = event.target.closest('.order-qty');
                if (!quantityInput) return;

                const productId = Number.parseInt(quantityInput.dataset.id, 10);
                const nextValue = Math.max(1, toSafeNumber(quantityInput.value, 1));
                const order = window.getOrder();
                const item = order.find((entry) => entry.id === productId);

                if (!item) return;

                item.quantity = nextValue;
                window.saveOrder(order);
                updateCartBadge();
                window.renderOrderTo(orderModalBody);
            });
        }

        window.onclick = (event) => {
            if (event.target === confirmationModal) closeModal(confirmationModal);
            if (event.target === productModal) closeModal(productModal);
            if (event.target === orderModal) closeModal(orderModal);
        };
    }

    document.addEventListener('DOMContentLoaded', () => {
        setupQuantitySteppers();
        setupCatalogInteractions();
        setupCartModal();

        const fechaInput = document.getElementById('cliente-fecha');
        if (fechaInput) {
            const today = new Date();
            const formattedToday = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
            fechaInput.setAttribute('min', formattedToday);
        }

        renderProducts();
        updateCartBadge();
    });
})();
