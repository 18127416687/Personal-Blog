const { createEditor, createToolbar } = window.wangEditor;

let editingArticleId = null;
let articleTags = [];
let currentPublishStatus = 'public';
let autoSaveTimer = null;
let outlineUpdateTimer = null;
let editor = null;
let toolbar = null;

window.addEventListener('DOMContentLoaded', function() {
    checkAuth();
    initWangEditor();
    initTitleInput();
    initCoverUpload();
    initTagInput();
    initPublishDropdown();
    initPreview();
    initAutoSave();
    initKeyboardShortcuts();
    initPublishActions();
    checkUrlForEdit();
});

function checkAuth() {
    fetch('/api/current_user', { credentials: 'same-origin' })
        .then(function(r) { return r.json(); })
        .then(function(data) {
            if (!data.username) {
                window.location.href = '/login.html';
            } else {
                var displayName = data.nickname || data.username;
                var navUserName = document.getElementById('navUserName');
                var navAvatar = document.getElementById('navAvatar');
                var userMenuContainer = document.getElementById('userMenuContainer');
                var loginBtn = document.getElementById('loginBtn');
                if (navUserName) navUserName.textContent = displayName;
                if (data.avatar && navAvatar) {
                    navAvatar.src = data.avatar;
                    navAvatar.style.display = 'block';
                }
                if (userMenuContainer) userMenuContainer.style.display = 'block';
                if (loginBtn) loginBtn.style.display = 'none';
            }
        })
        .catch(function() { window.location.href = '/login.html'; });

    var userMenuBtn = document.getElementById('userMenuBtn');
    var userDropdown = document.getElementById('userDropdown');
    var userMenuContainer = document.getElementById('userMenuContainer');
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

    }

    var logoutBtnDropdown = document.getElementById('logoutBtnDropdown');
    if (logoutBtnDropdown) {
        logoutBtnDropdown.addEventListener('click', function() {
            fetch('/api/logout', { method: 'POST', credentials: 'same-origin' })
                .then(function() { window.location.href = '/login.html'; });
        });
    }

    var loginBtn = document.getElementById('loginBtn');
    if (loginBtn) {
        loginBtn.addEventListener('click', function() {
            window.location.href = '/login.html';
        });
    }

function checkUrlForEdit() {
    var match = window.location.pathname.match(/\/editor\.html\/(\d+)/);
    if (match) {
        editingArticleId = parseInt(match[1]);
        loadArticleForEdit(editingArticleId);
    }
}

