(function () {
    'use strict';

    const state = { imagePreviewUrls: [] };

    function cleanupAndRedirect() {
        document.getElementById('order-form')?.reset();

        const imagePreview = document.getElementById('cliente-imagen-preview');
        if (imagePreview) {
            imagePreview.innerHTML = '';
            imagePreview.setAttribute('aria-hidden', 'true');
        }

        state.imagePreviewUrls.forEach((url) => URL.revokeObjectURL(url));
        state.imagePreviewUrls = [];

        window.clearOrder?.();
        window.location.href = 'index.html';
    }

    function renderOrderSummary() {
        const container = document.getElementById('order-summary-container');
        const formColumn = document.querySelector('.order-form-column');
        if (!container || !formColumn) return;

        const order = window.getOrder?.() || [];

        if (!order.length) {
            container.innerHTML = `
                <div class="cart-empty-message">
                    <p>Tu carrito está vacío.</p>
                    <a href="index.html" class="button-primary">Ver catálogo</a>
                </div>
            `;
            formColumn.style.display = 'none';
            return;
        }

        formColumn.style.display = '';

        const total = order.reduce((sum, item) => sum + item.price * item.quantity, 0);
        const itemsHtml = order.map((item) => `
            <li class="cart-item" data-id="${item.id}">
                <img src="${String(item.image || '').replace(/\.svg$/, '.jfif')}" alt="${item.name}" class="cart-item-thumbnail">
                <div class="cart-item-info">
                    <div class="cart-item-name">${item.name}</div>
                    <span class="summary-item-price" style="font-size: 0.9rem; color: #777;">${window.formatPrice(item.price)} ${window.getQuantityUnit(item) === 'kg' ? '/ kg' : 'c/u'}</span>
                </div>
                <div class="cart-item-controls">
                    <span class="cart-item-price">${window.formatPrice(item.price * item.quantity)}</span>
                    ${window.renderQuantityStepper({
                        inputClass: 'order-qty',
                        productId: item.id,
                        value: item.quantity,
                        label: item.name,
                        stepUnit: window.getQuantityUnit(item) === 'kg' ? 'kilos' : 'unidades',
                        displayUnit: window.getQuantityUnit(item) === 'kg' ? 'kg' : 'unid.'
                    })}
                </div>
                <button class="remove-item-btn" aria-label="Eliminar ${item.name}" type="button">&times;</button>
            </li>
        `).join('');

        container.innerHTML = `
            <ul id="order-items">${itemsHtml}</ul>
            <div class="summary-total">
                <span>Total</span>
                <span id="summary-total-price">${window.formatPrice(total)}</span>
            </div>
        `;
    }

    function updateItemQuantity(productId, value) {
        const order = window.getOrder?.() || [];
        const item = order.find((entry) => entry.id === productId);
        if (!item) return;

        item.quantity = Math.max(1, value);

        window.saveOrder?.(order);
        window.updateCartBadge?.();
        renderOrderSummary();
    }

    function removeItem(productId) {
        const itemElement = document.querySelector(`.cart-item[data-id="${productId}"]`);
        if (!itemElement) return;

        itemElement.style.animation = 'fadeOut 0.4s ease-out forwards';
        itemElement.addEventListener('animationend', () => {
            const order = window.getOrder?.() || [];
            const updatedOrder = order.filter((item) => item.id !== productId);
            window.saveOrder?.(updatedOrder);
            window.updateCartBadge?.();
            renderOrderSummary();
        }, { once: true });
    }

    async function handleFormSubmit(event) {
        event.preventDefault();
        event.stopPropagation();

        const order = window.getOrder?.() || [];
        if (!order.length) {
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

        if (!/^\d{10}$/.test(phone)) {
            window.showModal('Teléfono incorrecto', 'Ingresá un número de 10 dígitos sin espacios ni caracteres especiales.<br>Ej: 3456123456');
            document.getElementById('cliente-telefono').focus();
            return;
        }

        const total = order.reduce((sum, item) => sum + item.quantity * item.price, 0);
        let message = '¡Hola Dulce Nicobella! \n\nQuisiera hacer el siguiente pedido:\n\n';

        order.forEach((item) => {
            message += `*${window.formatOrderQuantity(item)}* - ${item.name} (${window.formatPrice(item.quantity * item.price)})\n`;
        });

        message += `\n*TOTAL: ${window.formatPrice(total)}*\n\n*Datos del Cliente:*\n`;
        message += `*Nombre:* ${name}\n*Teléfono:* ${phone}\n*Fecha de Entrega:* ${deliveryDate}\n`;

        const comments = document.getElementById('cliente-comentarios').value.trim();
        if (comments) message += `*Comentarios:* ${comments}\n`;

        const imageFiles = Array.from(document.getElementById('cliente-imagen').files);
        if (imageFiles.length) {
            message += `\n*Nota:* Se adjuntarán ${imageFiles.length} imagen(es) de referencia en el chat.`;
        }

        message += '\n¡Muchas gracias!';

        window.open(`https://wa.me/5493456256330?text=${encodeURIComponent(message)}`, '_blank');
        window.showModal('¡Pedido en camino!', 'Se está abriendo WhatsApp. Una vez enviado el mensaje, serás redirigido al catálogo en 5 segundos.');
        setTimeout(cleanupAndRedirect, 5000);
    }

    function setupEventListeners() {
        const orderForm = document.getElementById('order-form');
        orderForm?.addEventListener('submit', handleFormSubmit);

        const summaryContainer = document.getElementById('order-summary-container');
        summaryContainer?.addEventListener('click', (event) => {
            const target = event.target;
            const item = target.closest('.cart-item');
            if (!item) return;

            const productId = Number.parseInt(item.dataset.id, 10);

            if (target.classList.contains('remove-item-btn')) {
                removeItem(productId);
            }
        });

        summaryContainer?.addEventListener('change', (event) => {
            const target = event.target;
            if (!target.classList.contains('order-qty')) return;

            const productId = Number.parseInt(target.dataset.id, 10);
            const quantity = Number.parseInt(target.value, 10);
            updateItemQuantity(productId, Number.isFinite(quantity) ? quantity : 1);
        });

        const imageInput = document.getElementById('cliente-imagen');
        const imagePreview = document.getElementById('cliente-imagen-preview');

        imageInput?.addEventListener('change', (event) => {
            imagePreview.innerHTML = '';
            state.imagePreviewUrls.forEach((url) => URL.revokeObjectURL(url));
            state.imagePreviewUrls = [];

            const files = Array.from(event.target.files);
            if (!files.length) {
                imagePreview.setAttribute('aria-hidden', 'true');
                return;
            }

            imagePreview.setAttribute('aria-hidden', 'false');
            files.forEach((file) => {
                if (!file.type.startsWith('image/')) return;

                const url = URL.createObjectURL(file);
                state.imagePreviewUrls.push(url);

                const wrap = document.createElement('div');
                wrap.className = 'preview-wrap';
                wrap.innerHTML = `<img src="${url}" alt="Previsualización">`;
                imagePreview.appendChild(wrap);
            });
        });
    }

    document.addEventListener('DOMContentLoaded', () => {
        renderOrderSummary();
        setupEventListeners();
        window.updateCartBadge?.();
    });
})();
