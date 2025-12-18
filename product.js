document.addEventListener('DOMContentLoaded', () => {
        const productDetailSection = document.getElementById('product-detail');
    if (!productDetailSection) return;

    const urlParams = new URLSearchParams(window.location.search);
    const productId = parseInt(urlParams.get('id'), 10);
    const products = window.DULCE_PRODUCTS || [];

     if (!productId) {
        productDetailSection.innerHTML = '<p>Producto no encontrado. <a href="index.html">Volver al catálogo</a>.</p>';
        return;
    }

        const product = products.find(p => p.id === productId);
    if (!product) {
        productDetailSection.innerHTML = '<p>Producto no encontrado. <a href="index.html">Volver al catálogo</a>.</p>';
        return;
    }

    // Recuperar imágenes de la galería o usar la imagen principal como fallback
    const storedImages = JSON.parse(localStorage.getItem(`productImages_${product.id}`) || '[]');
    const galleryImages = storedImages.length > 0 ? storedImages : [product.image.replace(/\.svg$/, '.jfif')];

    // --- RENDERIZADO DE LA GALERÍA Y LA PÁGINA ---
    function renderProductPage() {
        const mainImageHtml = galleryImages.map((src, index) => `<img src="${src}" alt="${product.name}" class="gallery-image ${index === 0 ? 'active' : ''}">`).join('');
        
        const thumbnailsHtml = galleryImages.length > 1 ? `
            <div class="gallery-thumbnails">
                ${galleryImages.map((src, index) => `
                    <button class="thumbnail-item ${index === 0 ? 'active' : ''}" data-index="${index}">
                        <img src="${src}" alt="Miniatura ${index + 1}">
                    </button>
                `).join('')}
            </div>
        ` : '';

        const galleryHtml = `
            <div class="product-detail-media">
                <div class="gallery-container">
                    <div class="gallery-main-image">
                        <div class="gallery-track" style="--image-count: ${galleryImages.length};">
                            ${mainImageHtml}
                        </div>
                    </div>
                    ${galleryImages.length > 1 ? `
                        <button class="gallery-nav prev" aria-label="Anterior">‹</button>
                        <button class="gallery-nav next" aria-label="Siguiente">›</button>
                        <div class="gallery-counter">1 / ${galleryImages.length}</div>
                    ` : ''}
                </div>
                ${thumbnailsHtml}
            </div>
        `;

           productDetailSection.innerHTML = `
            <div class="product-detail-grid">
                ${galleryHtml}
                <div class="product-detail-info">
                    <h1>${product.name}</h1>
                    <div class="product-price-detail">${window.formatPrice(product.price)}</div>
                    <p>${product.description}</p>
                    <div class="product-controls">
                        <input id="detail-qty" type="number" min="1" value="1" class="product-quantity">
                        <button id="detail-add" class="add-to-cart-btn" data-id="${product.id}">Agregar al carrito</button>
                    </div>
                </div>
            </div>
        `;
    }

    // --- LÓGICA DE LA GALERÍA ---
    function setupGalleryControls() {
        const images = productDetailSection.querySelectorAll('.gallery-image');
        if (images.length <= 1) return;

    let currentIndex = 0;
        const totalImages = galleryImages.length;
        const counter = productDetailSection.querySelector('.gallery-counter');
        const thumbnails = productDetailSection.querySelectorAll('.thumbnail-item');

        function updateGallery(newIndex) {
            // Oculta la imagen actual
            images[currentIndex].classList.remove('active');
            thumbnails[currentIndex].classList.remove('active');

            // Muestra la nueva imagen
            currentIndex = newIndex;
            images[currentIndex].classList.add('active');
            thumbnails[currentIndex].classList.add('active');

            // Actualiza el contador
            if (counter) counter.textContent = `${currentIndex + 1} / ${totalImages}`;
        }

        productDetailSection.querySelector('.next')?.addEventListener('click', () => {
            updateGallery((currentIndex + 1) % totalImages);
        });

        productDetailSection.querySelector('.prev')?.addEventListener('click', () => {
            updateGallery((currentIndex - 1 + totalImages) % totalImages);
        });

        thumbnails.forEach(thumb => {
            thumb.addEventListener('click', () => {
                updateGallery(parseInt(thumb.dataset.index, 10));
            });
        });
    }

    // --- LÓGICA DE LA PÁGINA ---
    function setupPageLogic() {
        // Botón "Agregar al carrito"
        const addButton = document.getElementById('detail-add');
        if (addButton) {
            addButton.addEventListener('click', () => {
                const quantity = parseInt(document.getElementById('detail-qty').value, 10);
                if (quantity > 0) {
                    window.addToOrder?.(product.id, quantity);
                }
            });
        }

        // Actualización dinámica de precio
        const quantityInput = document.getElementById('detail-qty');
        const priceDisplay = document.querySelector('.product-price-detail');
        if (quantityInput && priceDisplay) {
            const basePrice = product.price;
            quantityInput.addEventListener('input', () => {
                const quantity = parseInt(quantityInput.value) || 1;
                priceDisplay.textContent = window.formatPrice(basePrice * quantity);
            });
        }

        // Actualizar contador del carrito
        window.updateCartBadge?.();
    }

    // --- INICIALIZACIÓN ---
    renderProductPage();
    setupGalleryControls();
    setupPageLogic();
});