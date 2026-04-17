function __initMyInteractionsPage() {
    initInteractions();
}

/* ==================== Interactions ==================== */

var currentInteractionFilter = 'likes';
var likesData = [];
var favoritesData = [];

function initInteractions() {
    loadInteractions();

    var filterBtns = document.querySelectorAll('.filter-btn');
    for (var i = 0; i < filterBtns.length; i++) {
        (function(btn) {
            btn.addEventListener('click', function() {
                for (var j = 0; j < filterBtns.length; j++) filterBtns[j].classList.remove('active');
                btn.classList.add('active');
                currentInteractionFilter = btn.dataset.filter;
                renderInteractions();
            });
        })(filterBtns[i]);
    }
}

function loadInteractions() {
    fetch('/api/user/likes')
        .then(function(r) { return r.json(); })
        .then(function(data) {
            likesData = data || [];
            document.getElementById('likesCount').textContent = likesData.length;
            renderInteractions();
        })
        .catch(function() {
            document.getElementById('myInteractionsList').innerHTML = '<div class="empty-placeholder"><i class="fa-regular fa-folder-open"></i><p>加载失败</p></div>';
        });

    fetch('/api/user/favorites')
        .then(function(r) { return r.json(); })
        .then(function(data) {
            favoritesData = data || [];
            document.getElementById('favoritesCount').textContent = favoritesData.length;
        })
        .catch(function() {});
}

function renderInteractions() {
    var container = document.getElementById('myInteractionsList');
    var items = currentInteractionFilter === 'likes' ? likesData : favoritesData;

    if (!items || items.length === 0) {
        container.innerHTML = '<div class="empty-placeholder"><i class="fa-regular fa-folder-open"></i><p>暂无' + (currentInteractionFilter === 'likes' ? '点赞' : '收藏') + '</p></div>';
        return;
    }

    var html = '';
    for (var i = 0; i < items.length; i++) {
        var a = items[i];
        var timeLabel = currentInteractionFilter === 'likes' ? 'liked_at' : 'favorited_at';
        var d = a[timeLabel] ? new Date(a[timeLabel]) : null;
        var timeStr = d ? d.toLocaleDateString('zh-CN') : '';
        html += '<a href="/article/' + a.id + '" class="my-article-item">' +
            '<div class="my-article-info">' +
                '<h4>' + a.title + '</h4>' +
                '<div class="my-article-meta">' +
                    '<span><i class="fa-regular fa-calendar"></i> ' + a.date + '</span>' +
                    '<span><i class="fa-regular fa-eye"></i> ' + a.views + '</span>' +
                    '<span><i class="fa-regular fa-heart"></i> ' + a.likes + '</span>' +
                    (timeStr ? '<span><i class="fa-regular fa-clock"></i> ' + timeStr + '</span>' : '') +
                '</div>' +
            '</div>' +
        '</a>';
    }
    container.innerHTML = html;
}

if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', __initMyInteractionsPage, { once: true });
} else {
    __initMyInteractionsPage();
}
