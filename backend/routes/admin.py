from datetime import datetime, timedelta

from flask import Blueprint, current_app, jsonify, request
from flask_login import current_user, login_user
from werkzeug.security import check_password_hash, generate_password_hash

from models import AdminNotice, Article, Bullet, Comment, User, db
from services.admin_auth import admin_required
from services.auth_session import UserLogin
from services.common import to_utc_iso

admin_bp = Blueprint("admin", __name__)


def _ok(message, data=None, status=200):
    payload = {"message": message}
    if data is not None:
        payload["data"] = data
    return jsonify(payload), status


def _err(message, code, status):
    return jsonify({"error": message, "code": code}), status


def _parse_pagination():
    page = max(1, request.args.get("page", 1, type=int))
    per_page = min(50, max(1, request.args.get("per_page", 10, type=int)))
    return page, per_page


def _get_or_create_notice():
    notice = AdminNotice.query.order_by(AdminNotice.id.desc()).first()
    if notice:
        return notice
    notice = AdminNotice(content="", display_mode="marquee", enabled=False)
    db.session.add(notice)
    db.session.commit()
    return notice


def _login_with_env_admin(username, password):
    env_username = (current_app.config.get("ADMIN_USERNAME") or "").strip()
    env_password = current_app.config.get("ADMIN_PASSWORD") or ""
    if not env_username or not env_password:
        return None
    if username != env_username or password != env_password:
        return None

    user = User.query.filter_by(username=env_username).first()
    if not user:
        user = User(
            username=env_username,
            password=generate_password_hash(env_password),
            is_admin=True,
            is_active=True,
        )
        db.session.add(user)
        db.session.commit()
    else:
        changed = False
        if not user.is_admin:
            user.is_admin = True
            changed = True
        if not user.is_active:
            user.is_active = True
            changed = True
        if not check_password_hash(user.password, env_password):
            user.password = generate_password_hash(env_password)
            changed = True
        if changed:
            db.session.commit()

    login_user(UserLogin(user))
    return _ok(
        "登录成功",
        {
            "id": user.id,
            "username": user.username,
            "is_admin": user.is_admin,
            "is_active": user.is_active,
        },
    )


@admin_bp.route("/api/admin/login", methods=["POST"])
def admin_login():
    data = request.get_json() or {}
    username = (data.get("username") or "").strip()
    password = data.get("password") or ""
    if not username or not password:
        return _err("请输入用户名和密码", "INVALID_INPUT", 422)

    env_login_result = _login_with_env_admin(username, password)
    if env_login_result:
        return env_login_result

    user = User.query.filter_by(username=username).first()
    if not user or not check_password_hash(user.password, password):
        return _err("用户名或密码错误", "BAD_CREDENTIALS", 401)
    if not user.is_active:
        return _err("账号已被禁用", "ACCOUNT_DISABLED", 401)
    if not user.is_admin:
        return _err("无管理员权限", "ADMIN_REQUIRED", 403)

    login_user(UserLogin(user))
    return _ok(
        "登录成功",
        {
            "id": user.id,
            "username": user.username,
            "is_admin": user.is_admin,
            "is_active": user.is_active,
        },
    )


@admin_bp.route("/api/admin/session", methods=["GET"])
@admin_required
def admin_session():
    user = User.query.get(current_user.id)
    return _ok(
        "ok",
        {
            "id": user.id,
            "username": user.username,
            "nickname": user.nickname,
            "is_admin": user.is_admin,
            "is_active": user.is_active,
        },
    )


@admin_bp.route("/api/admin/articles", methods=["GET"])
@admin_required
def admin_articles():
    page, per_page = _parse_pagination()
    keyword = (request.args.get("keyword") or "").strip()
    status = (request.args.get("status") or "").strip()

    query = Article.query
    if keyword:
        like = f"%{keyword}%"
        query = query.filter(db.or_(Article.title.like(like), Article.excerpt.like(like)))
    if status:
        query = query.filter(Article.status == status)

    query = query.order_by(Article.updated_at.desc())
    total = query.count()
    rows = query.offset((page - 1) * per_page).limit(per_page).all()
    items = []
    for a in rows:
        items.append(
            {
                "id": a.id,
                "title": a.title,
                "author": a.author,
                "status": a.status,
                "tag": a.tag,
                "views": a.views,
                "likes": a.likes,
                "favorites": a.favorites,
                "created_at": to_utc_iso(a.created_at),
                "updated_at": to_utc_iso(a.updated_at),
            }
        )
    return _ok(
        "ok",
        {
            "items": items,
            "pagination": {
                "total": total,
                "page": page,
                "per_page": per_page,
                "total_pages": (total + per_page - 1) // per_page,
            },
        },
    )


