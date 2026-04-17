import threading
from collections import defaultdict
from datetime import datetime

_view_count_lock = threading.Lock()
_view_counts = defaultdict(list)


def can_increment_view(article_id, ip_address):
    now = datetime.utcnow()
    _view_count_lock.acquire()
    try:
        recent_views = _view_counts[article_id]
        recent_views = [t for t in recent_views if (now - t).total_seconds() < 3600]
        if len(recent_views) >= 10:
            return False
        recent_views.append(now)
        _view_counts[article_id] = recent_views
        return True
    finally:
        _view_count_lock.release()
