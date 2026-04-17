/* ==================== 公共导航组件 ==================== */

/* 生成导航栏HTML */
function generateNavbar(currentPage) {
    const navItems = [
        { href: '/index.html', page: 'home', label: '首页' },
        { href: '/articles.html', page: 'articles', label: '文章' },
        { href: '/gallery.html', page: 'gallery', label: '相册' },
        { href: '/treehole.html', page: 'treehole', label: '树洞' }
    ];

    const navHtml = `
        <header class="navbar">
            <div class="logo"><a href="/index.html">🌿 静泊小筑</a></div>
            <button class="menu-toggle" id="menuToggle" onclick="document.getElementById('navLinks').classList.toggle('active')">
                <i class="fa-solid fa-bars"></i>
            </button>
            <nav class="nav-links" id="navLinks">
                ${navItems.map(item => `<a href="${item.href}" data-page="${item.page}" class="${currentPage === item.page ? 'active' : ''}">${item.label}</a>`).join('')}
                <div class="auth-area" id="authArea">
                    <div id="userMenuContainer" style="display:none; position:relative;">
                        <button id="userMenuBtn" class="user-menu-btn" onclick="document.getElementById('userDropdown').classList.toggle('dropdown-open');event.stopPropagation();">
                            <img id="navAvatar" src="" alt="" class="nav-avatar">
                            <span id="navUserName"></span>
                            <i class="fa-solid fa-chevron-down nav-chevron"></i>
                        </button>
                        <div id="userDropdown" class="user-dropdown-web">
                            <a href="/profile.html" class="dropdown-item"><i class="fa-regular fa-user"></i> 个人资料</a>
                            <a href="/my-interactions.html" class="dropdown-item"><i class="fa-regular fa-heart"></i> 我的互动</a>
                            <a href="/editor.html" class="dropdown-item"><i class="fa-regular fa-pen-to-square"></i> 写文章</a>
                            <a href="/my-articles.html" class="dropdown-item"><i class="fa-regular fa-newspaper"></i> 我的文章</a>
                            <a href="/my-drafts.html" class="dropdown-item"><i class="fa-regular fa-file-lines"></i> 草稿箱</a>
                            <a href="/my-photos.html" class="dropdown-item"><i class="fa-regular fa-images"></i> 我的相册</a>
                            <hr class="dropdown-divider">
                            <button id="logoutBtnDropdown" class="dropdown-logout-btn"><i class="fa-solid fa-right-from-bracket"></i> 注销</button>
                        </div>
                    </div>
                    <button id="loginBtn" class="btn btn-primary"><i class="fa-regular fa-user"></i> 登录</button>
                </div>
            </nav>
        </header>
    `;
    return navHtml;
}

/* 初始化认证和用户菜单 */
function initNavbarAuth() {
    var authArea = document.getElementById('authArea');
    var userMenuContainer = document.getElementById('userMenuContainer');
    var userDropdown = document.getElementById('userDropdown');
    var navUserName = document.getElementById('navUserName');
    var navAvatar = document.getElementById('navAvatar');
    var loginBtn = document.getElementById('loginBtn');
    var logoutBtnDropdown = document.getElementById('logoutBtnDropdown');
    document.documentElement.classList.remove('auth-ready');
    if (document.body) document.body.classList.remove('auth-ready');

    fetch('/api/current_user', { credentials: 'same-origin' })
        .then(function(r) { return r.json(); })
        .then(function(data) {
            if (data.username) {
                var displayName = data.nickname || data.username;
                if (navUserName) navUserName.textContent = displayName;
                if (data.avatar && navAvatar) {
                    navAvatar.src = data.avatar;
                    navAvatar.style.display = 'block';
                }
                if (userMenuContainer) userMenuContainer.style.display = 'block';
                if (loginBtn) loginBtn.style.display = 'none';
                if (typeof onAuthCheck === 'function') onAuthCheck(true, data);
            } else {
                if (userMenuContainer) userMenuContainer.style.display = 'none';
                if (loginBtn) loginBtn.style.display = 'inline-flex';
                if (typeof onAuthCheck === 'function') onAuthCheck(false);
            }
            document.documentElement.classList.add('auth-ready');
            if (document.body) document.body.classList.add('auth-ready');
        })
        .catch(function() {
            if (userMenuContainer) userMenuContainer.style.display = 'none';
            if (loginBtn) loginBtn.style.display = 'inline-flex';
            document.documentElement.classList.add('auth-ready');
            if (document.body) document.body.classList.add('auth-ready');
            if (typeof onAuthCheck === 'function') onAuthCheck(false);
        });

    document.addEventListener('click', function(e) {
        if (userDropdown && userMenuContainer &&
            !userMenuContainer.contains(e.target)) {
            userDropdown.classList.remove('dropdown-open');
        }
    });

    if (logoutBtnDropdown) {
        logoutBtnDropdown.addEventListener('click', function() {
            fetch('/api/logout', { method: 'POST', credentials: 'same-origin' })
                .then(function() { window.location.href = '/login.html'; });
        });
    }

    if (loginBtn) {
        loginBtn.addEventListener('click', function() {
            window.location.href = '/login.html';
        });
    }
}

/* 生成页脚HTML */
function generateFooter() {
    return `
        <div class="footer-wrapper">
            <hr>
            <div class="footer-tip">✨ 静泊小筑 · 用代码记录成长，用文字分享经验</div>
        </div>
    `;
}

/* 显示Toast提示 */
function showToast(message, type) {
    var existing = document.querySelector('.toast');
    if (existing) existing.remove();
    var toast = document.createElement('div');
    toast.className = 'toast ' + type;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(function() { toast.remove(); }, 3000);
}
