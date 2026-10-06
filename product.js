document.addEventListener('DOMContentLoaded', () => {
    const productDetailSection = document.getElementById('product-detail');
    if (!productDetailSection) return;

    const products = window.DULCE_PRODUCTS || [];
    const productId = Number.parseInt(new URLSearchParams(window.location.search).get('id'), 10);
    const product = products.find((item) => item.id === productId);

    if (!product) {
        productDetailSection.innerHTML = '<p>Producto no encontrado. <a href="index.html">Volver al catálogo</a>.</p>';
        return;
    }

    const quantityUnit = product.quantityUnit || 'unidad';
    const storedImages = JSON.parse(localStorage.getItem(`productImages_${product.id}`) || '[]');
    const galleryImages = Array.isArray(storedImages) && storedImages.length > 0
        ? storedImages
        : [product.image.replace(/\.svg$/, '.jfif')];

    function renderProductPage() {
        const mainImageHtml = galleryImages
            .map((src, index) => `<img src="${src}" alt="${product.name}" class="gallery-image ${index === 0 ? 'active' : ''}">`)
            .join('');

        const thumbnailsHtml = galleryImages.length > 1 ? `
            <div class="gallery-thumbnails">
                ${galleryImages.map((src, index) => `
                    <button class="thumbnail-item ${index === 0 ? 'active' : ''}" data-index="${index}" type="button">
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
                        <button class="gallery-nav prev" aria-label="Anterior" type="button">‹</button>
                        <button class="gallery-nav next" aria-label="Siguiente" type="button">›</button>
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
                    <div class="product-price-detail">${window.formatPrice(product.price)}${quantityUnit === 'kg' ? ' (1 kg)' : ''}</div>
                    <p>${product.description}</p>
                    <div class="product-controls">
                        ${window.renderQuantityStepper({
                            id: 'detail-qty',
                            inputClass: 'product-quantity',
                            value: 1,
                            label: product.name,
                            stepUnit: quantityUnit === 'kg' ? 'kilos' : 'unidades',
                            displayUnit: quantityUnit === 'kg' ? 'kg' : ''
                        })}
                        <button id="detail-add" class="add-to-cart-btn" data-id="${product.id}" type="button">Agregar al carrito</button>
                    </div>
                </div>
            </div>
        `;
    }

    function setupGalleryControls() {
        const galleryImagesNodes = productDetailSection.querySelectorAll('.gallery-image');
        const thumbnails = productDetailSection.querySelectorAll('.thumbnail-item');

        if (galleryImagesNodes.length <= 1) return;

        let currentIndex = 0;
        const totalImages = galleryImages.length;
        const counter = productDetailSection.querySelector('.gallery-counter');

        const updateGallery = (nextIndex) => {
            galleryImagesNodes[currentIndex].classList.remove('active');
            thumbnails[currentIndex].classList.remove('active');

            currentIndex = nextIndex;
            galleryImagesNodes[currentIndex].classList.add('active');
            thumbnails[currentIndex].classList.add('active');

            if (counter) {
                counter.textContent = `${currentIndex + 1} / ${totalImages}`;
            }
        };

        productDetailSection.querySelector('.next')?.addEventListener('click', () => {
            updateGallery((currentIndex + 1) % totalImages);
        });

        productDetailSection.querySelector('.prev')?.addEventListener('click', () => {
            updateGallery((currentIndex - 1 + totalImages) % totalImages);
        });

        thumbnails.forEach((thumbnail) => {
            thumbnail.addEventListener('click', () => {
                updateGallery(Number.parseInt(thumbnail.dataset.index, 10));
            });
        });
    }

    function setupPageLogic() {
        const addButton = document.getElementById('detail-add');
        const quantityInput = document.getElementById('detail-qty');
        const priceDisplay = document.querySelector('.product-price-detail');

        addButton?.addEventListener('click', () => {
            const quantity = Number.parseInt(quantityInput?.value || '1', 10);
            if (quantity > 0) {
                window.addToOrder?.(product.id, quantity);
            }
        });

        if (quantityInput && priceDisplay) {
            quantityInput.addEventListener('input', () => {
                const quantity = Number.parseInt(quantityInput.value, 10) || 1;
                const total = window.formatPrice(product.price * quantity);
                priceDisplay.textContent = quantityUnit === 'kg'
                    ? `${total} (${quantity} kg)`
                    : total;
            });
        }

        window.updateCartBadge?.();
    }

    renderProductPage();
    setupGalleryControls();
    setupPageLogic();
});
