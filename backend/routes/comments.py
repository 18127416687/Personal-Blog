from flask import Blueprint, jsonify, request
from flask_login import current_user, login_required

from models import Article, Comment, CommentLike, User, db
from services.common import to_utc_iso

comments_bp = Blueprint("comments", __name__)


@comments_bp.route("/api/articles/<int:id>/comments", methods=["GET"])
def get_comments(id):
    comments = (
        Comment.query.filter_by(article_id=id, parent_id=None)
        .order_by(Comment.created_at.desc())
        .all()
    )
    result = []
    for c in comments:
        replies = (
            Comment.query.filter_by(parent_id=c.id)
            .order_by(Comment.created_at.asc())
            .all()
        )
        reply_list = []
        for r in replies:
            reply_list.append(
                {
                    "id": r.id,
                    "content": r.content,
                    "user": r.user.username,
                    "user_nickname": r.user.nickname if r.user.nickname else r.user.username,
                    "user_avatar": r.user.avatar,
                    "likes": r.likes,
                    "created_at": to_utc_iso(r.created_at),
                }
            )
        result.append(
            {
                "id": c.id,
                "content": c.content,
                "user": c.user.username,
                "user_nickname": c.user.nickname if c.user.nickname else c.user.username,
                "user_avatar": c.user.avatar,
                "likes": c.likes,
                "created_at": to_utc_iso(c.created_at),
                "replies": reply_list,
            }
        )
    return jsonify(result)


@comments_bp.route("/api/articles/<int:id>/comments", methods=["POST"])
@login_required
def create_comment(id):
    data = request.get_json()
    content = (data.get("content") or "").strip()
    parent_id = data.get("parent_id")
    if not content:
        return jsonify({"error": "评论内容不能为空"}), 400
    if len(content) > 500:
        return jsonify({"error": "评论不能超过500字"}), 400

    article = Article.query.get(id)
    if not article:
        return jsonify({"error": "文章不存在"}), 404

    if parent_id:
        parent = Comment.query.get(parent_id)
        if not parent or parent.article_id != id:
            return jsonify({"error": "回复的评论不存在"}), 404

    new_comment = Comment(
        article_id=id,
        user_id=current_user.id,
        content=content,
        parent_id=parent_id if parent_id else None,
    )
    db.session.add(new_comment)
    db.session.commit()

    user = User.query.get(current_user.id)
    return jsonify(
        {
            "message": "评论成功",
            "comment": {
                "id": new_comment.id,
                "content": new_comment.content,
                "user": user.username,
                "user_nickname": user.nickname if user.nickname else user.username,
                "user_avatar": user.avatar,
                "likes": 0,
                "created_at": to_utc_iso(new_comment.created_at),
                "replies": [],
            },
        }
    )


@comments_bp.route("/api/comments/<int:id>/like", methods=["POST"])
@login_required
def like_comment(id):
    comment = Comment.query.get(id)
    if not comment:
        return jsonify({"error": "评论不存在"}), 404

    existing = CommentLike.query.filter_by(user_id=current_user.id, comment_id=id).first()
    if existing:
        db.session.delete(existing)
        comment.likes = max(0, comment.likes - 1)
        db.session.commit()
        return jsonify({"likes": comment.likes, "action": "unliked"})

    new_like = CommentLike(user_id=current_user.id, comment_id=id)
    db.session.add(new_like)
    comment.likes += 1
    db.session.commit()
    return jsonify({"likes": comment.likes, "action": "liked"})


@comments_bp.route("/api/comments/<int:id>", methods=["DELETE"])
@login_required
def delete_comment(id):
    comment = Comment.query.get(id)
    if not comment:
        return jsonify({"error": "评论不存在"}), 404
    if comment.user_id != current_user.id:
        return jsonify({"error": "无权操作"}), 403
    db.session.delete(comment)
    db.session.commit()
    return jsonify({"message": "评论已删除"})
