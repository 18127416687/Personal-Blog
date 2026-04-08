// 页面加载完成后执行
window.addEventListener('DOMContentLoaded', function() {
    initAuth();

    // 搜索引擎下拉选择
    const engineSelect = document.getElementById('engineSelect');
    const engineDropdown = document.getElementById('engineDropdown');
    let currentEngine = 'baidu';

    function setEngine(engine) {
        currentEngine = engine;
        const option = engineDropdown?.querySelector(`[data-engine="${engine}"]`);
        if (option) {
            const icon = option.querySelector('i')?.className || '';
            const text = option.querySelector('span')?.textContent || '';
            const selectEl = document.getElementById('engineSelect');
            if (selectEl) {
                selectEl.querySelector('.selected-icon').className = icon + ' selected-icon';
                selectEl.querySelector('.selected-text').textContent = text;
            }
        }
        engineDropdown?.classList.remove('show');
    }

    if (engineSelect) {
        engineSelect.addEventListener('click', function(e) {
            e.stopPropagation();
            engineDropdown?.classList.toggle('show');
        });
    }

    if (engineDropdown) {
        document.querySelectorAll('.engine-option').forEach(option => {
            option.addEventListener('click', function() {
                setEngine(this.dataset.engine);
            });
        });
    }

    document.addEventListener('click', function() {
        engineDropdown?.classList.remove('show');
    });
    
    // 搜索功能
    const searchBtn = document.getElementById('searchBtn');
    const searchQuery = document.getElementById('searchQuery');
    if (searchBtn && searchQuery) {
        searchBtn.addEventListener('click', function() {
            const query = searchQuery.value.trim();
            if (query) {
                let searchUrl = '';
                
                switch(currentEngine) {
                    case 'baidu':
                        searchUrl = `https://www.baidu.com/s?wd=${encodeURIComponent(query)}`;
                        break;
                    case 'bing':
                        searchUrl = `https://www.bing.com/search?q=${encodeURIComponent(query)}`;
                        break;
                    case 'google':
                        searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
                        break;
                    case 'sogou':
                        searchUrl = `https://www.sogou.com/web?query=${encodeURIComponent(query)}`;
                        break;
                    case '360':
                        searchUrl = `https://www.so.com/s?q=${encodeURIComponent(query)}`;
                        break;
                    case 'zhihu':
                        searchUrl = `https://www.zhihu.com/search?q=${encodeURIComponent(query)}`;
                        break;
                    case 'bilibili':
                        searchUrl = `https://search.bilibili.com/all?keyword=${encodeURIComponent(query)}`;
                        break;
                    case 'github':
                        searchUrl = `https://github.com/search?q=${encodeURIComponent(query)}`;
                        break;
                    case 'juejin':
                        searchUrl = `https://juejin.cn/search?query=${encodeURIComponent(query)}`;
                        break;
                    case 'csdn':
                        searchUrl = `https://so.csdn.net/so/search?q=${encodeURIComponent(query)}`;
                        break;
                    default:
                        searchUrl = `https://www.baidu.com/s?wd=${encodeURIComponent(query)}`;
                }
                
                window.open(searchUrl, '_blank');
            }
        });
        
        searchQuery.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                searchBtn.click();
            }
        });
    }
    
    // 时间显示
    function updateTime() {
        const now = new Date();
        const currentTime = document.getElementById('currentTime');
        const solarDate = document.getElementById('solarDate');
        
        if (currentTime) {
            currentTime.textContent = now.toLocaleTimeString('zh-CN');
        }
        
        if (solarDate) {
            solarDate.textContent = now.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });
        }
    }
    
    updateTime();
    setInterval(updateTime, 1000);
    
    // 登录/注销功能
    const loginBtn = document.getElementById('loginBtn');
    const userMenuContainer = document.getElementById('userMenuContainer');
    const userMenuBtn = document.getElementById('userMenuBtn');
    const userDropdown = document.getElementById('userDropdown');
    const navUserName = document.getElementById('navUserName');
    const navAvatar = document.getElementById('navAvatar');
    const logoutBtnDropdown = document.getElementById('logoutBtnDropdown');
    
    function checkUserStatus() {
        fetch('/api/current_user')
            .then(response => response.json())
            .then(data => {
                if (data.username) {
                    const displayName = data.nickname || data.username;
                    navUserName.textContent = displayName;
                    if (data.avatar) {
                        navAvatar.src = data.avatar;
                        navAvatar.style.display = 'block';
                    }
                    if (userMenuContainer) userMenuContainer.style.display = 'block';
                    if (loginBtn) loginBtn.style.display = 'none';
                } else {
                    if (userMenuContainer) userMenuContainer.style.display = 'none';
                    if (loginBtn) loginBtn.style.display = 'inline';
                }
            })
            .catch(error => console.error('检查用户状态失败:', error));
    }
    
    checkUserStatus();
    
    if (loginBtn) {
        loginBtn.addEventListener('click', function() {
            window.location.href = 'login.html';
        });
    }
    
    if (userMenuBtn && userDropdown) {
        userMenuBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            userDropdown.style.display = userDropdown.style.display === 'none' ? 'block' : 'none';
        });
        
        document.addEventListener('click', function(e) {
            if (!userMenuContainer.contains(e.target)) {
                userDropdown.style.display = 'none';
            }
        });
    }
    
    if (logoutBtnDropdown) {
        logoutBtnDropdown.addEventListener('click', function() {
            fetch('/api/logout', { method: 'POST' })
                .then(response => response.json())
                .then(data => {
                    checkUserStatus();
                    userDropdown.style.display = 'none';
                })
                .catch(error => console.error('注销失败:', error));
        });
    }
    
    // 加载文章列表
    function loadArticles() {
        fetch('/api/articles')
            .then(response => response.json())
            .then(data => {
                const blogGrid = document.querySelector('.blog-grid');
                if (blogGrid) {
                    blogGrid.innerHTML = '';
                    data.forEach(article => {
                        const articleElement = document.createElement('div');
                        articleElement.className = 'blog-card';
                        articleElement.style.cursor = 'pointer';
                        articleElement.addEventListener('click', function(e) {
                            if (e.target.closest('.like-btn') || e.target.closest('.favorite-btn')) return;
                            window.location.href = `article/${article.id}`;
                        });
                        articleElement.innerHTML = `
                            <div class="card-thumb">
                                <img src="${article.thumbnail}" alt="文章缩略图">
                            </div>
                            <div class="card-content">
                                <div class="article-meta">
                                    <span class="author"><i class="fa-regular fa-user"></i> ${article.author}</span>
                                    <span class="date">${article.date}</span>
                                </div>
                                <h3>${article.title}</h3>
                                <p class="excerpt">${article.excerpt}</p>
                                <div class="card-footer">
                                    <div class="stats">
                                        <span class="stat-item"><i class="fa-regular fa-eye"></i> ${article.views}</span>
                                        <span class="stat-item like-btn" data-id="${article.id}"><i class="fa-regular fa-heart"></i> ${article.likes}</span>
                                        <span class="stat-item favorite-btn" data-id="${article.id}"><i class="fa-regular fa-bookmark"></i> ${article.favorites}</span>
                                    </div>
                                    <span class="tag">#${article.tag}</span>
                                </div>
                            </div>
                        `;
                        blogGrid.appendChild(articleElement);
                    });
                    
                    // 添加点赞和收藏事件
                    document.querySelectorAll('.like-btn').forEach(btn => {
                        btn.addEventListener('click', function() {
                            const articleId = this.getAttribute('data-id');
                            fetch(`/api/articles/${articleId}/like`, {
                                method: 'POST'
                            })
                            .then(response => response.json())
                            .then(data => {
                                if (data.likes) {
                                    this.innerHTML = `<i class="fa-regular fa-heart"></i> ${data.likes}`;
                                }
                            })
                            .catch(error => console.error('点赞失败:', error));
                        });
                    });
                    
                    document.querySelectorAll('.favorite-btn').forEach(btn => {
                        btn.addEventListener('click', function() {
                            const articleId = this.getAttribute('data-id');
                            fetch(`/api/articles/${articleId}/favorite`, {
                                method: 'POST'
                            })
                            .then(response => response.json())
                            .then(data => {
                                if (data.favorites) {
                                    this.innerHTML = `<i class="fa-regular fa-bookmark"></i> ${data.favorites}`;
                                }
                            })
                            .catch(error => console.error('收藏失败:', error));
                        });
                    });
                }
            })
            .catch(error => console.error('加载文章失败:', error));
    }
    
    // 加载相册
    function initGalleryViewer(galleryGrid) {
        if (!galleryGrid) return;
        try {
            if (window.__galleryViewer && typeof window.__galleryViewer.destroy === 'function') {
                window.__galleryViewer.destroy();
            }
            if (window.Viewer) {
                window.__galleryViewer = new window.Viewer(galleryGrid, {
                    title: false,
                    toolbar: true,
                    navbar: true,
                    movable: true,
                    zoomable: true,
                    rotatable: true,
                    scalable: true,
                    transition: true,
                });
            } else {
                console.warn('Viewer.js 未加载，无法启用图片放大预览');
            }
        } catch (e) {
            console.error('初始化 Viewer.js 失败:', e);
        }
    }

    function loadPhotos() {
        fetch('/api/photos')
            .then(response => response.json())
            .then(data => {
                const galleryGrid = document.querySelector('.gallery-grid');
                if (galleryGrid) {
                    // 只有当数据库确实返回了图片时才替换页面内容，
                    // 否则保留 gallery.html 里的静态占位图，避免“页面空白”的体验
                    if (Array.isArray(data) && data.length > 0) {
                        galleryGrid.innerHTML = '';
                        data.forEach(photo => {
                            if (!photo || !photo.url) return;
                            const photoElement = document.createElement('div');
                            photoElement.className = 'gallery-item';
                            photoElement.innerHTML = `<img src="${photo.url}" alt="相册图片" loading="lazy">`;
                            galleryGrid.appendChild(photoElement);
                        });
                    }
                    initGalleryViewer(galleryGrid);
                }
            })
            .catch(error => console.error('加载相册失败:', error));
    }
    
    // 仅在对应页面存在目标容器时才触发加载
    const galleryGrid = document.querySelector('.gallery-grid');
    if (galleryGrid) {
        // 先对页面静态图片启用预览（即使接口加载失败也可放大）
        initGalleryViewer(galleryGrid);
        // 再从数据库拉取最新图片并刷新预览
        loadPhotos();
    }

    const blogGrid = document.querySelector('.blog-grid');

    // 从URL读取标签参数
    const urlParams = new URLSearchParams(window.location.search);
    const urlTag = urlParams.get('tag');

    // 文章搜索 + 标签筛选 + 分页
    const articleSearchInput = document.getElementById('articleSearchInput');
    const articleSearchBtn = document.getElementById('articleSearchBtn');
    if (articleSearchInput && articleSearchBtn) {
        let allArticlesCache = null;
        let currentPage = 1;
        const perPage = 9;
        let activeTag = urlTag || null;

        function renderTagBar() {
            const bar = document.getElementById('tagFilterBar');
            if (!bar || !allArticlesCache) return;

            const tagCounts = {};
            allArticlesCache.forEach(a => {
                if (a.tag) tagCounts[a.tag] = (tagCounts[a.tag] || 0) + 1;
            });

            bar.innerHTML = '';

            const allBtn = createTagChip('全部', !activeTag, function() {
                activeTag = null;
                currentPage = 1;
                applyFilters();
                renderTagBar();
            });
            bar.appendChild(allBtn);

            Object.keys(tagCounts).sort().forEach(tag => {
                const chip = createTagChip(tag, activeTag === tag, function() {
                    activeTag = tag;
                    currentPage = 1;
                    applyFilters();
                    renderTagBar();
                });
                bar.appendChild(chip);
            });
        }

        function createTagChip(label, isActive, onClick) {
            const btn = document.createElement('button');
            btn.textContent = label;
            btn.style.cssText = `padding:0.35rem 0.85rem;border:1px solid ${isActive ? '#3b82f6' : '#ddd'};border-radius:20px;background:${isActive ? '#3b82f6' : 'white'};color:${isActive ? 'white' : '#555'};cursor:pointer;font-size:0.8rem;transition:all 0.2s;white-space:nowrap;`;
            btn.addEventListener('click', onClick);
            return btn;
        }

        function renderPagination(totalPages) {
            let existing = document.getElementById('articlePagination');
            if (existing) existing.remove();

            if (totalPages <= 1) return;

            const wrapper = document.createElement('div');
            wrapper.id = 'articlePagination';
            wrapper.style.cssText = 'display:flex;justify-content:center;align-items:center;gap:0.5rem;margin-top:2rem;flex-wrap:wrap;';

            const prevBtn = document.createElement('button');
            prevBtn.innerHTML = '<i class="fa-solid fa-chevron-left"></i>';
            prevBtn.disabled = currentPage === 1;
            prevBtn.style.cssText = `padding:0.5rem 0.75rem;border:1px solid #ddd;border-radius:6px;background:white;cursor:pointer;${currentPage === 1 ? 'opacity:0.5;cursor:default;' : ''}`;
            prevBtn.addEventListener('click', function() { goToPage(currentPage - 1); });
            wrapper.appendChild(prevBtn);

            const maxVisible = 5;
            let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
            let end = Math.min(totalPages, start + maxVisible - 1);
            if (end - start < maxVisible - 1) start = Math.max(1, end - maxVisible + 1);

            if (start > 1) {
                addPageBtn(wrapper, 1);
                if (start > 2) {
                    const dots = document.createElement('span');
                    dots.textContent = '...';
                    dots.style.cssText = 'padding:0 0.25rem;color:#999;';
                    wrapper.appendChild(dots);
                }
            }

            for (let i = start; i <= end; i++) {
                addPageBtn(wrapper, i);
            }

            if (end < totalPages) {
                if (end < totalPages - 1) {
                    const dots = document.createElement('span');
                    dots.textContent = '...';
                    dots.style.cssText = 'padding:0 0.25rem;color:#999;';
                    wrapper.appendChild(dots);
                }
                addPageBtn(wrapper, totalPages);
            }

            const nextBtn = document.createElement('button');
            nextBtn.innerHTML = '<i class="fa-solid fa-chevron-right"></i>';
            nextBtn.disabled = currentPage === totalPages;
            nextBtn.style.cssText = `padding:0.5rem 0.75rem;border:1px solid #ddd;border-radius:6px;background:white;cursor:pointer;${currentPage === totalPages ? 'opacity:0.5;cursor:default;' : ''}`;
            nextBtn.addEventListener('click', function() { goToPage(currentPage + 1); });
            wrapper.appendChild(nextBtn);

            blogGrid.parentNode.insertBefore(wrapper, blogGrid.nextSibling);
        }

        function addPageBtn(container, pageNum) {
            const btn = document.createElement('button');
            btn.textContent = pageNum;
            const isActive = pageNum === currentPage;
            btn.style.cssText = `width:36px;height:36px;border:1px solid #ddd;border-radius:6px;cursor:pointer;font-size:0.875rem;${isActive ? 'background:#3b82f6;color:white;border-color:#3b82f6;' : 'background:white;color:#333;'}`;
            if (!isActive) {
                btn.addEventListener('click', function() { goToPage(pageNum); });
            }
            container.appendChild(btn);
        }

        function goToPage(page) {
            currentPage = page;
            applyFilters();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }

        function renderArticles(articles, totalPages) {
            if (!blogGrid) return;
            blogGrid.innerHTML = '';
            if (articles.length === 0) {
                blogGrid.innerHTML = '<p style="grid-column:1/-1;text-align:center;color:#999;padding:3rem;">没有找到相关文章</p>';
                renderPagination(0);
                return;
            }
            articles.forEach(article => {
                const articleElement = document.createElement('div');
                articleElement.className = 'blog-card';
                articleElement.style.cursor = 'pointer';
                articleElement.addEventListener('click', function(e) {
                    if (e.target.closest('.like-btn') || e.target.closest('.favorite-btn')) return;
                    window.location.href = `article/${article.id}`;
                });
                articleElement.innerHTML = `
                    <div class="card-thumb">
                        <img src="${article.thumbnail}" alt="文章缩略图">
                    </div>
                    <div class="card-content">
                        <div class="article-meta">
                            <span class="author"><i class="fa-regular fa-user"></i> ${article.author}</span>
                            <span class="date">${article.date}</span>
                        </div>
                        <h3>${article.title}</h3>
                        <p class="excerpt">${article.excerpt}</p>
                        <div class="card-footer">
                            <div class="stats">
                                <span class="stat-item"><i class="fa-regular fa-eye"></i> ${article.views}</span>
                                <span class="stat-item like-btn" data-id="${article.id}"><i class="fa-regular fa-heart"></i> ${article.likes}</span>
                                <span class="stat-item favorite-btn" data-id="${article.id}"><i class="fa-regular fa-bookmark"></i> ${article.favorites}</span>
                            </div>
                            <span class="tag">#${article.tag}</span>
                        </div>
                    </div>
                `;
                blogGrid.appendChild(articleElement);
            });
            attachLikeAndFavoriteEvents();
            renderPagination(totalPages);
        }

        function attachLikeAndFavoriteEvents() {
            document.querySelectorAll('.like-btn').forEach(btn => {
                btn.addEventListener('click', function(e) {
                    e.stopPropagation();
                    const articleId = this.getAttribute('data-id');
                    fetch(`/api/articles/${articleId}/like`, { method: 'POST' })
                        .then(response => response.json())
                        .then(data => {
                            if (data.likes) {
                                this.innerHTML = `<i class="fa-regular fa-heart"></i> ${data.likes}`;
                            }
                        })
                        .catch(error => console.error('点赞失败:', error));
                });
            });
            document.querySelectorAll('.favorite-btn').forEach(btn => {
                btn.addEventListener('click', function(e) {
                    e.stopPropagation();
                    const articleId = this.getAttribute('data-id');
                    fetch(`/api/articles/${articleId}/favorite`, { method: 'POST' })
                        .then(response => response.json())
                        .then(data => {
                            if (data.favorites) {
                                this.innerHTML = `<i class="fa-regular fa-bookmark"></i> ${data.favorites}`;
                            }
                        })
                        .catch(error => console.error('收藏失败:', error));
                });
            });
        }

        function applyFilters() {
            if (!allArticlesCache) return;
            const query = articleSearchInput.value.toLowerCase().trim();

            let filtered = allArticlesCache;

            if (activeTag) {
                filtered = filtered.filter(a => a.tag === activeTag);
            }

            if (query) {
                filtered = filtered.filter(a =>
                    (a.title && a.title.toLowerCase().includes(query)) ||
                    (a.tag && a.tag.toLowerCase().includes(query)) ||
                    (a.author && a.author.toLowerCase().includes(query)) ||
                    (a.excerpt && a.excerpt.toLowerCase().includes(query))
                );
            }

            const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
            if (currentPage > totalPages) currentPage = totalPages;
            const start = (currentPage - 1) * perPage;
            const paged = filtered.slice(start, start + perPage);
            renderArticles(paged, totalPages);
        }

        articleSearchBtn.addEventListener('click', function() {
            currentPage = 1;
            applyFilters();
        });
        articleSearchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                currentPage = 1;
                applyFilters();
            }
        });
        articleSearchInput.addEventListener('input', function() {
            if (!articleSearchInput.value.trim()) {
                currentPage = 1;
                applyFilters();
            }
        });

        function loadAllArticles() {
            fetch('/api/articles?page=1&per_page=500')
                .then(response => response.json())
                .then(data => {
                    allArticlesCache = data.articles;
                    renderTagBar();
                    applyFilters();
                })
                .catch(error => console.error('加载文章失败:', error));
        }
        loadAllArticles();
    }

    const latestArticles = document.getElementById('latestArticles');
    if (latestArticles) {
        loadLatestArticles();
    }
    
    loadPopularTags();
    initWeiboHot();
});

