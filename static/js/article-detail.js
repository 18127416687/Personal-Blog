let articleId = null;

window.addEventListener('DOMContentLoaded', function() {
    var match = window.location.pathname.match(/\/article\/(\d+)/);
    if (!match) {
        showError('文章不存在');
        return;
    }
    articleId = parseInt(match[1]);
    loadArticle(articleId);
    initActions();
    initAuth();
    initComments();
});

function loadArticle(id) {
    fetch('/api/articles/' + id)
        .then(function(r) { return r.json(); })
        .then(function(data) {
            if (data.error) { showError(data.error); return; }

            document.getElementById('adLoading').style.display = 'none';
            document.getElementById('adContent').style.display = 'block';

            document.getElementById('adTitle').textContent = data.title;
            document.getElementById('adAuthor').textContent = data.author;
            
            var dateDisplay = data.date;
            if (data.updated_at) {
                var updatedDate = new Date(data.updated_at);
                var dateOnly = data.date || '';
                if (dateOnly) {
                    var dateParts = dateOnly.split('-');
                    var originalDate = new Date(dateParts[0], dateParts[1] - 1, dateParts[2]);
                    var updatedDateOnly = updatedDate.toISOString().split('T')[0];
                    if (updatedDateOnly !== dateOnly) {
                        var updateTime = updatedDate.toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
                        dateDisplay = '更新于 ' + updateTime;
                    }
                }
            }
            document.getElementById('adDate').textContent = dateDisplay;
            document.getElementById('adViews').textContent = data.views;
            document.getElementById('adLikeNum').textContent = data.likes;
            document.getElementById('adFavNum').textContent = data.favorites;
            document.title = data.title + ' - 静泊小筑';

            if (data.user_liked) {
                document.getElementById('adLikeBtn').classList.add('ad-liked');
            }
            if (data.user_favorited) {
                document.getElementById('adFavBtn').classList.add('ad-favorited');
            }

            if (data.tag) {
                var tagEl = document.getElementById('adTag');
                tagEl.textContent = '#' + data.tag;
                tagEl.style.display = 'inline-block';
            }

            if (data.thumbnail) {
                document.getElementById('adCoverImg').src = data.thumbnail;
                document.getElementById('adCover').style.display = 'block';
            }

            var content = data.content || '';
            if (!content) {
                content = '<p style="color:#999;text-align:center;padding:2rem;">暂无正文</p>';
            }
            document.getElementById('adBody').innerHTML = content;

            setTimeout(function() {
                buildTOC();
            }, 100);
        })
        .catch(function() { showError('加载文章失败'); });
}

function buildTOC() {
    var body = document.getElementById('adBody');
    var nav = document.getElementById('adTocNav');
    var empty = document.getElementById('adTocEmpty');

    if (!body || !nav || !empty) {
        console.error('TOC elements not found');
        return;
    }

    var headings = body.querySelectorAll('h1, h2, h3');

    if (!headings || headings.length === 0) {
        empty.style.display = 'block';
        empty.textContent = '暂无目录';
        nav.style.display = 'none';
        return;
    }

    empty.style.display = 'none';
    nav.style.display = 'block';
    nav.innerHTML = '';

    for (var i = 0; i < headings.length; i++) {
        var h = headings[i];
        h.id = 'heading-' + i;

        var level = h.tagName.toLowerCase();
        var text = h.textContent.trim();

        if (!text) continue;

        var item = document.createElement('div');
        item.className = 'ad-toc-item ad-toc-' + level;
        item.setAttribute('data-target', 'heading-' + i);

        var dot = document.createElement('span');
        dot.className = 'ad-toc-dot';

        var label = document.createElement('span');
        label.className = 'ad-toc-label';
        label.textContent = text;

        item.appendChild(dot);
        item.appendChild(label);
        nav.appendChild(item);

        (function(target, el) {
            item.addEventListener('click', function() {
                var targetEl = document.getElementById(target);
                if (targetEl) {
                    var offset = 80;
                    var top = targetEl.getBoundingClientRect().top + window.pageYOffset - offset;
                    window.scrollTo({ top: top, behavior: 'smooth' });
                }
                var allItems = nav.querySelectorAll('.ad-toc-item');
                for (var j = 0; j < allItems.length; j++) {
                    allItems[j].classList.remove('ad-toc-active');
                }
                el.classList.add('ad-toc-active');
            });
        })('heading-' + i, item);
    }

    var tocScrollHandler = function() {
        var currentId = '';
        for (var i = 0; i < headings.length; i++) {
            var rect = headings[i].getBoundingClientRect();
            if (rect.top <= 120) {
                currentId = headings[i].id;
            }
        }
        var allItems = nav.querySelectorAll('.ad-toc-item');
        for (var j = 0; j < allItems.length; j++) {
            var target = allItems[j].getAttribute('data-target');
            if (target === currentId) {
                allItems[j].classList.add('ad-toc-active');
            } else {
                allItems[j].classList.remove('ad-toc-active');
            }
        }
    };

    window.addEventListener('scroll', tocScrollHandler);
    tocScrollHandler();
}

