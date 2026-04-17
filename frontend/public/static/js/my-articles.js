let allArticles = [];
let currentFilter = 'all';
let deleteTargetId = null;

if (typeof window.showToast !== 'function') {
    window.showToast = function(message) {
        try { console.log(message); } catch (e) {}
    };
}

function __initMyArticlesPage() {
    loadMyArticles();
    initFilters();
    initDeleteModal();
}

function loadMyArticles() {
    fetch('/api/user/articles', { credentials: 'same-origin' })
        .then(function(r) { return r.json(); })
        .then(function(data) {
            allArticles = data || [];
            renderArticles();
        })
        .catch(function() {
            document.getElementById('myArticlesList').innerHTML = '<div class="empty-placeholder"><i class="fa-regular fa-folder-open"></i><p>加载失败</p></div>';
        });
}

function renderArticles() {
    var container = document.getElementById('myArticlesList');
    var filtered = currentFilter === 'all'
        ? allArticles.filter(function(a) { return a.status !== 'draft'; })
        : allArticles.filter(function(a) { return a.status === currentFilter; });

    if (filtered.length === 0) {
        container.innerHTML = '<div class="empty-placeholder"><i class="fa-regular fa-folder-open"></i><p>暂无文章</p></div>';
        return;
    }

    var html = '';
    for (var i = 0; i < filtered.length; i++) {
        var a = filtered[i];
        var statusLabel = { public: '公开', private: '私密', scheduled: '定时', draft: '草稿' }[a.status] || a.status;
        var scheduledInfo = '';
        if (a.status === 'scheduled' && a.scheduled_at) {
            var d = new Date(a.scheduled_at);
            scheduledInfo = '<span><i class="fa-regular fa-clock"></i> ' + d.toLocaleString('zh-CN') + '</span>';
        }
        
        var dateInfo = a.date;
        if (a.updated_at) {
            var updateDate = new Date(a.updated_at);
            var updateDateStr = updateDate.toISOString().split('T')[0];
            if (updateDateStr !== a.date) {
                dateInfo = '更新于 ' + updateDateStr;
            }
        }
        
        html += '<div class="my-article-item" data-id="' + a.id + '">' +
            '<div class="my-article-info">' +
                '<h4>' + a.title + '</h4>' +
                '<div class="my-article-meta">' +
                    '<span><i class="fa-regular fa-calendar"></i> ' + dateInfo + '</span>' +
                    '<span><i class="fa-regular fa-eye"></i> ' + a.views + '</span>' +
                    '<span><i class="fa-regular fa-heart"></i> ' + a.likes + '</span>' +
                    '<span class="status-badge ' + a.status + '">' + statusLabel + '</span>' +
                    scheduledInfo +
                '</div>' +
            '</div>' +
            '<div class="my-article-actions">' +
                '<button class="btn btn-secondary btn-sm view-btn" data-id="' + a.id + '"><i class="fa-regular fa-eye"></i> 查看</button>' +
                '<button class="btn btn-secondary btn-sm edit-btn" data-id="' + a.id + '"><i class="fa-solid fa-pen"></i> 编辑</button>' +
                '<button class="btn btn-danger btn-sm delete-btn" data-id="' + a.id + '"><i class="fa-solid fa-trash"></i> 删除</button>' +
            '</div>' +
        '</div>';
    }
    container.innerHTML = html;

    var editBtns = container.querySelectorAll('.edit-btn');
    for (var j = 0; j < editBtns.length; j++) {
        (function(btn) {
            btn.addEventListener('click', function() {
                window.location.href = '/editor/' + btn.dataset.id;
            });
        })(editBtns[j]);
    }

    var viewBtns = container.querySelectorAll('.view-btn');
    for (var k = 0; k < viewBtns.length; k++) {
        (function(btn) {
            btn.addEventListener('click', function() {
                window.location.href = '/article/' + btn.dataset.id;
            });
        })(viewBtns[k]);
    }

    var deleteBtns = container.querySelectorAll('.delete-btn');
    for (var m = 0; m < deleteBtns.length; m++) {
        (function(btn) {
            btn.addEventListener('click', function() {
                deleteTargetId = parseInt(btn.dataset.id);
                document.getElementById('deleteModal').classList.add('show');
            });
        })(deleteBtns[m]);
    }
}

function initFilters() {
    var filterBtns = document.querySelectorAll('.filter-btn');
    for (var i = 0; i < filterBtns.length; i++) {
        (function(btn) {
            btn.addEventListener('click', function() {
                for (var j = 0; j < filterBtns.length; j++) filterBtns[j].classList.remove('active');
                btn.classList.add('active');
                currentFilter = btn.dataset.filter;
                renderArticles();
            });
        })(filterBtns[i]);
    }
}

function initDeleteModal() {
    document.getElementById('deleteModalClose').addEventListener('click', closeModal);
    document.getElementById('cancelDeleteBtn').addEventListener('click', closeModal);
    document.getElementById('deleteModal').addEventListener('click', function(e) {
        if (e.target === this) closeModal();
    });
    document.getElementById('confirmDeleteBtn').addEventListener('click', function() {
        if (!deleteTargetId) return;
        fetch('/api/user/articles/' + deleteTargetId, { method: 'DELETE', credentials: 'same-origin' })
            .then(function(r) { return r.json(); })
            .then(function(data) {
                if (data.message) {
                    showToast('文章已删除', 'success');
                    allArticles = allArticles.filter(function(a) { return a.id !== deleteTargetId; });
                    renderArticles();
                } else {
                    showToast(data.error || '删除失败', 'error');
                }
            })
            .catch(function() { showToast('删除失败', 'error'); });
        closeModal();
    });
}

function closeModal() {
    document.getElementById('deleteModal').classList.remove('show');
    deleteTargetId = null;
}

if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', __initMyArticlesPage, { once: true });
} else {
    __initMyArticlesPage();
}

