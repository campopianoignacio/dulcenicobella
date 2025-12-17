document.addEventListener('DOMContentLoaded', () => {
    const qs = new URLSearchParams(location.search);
    const id = parseInt(qs.get('id')) || null;
    const detail = document.getElementById('product-detail');
    const products = window.DULCE_PRODUCTS || [];

    // util carro
    function getOrder() { return JSON.parse(localStorage.getItem('dulceNicobellaOrder')) || []; }
    function saveOrder(order) { localStorage.setItem('dulceNicobellaOrder', JSON.stringify(order)); }
    function updateCartBadge() {
        const badge = document.getElementById('cart-badge');
        if (!badge) return;
        const order = getOrder();
        const total = order.reduce((s,i) => s + i.quantity, 0);
        badge.textContent = total;
        badge.classList.toggle('active', total>0);
    }

    function showToast(message) {
        const toastContainer = document.getElementById('toast-container');
        if (!toastContainer) return;
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = message;
        toastContainer.appendChild(toast);
        setTimeout(() => toast.classList.add('show'), 80);
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => { if (toast.parentNode === toastContainer) toastContainer.removeChild(toast); }, 300);
        }, 2000);
    }

    if (!id) {
        detail.innerHTML = '<p>Producto no encontrado.</p>';
        return;
    }

    const product = products.find(p => p.id === id);
    if (!product) {
        detail.innerHTML = '<p>Producto no encontrado.</p>';
        return;
    }

    // Use shared renderer when available (DRY)
    if (window.renderProductTo) {
        window.renderProductTo(detail, product.id);
    } else {
        detail.innerHTML = `
            <div class="product-detail-grid">
                <div class="product-detail-media">
                    <img src="${product.image}" alt="${product.name}">
                </div>
                <div class="product-detail-info">
                    <h1>${product.name}</h1>
                    <div class="product-price-detail">${( '$' + product.price.toLocaleString('es-AR') )}</div>
                    <p>${product.description}</p>
                    <div class="product-controls">
                        <input id="detail-qty" type="number" min="1" value="1">
                        <button id="detail-add" class="add-to-cart-btn">Agregar al carrito</button>
                    </div>
                    <p><a href="index.html">Volver al catálogo</a></p>
                </div>
            </div>
        `;
    }

    document.getElementById('detail-add').addEventListener('click', () => {
        const qty = parseInt(document.getElementById('detail-qty').value) || 1;
        if (qty < 1) return;
        const order = getOrder();
        const existing = order.find(i => i.id === product.id);
        if (existing) existing.quantity += qty; else order.push({...product, quantity: qty});
        saveOrder(order);
        updateCartBadge();
        showToast('Agregado');
    });

    updateCartBadge();
});