if (typeof window.showToast !== 'function') {
    window.showToast = function(message, type) {
        var existing = document.querySelector('.profile-toast');
        if (existing) existing.remove();

        var toast = document.createElement('div');
        toast.className = 'profile-toast profile-toast-' + (type || 'info');
        toast.textContent = message || '';
        document.body.appendChild(toast);

        requestAnimationFrame(function() {
            toast.classList.add('show');
        });

        setTimeout(function() {
            toast.classList.remove('show');
            setTimeout(function() {
                if (toast && toast.parentNode) toast.parentNode.removeChild(toast);
            }, 220);
        }, 2600);
    };
}

function ensureToastStyles() {
    if (document.getElementById('profileToastStyles')) return;
    var style = document.createElement('style');
    style.id = 'profileToastStyles';
    style.textContent = '' +
        '.profile-toast{position:fixed;left:50%;top:18px;transform:translateX(-50%) translateY(-8px);' +
        'padding:10px 14px;border-radius:10px;font-size:13px;z-index:4000;color:#fff;opacity:0;' +
        'transition:all .22s ease;box-shadow:0 8px 20px rgba(0,0,0,.15)}' +
        '.profile-toast.show{opacity:1;transform:translateX(-50%) translateY(0)}' +
        '.profile-toast-success{background:#059669}' +
        '.profile-toast-error{background:#dc2626}' +
        '.profile-toast-info{background:#2563eb}';
    document.head.appendChild(style);
}

function apiRequest(url, options) {
    return fetch(url, options || {})
        .then(function(response) {
            return response.json().catch(function() { return {}; }).then(function(data) {
                if (!response.ok) {
                    var msg = data.error || data.message || ('请求失败(' + response.status + ')');
                    var err = new Error(msg);
                    err.status = response.status;
                    throw err;
                }
                return data;
            });
        });
}

function handleAuthError(err) {
    if (err && err.status === 401) {
        showToast('登录状态已失效，请重新登录', 'error');
        setTimeout(function() { window.location.href = '/login'; }, 600);
        return true;
    }
    return false;
}

function __initProfilePage() {
    ensureToastStyles();
    loadProfile();
    initAvatarUpload();
    initProfileForm();
    initPasswordForm();
    initUsernameEdit();
}

function loadProfile() {
    apiRequest('/api/user/profile', { credentials: 'same-origin' })
        .then(function(data) {
            document.getElementById('usernameInput').value = data.username || '';
            document.getElementById('nicknameInput').value = data.nickname || '';
            document.getElementById('bioInput').value = data.bio || '';
            document.getElementById('emailInput').value = data.email || '';
            document.getElementById('phoneInput').value = data.phone || '';
            if (data.avatar) {
                document.getElementById('avatarPreview').innerHTML = '<img src="' + data.avatar + '" alt="头像">';
            }
        })
        .catch(function(err) {
            if (!handleAuthError(err)) showToast(err.message || '加载资料失败', 'error');
        });
}

function initAvatarUpload() {
    var input = document.getElementById('avatarInput');
    input.addEventListener('change', function() {
        var file = this.files[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) {
            showToast('文件不能超过5MB', 'error');
            return;
        }

        var formData = new FormData();
        formData.append('file', file);
        fetch('/api/user/avatar', {
            method: 'POST',
            credentials: 'same-origin',
            body: formData,
        })
        .then(function(r) {
            return r.json().catch(function() { return {}; }).then(function(data) {
                if (!r.ok) {
                    var err = new Error(data.error || data.message || '上传失败');
                    err.status = r.status;
                    throw err;
                }
                return data;
            });
        })
        .then(function(data) {
            if (data.url) {
                document.getElementById('avatarPreview').innerHTML = '<img src="' + data.url + '" alt="头像">';
                showToast('头像已更新', 'success');
            } else {
                showToast('上传失败', 'error');
            }
        })
        .catch(function(err) {
            if (!handleAuthError(err)) showToast(err.message || '上传失败', 'error');
        });
    });
}

function initProfileForm() {
    document.getElementById('profileForm').addEventListener('submit', function(e) {
        e.preventDefault();

        var data = {
            nickname: document.getElementById('nicknameInput').value,
            bio: document.getElementById('bioInput').value,
            email: document.getElementById('emailInput').value,
            phone: document.getElementById('phoneInput').value,
        };

        apiRequest('/api/user/profile', {
            method: 'PUT',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        })
        .then(function(resp) {
            showToast(resp.message || '资料已保存', 'success');
        })
        .catch(function(err) {
            if (!handleAuthError(err)) showToast(err.message || '保存失败', 'error');
        });
    });
}

function initPasswordForm() {
    document.getElementById('passwordForm').addEventListener('submit', function(e) {
        e.preventDefault();

        var oldPassword = document.getElementById('oldPassword').value;
        var newPassword = document.getElementById('newPassword').value;
        var confirmPassword = document.getElementById('confirmPassword').value;

        if (newPassword !== confirmPassword) {
            showToast('两次输入的新密码不一致', 'error');
            return;
        }

        apiRequest('/api/user/password', {
            method: 'PUT',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ old_password: oldPassword, new_password: newPassword }),
        })
        .then(function(resp) {
            showToast(resp.message || '密码已修改', 'success');
            document.getElementById('oldPassword').value = '';
            document.getElementById('newPassword').value = '';
            document.getElementById('confirmPassword').value = '';
        })
        .catch(function(err) {
            if (!handleAuthError(err)) showToast(err.message || '修改失败', 'error');
        });
    });
}

function initUsernameEdit() {
    document.getElementById('editUsernameBtn').addEventListener('click', function() {
        var input = document.getElementById('usernameInput');

        if (input.disabled) {
            input.disabled = false;
            input.focus();
            this.textContent = '保存';
            return;
        }

        var newUsername = input.value.trim();
        if (!newUsername || newUsername.length < 3) {
            showToast('用户名至少3个字符', 'error');
            return;
        }

        apiRequest('/api/user/username', {
            method: 'PUT',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: newUsername }),
        })
        .then(function(resp) {
            showToast(resp.message || '用户名已修改', 'success');
            input.disabled = true;
            this.textContent = '修改';
            var navUserName = document.getElementById('navUserName');
            if (navUserName) navUserName.textContent = newUsername;
            window.dispatchEvent(new Event('auth-changed'));
        }.bind(this))
        .catch(function(err) {
            if (!handleAuthError(err)) showToast(err.message || '修改失败', 'error');
        });
    });
}

if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', __initProfilePage, { once: true });
} else {
    __initProfilePage();
}
