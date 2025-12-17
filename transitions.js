// Maneja una transición de fade suave entre páginas.
// - El <body> comienza con la clase `is-rendering` para estar oculto.
// - Al cargar, quitamos la clase para hacer fade-in.
// - Al hacer click en enlaces internos, prevenimos la navegación, aplicamos fade-out y luego navegamos.
(function () {
    const FADE_DURATION = 280; // ms, coincide con CSS

    function isInternalLink(anchor) {
        if (!anchor || !anchor.href) return false;
        // Ignorar enlaces con target _blank o con protocolos distintos
        if (anchor.target && anchor.target === '_blank') return false;
        const url = new URL(anchor.href, location.href);
        if (url.origin !== location.origin) return false;
        // Ignorar anchors a la misma página (hash only)
        if (url.pathname === location.pathname && url.hash && !url.search) return false;
        // Solo aceptar navegaciones a otras páginas html/paths
        return true;
    }

    // Fade in on load
    document.addEventListener('DOMContentLoaded', () => {
        document.body.classList.remove('is-rendering');

        // Interceptar clicks a enlaces internos para hacer fade-out
        document.addEventListener('click', (e) => {
            const anchor = e.target.closest('a');
            if (!anchor) return;
            if (!isInternalLink(anchor)) return;
            e.preventDefault();
            const href = anchor.href;
            // Añadir clase para ocultar (fade out)
            document.body.classList.add('is-rendering');
            setTimeout(() => {
                window.location.href = href;
            }, FADE_DURATION);
        });
    });
})();