function loadLatestArticles() {
    fetch('/api/articles?page=1&per_page=4')
        .then(response => response.json())
        .then(data => {
            const container = document.getElementById('latestArticles');
            if (!container) return;

            container.innerHTML = '';
            const articles = Array.isArray(data.articles) ? data.articles : (Array.isArray(data) ? data : []);

            if (articles.length === 0) {
                container.innerHTML = '<p style="text-align:center;color:#999;padding:2rem;">暂无文章</p>';
                return;
            }

            articles.forEach(article => {
                const el = document.createElement('a');
                el.className = 'latest-article-item';
                el.href = `article/${article.id}`;
                el.innerHTML = `
                    <div class="latest-article-thumb">
                        <img src="${article.thumbnail || 'https://picsum.photos/200/200?random=' + article.id}" alt="缩略图">
                    </div>
                    <div class="latest-article-info">
                        <h5>${article.title}</h5>
                        <p class="latest-article-excerpt">${article.excerpt}</p>
                        <div class="latest-article-meta">
                            <span><i class="fa-regular fa-calendar"></i> ${article.date}</span>
                            <span><i class="fa-regular fa-eye"></i> ${article.views}</span>
                            <span><i class="fa-regular fa-heart"></i> ${article.likes}</span>
                        </div>
                    </div>
                `;
                container.appendChild(el);
            });
        })
        .catch(error => console.error('加载最新文章失败:', error));
}

