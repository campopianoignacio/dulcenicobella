(function() {
    'use strict';

    // Estado local para la gestión de la página
    const state = {
        imagePreviewUrls: [],
    };

    /**
     * Muestra un modal de confirmación/error.
     */

    /**
     * Limpia el formulario, el carrito y redirige al inicio.
     */
    function cleanupAndRedirect() {
        document.getElementById('order-form')?.reset();

        const imagePreviewEl = document.getElementById('cliente-imagen-preview');
        if (imagePreviewEl) {
            imagePreviewEl.innerHTML = '';
            imagePreviewEl.setAttribute('aria-hidden', 'true');
        }
        state.imagePreviewUrls.forEach(url => URL.revokeObjectURL(url));
        state.imagePreviewUrls = [];

        window.clearOrder?.();
        window.location.href = 'index.html';
    }

    /**
     * Renderiza el resumen completo del pedido en su contenedor.
     */
    function renderOrderSummary() {
        const container = document.getElementById('order-summary-container');
        const formColumn = document.querySelector('.order-form-column');
        if (!container || !formColumn) return;

        const order = window.getOrder?.() || [];

        if (order.length === 0) {
            container.innerHTML = `
                <div class="cart-empty-message">
                    <p>Tu carrito está vacío.</p>
                    <a href="index.html" class="button-primary">Ver catálogo</a>
                </div>
            `;
            formColumn.style.display = 'none'; // Ocultar formulario si no hay pedido
            return;
        }

        formColumn.style.display = ''; // Asegurarse de que el formulario sea visible

        const itemsHtml = order.map(item => `
            <li class="cart-item" data-id="${item.id}">
                <img src="${item.image.replace('.svg', '.jfif')}" alt="${item.name}" class="cart-item-thumbnail">
                <div class="cart-item-info">
                    <div class="cart-item-name">${item.name}</div>
                    <span class="summary-item-price" style="font-size: 0.9rem; color: #777;">${window.formatPrice(item.price)} c/u</span>
                </div>
                <div class="cart-item-controls">
                    <span class="cart-item-price">${window.formatPrice(item.price * item.quantity)}</span>
                    <div class="quantity-stepper">
                        <button class="quantity-btn down" data-amount="-1" aria-label="Disminuir cantidad">‹</button>
                        <span class="quantity-value">${item.quantity}</span>
                        <button class="quantity-btn up" data-amount="1" aria-label="Aumentar cantidad">›</button>
                    </div>
                </div>
                <button class="remove-item-btn" aria-label="Eliminar ${item.name}">&times;</button>
            </li>
        `).join('');

        const total = order.reduce((sum, item) => sum + item.price * item.quantity, 0);

        container.innerHTML = `
            <ul id="order-items">${itemsHtml}</ul>
            <div class="summary-total">
                <span>Total</span>
                <span id="summary-total-price">${window.formatPrice(total)}</span>
            </div>
            <div class="summary-actions">
                <button id="clear-cart-btn" class="button-link-danger">Vaciar carrito</button>
            </div>
        `;
    }

    /**
     * Actualiza la cantidad de un item en el pedido.
     */
    function updateItemQuantity(productId, value, isRelative = false) {
        let order = window.getOrder?.() || [];
        const item = order.find(i => i.id === productId);
        if (item) {
            if (isRelative) {
                item.quantity += value;
            } else {
                item.quantity = value;
            }
            // Asegurarse de que la cantidad nunca sea menor que 1
            if (item.quantity < 1) item.quantity = 1;

            const oldTotal = window.getOrder?.().reduce((sum, i) => sum + i.price * i.quantity, 0);

            window.saveOrder?.(order);
            window.updateCartBadge?.();
            renderOrderSummary(); // Re-render para actualizar todo

            const newTotal = order.reduce((sum, i) => sum + i.price * i.quantity, 0);
            if (oldTotal !== newTotal) {
                const totalEl = document.getElementById('summary-total-price');
                totalEl?.classList.add('price-update');
                totalEl?.addEventListener('animationend', () => totalEl.classList.remove('price-update'), { once: true });
            }
        }
    }

    /**
     * Elimina un item del pedido.
     */
    function removeItem(productId) {
        const itemElement = document.querySelector(`.cart-item[data-id="${productId}"]`);
        if (!itemElement) return;

        // Añade una clase para la animación de salida
        itemElement.style.animation = 'fadeOut 0.4s ease-out forwards';

        // Espera a que la animación termine para eliminar el elemento y actualizar el estado
        itemElement.addEventListener('animationend', () => {
            let order = window.getOrder?.() || [];
            const updatedOrder = order.filter(i => i.id !== productId);
            window.saveOrder?.(updatedOrder);
            window.updateCartBadge?.();
            renderOrderSummary(); // Re-render para actualizar el total y el estado general
        }, { once: true }); // El listener se ejecuta solo una vez
    }

    /**
     * Maneja el envío del formulario.
     */
    async function handleFormSubmit(event) {
        event.preventDefault();
        event.stopPropagation();

        const order = window.getOrder?.() || [];
        if (order.length === 0) {
            window.showModal('Error', 'Tu carrito está vacío.');
            return;
        }

        const name = document.getElementById('cliente-nombre').value.trim();
        const phone = document.getElementById('cliente-telefono').value.trim();
        const deliveryDate = document.getElementById('cliente-fecha').value;

        if (!name || !phone || !deliveryDate) {
            window.showModal('Error', 'Por favor, completá los campos obligatorios: Nombre, Teléfono y Fecha de Entrega.');
            return;
        }

        // Validación del formato del teléfono
        const phoneRegex = /^\d{10}$/;
        if (!phoneRegex.test(phone)) {
            window.showModal('Teléfono incorrecto', 'Por favor, ingresá un número de 10 dígitos sin espacios ni caracteres especiales.<br>Ej: 3456123456');
            document.getElementById('cliente-telefono').focus(); // Ayuda al usuario a corregirlo
            return;
        }

        // Construcción del mensaje para WhatsApp.
        const total = order.reduce((sum, item) => sum + item.quantity * item.price, 0);
        let message = `¡Hola Dulce Nicobella! \n\nQuisiera hacer el siguiente pedido:\n\n`;
        order.forEach(item => {
            message += `*${item.quantity}x* - ${item.name} (${window.formatPrice(item.quantity * item.price)})\n`;
        });
        message += `\n*TOTAL: ${window.formatPrice(total)}*\n\n*Datos del Cliente:*\n`;
        message += `*Nombre:* ${name}\n*Teléfono:* ${phone}\n*Fecha de Entrega:* ${deliveryDate}\n`;

        const comments = document.getElementById('cliente-comentarios').value.trim();
        if (comments) message += `*Comentarios:* ${comments}\n`;

        const imageFiles = Array.from(document.getElementById('cliente-imagen').files);
        if (imageFiles.length) {
            message += `\n*Nota:* Se adjuntarán ${imageFiles.length} imagen(es) de referencia en el chat.`;
        }
        message += `\n¡Muchas gracias!`;

        const whatsappUrl = `https://wa.me/5493456256330?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, '_blank');

        window.showModal('¡Pedido en camino!', 'Se está abriendo WhatsApp. Una vez enviado el mensaje, serás redirigido al catálogo en 5 segundos.');
        setTimeout(cleanupAndRedirect, 5000);
    }

    /**
     * Configura los event listeners para la página.
     */
    function setupEventListeners() {
        // Listener para el formulario
        const orderForm = document.getElementById('order-form');
        orderForm?.addEventListener('submit', handleFormSubmit);

        // Listeners para el resumen del pedido (usando delegación de eventos)
        const summaryContainer = document.getElementById('order-summary-container');

        summaryContainer?.addEventListener('click', (event) => {
            const target = event.target;

            // Manejar clic en el botón "Vaciar Carrito"
            if (target.id === 'clear-cart-btn') {
                window.showModal('Confirmar acción', '¿Estás seguro de que querés vaciar el carrito?', {
                    confirmText: 'Sí, vaciar',
                    onConfirm: () => {
                        window.clearOrder?.();
                        renderOrderSummary();
                        window.updateCartBadge?.();
                    }
                });
                return; // Terminar la ejecución aquí
            }

            // El resto de la lógica depende de estar dentro de un item del carrito
            const li = target.closest('.cart-item');
            if (!li) return; // Salir si el clic no fue dentro de un item

            if (target.classList.contains('remove-item-btn')) {
                const productId = parseInt(li.dataset.id, 10);
                if (productId) {
                    removeItem(productId);
                }
            } else if (target.classList.contains('quantity-btn')) {
                const productId = parseInt(li.dataset.id, 10);
                const amount = parseInt(target.dataset.amount, 10);
                // El tercer parámetro 'true' indica que es un cambio relativo (sumar/restar)
                updateItemQuantity(productId, amount, true);
            }
        });

        // Listener para previsualización de imágenes
        const imageInput = document.getElementById('cliente-imagen');
        const imagePreview = document.getElementById('cliente-imagen-preview');
        if (imageInput && imagePreview) {
            imageInput.addEventListener('change', (event) => {
                imagePreview.innerHTML = '';
                state.imagePreviewUrls.forEach(url => URL.revokeObjectURL(url));
                state.imagePreviewUrls = [];

                const files = Array.from(event.target.files);
                if (files.length === 0) {
                    imagePreview.setAttribute('aria-hidden', 'true');
                    return;
                }

                imagePreview.setAttribute('aria-hidden', 'false');
                files.forEach(file => {
                    if (file.type.startsWith('image/')) {
                        const url = URL.createObjectURL(file);
                        state.imagePreviewUrls.push(url);
                        const wrap = document.createElement('div');
                        wrap.className = 'preview-wrap';
                        wrap.innerHTML = `<img src="${url}" alt="Previsualización">`;
                        imagePreview.appendChild(wrap);
                    }
                });
            });
        }
    }

    /**
     * Función principal que se ejecuta al cargar el DOM.
     */
    function main() {
        renderOrderSummary();
        setupEventListeners();
        window.updateCartBadge?.();
    }

    // Ejecutar al cargar la página
    document.addEventListener('DOMContentLoaded', main);

})();