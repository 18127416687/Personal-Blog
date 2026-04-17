(function () {
    const state = {
        topics: [],
        allPhotos: [],
        allArticles: [],
    };

    const searchEngines = {
        baidu: 'https://www.baidu.com/s?wd=',
        bing: 'https://www.bing.com/search?q=',
        google: 'https://www.google.com/search?q=',
        github: 'https://github.com/search?q=',
        zhihu: 'https://www.zhihu.com/search?q=',
    };

    document.addEventListener('DOMContentLoaded', init);

    function init() {
        initTheme();
        initNav();
        initReveal();
        initRipple();
        initTilt();
        initSearch();
        initModal();
        initClock();
        initAuthBridge();

        Promise.allSettled([loadUser(), loadHotTopics(), loadArticles(), loadPortfolio(), loadPopularTags()]).then(() => {
            if (window.lucide) window.lucide.createIcons();
        });

        if (window.lucide) window.lucide.createIcons();
    }

    function initTheme() {
        const body = document.body;
        const toggle = document.getElementById('themeToggle');
        const saved = localStorage.getItem('creative-theme');
        if (saved === 'light') body.classList.add('theme-light');

        toggle?.addEventListener('click', () => {
            body.classList.toggle('theme-light');
            localStorage.setItem('creative-theme', body.classList.contains('theme-light') ? 'light' : 'dark');
        });
    }

    function initNav() {
        const menuToggle = document.getElementById('menuToggle');
        const navLinks = document.getElementById('navLinks');
        const navItems = [...document.querySelectorAll('.nav-link[href^="#"]')];

        menuToggle?.addEventListener('click', () => navLinks.classList.toggle('is-open'));

        navItems.forEach((item) => {
            item.addEventListener('click', (e) => {
                const hash = item.getAttribute('href');
                if (!hash || !hash.startsWith('#')) return;
                const target = document.querySelector(hash);
                if (!target) return;

                e.preventDefault();
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                navLinks.classList.remove('is-open');
            });
        });

        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting) return;
                const id = entry.target.getAttribute('id');
                navItems.forEach((item) => {
                    const active = item.getAttribute('href') === `#${id}`;
                    item.classList.toggle('is-active', active);
                });
            });
        }, { threshold: 0.45 });

        ['hero', 'hot', 'blog', 'portfolio'].forEach((id) => {
            const section = document.getElementById(id);
            if (section) observer.observe(section);
        });
    }

    function initReveal() {
        const els = document.querySelectorAll('[data-reveal]');
        const io = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting) return;
                const delay = Number(entry.target.dataset.delay || 0);
                entry.target.style.transitionDelay = `${delay}ms`;
                entry.target.classList.add('is-visible');
                io.unobserve(entry.target);
            });
        }, { threshold: 0.18 });

        els.forEach((el) => io.observe(el));
    }

    function initRipple() {
        document.addEventListener('click', (e) => {
            const button = e.target.closest('[data-ripple]');
            if (!button) return;

            const rect = button.getBoundingClientRect();
            const ripple = document.createElement('span');
            ripple.className = 'ripple';
            const size = Math.max(rect.width, rect.height);
            ripple.style.width = ripple.style.height = `${size}px`;
            ripple.style.left = `${e.clientX - rect.left - size / 2}px`;
            ripple.style.top = `${e.clientY - rect.top - size / 2}px`;
            button.appendChild(ripple);
            setTimeout(() => ripple.remove(), 600);
        });
    }

    function initTilt() {
        const cards = document.querySelectorAll('.tilt-card');
        cards.forEach((card) => {
            card.addEventListener('mousemove', (e) => {
                const rect = card.getBoundingClientRect();
                const x = (e.clientX - rect.left) / rect.width - 0.5;
                const y = (e.clientY - rect.top) / rect.height - 0.5;
                card.style.transform = `perspective(600px) rotateX(${(-y * 6).toFixed(2)}deg) rotateY(${(x * 6).toFixed(2)}deg)`;
            });
            card.addEventListener('mouseleave', () => {
                card.style.transform = 'perspective(600px) rotateX(0deg) rotateY(0deg)';
            });
        });
    }

    function initSearch() {
        const engine = document.getElementById('engineSelect');
        const query = document.getElementById('searchQuery');
        const btn = document.getElementById('searchBtn');

        const doSearch = () => {
            const q = query?.value.trim();
            if (!q) return;
            const endpoint = searchEngines[engine?.value || 'baidu'] || searchEngines.baidu;
            window.open(`${endpoint}${encodeURIComponent(q)}`, '_blank', 'noopener');
        };

        btn?.addEventListener('click', doSearch);
        query?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') doSearch();
        });
    }

    function initClock() {
        const timeEl = document.getElementById('clockTime');
        const dateEl = document.getElementById('clockDate');

        function update() {
            const now = new Date();
            timeEl.textContent = now.toLocaleTimeString('zh-CN', { hour12: false });
            dateEl.textContent = now.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });
        }

        update();
        setInterval(update, 1000);
    }

    function initModal() {
        const modal = document.getElementById('topicModal');
        const closeBtn = document.getElementById('modalClose');

        closeBtn?.addEventListener('click', () => modal.classList.remove('is-open'));
        modal?.addEventListener('click', (e) => {
            if (e.target === modal) modal.classList.remove('is-open');
        });
    }

    function initAuthBridge() {
        window.onAuthCheck = function (isAuthed, user) {
            if (!isAuthed) return;
            const heroName = document.getElementById('heroName');
            const heroBio = document.getElementById('heroBio');
            const heroAvatar = document.getElementById('heroAvatar');

            if (heroName) heroName.textContent = user.nickname || user.username || '创作者';
            if (heroBio && user.bio) heroBio.textContent = user.bio;
            if (heroAvatar && user.avatar) heroAvatar.src = user.avatar;
        };

        if (typeof initAuth === 'function') initAuth();

        const userMenuBtn = document.getElementById('userMenuBtn');
        const userDropdown = document.getElementById('userDropdown');
        const userMenuContainer = document.getElementById('userMenuContainer');

        userMenuBtn?.addEventListener('click', (e) => {
            e.stopPropagation();
            userDropdown.classList.toggle('dropdown-open');
        });

        document.addEventListener('click', (e) => {
            if (userMenuContainer && !userMenuContainer.contains(e.target)) {
                userDropdown?.classList.remove('dropdown-open');
            }
        });
    }

    async function loadUser() {
        try {
            const res = await fetch('/api/current_user', { credentials: 'same-origin' });
            const data = await res.json();
            if (!data?.username) return;

            const heroName = document.getElementById('heroName');
            const heroBio = document.getElementById('heroBio');
            const heroAvatar = document.getElementById('heroAvatar');
            if (heroName) heroName.textContent = data.nickname || data.username;
            if (heroBio && data.bio) heroBio.textContent = data.bio;
            if (heroAvatar && data.avatar) heroAvatar.src = data.avatar;
        } catch (err) {
            console.warn('loadUser failed:', err);
        }
    }

    async function loadHotTopics() {
        const list = document.getElementById('hotTopicsList');
        if (!list) return;

        list.innerHTML = '<article class="hot-item"><div class="hot-content"><div class="hot-title">加载热搜中...</div></div></article>';

        try {
            const res = await fetch('/api/weibo/hot');
            const data = await res.json();
            state.topics = Array.isArray(data) ? data.slice(0, 10) : [];

            if (!state.topics.length) {
                list.innerHTML = '<article class="hot-item"><div class="hot-content"><div class="hot-title">暂无热搜数据</div></div></article>';
                return;
            }

            list.innerHTML = state.topics.map((item, index) => {
                const word = item.word || item.raw_word || '未知热搜';
                const label = item.label ? ` · ${item.label}` : '';
                const hot = index < 3 || /热|爆|新/.test(item.label || '') ? '<span class="hot-fire">🔥</span>' : '';
                return `
                    <article class="hot-item" data-topic-index="${index}">
                        <div class="hot-rank ${index < 3 ? 'top' : ''}">${index + 1}</div>
                        <div class="hot-content">
                            <div class="hot-title">${word}</div>
                            <div class="hot-meta">热度持续上升${label} ${hot}</div>
                        </div>
                        ${index < 3 ? '<i data-lucide="medal"></i>' : '<i data-lucide="trending-up"></i>'}
                    </article>
                `;
            }).join('');

            list.querySelectorAll('.hot-item').forEach((el) => {
                el.addEventListener('click', () => {
                    const idx = Number(el.dataset.topicIndex);
                    openTopicModal(state.topics[idx]);
                });
            });

            if (window.lucide) window.lucide.createIcons();
        } catch (err) {
            console.warn('loadHotTopics failed:', err);
            list.innerHTML = '<article class="hot-item"><div class="hot-content"><div class="hot-title">热搜加载失败</div></div></article>';
        }
    }

    function openTopicModal(topic) {
        if (!topic) return;
        const modal = document.getElementById('topicModal');
        const title = document.getElementById('modalTitle');
        const meta = document.getElementById('modalMeta');
        const content = document.getElementById('modalContent');
        const link = document.getElementById('modalLink');

        const keyword = topic.raw_word || topic.word;
        const source = `https://s.weibo.com/weibo?q=${encodeURIComponent(keyword)}&from=page_hot`;

        title.textContent = topic.word || keyword;
        meta.textContent = `标签：${topic.label || '实时热搜'} · 来源：微博热搜`; 
        content.textContent = `当前话题「${topic.word || keyword}」热度较高，点击下方按钮查看实时讨论详情。`;
        link.href = source;

        modal.classList.add('is-open');
    }

    async function loadArticles() {
        const masonry = document.getElementById('blogMasonry');
        if (!masonry) return;

        masonry.innerHTML = '';
        try {
            const res = await fetch('/api/articles?page=1&per_page=12');
            const data = await res.json();
            const list = Array.isArray(data.articles) ? data.articles : (Array.isArray(data) ? data : []);
            state.allArticles = list;

            if (!list.length) {
                masonry.innerHTML = '<article class="blog-card"><div class="blog-body"><h4>暂无文章</h4><p class="blog-excerpt">还没有发布内容，稍后再来看看。</p></div></article>';
                return;
            }

            masonry.innerHTML = list.map((article, index) => {
                const thumb = article.thumbnail || `/static/img/article-placeholder.svg?id=${article.id || index}`;
                const tag = article.tag || '创作';
                const excerpt = article.excerpt || '这是一篇值得阅读的内容，点击查看详情。';
                return `
                    <a class="blog-card" href="/article/${article.id}" data-reveal data-delay="${(index % 5) * 100}">
                        <div class="blog-thumb"><img src="${thumb}" alt="${article.title}" loading="lazy" onerror="this.onerror=null;this.src='/static/img/article-placeholder.svg';"></div>
                        <div class="blog-body">
                            <span class="blog-tag">${tag}</span>
                            <h4 class="blog-title">${article.title}</h4>
                            <p class="blog-excerpt">${excerpt}</p>
                            <div class="blog-foot">
                                <span>${article.date || ''}</span>
                                <span class="read-more">Read More →</span>
                            </div>
                        </div>
                    </a>
                `;
            }).join('');

            refreshStats();
            initReveal();
        } catch (err) {
            console.warn('loadArticles failed:', err);
            masonry.innerHTML = '<article class="blog-card"><div class="blog-body"><h4>文章加载失败</h4><p class="blog-excerpt">请稍后刷新重试。</p></div></article>';
        }
    }

    async function loadPortfolio() {
        const grid = document.getElementById('portfolioGrid');
        const categories = ['Web', 'Mobile', 'Branding'];
        if (!grid) return;

        try {
            const res = await fetch('/api/photos');
            const data = await res.json();

            let photos = Array.isArray(data) ? data : [];
            if (!photos.length) {
                photos = Array.from({ length: 9 }).map((_, i) => ({
                    url: `https://images.unsplash.com/photo-1461749280684-dccba630e2f6?auto=format&fit=crop&w=900&q=80&sig=${i + 8}`,
                    title: `Project ${i + 1}`,
                }));
            }

            state.allPhotos = photos.map((item, index) => ({
                ...item,
                category: item.category || categories[index % categories.length],
                title: item.title || `作品 ${index + 1}`,
            }));

            renderPortfolio('All');
            bindPortfolioFilters();
            refreshStats();
        } catch (err) {
            console.warn('loadPortfolio failed:', err);
        }
    }

    function renderPortfolio(filter) {
        const grid = document.getElementById('portfolioGrid');
        if (!grid) return;

        const list = state.allPhotos.filter((item) => filter === 'All' || item.category === filter);
        grid.innerHTML = list.map((item) => `
            <a class="portfolio-item" href="${item.url}" target="_blank" rel="noopener" data-category="${item.category}" data-reveal>
                <img src="${item.url}" alt="${item.title}" loading="lazy">
                <div class="portfolio-overlay">
                    <div>
                        <h4 class="overlay-title">${item.title}</h4>
                        <p class="overlay-cat">${item.category}</p>
                    </div>
                </div>
            </a>
        `).join('');

        initReveal();
    }

    function bindPortfolioFilters() {
        const wrap = document.getElementById('portfolioFilters');
        if (!wrap) return;

        wrap.addEventListener('click', (e) => {
            const btn = e.target.closest('.tab');
            if (!btn) return;
            wrap.querySelectorAll('.tab').forEach((tab) => tab.classList.remove('is-active'));
            btn.classList.add('is-active');
            renderPortfolio(btn.dataset.filter);
        });
    }

    async function loadPopularTags() {
        try {
            const res = await fetch('/api/tags/popular');
            const data = await res.json();
            const count = Array.isArray(data) ? data.length : 0;
            const tagCount = document.getElementById('tagCount');
            if (tagCount && count) tagCount.textContent = count;
        } catch (err) {
            console.warn('loadPopularTags failed:', err);
        }
    }

    function refreshStats() {
        const articleCount = document.getElementById('articleCount');
        const photoCount = document.getElementById('photoCount');

        if (articleCount) articleCount.textContent = state.allArticles.length || 0;
        if (photoCount) photoCount.textContent = state.allPhotos.length || 0;
    }
})();
