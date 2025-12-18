(function() {
    'use strict';

    // Estado local para la gestión de la página
    const state = {
        imagePreviewUrls: [],
    };

    /**
     * Muestra un modal de confirmación/error.
     */
    function showModal(title, message) {
        const modal = document.getElementById('confirmation-modal');
        if (!modal) return;
        modal.querySelector('h2').textContent = title;
        modal.querySelector('#modal-message').innerHTML = message;
        modal.style.display = 'block';

        const closeModalBtn = modal.querySelector('.close-btn');
        if (closeModalBtn) {
            closeModalBtn.onclick = () => { modal.style.display = 'none'; };
        }
    }

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
            <li class="summary-item" data-id="${item.id}">
                <img src="${item.image.replace('.svg', '.jfif')}" alt="${item.name}" class="summary-item-thumbnail">
                <div class="summary-item-details">
                    <span class="summary-item-name">${item.name}</span>
                    <span class="summary-item-price">${window.formatPrice(item.price)} c/u</span>
                </div>
                <div class="summary-item-controls">
                    <input type="number" class="summary-item-qty" value="${item.quantity}" min="1" aria-label="Cantidad de ${item.name}">
                    <span class="summary-item-subtotal">${window.formatPrice(item.price * item.quantity)}</span>
                </div>
                <button class="summary-item-remove" aria-label="Eliminar ${item.name}">&times;</button>
            </li>
        `).join('');

        const total = order.reduce((sum, item) => sum + item.price * item.quantity, 0);

        container.innerHTML = `
            <ul class="summary-list">${itemsHtml}</ul>
            <div class="summary-total">
                <span>Total</span>
                <span id="summary-total-price">${window.formatPrice(total)}</span>
            </div>
        `;
    }

    /**
     * Actualiza la cantidad de un item en el pedido.
     */
    function updateItemQuantity(productId, newQuantity) {
        let order = window.getOrder?.() || [];
        const item = order.find(i => i.id === productId);
        if (item) {
            item.quantity = newQuantity;
            window.saveOrder?.(order);
            window.updateCartBadge?.();
            renderOrderSummary(); // Re-render para actualizar todo
        }
    }

    /**
     * Elimina un item del pedido.
     */
    function removeItem(productId) {
        let order = window.getOrder?.() || [];
        const updatedOrder = order.filter(i => i.id !== productId);
        window.saveOrder?.(updatedOrder);
        window.updateCartBadge?.();
        renderOrderSummary(); // Re-render para actualizar todo
    }

    /**
     * Maneja el envío del formulario.
     */
    async function handleFormSubmit(event) {
        event.preventDefault();
        event.stopPropagation();

        const order = window.getOrder?.() || [];
        if (order.length === 0) {
            showModal('Error', 'Tu carrito está vacío.');
            return;
        }

        const name = document.getElementById('cliente-nombre').value.trim();
        const phone = document.getElementById('cliente-telefono').value.trim();
        const deliveryDate = document.getElementById('cliente-fecha').value;

        if (!name || !phone || !deliveryDate) {
            showModal('Error', 'Por favor, completá los campos obligatorios: Nombre, Teléfono y Fecha de Entrega.');
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

        showModal('¡Pedido en camino!', 'Se está abriendo WhatsApp. Una vez enviado el mensaje, serás redirigido al catálogo en 5 segundos.');
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
        summaryContainer?.addEventListener('change', (event) => {
            if (event.target.classList.contains('summary-item-qty')) {
                const li = event.target.closest('.summary-item');
                const productId = parseInt(li.dataset.id, 10);
                const newQuantity = parseInt(event.target.value, 10);
                if (productId && newQuantity > 0) {
                    updateItemQuantity(productId, newQuantity);
                }
            }
        });

        summaryContainer?.addEventListener('click', (event) => {
            if (event.target.classList.contains('summary-item-remove')) {
                const li = event.target.closest('.summary-item');
                const productId = parseInt(li.dataset.id, 10);
                if (productId) {
                    removeItem(productId);
                }
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