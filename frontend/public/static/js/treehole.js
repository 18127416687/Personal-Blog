function __initTreeholePage() {
    initBulletScreen();
}

/* ==================== Bullet Screen (CSS Animation) ==================== */

function initBulletScreen() {
    var screen = document.getElementById('bulletScreen');
    var placeholder = document.getElementById('bulletPlaceholder');
    var input = document.getElementById('bulletMessage');
    var shootBtn = document.getElementById('shootBtn');
    var historyList = document.getElementById('bulletHistoryList');

    var tracks = [];
    var trackCount = 12;
    var hasBullets = false;

    for (var i = 0; i < trackCount; i++) {
        tracks.push({ busy: false });
    }

    function randomColor() {
        var colors = [
            '#60a5fa', '#a78bfa', '#f472b6', '#34d399', '#fbbf24',
            '#fb923c', '#38bdf8', '#e879f9', '#2dd4bf', '#facc15',
            '#818cf8', '#f87171', '#4ade80', '#c084fc', '#22d3ee'
        ];
        return colors[Math.floor(Math.random() * colors.length)];
    }

    function timeAgo(dateStr) {
        var now = new Date();
        var date = new Date(dateStr);
        var diff = Math.floor((now - date) / 1000);
        if (diff < 60) return '刚刚';
        if (diff < 3600) return Math.floor(diff / 60) + '分钟前';
        if (diff < 86400) return Math.floor(diff / 3600) + '小时前';
        return date.toLocaleDateString('zh-CN');
    }

    function createBullet(text, color) {
        if (!hasBullets) {
            hasBullets = true;
            placeholder.style.display = 'none';
        }

        var freeTrack = -1;
        for (var i = 0; i < tracks.length; i++) {
            if (!tracks[i].busy) {
                freeTrack = i;
                break;
            }
        }
        if (freeTrack === -1) return;

        tracks[freeTrack].busy = true;

        var bullet = document.createElement('div');
        bullet.className = 'danmaku-item';
        bullet.textContent = text;
        bullet.style.color = color || randomColor();

        var trackHeight = screen.offsetHeight / trackCount;
        var topPos = freeTrack * trackHeight + (trackHeight - 24) / 2;
        bullet.style.top = topPos + 'px';

        var duration = 8 + Math.random() * 6;
        bullet.style.animationDuration = duration + 's';

        screen.appendChild(bullet);

        setTimeout(function() {
            if (bullet.parentNode) {
                bullet.parentNode.removeChild(bullet);
            }
            tracks[freeTrack].busy = false;
        }, duration * 1000 + 200);
    }

    function loadBullets() {
        fetch('/api/bullets', { credentials: 'same-origin' })
            .then(function(r) { return r.json(); })
            .then(function(list) {
                if (!Array.isArray(list)) return;

                var ordered = list.slice().reverse();
                renderHistory(ordered);

                var delay = 0;
                for (var i = 0; i < ordered.length; i++) {
                    (function(item) {
                        setTimeout(function() {
                            var text = item.user ? item.user + ': ' + item.content : item.content;
                            createBullet(text, randomColor());
                        }, delay);
                    })(ordered[i]);
                    delay += 600 + Math.random() * 400;
                }
            })
            .catch(function() {});
    }

    function renderHistory(list) {
        if (!list || list.length === 0) {
            historyList.innerHTML = '<div class="bullet-history-empty"><i class="fa-regular fa-comment-dots"></i>暂无弹幕</div>';
            return;
        }

        var html = '';
        for (var i = 0; i < list.length; i++) {
            var item = list[i];
            var avatarHtml = item.user_avatar ?
                '<img src="' + item.user_avatar + '" alt="">' :
                '<i class="fa-regular fa-circle-user"></i>';
            var timeStr = item.created_at ? timeAgo(item.created_at) : '';

            html += '<div class="bullet-history-item">' +
                '<div class="bullet-history-avatar">' + avatarHtml + '</div>' +
                '<div class="bullet-history-body">' +
                    '<div class="bullet-history-user">' + (item.user || '匿名') + '</div>' +
                    '<div class="bullet-history-content">' + escapeHtml(item.content) + '</div>' +
                '</div>' +
                '<div class="bullet-history-time">' + timeStr + '</div>' +
            '</div>';
        }
        historyList.innerHTML = html;
    }

    function escapeHtml(str) {
        var div = document.createElement('div');
        div.appendChild(document.createTextNode(str));
        return div.innerHTML;
    }

    function sendBullet() {
        var text = input.value.trim();
        if (!text) { alert('请输入想说的话'); return; }

        fetch('/api/bullets', {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content: text }),
        })
        .then(function(r) { return r.json(); })
        .then(function(data) {
            if (data.bullet) {
                var showText = data.bullet.user ? data.bullet.user + ': ' + data.bullet.content : data.bullet.content;
                createBullet(showText, randomColor());
                loadBullets();
            } else if (data.error) {
                if (data.error.indexOf('登录') !== -1) {
                    window.location.href = '/login';
                } else {
                    alert(data.error);
                }
            }
        })
        .catch(function() { alert('发送失败'); });

        input.value = '';
        input.focus();
    }

    shootBtn.addEventListener('click', sendBullet);
    input.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            sendBullet();
        }
    });

    loadBullets();
    setInterval(loadBullets, 10000);
}

if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', __initTreeholePage, { once: true });
} else {
    __initTreeholePage();
}