function loadArticleForEdit(id) {
    document.getElementById('topbarTitle').textContent = '编辑文章';
    fetch('/api/articles/' + id, { credentials: 'same-origin' })
        .then(function(r) { return r.json(); })
        .then(function(data) {
            if (data.error) { showToast(data.error, 'error'); return; }
            document.getElementById('articleTitleInput').value = data.title;
            document.getElementById('articleExcerptInput').value = data.excerpt;
            document.getElementById('articleThumbnailInput').value = data.thumbnail || '';
            if (editor) editor.setHtml(data.content || '');
            currentPublishStatus = data.status;
            updateStatusBadge();
            if (data.tag) { articleTags = [data.tag]; renderTags(); }
            if (data.thumbnail) showCoverPreview(data.thumbnail);
            if (data.scheduled_at) {
                var dt = new Date(data.scheduled_at);
                document.getElementById('scheduledInput').value = new Date(dt.getTime() - dt.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
                document.getElementById('scheduledTimeDisplay').textContent = document.getElementById('scheduledInput').value.replace('T', ' ');
                document.getElementById('scheduledSetting').style.display = 'flex';
            }
            updateWordCount();
            setTimeout(updateOutline, 500);
        })
        .catch(function() { showToast('加载文章失败', 'error'); });
}

function initTitleInput() {
    document.getElementById('articleTitleInput').addEventListener('input', function() {
        this.style.color = this.value.length > 80 ? '#ef4444' : '#333';
    });
}

function updateWordCount() {
    if (!editor) return;
    var text = editor.getText().replace(/\n/g, '').trim();
    document.getElementById('wordCount').textContent = text.length + ' 字';
    updateAutoExcerpt();
}

function updateAutoExcerpt() {
    var excerpt = document.getElementById('articleExcerptInput');
    if (!excerpt.value.trim() && editor) {
        var text = editor.getText().trim().substring(0, 150);
        excerpt.placeholder = text ? '自动截取: ' + text + '...' : '输入文章摘要...';
    }
}

/* ==================== WangEditor 5 ==================== */

function initWangEditor() {
    editor = createEditor({
        selector: '#w-e-text',
        html: '<p><br></p>',
        config: {
            placeholder: '开始撰写你的文章...',
            onChange: function(editor) {
                updateWordCount();
                clearTimeout(outlineUpdateTimer);
                outlineUpdateTimer = setTimeout(updateOutline, 500);
            },
            // Enable server-based image upload so that Local Upload button appears
            uploadImgServer: '/api/upload-editor-image',
            uploadImgFileName: 'file',
            uploadImgMaxSize: 5 * 1024 * 1024,
            uploadImgMaxLength: 1,
            // Do not force base64 fallback unless backend is unavailable
            // uploadImgShowBase64: true,
            // video base64 fallback could be added similarly if needed
            // uploadVideoShowBase64: true,
        },
        mode: 'default',
    });

    toolbar = createToolbar({
        editor: editor,
        selector: '#w-e-toolbar',
        config: {
            toolbarKeys: [
                'blockquote',
                'headerSelect',
                '|',
                'bold', 'italic', 'underline', 'through',
                'color', 'bgColor',
                '|',
                'fontSize', 'fontFamily', 'lineHeight',
                '|',
                'bulletedList', 'numberedList', 'todo',
                '|',
                'justifyLeft', 'justifyCenter', 'justifyRight', 'justifyJustify',
                'indent', 'delIndent',
                '|',
                'code', 'codeBlock',
                '|',
                'insertLink', 'insertImage', 'insertVideo', 'insertTable',
                '|',
                'emotion',
                '|',
                'divider', 'clearStyle',
                '|',
                'undo', 'redo',
                '|',
                'fullScreen',
            ],
        },
        mode: 'default',
    });

    // Local upload button removed; rely on wangEditor native upload flow
}

/* ==================== Outline ==================== */

function initOutline() { updateOutline(); }

function updateOutline() {
    if (!editor) return;
    var html = editor.getHtml();
    var temp = document.createElement('div');
    temp.innerHTML = html;
    var headings = temp.querySelectorAll('h1, h2, h3');
    var list = document.getElementById('outlineList');
    var empty = document.getElementById('outlineEmpty');

    if (!list || !empty) return;

    if (headings.length === 0) {
        empty.style.display = 'flex';
        list.style.display = 'none';
        return;
    }

    empty.style.display = 'none';
    list.style.display = 'flex';
    list.innerHTML = '';

    for (var i = 0; i < headings.length; i++) {
        (function(h, idx) {
            var a = document.createElement('a');
            a.className = 'outline-item level-' + h.tagName.toLowerCase();
            a.textContent = h.textContent.trim();
            a.href = '#';
            a.addEventListener('click', function(e) {
                e.preventDefault();
                var targetId = 'outline-heading-' + idx;
                h.id = targetId;
                editor.scrollToElem(targetId);
                list.querySelectorAll('.outline-item').forEach(function(x) { x.classList.remove('active'); });
                this.classList.add('active');
            });
            list.appendChild(a);
        })(headings[i], i);
    }
}

/* ==================== Cover Upload ==================== */

function initCoverUpload() {
    document.getElementById('coverPlaceholder').addEventListener('click', function() {
        document.getElementById('coverInput').click();
    });
    document.getElementById('coverInput').addEventListener('change', function() {
        var file = this.files[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) { showToast('文件不能超过5MB', 'error'); return; }
        var reader = new FileReader();
        reader.onload = function(e) {
            showCoverPreview(e.target.result);
            document.getElementById('articleThumbnailInput').value = e.target.result;
        };
        reader.readAsDataURL(file);
    });
    document.getElementById('articleThumbnailInput').addEventListener('input', function() {
        if (this.value.trim()) showCoverPreview(this.value.trim());
        else hideCoverPreview();
    });
}

function showCoverPreview(src) {
    document.getElementById('coverPreview').src = src;
    document.getElementById('coverPreview').style.display = 'block';
    document.getElementById('coverPlaceholder').style.display = 'none';
    document.getElementById('coverPreview').onclick = function() {
        document.getElementById('coverInput').click();
    };
}

function hideCoverPreview() {
    document.getElementById('coverPreview').style.display = 'none';
    document.getElementById('coverPlaceholder').style.display = 'flex';
}

/* ==================== Tags ==================== */

function initTagInput() {
    document.getElementById('tagInput').addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            var val = this.value.trim();
            if (!val) return;
            if (articleTags.length >= 5) { showToast('最多5个标签', 'error'); return; }
            if (articleTags.includes(val)) { showToast('标签已存在', 'error'); return; }
            articleTags.push(val);
            this.value = '';
            renderTags();
        }
    });
}

