/* ==================== 公共工具函数 ==================== */

function showToast(message, type) {
    var existing = document.querySelector('.toast');
    if (existing) existing.remove();
    var toast = document.createElement('div');
    toast.className = 'toast ' + type;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(function() { toast.remove(); }, 3000);
}

/* ==================== 认证与导航 ==================== */

function initAuth() {
    var userMenuContainer = document.getElementById('userMenuContainer');
    var userDropdown = document.getElementById('userDropdown');
    var navUserName = document.getElementById('navUserName');
    var navAvatar = document.getElementById('navAvatar');
    var loginBtn = document.getElementById('loginBtn');
    var logoutBtnDropdown = document.getElementById('logoutBtnDropdown');

    fetch('/api/current_user', { credentials: 'same-origin' })
        .then(function(r) { return r.json(); })
        .then(function(data) {
            if (!data.username) {
                if (typeof onAuthCheck === 'function') onAuthCheck(false);
            } else {
                var displayName = data.nickname || data.username;
                if (navUserName) navUserName.textContent = displayName;
                if (data.avatar && navAvatar) {
                    navAvatar.src = data.avatar;
                    navAvatar.style.display = 'block';
                }
                if (userMenuContainer) userMenuContainer.style.display = 'block';
                if (loginBtn) loginBtn.style.display = 'none';
                if (typeof onAuthCheck === 'function') onAuthCheck(true, data);
            }
        })
        .catch(function() {
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