@admin_bp.route("/api/admin/articles/batch", methods=["POST"])
@admin_required
def admin_articles_batch():
    data = request.get_json() or {}
    action = (data.get("action") or "").strip()
    ids = data.get("ids") or []
    if action not in {"publish", "unpublish", "delete"}:
        return _err("不支持的操作", "INVALID_ACTION", 422)
    if not isinstance(ids, list) or not ids:
        return _err("ids 不能为空", "EMPTY_IDS", 422)

    int_ids = sorted({int(i) for i in ids if str(i).isdigit()})
    if not int_ids:
        return _err("ids 不合法", "INVALID_IDS", 422)

    rows = Article.query.filter(Article.id.in_(int_ids)).all()
    if action == "delete":
        for row in rows:
            db.session.delete(row)
    elif action == "publish":
        for row in rows:
            row.status = "public"
            row.date = datetime.utcnow().date()
            row.updated_at = datetime.utcnow()
    else:
        for row in rows:
            row.status = "private"
            row.updated_at = datetime.utcnow()
    db.session.commit()
    return _ok("批量操作成功", {"affected": len(rows), "action": action})


@admin_bp.route("/api/admin/comments", methods=["GET"])
@admin_required
def admin_comments():
    page, per_page = _parse_pagination()
    keyword = (request.args.get("keyword") or "").strip()
    article_id = request.args.get("article_id", type=int)

    query = Comment.query
    if keyword:
        query = query.filter(Comment.content.like(f"%{keyword}%"))
    if article_id:
        query = query.filter(Comment.article_id == article_id)

    query = query.order_by(Comment.created_at.desc())
    total = query.count()
    rows = query.offset((page - 1) * per_page).limit(per_page).all()
    items = []
    for c in rows:
        items.append(
            {
                "id": c.id,
                "article_id": c.article_id,
                "user_id": c.user_id,
                "username": c.user.username if c.user else None,
                "content": c.content,
                "likes": c.likes,
                "created_at": to_utc_iso(c.created_at),
            }
        )
    return _ok(
        "ok",
        {
            "items": items,
            "pagination": {
                "total": total,
                "page": page,
                "per_page": per_page,
                "total_pages": (total + per_page - 1) // per_page,
            },
        },
    )


@admin_bp.route("/api/admin/comments/batch-delete", methods=["POST"])
@admin_required
def admin_comments_batch_delete():
    data = request.get_json() or {}
    ids = data.get("ids") or []
    if not isinstance(ids, list) or not ids:
        return _err("ids 不能为空", "EMPTY_IDS", 422)
    int_ids = sorted({int(i) for i in ids if str(i).isdigit()})
    if not int_ids:
        return _err("ids 不合法", "INVALID_IDS", 422)

    rows = Comment.query.filter(Comment.id.in_(int_ids)).all()
    for row in rows:
        db.session.delete(row)
    db.session.commit()
    return _ok("批量删除成功", {"affected": len(rows)})


@admin_bp.route("/api/admin/users", methods=["GET"])
@admin_required
def admin_users():
    page, per_page = _parse_pagination()
    keyword = (request.args.get("keyword") or "").strip()
    status = (request.args.get("status") or "").strip()

    query = User.query
    if keyword:
        like = f"%{keyword}%"
        query = query.filter(
            db.or_(User.username.like(like), User.nickname.like(like), User.email.like(like))
        )
    if status == "active":
        query = query.filter(User.is_active.is_(True))
    elif status == "suspended":
        query = query.filter(User.is_active.is_(False))

    query = query.order_by(User.created_at.desc())
    total = query.count()
    rows = query.offset((page - 1) * per_page).limit(per_page).all()
    items = []
    for u in rows:
        items.append(
            {
                "id": u.id,
                "username": u.username,
                "nickname": u.nickname,
                "email": u.email,
                "is_admin": u.is_admin,
                "is_active": u.is_active,
                "banned_until": to_utc_iso(u.banned_until),
                "created_at": to_utc_iso(u.created_at),
            }
        )
    return _ok(
        "ok",
        {
            "items": items,
            "pagination": {
                "total": total,
                "page": page,
                "per_page": per_page,
                "total_pages": (total + per_page - 1) // per_page,
            },
        },
    )


@admin_bp.route("/api/admin/users/<int:user_id>/status", methods=["PUT"])
@admin_required
def admin_user_status(user_id):
    data = request.get_json() or {}
    status = (data.get("status") or "").strip()
    if status not in {"active", "suspended"}:
        return _err("状态不合法", "INVALID_STATUS", 422)

    actor = User.query.get(current_user.id)
    if actor.id == user_id and status == "suspended":
        return _err("不能禁用自己", "CANNOT_SUSPEND_SELF", 422)

    user = User.query.get(user_id)
    if not user:
        return _err("用户不存在", "USER_NOT_FOUND", 404)

    if status == "active":
        user.is_active = True
        user.banned_until = None
    else:
        ban_hours_raw = data.get("ban_hours")
        ban_hours = None
        if ban_hours_raw not in (None, ""):
            try:
                ban_hours = int(ban_hours_raw)
            except (TypeError, ValueError):
                return _err("封禁时长必须是整数小时", "INVALID_BAN_DURATION", 422)
            if ban_hours <= 0:
                return _err("封禁时长必须大于0", "INVALID_BAN_DURATION", 422)
        user.is_active = False
        user.banned_until = (
            datetime.utcnow() + timedelta(hours=ban_hours) if ban_hours else None
        )

    db.session.commit()
    return _ok(
        "状态更新成功",
        {
            "id": user.id,
            "is_active": user.is_active,
            "status": status,
            "banned_until": to_utc_iso(user.banned_until),
        },
    )


