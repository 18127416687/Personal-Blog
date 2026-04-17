let editingArticleId = null;

window.addEventListener('DOMContentLoaded', function() {
    checkAuth();
    initEditor();
    initArticleForm();
    initStatusToggle();
    initPreview();
    initInsertLink();
    initInsertImage();
    checkUrlForEdit();
});

function checkAuth() {
    fetch('/api/current_user')
        .then(r => r.json())
        .then(data => {
            if (!data.username) {
                window.location.href = 'login.html';
            } else {
                document.getElementById('userNameDisplay').textContent = data.username;
                document.getElementById('userGreeting').style.display = 'inline';
                document.getElementById('loginBtn').style.display = 'none';
                document.getElementById('logoutBtn').style.display = 'inline';
            }
        })
        .catch(() => { window.location.href = 'login.html'; });

    document.getElementById('logoutBtn').addEventListener('click', function() {
        fetch('/api/logout', { method: 'POST' }).then(() => { window.location.href = 'login.html'; });
    });

    document.getElementById('loginBtn').addEventListener('click', function() {
        window.location.href = 'login.html';
    });
}

function checkUrlForEdit() {
    const path = window.location.pathname;
    const match = path.match(/\/editor\.html\/(\d+)/);
    if (match) {
        editingArticleId = parseInt(match[1]);
        loadArticleForEdit(editingArticleId);
    }
}

function loadArticleForEdit(id) {
    document.getElementById('editorTitle').innerHTML = '<i class="fa-solid fa-pen"></i> 编辑文章';
    document.getElementById('submitArticleBtn').innerHTML = '<i class="fa-regular fa-floppy-disk"></i> 保存修改';

    fetch(`/api/articles/${id}`)
        .then(r => r.json())
        .then(data => {
            if (data.error) {
                showToast(data.error, 'error');
                return;
            }
            document.getElementById('articleTitleInput').value = data.title;
            document.getElementById('articleExcerptInput').value = data.excerpt;
            document.getElementById('articleTagInput').value = data.tag || '';
            document.getElementById('articleThumbnailInput').value = data.thumbnail || '';
            document.getElementById('richEditor').innerHTML = data.content || '';
            document.getElementById('articleStatus').value = data.status;
            if (data.scheduled_at) {
                var dt = new Date(data.scheduled_at);
                var local = new Date(dt.getTime() - dt.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
                document.getElementById('articleScheduledAt').value = local;
                document.getElementById('scheduledGroup').style.display = 'block';
            }
        })
        .catch(() => showToast('加载文章失败', 'error'));
}

function initEditor() {
    const toolbar = document.getElementById('editorToolbar');
    toolbar.addEventListener('click', function(e) {
        const btn = e.target.closest('button[data-cmd]');
        if (!btn) return;
        e.preventDefault();
        const cmd = btn.dataset.cmd;
        const val = btn.dataset.val || null;
        document.execCommand(cmd, false, val);
        document.getElementById('richEditor').focus();
    });
}

function initInsertLink() {
    document.getElementById('insertLinkBtn').addEventListener('click', function() {
        const url = prompt('请输入链接地址:', 'https://');
        if (url) {
            document.execCommand('createLink', false, url);
        }
    });
}

function initInsertImage() {
    const input = document.getElementById('editorImageInput');

    document.getElementById('insertImageBtn').addEventListener('click', function() {
        const url = prompt('请输入图片地址（或留空选择文件上传）:', '');
        if (url) {
            document.execCommand('insertImage', false, url);
        } else {
            input.click();
        }
    });

    input.addEventListener('change', function() {
        const file = this.files[0];
        if (!file) return;
        if (!editingArticleId) {
            showToast('请先保存文章草稿再上传图片', 'error');
            return;
        }
        const formData = new FormData();
        formData.append('file', file);
        fetch(`/api/user/articles/${editingArticleId}/image`, { method: 'POST', body: formData })
            .then(r => r.json())
            .then(data => {
                if (data.url) {
                    document.execCommand('insertImage', false, data.url);
                } else {
                    showToast(data.error || '上传失败', 'error');
                }
            })
            .catch(() => showToast('上传失败', 'error'));
    });
}

function initStatusToggle() {
    document.getElementById('articleStatus').addEventListener('change', function() {
        document.getElementById('scheduledGroup').style.display = this.value === 'scheduled' ? 'block' : 'none';
    });
}

function initArticleForm() {
    document.getElementById('articleForm').addEventListener('submit', function(e) {
        e.preventDefault();

        const title = document.getElementById('articleTitleInput').value.trim();
        const excerpt = document.getElementById('articleExcerptInput').value.trim();
        const tag = document.getElementById('articleTagInput').value.trim();
        const thumbnail = document.getElementById('articleThumbnailInput').value.trim();
        const content = document.getElementById('richEditor').innerHTML;
        const status = document.getElementById('articleStatus').value;
        const scheduledAt = document.getElementById('articleScheduledAt').value;

        if (!title) { showToast('请输入标题', 'error'); return; }
        if (!excerpt) { showToast('请输入摘要', 'error'); return; }

        let scheduledIso = null;
        if (status === 'scheduled') {
            if (!scheduledAt) { showToast('请选择发布时间', 'error'); return; }
            const d = new Date(scheduledAt);
            if (isNaN(d.getTime())) { showToast('时间格式不正确', 'error'); return; }
            scheduledIso = d.toISOString();
        }

        const data = { title, content, excerpt, tag, thumbnail, status, scheduled_at: scheduledIso };

        let url, method;
        if (editingArticleId) {
            url = `/api/user/articles/${editingArticleId}`;
            method = 'PUT';
        } else {
            url = '/api/user/articles';
            method = 'POST';
        }

        fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        })
        .then(r => r.json())
        .then(data => {
            if (data.message) {
                showToast(editingArticleId ? '文章已更新' : '文章已发布', 'success');
                if (!editingArticleId && data.id) {
                    editingArticleId = data.id;
                    document.getElementById('editorTitle').innerHTML = '<i class="fa-solid fa-pen"></i> 编辑文章';
                    document.getElementById('submitArticleBtn').innerHTML = '<i class="fa-regular fa-floppy-disk"></i> 保存修改';
                }
            } else {
                showToast(data.error || '操作失败', 'error');
            }
        })
        .catch(() => showToast('操作失败', 'error'));
    });
}

function initPreview() {
    document.getElementById('previewBtn').addEventListener('click', function() {
        const title = document.getElementById('articleTitleInput').value.trim() || '无标题';
        const content = document.getElementById('richEditor').innerHTML;
        const tag = document.getElementById('articleTagInput').value.trim();
        const now = new Date().toLocaleDateString('zh-CN');

        document.getElementById('previewModalTitle').textContent = title;
        document.getElementById('previewMeta').innerHTML = `
            <span><i class="fa-regular fa-calendar"></i> ${now}</span>
            ${tag ? `<span><i class="fa-solid fa-tag"></i> #${tag}</span>` : ''}
        `;
        document.getElementById('previewContent').innerHTML = content || '<p style="color:#999;">暂无内容</p>';
        document.getElementById('previewModal').classList.add('show');
    });

    document.getElementById('previewClose').addEventListener('click', function() {
        document.getElementById('previewModal').classList.remove('show');
    });

    document.getElementById('previewModal').addEventListener('click', function(e) {
        if (e.target === this) this.classList.remove('show');
    });
}

function showToast(message, type) {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}
