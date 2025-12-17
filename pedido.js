document.addEventListener('DOMContentLoaded', () => {

    // --- ELEMENTOS DEL DOM ---
    const orderItemsList = document.getElementById('pedido-items');
    const orderTotalContainer = document.getElementById('order-total-container');
    const orderForm = document.getElementById('order-form');
    const cartBadge = document.getElementById('cart-badge');
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

    function clearOrder() {
        localStorage.removeItem('dulceNicobellaOrder');
    }
    
    function updateCartBadge() {
        const order = getOrder();
        const totalItems = order.reduce((sum, item) => sum + item.quantity, 0);
        if (cartBadge) {
            cartBadge.textContent = totalItems;
        }
    }

    function removeFromOrder(productId) {
        let order = getOrder();
        order = order.filter(item => item.id !== productId);
        saveOrder(order);
        renderOrder(); // Re-render la lista y el total
        updateCartBadge();
    }
    
    // --- FUNCIÓN PARA FORMATEAR PRECIOS ---
    function formatPrice(price) {
        return `$${price.toLocaleString('es-AR')}`;
    }

    // --- RENDERIZADO DE LA LISTA DE PEDIDO ---
    function renderOrder() {
        const listaContainer = document.getElementById('lista-pedido');
        if (!listaContainer || !orderItemsList || !orderTotalContainer) return;

        const order = getOrder();

        // Si no hay items, mostrar mensaje y ocultar formulario
        if (order.length === 0) {
            if (window.renderOrderTo) {
                window.renderOrderTo(listaContainer);
                // Remove 'Ir a página de pedido' link if present (redundante en esta página)
                const gotoLink = listaContainer.querySelector('a[href="pedido.html"]');
                if (gotoLink) gotoLink.remove();
            } else {
                orderItemsList.innerHTML = '<li>Tu carrito está vacío. <a href="index.html">Volver al catálogo</a>.</li>';
                orderTotalContainer.innerHTML = '';
            }

            // Ocultar el formulario si el carrito está vacío
            const formFields = document.querySelectorAll('#order-form .form-group, #submit-pedido');
            formFields.forEach(field => field.style.display = 'none');
            return;
        }

        // Mostrar formulario si hay items
        const formFields = document.querySelectorAll('#order-form .form-group, #submit-pedido');
        formFields.forEach(field => field.style.display = '');

        // Usar renderer compartido para poblar la lista y total
        if (window.renderOrderTo) {
            window.renderOrderTo(listaContainer);
            // Remove redundant 'Ir a página de pedido' link when already on this page
            const gotoLink = listaContainer.querySelector('a[href="pedido.html"]');
            if (gotoLink) gotoLink.remove();
        } else {
            // Fallback al renderizado local (shouldn't usually happen)
            orderItemsList.innerHTML = '';
            orderTotalContainer.innerHTML = '';
            let total = 0;
            order.forEach(item => {
                const listItem = document.createElement('li');
                const subtotal = item.quantity * item.price;
                total += subtotal;
                listItem.innerHTML = `
                    <span>${item.quantity} x ${item.name}</span>
                    <span>${formatPrice(subtotal)}</span>
                    <button class="remove-item-btn" data-id="${item.id}">X</button>
                `;
                orderItemsList.appendChild(listItem);
            });
            const totalElement = document.createElement('div');
            totalElement.className = 'order-total';
            totalElement.innerHTML = `<strong>Total del Pedido:</strong> <span>${formatPrice(total)}</span>`;
            orderTotalContainer.appendChild(totalElement);
        }

        // Adjuntar manejadores a los elementos renderizados (el renderer global no los incluye)
        listaContainer.querySelectorAll('.remove-item, .remove-item-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = parseInt(e.target.dataset.id);
                let ord = getOrder();
                ord = ord.filter(i => i.id !== id);
                saveOrder(ord);
                renderOrder();
                updateCartBadge();
            });
        });

        listaContainer.querySelectorAll('.order-qty').forEach(input => {
            input.addEventListener('change', (e) => {
                const id = parseInt(e.target.dataset.id);
                const val = Math.max(1, parseInt(e.target.value) || 1);
                const ord = getOrder();
                const item = ord.find(i => i.id === id);
                if (item) item.quantity = val;
                saveOrder(ord);
                renderOrder();
                updateCartBadge();
            });
        });

        const sendBtn = listaContainer.querySelector('#send-order');
        if (sendBtn) {
            sendBtn.addEventListener('click', () => {
                const ord = getOrder();
                // Use the global share function
                if (window.shareOrderViaWhatsapp) window.shareOrderViaWhatsapp(ord);
            });
        }
    }

    // --- MANEJO DE EVENTOS ---
    if (orderItemsList) {
        orderItemsList.addEventListener('click', (e) => {
            if (e.target.classList.contains('remove-item-btn')) {
                const productId = parseInt(e.target.dataset.id);
                removeFromOrder(productId);
            }
        });
    }

    // --- MANEJO DEL FORMULARIO ---
    if (orderForm) {
        orderForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const order = getOrder();
            const name = document.getElementById('cliente-nombre').value.trim();
            const email = document.getElementById('cliente-email').value.trim();
            const phone = document.getElementById('cliente-telefono').value.trim();
            const deliveryDate = document.getElementById('cliente-fecha').value;

            if (order.length === 0) {
                showModal('Error', 'Tu carrito está vacío.');
                return;
            }

            // Email no es obligatorio. Verificamos: nombre, teléfono y fecha.
            if (!name || !phone || !deliveryDate) {
                showModal('Error', 'Por favor, completa los campos obligatorios: Nombre, Teléfono y Fecha de Entrega.');
                return;
            }
            
            let total = order.reduce((sum, item) => sum + item.quantity * item.price, 0);
            let message = `¡Hola Dulce Nicobella! \n\nQuisiera hacer el siguiente pedido:\n\n`;
            order.forEach(item => {
                const subtotal = item.quantity * item.price;
                message += `*${item.quantity}x* - ${item.name} (${formatPrice(subtotal)})\n`;
            });
            message += `\n*TOTAL: ${formatPrice(total)}*\n`;
            message += `\n*Datos del Cliente:*\n`;
            message += `*Nombre:* ${name}\n*Email:* ${email}\n*Teléfono:* ${phone}\n*Fecha de Entrega deseada:* ${deliveryDate}\n`;
            
            const comments = document.getElementById('cliente-comentarios').value.trim();
            if (comments) message += `*Comentarios:* ${comments}\n`;

            const imageFiles = Array.from(document.getElementById('cliente-imagen').files);
            if (imageFiles.length) message += `\n*Nota:* Se adjuntarán ${imageFiles.length} imagen(es) de referencia en el chat.`;
            
            message += `\n¡Muchas gracias!`;

            // Intentar usar Web Share API para adjuntar las imágenes automáticamente.
            let sharedViaWebShare = false;

            if (imageFiles.length && navigator.share) {
                // Algunos navegadores ofrecen navigator.canShare para verificar soporte de archivos
                const canShareFiles = (typeof navigator.canShare !== 'undefined')
                    ? navigator.canShare({ files: imageFiles })
                    : true; // si canShare no existe, intentamos share y lo capturamos

                if (canShareFiles) {
                    try {
                        await navigator.share({ files: imageFiles, text: message });
                        sharedViaWebShare = true;
                        showModal('¡Pedido compartido!', 'Se abrió la hoja de compartir. Elegí WhatsApp y seleccioná el contacto de Dulce Nicobella para enviar las imágenes. Serás redirigido al catálogo en unos segundos.');
                    } catch (err) {
                        // Falló compartir (usuario canceló o navegador no permite), haremos fallback
                        console.warn('Web Share fallo:', err);
                    }
                }
            }

            if (!sharedViaWebShare) {
                // Fallback clásico: abrir wa.me con el texto (las imágenes deben adjuntarse manualmente)
                if (imageFiles.length) {
                    showModal('Atención', 'Tu navegador no permite adjuntar archivos automáticamente. Se abrirá WhatsApp con el texto; por favor adjunta manualmente las imágenes cuando el chat se abra.');
                } else {
                    showModal('¡Pedido en camino!', 'Tu pedido está siendo enviado por WhatsApp. Serás redirigido al catálogo en unos segundos.');
                }

                const whatsappUrl = `https://wa.me/5493456256330?text=${encodeURIComponent(message)}`;
                window.open(whatsappUrl, '_blank');
            }

            // Limpieza de preview y archivos seleccionados
            setTimeout(() => {
                const imageInputEl = document.getElementById('cliente-imagen');
                const imagePreviewEl = document.getElementById('cliente-imagen-preview');
                if (imageInputEl) {
                    imageInputEl.value = '';
                    try { imageInputEl.files = new DataTransfer().files; } catch (err) { /* ignore */ }
                }

                // Revoke object URLs
                if (typeof __currentImageUrls !== 'undefined' && Array.isArray(__currentImageUrls)) {
                    __currentImageUrls.forEach(u => { if (u) URL.revokeObjectURL(u); });
                    __currentImageUrls = [];
                }

                if (imagePreviewEl) { imagePreviewEl.innerHTML = ''; imagePreviewEl.setAttribute('aria-hidden','true'); }

                clearOrder();
                updateCartBadge();
                window.location.href = 'index.html';
            }, 4000);
        });
    }

    // --- PREVISUALIZACIÓN DE IMÁGENES + GESTIÓN ---
    const imageInput = document.getElementById('cliente-imagen');
    const imagePreview = document.getElementById('cliente-imagen-preview');
    let __currentImageUrls = []; // array of generated object URLs
    let selectedImages = []; // array of File objects

    const uploadLabel = document.querySelector('label.upload-btn[for="cliente-imagen"]');

    if (imageInput && imagePreview) {
        function renderImagePreviews() {
            imagePreview.innerHTML = '';
            if (!selectedImages.length) {
                imagePreview.setAttribute('aria-hidden', 'true');
                return;
            }
            selectedImages.forEach((file, idx) => {
                const url = __currentImageUrls[idx];
                const wrap = document.createElement('div');
                wrap.className = 'preview-wrap';
                wrap.innerHTML = `<img src="${url}" alt="Imagen de referencia"><button type="button" class="remove-preview" data-index="${idx}" aria-label="Eliminar imagen">✕</button>`;
                imagePreview.appendChild(wrap);
            });
            imagePreview.setAttribute('aria-hidden', 'false');

            imagePreview.querySelectorAll('.remove-preview').forEach(btn => {
                btn.addEventListener('click', (ev) => {
                    const idx = parseInt(ev.currentTarget.dataset.index);
                    if (isNaN(idx)) return;
                    // Remove selected image
                    selectedImages.splice(idx, 1);
                    // Rebuild FileList via DataTransfer
                    const dt = new DataTransfer();
                    selectedImages.forEach(f => dt.items.add(f));
                    try { imageInput.files = dt.files; } catch (err) { /* ignore on older browsers */ }
                    // Revoke and recreate URLs
                    __currentImageUrls.forEach(u => { if (u) URL.revokeObjectURL(u); });
                    __currentImageUrls = selectedImages.map(f => URL.createObjectURL(f));
                    // Re-render previews
                    renderImagePreviews();
                });
            });
        }

        imageInput.addEventListener('change', (e) => {
            const files = Array.from(e.target.files || []).filter(f => f && f.type && f.type.startsWith('image/'));
            // Clean previous URLs
            __currentImageUrls.forEach(u => { if (u) URL.revokeObjectURL(u); });
            __currentImageUrls = [];
            imagePreview.innerHTML = '';
            imagePreview.setAttribute('aria-hidden', 'true');

            if (!files.length) return;

            selectedImages = files;
            __currentImageUrls = selectedImages.map(f => URL.createObjectURL(f));
            renderImagePreviews();
        });

        // Apertura del input desde el label por teclado (Enter/Space)
        if (uploadLabel) {
            uploadLabel.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
                    e.preventDefault();
                    imageInput.click();
                }
            });
        }
    }



    // --- FUNCIONALIDAD DEL MODAL ---
    function showModal(title, message) {
        if (!modal) return;
        modal.querySelector('h2').textContent = title;
        modal.querySelector('#modal-message').innerHTML = message;
        modal.style.display = 'block';
    }
    
    if (closeModalBtn) {
        closeModalBtn.onclick = () => { if (modal) modal.style.display = 'none'; }
    }
    
    window.onclick = (event) => {
        if (event.target == modal) { if (modal) modal.style.display = 'none'; }
    }
    
    // --- INICIALIZACIÓN ---
    renderOrder();
    updateCartBadge();
});