function initActions() {
    var likeBtn = document.getElementById('adLikeBtn');
    var favBtn = document.getElementById('adFavBtn');

    if (likeBtn) {
        likeBtn.addEventListener('click', function() {
            fetch('/api/articles/' + articleId + '/like', { method: 'POST' })
                .then(function(r) { return r.json(); })
                .then(function(data) {
                    if (data.likes !== undefined) {
                        document.getElementById('adLikeNum').textContent = data.likes;
                        if (data.action === 'liked') {
                            likeBtn.classList.add('ad-liked');
                        } else {
                            likeBtn.classList.remove('ad-liked');
                        }
                    }
                })
                .catch(function() {});
        });
    }

    if (favBtn) {
        favBtn.addEventListener('click', function() {
            fetch('/api/articles/' + articleId + '/favorite', { method: 'POST' })
                .then(function(r) { return r.json(); })
                .then(function(data) {
                    if (data.favorites !== undefined) {
                        document.getElementById('adFavNum').textContent = data.favorites;
                        if (data.action === 'favorited') {
                            favBtn.classList.add('ad-favorited');
                        } else {
                            favBtn.classList.remove('ad-favorited');
                        }
                    }
                })
                .catch(function() {});
        });
    }
}

function initAuth() {
    fetch('/api/current_user')
        .then(function(r) { return r.json(); })
        .then(function(data) {
            if (data.username) {
                var loginBtn = document.getElementById('adLoginBtn');
                var logoutBtn = document.getElementById('adLogoutBtn');
                if (loginBtn) loginBtn.style.display = 'none';
                if (logoutBtn) logoutBtn.style.display = 'inline';
            }
        })
        .catch(function() {});

    var loginBtn = document.getElementById('adLoginBtn');
    if (loginBtn) {
        loginBtn.addEventListener('click', function() {
            window.location.href = '/login.html';
        });
    }

    var logoutBtn = document.getElementById('adLogoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            fetch('/api/logout', { method: 'POST' })
                .then(function() { window.location.reload(); });
        });
    }

    // Mobile hamburger menu - handled via onclick in HTML
}

function showError(msg) {
    var loading = document.getElementById('adLoading');
    var content = document.getElementById('adContent');
    var error = document.getElementById('adError');
    var errorMsg = document.getElementById('adErrorMsg');

    if (loading) loading.style.display = 'none';
    if (content) content.style.display = 'none';
    if (error) error.style.display = 'flex';
    if (errorMsg) errorMsg.textContent = msg;
}

/* ==================== Comments ==================== */

var currentUser = null;

function initComments() {
    fetch('/api/current_user')
        .then(function(r) { return r.json(); })
        .then(function(data) {
            if (data.username) {
                currentUser = data;
            }
        })
        .catch(function() {});

    loadComments();

    var submitBtn = document.getElementById('submitCommentBtn');
    if (submitBtn) {
        submitBtn.addEventListener('click', submitComment);
    }
}