function renderTags() {
    var list = document.getElementById('tagList');
    list.innerHTML = articleTags.map(function(tag, i) {
        return '<span class="tag-item">' + tag + '<span class="tag-remove" data-index="' + i + '"><i class="fa-solid fa-xmark"></i></span></span>';
    }).join('');
    list.querySelectorAll('.tag-remove').forEach(function(el) {
        el.addEventListener('click', function() {
            articleTags.splice(parseInt(this.dataset.index), 1);
            renderTags();
        });
    });
}

/* ==================== Publish Dropdown ==================== */

function initPublishDropdown() {
    document.getElementById('publishToggleBtn').addEventListener('click', function(e) {
        e.stopPropagation();
        document.getElementById('publishMenu').classList.toggle('show');
    });
    document.addEventListener('click', function(e) {
        if (!document.getElementById('publishDropdown').contains(e.target)) {
            document.getElementById('publishMenu').classList.remove('show');
        }
    });
    document.querySelectorAll('.publish-menu-item').forEach(function(item) {
        item.addEventListener('click', function() {
            var status = this.dataset.status;
            if (status === 'scheduled') {
                document.getElementById('publishScheduled').style.display = 'flex';
                return;
            }
            currentPublishStatus = status;
            updateStatusBadge();
            document.getElementById('publishMenu').classList.remove('show');
            document.getElementById('publishScheduled').style.display = 'none';
            document.getElementById('scheduledSetting').style.display = 'none';
        });
    });
    document.getElementById('confirmScheduledBtn').addEventListener('click', function() {
        var val = document.getElementById('scheduledInput').value;
        if (!val) { showToast('请选择时间', 'error'); return; }
        currentPublishStatus = 'scheduled';
        updateStatusBadge();
        document.getElementById('publishMenu').classList.remove('show');
        document.getElementById('publishScheduled').style.display = 'none';
        document.getElementById('scheduledTimeDisplay').textContent = val.replace('T', ' ');
        document.getElementById('scheduledSetting').style.display = 'flex';
    });
}

function updateStatusBadge() {
    var labels = { public: '公开', private: '私密', scheduled: '定时发布' };
    document.getElementById('currentStatusBadge').innerHTML =
        '<span class="status-dot ' + currentPublishStatus + '"></span> ' + labels[currentPublishStatus];
}

/* ==================== Publish Actions ==================== */

function initPublishActions() {
    document.getElementById('draftBtn').addEventListener('click', function() {
        if (editingArticleId) { saveDraft(); showToast('草稿已保存', 'success'); }
        else { saveDraftFirst(function() { showToast('草稿已保存', 'success'); }); }
    });

    document.querySelectorAll('.publish-menu-item').forEach(function(item) {
        item.addEventListener('click', function() {
            var status = this.dataset.status;
            if (status === 'scheduled') return;
            publishArticle(status);
        });
    });

    document.getElementById('confirmScheduledBtn').addEventListener('click', function() {
        if (!document.getElementById('scheduledInput').value) { showToast('请选择时间', 'error'); return; }
        publishArticle('scheduled');
    });
}

