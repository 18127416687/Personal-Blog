from werkzeug.security import check_password_hash, generate_password_hash
from flask import Blueprint, jsonify, request
from flask_login import current_user, login_required, login_user, logout_user

from models import Article, ArticleFavorite, ArticleLike, User, db
from services.auth_session import UserLogin
from services.common import is_valid_email, is_valid_phone, to_utc_iso

auth_bp = Blueprint("auth", __name__)


@auth_bp.route("/api/register", methods=["POST"])
def register():
    data = request.get_json()
    username = (data.get("username") or "").strip()
    password = data.get("password") or ""
    email = (data.get("email") or "").strip()
    phone = (data.get("phone") or "").strip()

    if not username or not password:
        return jsonify({"error": "用户名和密码不能为空"}), 400
    if len(username) < 3 or len(username) > 80:
        return jsonify({"error": "用户名长度需在3-80之间"}), 400
    if len(password) < 6:
        return jsonify({"error": "密码至少6位"}), 400
    if email and not is_valid_email(email):
        return jsonify({"error": "邮箱格式不正确"}), 400
    if phone and not is_valid_phone(phone):
        return jsonify({"error": "手机号格式不正确"}), 400
    if User.query.filter_by(username=username).first():
        return jsonify({"error": "用户名已存在"}), 400
    if email and User.query.filter_by(email=email).first():
        return jsonify({"error": "邮箱已被使用"}), 400
    if phone and User.query.filter_by(phone=phone).first():
        return jsonify({"error": "手机号已被使用"}), 400

    hashed_password = generate_password_hash(password)
    new_user = User(
        username=username,
        password=hashed_password,
        email=email or None,
        phone=phone or None,
    )
    db.session.add(new_user)
    db.session.commit()
    return jsonify({"message": "注册成功"})


@auth_bp.route("/api/reset_password", methods=["POST"])
def reset_password():
    data = request.get_json() or {}
    username = (data.get("username") or "").strip()
    email = (data.get("email") or "").strip()
    phone = (data.get("phone") or "").strip()
    new_password = data.get("new_password") or ""

    if not username:
        return jsonify({"error": "请输入用户名"}), 400
    if len(new_password) < 6:
        return jsonify({"error": "新密码至少6位"}), 400
    if not email and not phone:
        return jsonify({"error": "请提供邮箱或手机号用于核验"}), 400
    if email and not is_valid_email(email):
        return jsonify({"error": "邮箱格式不正确"}), 400
    if phone and not is_valid_phone(phone):
        return jsonify({"error": "手机号格式不正确"}), 400

    user = User.query.filter_by(username=username).first()
    if not user:
        return jsonify({"error": "用户不存在"}), 404
    if email and user.email != email:
        return jsonify({"error": "邮箱不匹配"}), 400
    if phone and user.phone != phone:
        return jsonify({"error": "手机号不匹配"}), 400

    user.password = generate_password_hash(new_password)
    db.session.commit()
    return jsonify({"message": "密码已重置，请重新登录"})


@auth_bp.route("/api/login", methods=["POST"])
def login():
    data = request.get_json()
    username = data.get("username")
    password = data.get("password")
    user = User.query.filter_by(username=username).first()
    if not user or not check_password_hash(user.password, password):
        return jsonify({"error": "用户名或密码错误"}), 401
    if user.is_admin:
        return jsonify({"error": "管理员请使用后台登录页"}), 403
    if not user.is_active:
        return jsonify({"error": "账号已被禁用"}), 401
    login_user(UserLogin(user))
    return jsonify(
        {
            "message": "登录成功",
            "username": username,
            "is_admin": user.is_admin,
            "is_active": user.is_active,
        }
    )


@auth_bp.route("/api/logout", methods=["POST"])
@login_required
def logout():
    logout_user()
    return jsonify({"message": "注销成功"})


@auth_bp.route("/api/current_user", methods=["GET"])
def get_current_user():
    if current_user.is_authenticated:
        user = User.query.get(current_user.id)
        return jsonify(
            {
                "id": current_user.id,
                "username": current_user.username,
                "nickname": user.nickname if user else None,
                "avatar": user.avatar if user else None,
                "bio": user.bio if user else None,
                "is_admin": user.is_admin if user else False,
                "is_active": user.is_active if user else False,
            }
        )
    return jsonify({"username": None})


