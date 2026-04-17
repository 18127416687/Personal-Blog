(function () {
    if (window.__uiUxProMaxLoaded) return;
    window.__uiUxProMaxLoaded = true;

    function ready(fn) {
        if (document.readyState === "loading") {
            document.addEventListener("DOMContentLoaded", fn);
        } else {
            fn();
        }
    }

    function injectFonts() {
        var id = "ux-pro-max-fonts";
        if (document.getElementById(id)) return;
        var link = document.createElement("link");
        link.id = id;
        link.rel = "stylesheet";
        link.href = "https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;500;700&family=ZCOOL+XiaoWei&display=swap";
        document.head.appendChild(link);
    }

    function setupProgressBar() {
        if (document.querySelector(".ui-ux-progress")) return;
        var bar = document.createElement("div");
        bar.className = "ui-ux-progress";
        document.body.appendChild(bar);

        function update() {
            var doc = document.documentElement;
            var max = doc.scrollHeight - doc.clientHeight;
            var progress = max <= 0 ? 0 : (doc.scrollTop / max);
            bar.style.transform = "scaleX(" + Math.max(0, Math.min(1, progress)) + ")";
        }

        update();
        window.addEventListener("scroll", update, { passive: true });
        window.addEventListener("resize", update);
    }

    function setupReveal() {
        if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
            return;
        }

        var selectors = [
            ".profile-card",
            ".search-card",
            ".nav-card",
            ".weibo-hot-card",
            ".tags-card",
            ".latest-articles-card",
            ".admin-card",
            ".blog-card",
            ".gallery-item",
            ".ad-article",
            ".ad-toc-card",
            ".bullet-input-card",
            ".bullet-history",
            ".bullet-screen"
        ];

        var nodes = document.querySelectorAll(selectors.join(","));
        if (!nodes.length) return;

        nodes.forEach(function (el, index) {
            el.classList.add("ux-reveal");
            el.style.transitionDelay = Math.min(index * 35, 260) + "ms";
        });

        if (!("IntersectionObserver" in window)) {
            nodes.forEach(function (el) {
                el.classList.add("is-visible");
            });
            return;
        }

        var observer = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    entry.target.classList.add("is-visible");
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });

        nodes.forEach(function (el) {
            observer.observe(el);
        });
    }

    ready(function () {
        injectFonts();
        document.body.classList.add("ui-ux-pro-max-ready");
        setupProgressBar();
        setupReveal();
    });
})();