function publishArticle(status) {
    var title = document.getElementById('articleTitleInput').value.trim();
    var content = editor ? editor.getHtml() : '';
    var excerpt = document.getElementById('articleExcerptInput').value.trim();
    if (!excerpt && editor) excerpt = editor.getText().trim().substring(0, 150);
    var thumbnail = document.getElementById('articleThumbnailInput').value.trim();
    var tag = articleTags[0] || '';

    if (!title) { showToast('请输入标题', 'error'); return; }
    if (!excerpt) { showToast('请输入摘要', 'error'); return; }

    var scheduledIso = null;
    if (status === 'scheduled') {
        var val = document.getElementById('scheduledInput').value;
        if (!val) { showToast('请选择发布时间', 'error'); return; }
        var d = new Date(val);
        if (isNaN(d.getTime())) { showToast('时间格式不正确', 'error'); return; }
        scheduledIso = d.toISOString();
    }

    var data = { title: title, content: content, excerpt: excerpt, tag: tag, thumbnail: thumbnail, status: status, scheduled_at: scheduledIso };
    var url = editingArticleId ? '/api/user/articles/' + editingArticleId : '/api/user/articles';
    var method = editingArticleId ? 'PUT' : 'POST';

    fetch(url, {
        method: method,
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    })
    .then(function(r) { return r.json(); })
    .then(function(data) {
        if (data.message) {
            showToast(editingArticleId ? '文章已更新' : '文章已发布', 'success');
            if (!editingArticleId && data.id) editingArticleId = data.id;
            setTimeout(function() { window.location.href = '/my-articles.html'; }, 1500);
        } else {
            showToast(data.error || '操作失败', 'error');
        }
    })
    .catch(function() { showToast('操作失败', 'error'); });
}

/* ==================== Preview ==================== */

function initPreview() {
    document.getElementById('previewBtn').addEventListener('click', function() {
        var title = document.getElementById('articleTitleInput').value.trim() || '无标题';
        var content = editor ? editor.getHtml() : '';
        var tag = articleTags.join(', ');
        document.getElementById('previewModalTitle').textContent = title;
        document.getElementById('previewMeta').innerHTML =
            '<span><i class="fa-regular fa-calendar"></i> ' + new Date().toLocaleDateString('zh-CN') + '</span>' +
            (tag ? '<span><i class="fa-solid fa-tag"></i> ' + tag + '</span>' : '');
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

/* ==================== Auto Save ==================== */

function initAutoSave() {
    var titleInput = document.getElementById('articleTitleInput');
    titleInput.addEventListener('input', function() {
        clearTimeout(autoSaveTimer);
        autoSaveTimer = setTimeout(function() { if (editingArticleId) saveDraft(); }, 3000);
    });
}

function initKeyboardShortcuts() {
    document.addEventListener('keydown', function(e) {
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            if (editingArticleId) { saveDraft(); showToast('草稿已保存', 'success'); }
            else { saveDraftFirst(function() { showToast('草稿已保存', 'success'); }); }
        }
    });
}

function saveDraftFirst(callback) {
    var title = document.getElementById('articleTitleInput').value.trim();
    if (!title) { showToast('请先输入标题', 'error'); return; }
    var content = editor ? editor.getHtml() : '';
    var excerpt = document.getElementById('articleExcerptInput').value.trim();
    if (!excerpt && editor) excerpt = editor.getText().trim().substring(0, 150);

    fetch('/api/user/articles', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            title: title, content: content, excerpt: excerpt,
            tag: articleTags[0] || '',
            thumbnail: document.getElementById('articleThumbnailInput').value.trim() || '',
            status: 'draft',
        }),
    })
    .then(function(r) { return r.json(); })
    .then(function(data) {
        if (data.id) {
            editingArticleId = data.id;
            document.getElementById('topbarTitle').textContent = '编辑文章';
            if (callback) callback();
        }
    })
    .catch(function() { showToast('保存草稿失败', 'error'); });
}

function saveDraft() {
    if (!editingArticleId) return;
    var title = document.getElementById('articleTitleInput').value.trim();
    var content = editor ? editor.getHtml() : '';
    var excerpt = document.getElementById('articleExcerptInput').value.trim();
    if (!excerpt && editor) excerpt = editor.getText().trim().substring(0, 150);

    fetch('/api/user/articles/' + editingArticleId, {
        method: 'PUT',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title, content: content, excerpt: excerpt, status: 'draft' }),
    })
    .then(function(r) { return r.json(); })
    .then(function(data) {
        if (data.message) {
            var s = document.getElementById('saveStatus');
            s.textContent = '已保存';
            setTimeout(function() { s.textContent = ''; }, 2000);
        }
    })
    .catch(function() {});
}

/* ==================== Toast ==================== */

function showToast(message, type) {
    var existing = document.querySelector('.toast');
    if (existing) existing.remove();
    var toast = document.createElement('div');
    toast.className = 'toast ' + type;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(function() { toast.remove(); }, 3000);
}