function loadComments() {
    fetch('/api/articles/' + articleId + '/comments')
        .then(function(r) { return r.json(); })
        .then(function(data) {
            renderComments(data);
        })
        .catch(function() {
            document.getElementById('commentsList').innerHTML = '<div class="ad-no-comments">加载评论失败</div>';
        });
}

function renderComments(comments) {
    var container = document.getElementById('commentsList');
    var countEl = document.getElementById('commentCount');

    if (!comments || comments.length === 0) {
        container.innerHTML = '<div class="ad-no-comments"><i class="fa-regular fa-comment-dots"></i>暂无评论，快来抢沙发吧！</div>';
        if (countEl) countEl.textContent = '0';
        return;
    }

    var totalComments = 0;
    var html = '';
    for (var i = 0; i < comments.length; i++) {
        var c = comments[i];
        totalComments += 1 + (c.replies ? c.replies.length : 0);
        html += renderCommentItem(c);
    }
    container.innerHTML = html;
    if (countEl) countEl.textContent = totalComments;

    bindCommentActions();
}

function renderCommentItem(c) {
    var avatarHtml = c.user_avatar ?
        '<img src="' + c.user_avatar + '" alt="">' :
        '<i class="fa-regular fa-circle-user"></i>';

    var timeStr = c.created_at ? timeAgo(c.created_at) : '';
    var canDelete = currentUser && c.user === currentUser.username;

    var html = '<div class="ad-comment-item" data-id="' + c.id + '">' +
        '<div class="ad-comment-avatar">' + avatarHtml + '</div>' +
        '<div class="ad-comment-body">' +
            '<div class="ad-comment-user">' +
                '<span class="ad-comment-username">' + (c.user_nickname || c.user) + '</span>' +
                '<span class="ad-comment-time">' + timeStr + '</span>' +
            '</div>' +
            '<div class="ad-comment-content">' + escapeHtml(c.content) + '</div>' +
            '<div class="ad-comment-actions">' +
                '<button class="ad-comment-action comment-like-btn" data-id="' + c.id + '">' +
                    '<i class="fa-regular fa-heart"></i> ' + c.likes +
                '</button>' +
                '<button class="ad-comment-action comment-reply-btn" data-id="' + c.id + '" data-user="' + escapeHtml(c.user_nickname || c.user) + '">' +
                    '<i class="fa-regular fa-comment"></i> 回复' +
                '</button>' +
                (canDelete ? '<button class="ad-comment-action delete-btn comment-delete-btn" data-id="' + c.id + '"><i class="fa-solid fa-trash"></i></button>' : '') +
            '</div>';

    if (c.replies && c.replies.length > 0) {
        html += '<div class="ad-comment-replies">';
        for (var j = 0; j < c.replies.length; j++) {
            var r = c.replies[j];
            var rAvatar = r.user_avatar ?
                '<img src="' + r.user_avatar + '" alt="">' :
                '<i class="fa-regular fa-circle-user"></i>';
            var rTime = r.created_at ? timeAgo(r.created_at) : '';
            var rCanDelete = currentUser && r.user === currentUser.username;

            html += '<div class="ad-reply-item" data-id="' + r.id + '">' +
                '<div class="ad-reply-avatar">' + rAvatar + '</div>' +
                '<div class="ad-reply-body">' +
                    '<div class="ad-reply-user">' +
                        '<span class="ad-reply-username">' + (r.user_nickname || r.user) + '</span>' +
                        '<span class="ad-reply-time">' + rTime + '</span>' +
                    '</div>' +
                    '<div class="ad-reply-content">' + escapeHtml(r.content) + '</div>' +
                    '<div class="ad-reply-actions">' +
                        '<button class="ad-reply-action reply-like-btn" data-id="' + r.id + '">' +
                            '<i class="fa-regular fa-heart"></i> ' + r.likes +
                        '</button>' +
                        '<button class="ad-reply-action comment-reply-btn" data-id="' + c.id + '" data-user="' + escapeHtml(r.user_nickname || r.user) + '">' +
                            '<i class="fa-regular fa-comment"></i> 回复' +
                        '</button>' +
                        (rCanDelete ? '<button class="ad-reply-action delete-btn comment-delete-btn" data-id="' + r.id + '"><i class="fa-solid fa-trash"></i></button>' : '') +
                    '</div>' +
                '</div>' +
            '</div>';
        }
        html += '</div>';
    }

    html += '</div></div>';
    return html;
}

