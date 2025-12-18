document.addEventListener('DOMContentLoaded', () => {
    const qs = new URLSearchParams(location.search);
    const id = parseInt(qs.get('id')) || null;
    const detail = document.getElementById('product-detail');
    const products = window.DULCE_PRODUCTS || [];

    if (!id) {
        detail.innerHTML = '<p>Producto no encontrado.</p>';
        return;
    }

    const product = products.find(p => p.id === id);
    if (!product) {
        detail.innerHTML = '<p>Producto no encontrado.</p>';
        return;
    }

    // --- GALERÍA DE IMÁGENES ---
    function renderImageGallery(container, product) {
        const storedImages = JSON.parse(localStorage.getItem(`productImages_${product.id}`) || '[]');
        const images = storedImages.length > 0 ? storedImages : [product.image]; // Fallback a la imagen principal
        
        if (!container) return;

        let currentIndex = 0;

        const imagesHtml = images.map(imgSrc => `<img src="${imgSrc}" alt="${product.name}" class="gallery-image" loading="lazy" width="500" height="500">`).join('');

        const thumbnailsHtml = images.length > 1
            ? `
            <div class="gallery-thumbnails">
                ${images.map((imgSrc, index) => `
                    <button class="thumbnail-item ${index === 0 ? 'active' : ''}" data-index="${index}" aria-label="Ver imagen ${index + 1}">
                        <img src="${imgSrc}" alt="Miniatura ${index + 1}" loading="lazy" width="70" height="70">
                    </button>
                `).join('')}
            </div>` : '';

        container.innerHTML = `
            <div class="gallery-container">
                <div class="gallery-main-image">
                    <div class="gallery-track" style="width: ${images.length * 100}%; --image-count: ${images.length};">
                        ${imagesHtml}
                    </div>
                </div>
                ${images.length > 1 ? `
                    <button class="gallery-nav prev" aria-label="Imagen anterior">‹</button>
                    <button class="gallery-nav next" aria-label="Siguiente imagen">›</button>
                ` : ''}
                ${images.length > 1 ? `<div class="gallery-counter">${currentIndex + 1} / ${images.length}</div>` : ''}
                ${thumbnailsHtml}
            </div>
        `;

        const track = container.querySelector('.gallery-track');
        const counter = container.querySelector('.gallery-counter');
        const thumbnails = container.querySelectorAll('.thumbnail-item');

        function updateImage(index) {
            currentIndex = index;
            const offset = -currentIndex * (100 / images.length);
            if (track) track.style.transform = `translateX(${offset}%)`;
            if (counter) counter.textContent = `${currentIndex + 1} / ${images.length}`;

            // Actualizar la miniatura activa
            thumbnails.forEach((thumb, i) => {
                const isActive = i === currentIndex;
                thumb.classList.toggle('active', isActive);
                if (isActive) {
                    thumb.scrollIntoView({
                        behavior: 'smooth',
                        block: 'nearest',
                        inline: 'center'
                    });
                }
            });
        }

        container.querySelector('.next')?.addEventListener('click', () => {
            const nextIndex = (currentIndex + 1) % images.length;
            updateImage(nextIndex);
        });

        container.querySelector('.prev')?.addEventListener('click', () => {
            const prevIndex = (currentIndex - 1 + images.length) % images.length;
            updateImage(prevIndex);
        });

        // Event listener para las miniaturas
        thumbnails.forEach(thumb => {
            thumb.addEventListener('click', () => {
                const index = parseInt(thumb.dataset.index);
                updateImage(index);
            });
        });
        // --- Lógica para abrir en pantalla completa ---
        function openFullscreen(startIndex) {
            let fsCurrentIndex = startIndex;
            const overlay = document.createElement('div');
            overlay.className = 'fullscreen-overlay';

            const arrowsHtml = images.length > 1 ? `
                <button class="gallery-nav prev fs-nav" aria-label="Imagen anterior">‹</button>
                <button class="gallery-nav next fs-nav" aria-label="Siguiente imagen">›</button>
            ` : '';

            const counterHtml = images.length > 1 ? `<div class="gallery-counter fs-counter">${fsCurrentIndex + 1} / ${images.length}</div>` : '';

            const fsThumbnailsHtml = images.length > 1
                ? `
                <div class="gallery-thumbnails fs-thumbnails">
                    ${images.map((imgSrc, index) => `
                        <button class="thumbnail-item ${index === startIndex ? 'active' : ''}" data-index="${index}" aria-label="Ver imagen ${index + 1}">
                            <img src="${imgSrc}" alt="Miniatura ${index + 1}" loading="lazy" width="70" height="70">
                        </button>
                    `).join('')}
                </div>` : '';

            overlay.innerHTML = `
                <button class="close-fullscreen" aria-label="Cerrar vista completa">&times;</button>
                ${arrowsHtml}
                <img src="${images[fsCurrentIndex]}" alt="Vista a pantalla completa" width="1000" height="1000">
                ${counterHtml}
                ${fsThumbnailsHtml}
            `;
            document.body.appendChild(overlay);

            const fsImage = overlay.querySelector('img');
            const fsCounter = overlay.querySelector('.fs-counter');
            const fsThumbnails = overlay.querySelectorAll('.fs-thumbnails .thumbnail-item');

            function updateFullscreenImage(newIndex) {
                fsCurrentIndex = newIndex;
                fsImage.style.opacity = 0;
                setTimeout(() => {
                    fsImage.src = images[fsCurrentIndex];
                    fsImage.style.opacity = 1;
                }, 150);
                if (fsCounter) fsCounter.textContent = `${fsCurrentIndex + 1} / ${images.length}`;

                fsThumbnails.forEach((thumb, i) => {
                    const isActive = i === fsCurrentIndex;
                    thumb.classList.toggle('active', isActive);
                    if (isActive) {
                        thumb.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
                    }
                });
            }

            const close = () => {
                document.removeEventListener('keydown', onKey);
                document.body.removeChild(overlay);
            };

            const onKey = (e) => {
                if (e.key === 'Escape') close();
                if (images.length > 1) {
                    if (e.key === 'ArrowRight') updateFullscreenImage((fsCurrentIndex + 1) % images.length);
                    if (e.key === 'ArrowLeft') updateFullscreenImage((fsCurrentIndex - 1 + images.length) % images.length);
                }
            };

            overlay.addEventListener('click', (e) => {
                if (e.target.classList.contains('next')) {
                    updateFullscreenImage((fsCurrentIndex + 1) % images.length);
                } else if (e.target.classList.contains('prev')) {
                    updateFullscreenImage((fsCurrentIndex - 1 + images.length) % images.length);
                } else if (e.target === overlay || e.target.classList.contains('close-fullscreen')) {
                    close();
                }
            });

            fsThumbnails.forEach(thumb => {
                thumb.addEventListener('click', () => {
                    const index = parseInt(thumb.dataset.index);
                    updateFullscreenImage(index);
                });
            });
            document.addEventListener('keydown', onKey);
        }

        if (track) {
            track.addEventListener('click', (e) => {
                if (e.target.classList.contains('gallery-image')) {
                    openFullscreen(currentIndex);
                }
            });
        }
    }

    // Use shared renderer when available (DRY)
    window.renderProductTo(detail, product.id);
    
    // Render the gallery into the media container
    renderImageGallery(detail.querySelector('.product-detail-media'), product);

    // --- Manejador para el botón "Agregar al carrito" ---
    const addButton = detail.querySelector('.add-to-cart-btn');
    if (addButton) {
        addButton.addEventListener('click', () => {
            const quantityInput = detail.querySelector('#detail-qty');
            const quantity = parseInt(quantityInput.value) || 1;
            if (quantity > 0 && window.addToOrder) {
                // Usamos la función global de script.js para consistencia
                window.addToOrder(product.id, quantity);
            }
        });
    }

    // --- Lógica para actualizar el precio dinámicamente ---
    const quantityInput = detail.querySelector('#detail-qty');
    const priceDisplay = detail.querySelector('.product-price-detail');

    if (quantityInput && priceDisplay && product && window.formatPrice) {
        const basePrice = product.price;

        quantityInput.addEventListener('input', () => {
            const quantity = parseInt(quantityInput.value) || 1;
            if (quantity > 0) {
                const totalPrice = basePrice * quantity;
                priceDisplay.textContent = window.formatPrice(totalPrice);
            }
        });
    }

    if (window.updateCartBadge) window.updateCartBadge();
});