function loadPopularTags() {
    const container = document.getElementById('popularTags');
    if (!container) return;
    
    fetch('/api/tags/popular')
        .then(response => response.json())
        .then(data => {
            if (!Array.isArray(data) || data.length === 0) {
                container.innerHTML = '<p style="text-align:center;color:#999;">暂无标签</p>';
                return;
            }
            
            container.innerHTML = data.map(item => 
                `<a href="articles.html?tag=${encodeURIComponent(item.tag)}" class="tag-item" data-tag="${item.tag}">#${item.tag}</a>`
            ).join('');
        })
        .catch(error => {
            console.error('加载热门标签失败:', error);
            container.innerHTML = '<p style="text-align:center;color:#999;">加载失败</p>';
        });
}

const WEIBO_REFRESH_INTERVAL = 15 * 60 * 1000;
let weiboRefreshTimer = null;
let weiboCountdownInterval = null;

function initWeiboHot() {
    const weiboContainer = document.getElementById('weiboHotList');
    if (!weiboContainer) return;
    
    loadWeiboHot();
    
    weiboRefreshTimer = setInterval(loadWeiboHot, WEIBO_REFRESH_INTERVAL);
    
    startCountdown();
}

function startCountdown() {
    const timerEl = document.getElementById('weiboRefreshTimer');
    if (!timerEl) return;
    
    let remaining = WEIBO_REFRESH_INTERVAL / 1000;
    
    if (weiboCountdownInterval) clearInterval(weiboCountdownInterval);
    
    weiboCountdownInterval = setInterval(() => {
        remaining--;
        if (remaining <= 0) remaining = WEIBO_REFRESH_INTERVAL / 1000;
        
        const minutes = Math.floor(remaining / 60);
        const seconds = remaining % 60;
        timerEl.textContent = `热搜将于 ${minutes}分${seconds}秒后更新`;
    }, 1000);
}

