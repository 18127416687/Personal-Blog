from flask import Blueprint, jsonify, request
from flask_login import current_user, login_required

from models import Bullet, db
from services.common import filter_banned_words, to_utc_iso

bullets_bp = Blueprint("bullets", __name__)


@bullets_bp.route("/api/bullets", methods=["GET"])
def get_bullets():
    bullets = Bullet.query.order_by(Bullet.created_at.desc()).limit(50).all()
    result = []
    for b in bullets:
        result.append(
            {
                "id": b.id,
                "content": b.content,
                "user": b.user.username,
                "user_avatar": b.user.avatar,
                "created_at": to_utc_iso(b.created_at),
            }
        )
    return jsonify(result)


@bullets_bp.route("/api/bullets", methods=["POST"])
@login_required
def create_bullet():
    data = request.get_json()
    content = data.get("content")
    if not content or len(content) > 100:
        return jsonify({"error": "弹幕内容不能为空且长度不能超过100字符"}), 400
    content = filter_banned_words(content.strip())
    if not content:
        return jsonify({"error": "弹幕内容不能为空"}), 400
    new_bullet = Bullet(content=content, user_id=current_user.id)
    db.session.add(new_bullet)
    db.session.commit()
    return jsonify(
        {
            "message": "弹幕发送成功",
            "bullet": {
                "id": new_bullet.id,
                "content": new_bullet.content,
                "user": current_user.username,
                "created_at": to_utc_iso(new_bullet.created_at),
            },
        }
    )
