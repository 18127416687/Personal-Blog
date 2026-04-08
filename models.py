from flask_sqlalchemy import SQLAlchemy
from datetime import date, datetime

db = SQLAlchemy()


class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password = db.Column(db.String(200), nullable=False)
    nickname = db.Column(db.String(80), nullable=True)
    avatar = db.Column(db.String(200), nullable=True)
    bio = db.Column(db.Text, nullable=True)
    email = db.Column(db.String(120), unique=True, nullable=True)
    phone = db.Column(db.String(20), unique=True, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    articles = db.relationship("Article", backref="author_user", lazy=True)


class Article(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    content = db.Column(db.Text, nullable=True)
    author = db.Column(db.String(50), default="程序员逗号")
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=True)
    date = db.Column(db.Date, default=date.today)
    excerpt = db.Column(db.Text, nullable=False)
    thumbnail = db.Column(db.String(200))
    tag = db.Column(db.String(50))
    views = db.Column(db.Integer, default=0)
    likes = db.Column(db.Integer, default=0)
    favorites = db.Column(db.Integer, default=0)
    status = db.Column(db.String(20), default="public")
    scheduled_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(
        db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )


class Bullet(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    content = db.Column(db.String(100), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    user = db.relationship("User", backref=db.backref("bullets", lazy=True))


class Photo(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    url = db.Column(db.String(200), nullable=False)
    uploader_id = db.Column(db.Integer, db.ForeignKey("user.id"))
    uploaded_at = db.Column(db.DateTime, default=datetime.utcnow)
    uploader = db.relationship("User", backref=db.backref("photos", lazy=True))


class ArticleLike(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    article_id = db.Column(db.Integer, db.ForeignKey("article.id"), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    user = db.relationship("User", backref=db.backref("article_likes", lazy=True))
    article = db.relationship("Article", backref=db.backref("article_likes", lazy=True))


class ArticleFavorite(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    article_id = db.Column(db.Integer, db.ForeignKey("article.id"), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    user = db.relationship("User", backref=db.backref("article_favorites", lazy=True))
    article = db.relationship(
        "Article", backref=db.backref("article_favorites", lazy=True)
    )


class Comment(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    article_id = db.Column(db.Integer, db.ForeignKey("article.id"), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    content = db.Column(db.Text, nullable=False)
    parent_id = db.Column(db.Integer, db.ForeignKey("comment.id"), nullable=True)
    likes = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(
        db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )
    article = db.relationship("Article", backref=db.backref("comments", lazy=True))
    user = db.relationship("User", backref=db.backref("comments", lazy=True))
    replies = db.relationship(
        "Comment", backref=db.backref("parent", remote_side=[id]), lazy=True
    )


class CommentLike(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    comment_id = db.Column(db.Integer, db.ForeignKey("comment.id"), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    user = db.relationship("User", backref=db.backref("comment_likes", lazy=True))
    comment = db.relationship("Comment", backref=db.backref("comment_likes", lazy=True))