function loadWeiboHot() {
    const container = document.getElementById('weiboHotList');
    if (!container) return;
    
    container.innerHTML = '<div class="loading-placeholder" style="text-align:center;padding:1rem;color:#999;"><i class="fa-solid fa-spinner fa-spin"></i> 加载中...</div>';
    
    fetch('/api/weibo/hot')
        .then(response => response.json())
        .then(data => {
            if (!Array.isArray(data) || data.length === 0) {
                container.innerHTML = '<p style="text-align:center;color:#999;padding:1rem;">暂无热搜</p>';
                return;
            }
            
            container.innerHTML = data.slice(0, 15).map((item, index) => {
                const rankClass = index < 3 ? `top-${index + 1}` : 'other';
                const url = `https://s.weibo.com/weibo?q=${encodeURIComponent(item.raw_word || item.word)}&from=page_hot`;
                return `<a href="${url}" target="_blank" class="weibo-hot-item">
                    <span class="weibo-hot-rank ${rankClass}">${index + 1}</span>
                    <span class="weibo-hot-word">${item.word}</span>
                    ${item.label ? `<span class="weibo-hot-label">${item.label}</span>` : ''}
                </a>`;
            }).join('');
        })
        .catch(error => {
            console.error('加载微博热搜失败:', error);
            container.innerHTML = '<p style="text-align:center;color:#999;padding:1rem;">加载失败</p>';
        });
}