@auth_bp.route("/api/user/profile", methods=["GET"])
@login_required
def get_profile():
    user = User.query.get(current_user.id)
    if not user:
        return jsonify({"error": "用户不存在"}), 404
    return jsonify(
        {
            "id": user.id,
            "username": user.username,
            "nickname": user.nickname,
            "avatar": user.avatar,
            "bio": user.bio,
            "email": user.email,
            "phone": user.phone,
            "created_at": to_utc_iso(user.created_at),
        }
    )


@auth_bp.route("/api/user/profile", methods=["PUT"])
@login_required
def update_profile():
    user = User.query.get(current_user.id)
    if not user:
        return jsonify({"error": "用户不存在"}), 404
    data = request.get_json()

    nickname = data.get("nickname")
    if nickname is not None:
        nickname = nickname.strip()
        if len(nickname) > 80:
            return jsonify({"error": "昵称过长"}), 400
        user.nickname = nickname if nickname else None

    bio = data.get("bio")
    if bio is not None:
        user.bio = bio.strip() if bio.strip() else None

    email = data.get("email")
    if email is not None:
        email = email.strip()
        if email and not is_valid_email(email):
            return jsonify({"error": "邮箱格式不正确"}), 400
        if email and User.query.filter(User.email == email, User.id != user.id).first():
            return jsonify({"error": "邮箱已被使用"}), 400
        user.email = email if email else None

    phone = data.get("phone")
    if phone is not None:
        phone = phone.strip()
        if phone and not is_valid_phone(phone):
            return jsonify({"error": "手机号格式不正确"}), 400
        if phone and User.query.filter(User.phone == phone, User.id != user.id).first():
            return jsonify({"error": "手机号已被使用"}), 400
        user.phone = phone if phone else None

    db.session.commit()
    return jsonify({"message": "资料已更新"})


@auth_bp.route("/api/user/password", methods=["PUT"])
@login_required
def change_password():
    data = request.get_json()
    old_password = data.get("old_password") or ""
    new_password = data.get("new_password") or ""
    if not old_password or not new_password:
        return jsonify({"error": "请填写旧密码和新密码"}), 400
    if len(new_password) < 6:
        return jsonify({"error": "新密码至少6位"}), 400
    user = User.query.get(current_user.id)
    if not check_password_hash(user.password, old_password):
        return jsonify({"error": "旧密码不正确"}), 400
    user.password = generate_password_hash(new_password)
    db.session.commit()
    return jsonify({"message": "密码已修改"})


@auth_bp.route("/api/user/username", methods=["PUT"])
@login_required
def change_username():
    data = request.get_json()
    new_username = (data.get("username") or "").strip()
    if not new_username or len(new_username) < 3 or len(new_username) > 80:
        return jsonify({"error": "用户名长度需在3-80之间"}), 400
    if User.query.filter(User.username == new_username, User.id != current_user.id).first():
        return jsonify({"error": "用户名已存在"}), 400
    user = User.query.get(current_user.id)
    user.username = new_username
    db.session.commit()
    return jsonify({"message": "用户名已修改"})


@auth_bp.route("/api/user/likes", methods=["GET"])
@login_required
def get_my_likes():
    likes = (
        ArticleLike.query.filter_by(user_id=current_user.id)
        .order_by(ArticleLike.created_at.desc())
        .all()
    )
    result = []
    for l in likes:
        a = Article.query.get(l.article_id)
        if a:
            result.append(
                {
                    "id": a.id,
                    "title": a.title,
                    "author": a.author,
                    "date": a.date.isoformat() if a.date else None,
                    "excerpt": a.excerpt,
                    "thumbnail": a.thumbnail,
                    "tag": a.tag,
                    "views": a.views,
                    "likes": a.likes,
                    "favorites": a.favorites,
                    "status": a.status,
                    "liked_at": to_utc_iso(l.created_at),
                }
            )
    return jsonify(result)


@auth_bp.route("/api/user/favorites", methods=["GET"])
@login_required
def get_my_favorites():
    favs = (
        ArticleFavorite.query.filter_by(user_id=current_user.id)
        .order_by(ArticleFavorite.created_at.desc())
        .all()
    )
    result = []
    for f in favs:
        a = Article.query.get(f.article_id)
        if a:
            result.append(
                {
                    "id": a.id,
                    "title": a.title,
                    "author": a.author,
                    "date": a.date.isoformat() if a.date else None,
                    "excerpt": a.excerpt,
                    "thumbnail": a.thumbnail,
                    "tag": a.tag,
                    "views": a.views,
                    "likes": a.likes,
                    "favorites": a.favorites,
                    "status": a.status,
                    "favorited_at": to_utc_iso(f.created_at),
                }
            )
    return jsonify(result)
