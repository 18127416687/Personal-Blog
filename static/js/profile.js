window.addEventListener('DOMContentLoaded', function() {
    initAuth();
    loadProfile();
    initAvatarUpload();
    initProfileForm();
    initPasswordForm();
    initUsernameEdit();
});

function loadProfile() {
    fetch('/api/user/profile', { credentials: 'same-origin' })
        .then(function(r) { return r.json(); })
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
        .catch(function(err) { console.error('加载资料失败:', err); });
}

function initAvatarUpload() {
    var input = document.getElementById('avatarInput');
    input.addEventListener('change', function() {
        var file = this.files[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) { showToast('文件不能超过5MB', 'error'); return; }
        var formData = new FormData();
        formData.append('file', file);
        fetch('/api/user/avatar', { method: 'POST', credentials: 'same-origin', body: formData })
            .then(function(r) { return r.json(); })
            .then(function(data) {
                if (data.url) {
                    document.getElementById('avatarPreview').innerHTML = '<img src="' + data.url + '" alt="头像">';
                    showToast('头像已更新', 'success');
                } else {
                    showToast(data.error || '上传失败', 'error');
                }
            })
            .catch(function() { showToast('上传失败', 'error'); });
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
        fetch('/api/user/profile', {
            method: 'PUT',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        })
        .then(function(r) { return r.json(); })
        .then(function(data) {
            if (data.message) { showToast('资料已保存', 'success'); }
            else { showToast(data.error || '保存失败', 'error'); }
        })
        .catch(function() { showToast('保存失败', 'error'); });
    });
}

function initPasswordForm() {
    document.getElementById('passwordForm').addEventListener('submit', function(e) {
        e.preventDefault();
        var oldPassword = document.getElementById('oldPassword').value;
        var newPassword = document.getElementById('newPassword').value;
        var confirmPassword = document.getElementById('confirmPassword').value;

        if (newPassword !== confirmPassword) { showToast('两次输入的新密码不一致', 'error'); return; }

        fetch('/api/user/password', {
            method: 'PUT',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ old_password: oldPassword, new_password: newPassword }),
        })
        .then(function(r) { return r.json(); })
        .then(function(data) {
            if (data.message) {
                showToast('密码已修改', 'success');
                document.getElementById('oldPassword').value = '';
                document.getElementById('newPassword').value = '';
                document.getElementById('confirmPassword').value = '';
            } else {
                showToast(data.error || '修改失败', 'error');
            }
        })
        .catch(function() { showToast('修改失败', 'error'); });
    });
}

function initUsernameEdit() {
    document.getElementById('editUsernameBtn').addEventListener('click', function() {
        var input = document.getElementById('usernameInput');
        if (input.disabled) {
            input.disabled = false;
            input.focus();
            this.textContent = '保存';
        } else {
            var newUsername = input.value.trim();
            if (!newUsername || newUsername.length < 3) { showToast('用户名至少3个字符', 'error'); return; }
            fetch('/api/user/username', {
                method: 'PUT',
                credentials: 'same-origin',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: newUsername }),
            })
            .then(function(r) { return r.json(); })
            .then(function(data) {
                if (data.message) {
                    showToast('用户名已修改', 'success');
                    input.disabled = true;
                    this.textContent = '修改';
                    document.getElementById('navUserName').textContent = newUsername;
                } else {
                    showToast(data.error || '修改失败', 'error');
                }
            }.bind(this))
            .catch(function() { showToast('修改失败', 'error'); });
        }
    });
}


