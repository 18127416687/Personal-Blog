let allDrafts = [];
let deleteTargetId = null;

if (typeof window.showToast !== 'function') {
    window.showToast = function(message) {
        try { console.log(message); } catch (e) {}
    };
}

function __initMyDraftsPage() {
    loadMyDrafts();
    initDeleteModal();
}

function loadMyDrafts() {
    fetch('/api/user/articles', { credentials: 'same-origin' })
        .then(function(r) { return r.json(); })
        .then(function(data) {
            allDrafts = (data || []).filter(function(a) { return a.status === 'draft'; });
            renderDrafts();
        })
        .catch(function() {
            document.getElementById('myArticlesList').innerHTML = '<div class="empty-placeholder"><i class="fa-regular fa-folder-open"></i><p>加载失败</p></div>';
        });
}

function renderDrafts() {
    var container = document.getElementById('myArticlesList');

    if (allDrafts.length === 0) {
        container.innerHTML = '<div class="empty-placeholder"><i class="fa-regular fa-file-lines"></i><p>暂无草稿</p></div>';
        return;
    }

    var html = '';
    for (var i = 0; i < allDrafts.length; i++) {
        var a = allDrafts[i];
        html += '<div class="my-article-item" data-id="' + a.id + '">' +
            '<div class="my-article-info">' +
                '<h4>' + a.title + '</h4>' +
                '<div class="my-article-meta">' +
                    '<span><i class="fa-regular fa-calendar"></i> ' + a.date + '</span>' +
                    '<span class="status-badge draft">草稿</span>' +
                '</div>' +
            '</div>' +
            '<div class="my-article-actions">' +
                '<button class="btn btn-secondary btn-sm edit-btn" data-id="' + a.id + '"><i class="fa-solid fa-pen"></i> 继续编辑</button>' +
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
                    showToast('草稿已删除', 'success');
                    allDrafts = allDrafts.filter(function(a) { return a.id !== deleteTargetId; });
                    renderDrafts();
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
    window.addEventListener('DOMContentLoaded', __initMyDraftsPage, { once: true });
} else {
    __initMyDraftsPage();
}

