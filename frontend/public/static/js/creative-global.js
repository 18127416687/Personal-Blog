(function () {
    document.addEventListener('DOMContentLoaded', () => {
        const body = document.body;
        if (!body.classList.contains('creative-ui') || body.classList.contains('creative-home')) return;

        initScrollNavbar();
        initReveal();
        initRipple();
        initMenuClose();
    });

    function initScrollNavbar() {
        const nav = document.querySelector('.navbar');
        if (!nav) return;

        const onScroll = () => {
            nav.classList.toggle('scrolled', window.scrollY > 8);
        };

        onScroll();
        window.addEventListener('scroll', onScroll, { passive: true });
    }

    function initReveal() {
        const targets = document.querySelectorAll('.profile-card, .search-card, .nav-card, .weibo-hot-card, .tags-card, .latest-articles-card, .blog-card, .gallery-item, .treehole-input-card, .bullet-screen, .bullet-history, .admin-card, .treehole-header');
        if (!targets.length) return;

        const io = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting) return;
                entry.target.classList.add('reveal-show');
                io.unobserve(entry.target);
            });
        }, { threshold: 0.14 });

        targets.forEach((el, idx) => {
            el.classList.add('reveal-init');
            el.style.transitionDelay = `${Math.min(idx * 60, 360)}ms`;
            io.observe(el);
        });
    }

    function initRipple() {
        document.addEventListener('click', (e) => {
            const btn = e.target.closest('.btn, .search-btn, #searchBtn');
            if (!btn) return;

            const rect = btn.getBoundingClientRect();
            const span = document.createElement('span');
            const size = Math.max(rect.width, rect.height);
            span.className = 'cg-ripple';
            span.style.width = span.style.height = `${size}px`;
            span.style.left = `${e.clientX - rect.left - size / 2}px`;
            span.style.top = `${e.clientY - rect.top - size / 2}px`;
            btn.appendChild(span);
            setTimeout(() => span.remove(), 620);
        });
    }

    function initMenuClose() {
        const nav = document.getElementById('navLinks');
        if (!nav) return;
        nav.querySelectorAll('a').forEach((a) => {
            a.addEventListener('click', () => nav.classList.remove('active'));
        });
    }
})();