function bindCommentActions() {
    document.querySelectorAll('.comment-like-btn').forEach(function(btn) {
        btn.addEventListener('click', function() {
            if (!currentUser) { window.location.href = '/login.html'; return; }
            var id = this.dataset.id;
            var self = this;
            fetch('/api/comments/' + id + '/like', { method: 'POST' })
                .then(function(r) { return r.json(); })
                .then(function(data) {
                    if (data.likes !== undefined) {
                        self.innerHTML = '<i class="fa-regular fa-heart"></i> ' + data.likes;
                        if (data.action === 'liked') self.classList.add('liked');
                        else self.classList.remove('liked');
                    }
                })
                .catch(function() {});
        });
    });

    document.querySelectorAll('.reply-like-btn').forEach(function(btn) {
        btn.addEventListener('click', function() {
            if (!currentUser) { window.location.href = '/login.html'; return; }
            var id = this.dataset.id;
            var self = this;
            fetch('/api/comments/' + id + '/like', { method: 'POST' })
                .then(function(r) { return r.json(); })
                .then(function(data) {
                    if (data.likes !== undefined) {
                        self.innerHTML = '<i class="fa-regular fa-heart"></i> ' + data.likes;
                        if (data.action === 'liked') self.classList.add('liked');
                        else self.classList.remove('liked');
                    }
                })
                .catch(function() {});
        });
    });

    document.querySelectorAll('.comment-reply-btn').forEach(function(btn) {
        btn.addEventListener('click', function() {
            if (!currentUser) { window.location.href = '/login.html'; return; }
            var parentId = this.dataset.id;
            var userName = this.dataset.user;
            var input = document.getElementById('commentInput');
            input.value = '回复 @' + userName + '：';
            input.dataset.parentId = parentId;
            input.focus();
        });
    });

    document.querySelectorAll('.comment-delete-btn').forEach(function(btn) {
        btn.addEventListener('click', function() {
            if (!currentUser) return;
            if (!confirm('确定删除这条评论吗？')) return;
            var id = this.dataset.id;
            var self = this;
            fetch('/api/comments/' + id, { method: 'DELETE' })
                .then(function(r) { return r.json(); })
                .then(function(data) {
                    if (data.message) {
                        loadComments();
                    } else {
                        alert(data.error || '删除失败');
                    }
                })
                .catch(function() { alert('删除失败'); });
        });
    });
}

function submitComment() {
    if (!currentUser) { window.location.href = '/login.html'; return; }

    var input = document.getElementById('commentInput');
    var content = input.value.trim();
    if (!content) { alert('评论内容不能为空'); return; }
    if (content.length > 500) { alert('评论不能超过500字'); return; }

    var parentId = input.dataset.parentId || null;

    var data = { content: content };
    if (parentId) data.parent_id = parseInt(parentId);

    fetch('/api/articles/' + articleId + '/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    })
    .then(function(r) { return r.json(); })
    .then(function(data) {
        if (data.comment) {
            input.value = '';
            delete input.dataset.parentId;
            loadComments();
        } else {
            alert(data.error || '评论失败');
        }
    })
    .catch(function() { alert('评论失败'); });
}

function timeAgo(dateStr) {
    var now = new Date();
    var date = new Date(dateStr);
    var diff = Math.floor((now - date) / 1000);

    if (diff < 60) return '刚刚';
    if (diff < 3600) return Math.floor(diff / 60) + '分钟前';
    if (diff < 86400) return Math.floor(diff / 3600) + '小时前';
    if (diff < 2592000) return Math.floor(diff / 86400) + '天前';
    return date.toLocaleDateString('zh-CN');
}

function escapeHtml(str) {
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
}
