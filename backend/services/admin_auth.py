from functools import wraps

from flask import jsonify
from flask_login import current_user, login_required, logout_user

from models import User


def get_current_db_user():
    if not current_user.is_authenticated:
        return None
    return User.query.get(current_user.id)


def admin_required(view_func):
    @wraps(view_func)
    @login_required
    def wrapper(*args, **kwargs):
        user = get_current_db_user()
        if not user:
            return jsonify({"error": "用户不存在", "code": "USER_NOT_FOUND"}), 404
        if not user.is_active:
            logout_user()
            return jsonify({"error": "账号已被禁用", "code": "ACCOUNT_DISABLED"}), 401
        if not user.is_admin:
            return jsonify({"error": "无管理员权限", "code": "ADMIN_REQUIRED"}), 403
        return view_func(*args, **kwargs)

    return wrapper