@admin_bp.route("/api/admin/bullets", methods=["GET"])
@admin_required
def admin_bullets():
    page, per_page = _parse_pagination()
    keyword = (request.args.get("keyword") or "").strip()

    query = Bullet.query
    if keyword:
        query = query.filter(Bullet.content.like(f"%{keyword}%"))

    query = query.order_by(Bullet.created_at.desc())
    total = query.count()
    rows = query.offset((page - 1) * per_page).limit(per_page).all()
    items = []
    for b in rows:
        items.append(
            {
                "id": b.id,
                "content": b.content,
                "user_id": b.user_id,
                "username": b.user.username if b.user else None,
                "created_at": to_utc_iso(b.created_at),
            }
        )
    return _ok(
        "ok",
        {
            "items": items,
            "pagination": {
                "total": total,
                "page": page,
                "per_page": per_page,
                "total_pages": (total + per_page - 1) // per_page,
            },
        },
    )


@admin_bp.route("/api/admin/bullets/<int:bullet_id>", methods=["DELETE"])
@admin_required
def admin_delete_bullet(bullet_id):
    bullet = Bullet.query.get(bullet_id)
    if not bullet:
        return _err("弹幕不存在", "BULLET_NOT_FOUND", 404)
    db.session.delete(bullet)
    db.session.commit()
    return _ok("弹幕删除成功", {"id": bullet_id})


@admin_bp.route("/api/admin/announcement", methods=["GET"])
@admin_required
def admin_get_announcement():
    notice = _get_or_create_notice()
    return _ok(
        "ok",
        {
            "content": notice.content,
            "display_mode": notice.display_mode,
            "enabled": notice.enabled,
            "updated_at": to_utc_iso(notice.updated_at),
        },
    )


@admin_bp.route("/api/admin/announcement", methods=["PUT"])
@admin_required
def admin_set_announcement():
    data = request.get_json() or {}
    content = (data.get("content") or "").strip()
    display_mode = (data.get("display_mode") or "marquee").strip()
    enabled = bool(data.get("enabled"))

    if len(content) > 300:
        return _err("公告内容不能超过300字", "ANNOUNCEMENT_TOO_LONG", 422)
    if display_mode not in {"marquee", "modal"}:
        return _err("公告展示模式不合法", "INVALID_DISPLAY_MODE", 422)

    notice = _get_or_create_notice()
    notice.content = content
    notice.display_mode = display_mode
    notice.enabled = enabled and bool(content)
    db.session.commit()

    return _ok(
        "公告已更新",
        {
            "content": notice.content,
            "display_mode": notice.display_mode,
            "enabled": notice.enabled,
            "updated_at": to_utc_iso(notice.updated_at),
        },
    )


@admin_bp.route("/api/announcement", methods=["GET"])
def public_announcement():
    notice = AdminNotice.query.order_by(AdminNotice.id.desc()).first()
    if not notice or not notice.enabled or not notice.content:
        return _ok("ok", {"enabled": False, "content": "", "display_mode": "marquee"})
    return _ok(
        "ok",
        {
            "enabled": True,
            "content": notice.content,
            "display_mode": notice.display_mode,
            "updated_at": to_utc_iso(notice.updated_at),
        },
    )


@admin_bp.route("/api/admin/dashboard-metrics", methods=["GET"])
@admin_required
def admin_dashboard_metrics():
    today = datetime.utcnow().date()
    labels = []
    days = []
    for i in range(6, -1, -1):
        day = today - timedelta(days=i)
        days.append(day)
        labels.append(day.strftime("%m-%d"))

    def _daily_count(model, column):
        start = datetime.combine(days[0], datetime.min.time())
        rows = (
            db.session.query(db.func.date(column), db.func.count(model.id))
            .filter(column >= start)
            .group_by(db.func.date(column))
            .all()
        )
        mapping = {str(day): count for day, count in rows}
        return [int(mapping.get(d.isoformat(), 0)) for d in days]

    article_series = _daily_count(Article, Article.created_at)
    comment_series = _daily_count(Comment, Comment.created_at)
    bullet_series = _daily_count(Bullet, Bullet.created_at)
    active_series = [comment_series[i] + bullet_series[i] for i in range(len(days))]

    total_users = User.query.count()
    total_articles = Article.query.count()
    total_comments = Comment.query.count()
    total_bullets = Bullet.query.count()

    return _ok(
        "ok",
        {
            "kpi": {
                "users": total_users,
                "articles": total_articles,
                "comments": total_comments,
                "bullets": total_bullets,
            },
            "labels": labels,
            "pie": [
                {"name": "用户活跃", "value": sum(active_series)},
                {"name": "文章发布", "value": sum(article_series)},
                {"name": "弹幕评论", "value": sum(bullet_series)},
            ],
            "bar": article_series,
            "line": active_series,
            "danmu": bullet_series,
        },
    )
