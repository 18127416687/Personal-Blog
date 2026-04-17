import json
import re
from datetime import date, datetime
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from flask import Blueprint, current_app, jsonify, request
from flask_login import current_user, login_required

from models import Article, ArticleFavorite, ArticleLike, User, db
from services.article_views import can_increment_view
from services.common import to_utc_iso

articles_bp = Blueprint("articles", __name__)


def _strip_html_tags(content):
    text = re.sub(r"<[^>]+>", " ", content or "")
    text = re.sub(r"\s+", " ", text).strip()
    return text


def _safe_excerpt(raw_excerpt, content_html):
    excerpt = (raw_excerpt or "").strip()
    if excerpt:
        return excerpt[:200]
    plain = _strip_html_tags(content_html)
    return plain[:150]


def _parse_ai_json_payload(content):
    value = (content or "").strip()
    if value.startswith("```"):
        match = re.search(r"```(?:json)?\s*(\{.*\})\s*```", value, re.S)
        if match:
            value = match.group(1).strip()
    return json.loads(value)


def _normalize_ai_url(api_url, api_format):
    base = (api_url or "").rstrip("/")
    if api_format == "dashscope_generation":
        if base.endswith("/api/v1/services/aigc/text-generation/generation"):
            return base
        if base.endswith("/compatible-mode/v1/chat/completions"):
            return (
                base.replace("/compatible-mode/v1/chat/completions", "")
                + "/api/v1/services/aigc/text-generation/generation"
            )
        if base.endswith("/compatible-mode/v1"):
            return (
                base.replace("/compatible-mode/v1", "")
                + "/api/v1/services/aigc/text-generation/generation"
            )
        return base + "/api/v1/services/aigc/text-generation/generation"
    return base


def _extract_ai_text(result, api_format):
    if api_format == "dashscope_generation":
        output = result.get("output") or {}
        output_text = output.get("text")
        if output_text:
            return output_text
        choices = output.get("choices") or []
        if choices:
            message = choices[0].get("message") or {}
            content = message.get("content") or ""
            if isinstance(content, list):
                return "".join(
                    [
                        x.get("text", "")
                        for x in content
                        if isinstance(x, dict) and x.get("type") == "text"
                    ]
                )
            return content
        return ""

    choices = result.get("choices") or []
    if not choices:
        return ""
    message = choices[0].get("message") or {}
    content = message.get("content") or ""
    if isinstance(content, list):
        return "".join(
            [
                x.get("text", "")
                for x in content
                if isinstance(x, dict) and x.get("type") == "text"
            ]
        )
    return content


def _call_ai_generate_article(topic, outline):
    api_key = current_app.config.get("AI_API_KEY", "")
    api_url = current_app.config.get("AI_API_URL", "")
    model = current_app.config.get("AI_MODEL", "")
    api_format = current_app.config.get("AI_API_FORMAT", "chat_completions")

    if not api_key:
        raise ValueError("AI 服务未配置，请先设置 AI_API_KEY。")
    if not api_url:
        raise ValueError("AI 服务地址未配置，请先设置 AI_API_URL。")
    if not model:
        raise ValueError("AI 模型未配置，请先设置 AI_MODEL。")
    if api_format not in ("chat_completions", "dashscope_generation"):
        raise ValueError(
            "AI_API_FORMAT 不支持，请使用 chat_completions 或 dashscope_generation。"
        )

    system_prompt = (
        "你是专业中文写作助手。"
        "请根据用户输入主题和要点，输出一篇结构完整、可直接发布的中文文章。"
        "必须严格输出 JSON 对象，不要输出额外解释。"
        "JSON 字段必须包含：title, excerpt, tag, content_html。"
        "content_html 要用语义化 HTML，至少包含 h2 和 p，可包含 h3、ul、ol、blockquote。"
    )
    user_prompt = (
        f"主题：{topic}\n"
        f"要点：{outline}\n"
        "要求：\n"
        "1) 标题具体、有信息量；\n"
        "2) 摘要 60~180 字；\n"
        "3) tag 为 1 个短标签；\n"
        "4) 正文按逻辑分段，段落自然；\n"
        "5) 不要编造明显虚假数据，如需示例请标注“示例”。"
    )

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt},
    ]
    if api_format == "dashscope_generation":
        payload = {
            "model": model,
            "input": {"messages": messages},
            "parameters": {"result_format": "message", "temperature": 0.7},
        }
    else:
        payload = {
            "model": model,
            "temperature": 0.7,
            "messages": messages,
            "response_format": {"type": "json_object"},
        }

    req = Request(
        _normalize_ai_url(api_url, api_format),
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}",
        },
        method="POST",
    )

    try:
        with urlopen(req, timeout=45) as resp:
            result = json.loads(resp.read().decode("utf-8"))
    except HTTPError as e:
        body = ""
        try:
            body = e.read().decode("utf-8", errors="ignore")
        except Exception:
            body = ""
        raise RuntimeError(f"AI 服务调用失败（HTTP {e.code}）: {body[:300]}") from e
    except URLError as e:
        raise RuntimeError(f"AI 服务连接失败: {e.reason}") from e

    content = _extract_ai_text(result, api_format)
    if not content:
        raise RuntimeError("AI 服务返回异常：未收到可用文本结果。")
    parsed = _parse_ai_json_payload(content)

    content_html = (parsed.get("content_html") or "").strip()
    if not content_html:
        raise RuntimeError("AI 服务返回异常：正文为空。")

    return {
        "title": (parsed.get("title") or topic).strip()[:100],
        "excerpt": _safe_excerpt(parsed.get("excerpt"), content_html),
        "tag": (parsed.get("tag") or "").strip()[:50],
        "content_html": content_html,
    }


@articles_bp.route("/api/tags/popular", methods=["GET"])
def get_popular_tags():
    now = datetime.utcnow()
    articles = Article.query.filter(
        Article.status == "public",
        db.or_(Article.scheduled_at == None, Article.scheduled_at <= now),
        Article.tag != None,
        Article.tag != "",
    ).all()

    tag_counts = {}
    for a in articles:
        tag = a.tag.strip()
        if tag:
            tag_counts[tag] = tag_counts.get(tag, 0) + 1

    sorted_tags = sorted(tag_counts.items(), key=lambda x: x[1], reverse=True)[:10]
    return jsonify([{"tag": t[0], "count": t[1]} for t in sorted_tags])


@articles_bp.route("/api/weibo/hot", methods=["GET"])
def get_weibo_hot():
    import requests

    try:
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Referer": "https://weibo.com/hot/search",
            "Accept": "application/json",
        }
        response = requests.get(
            "https://weibo.com/ajax/side/hotSearch", headers=headers, timeout=10
        )
        if response.status_code == 200:
            data = response.json()
            if data.get("ok") == 1:
                items = data.get("data", {}).get("realtime", [])[:20]
                result = []
                for item in items:
                    result.append(
                        {
                            "word": item.get("word", ""),
                            "raw_word": item.get("raw_word", ""),
                            "label": item.get("label_name", ""),
                        }
                    )
                return jsonify(result)
    except Exception as e:
        print("获取微博热搜失败:", e)
    return jsonify([])



@articles_bp.route("/api/ai/generate-article", methods=["POST"])
@login_required
def generate_article_by_ai():
    data = request.get_json(silent=True) or {}
    topic = (data.get("topic") or "").strip()
    outline = (data.get("outline") or "").strip()

    if len(topic) < 2:
        return jsonify({"error": "主题至少 2 个字符"}), 400
    if len(outline) < 5:
        return jsonify({"error": "请补充至少 5 个字符的大致内容"}), 400

    try:
        generated = _call_ai_generate_article(topic, outline)
        return jsonify(generated)
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except RuntimeError as e:
        return jsonify({"error": str(e)}), 502
    except Exception:
        return jsonify({"error": "AI 生成失败，请稍后重试"}), 500


@articles_bp.route("/api/articles", methods=["GET"])
def get_articles():
    now = datetime.utcnow()
    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 9, type=int)
    per_page = min(per_page, 50)

    query = Article.query.filter(
        Article.status == "public",
        db.or_(Article.scheduled_at == None, Article.scheduled_at <= now),
    ).order_by(Article.date.desc())

    total = query.count()
    articles = query.offset((page - 1) * per_page).limit(per_page).all()

    result = []
    for a in articles:
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
            }
        )
    return jsonify(
        {
            "articles": result,
            "total": total,
            "page": page,
            "per_page": per_page,
            "total_pages": (total + per_page - 1) // per_page,
        }
    )


@articles_bp.route("/api/articles/<int:id>", methods=["GET"])
def get_article(id):
    article = Article.query.get(id)
    if not article:
        return jsonify({"error": "文章不存在"}), 404
    if article.status == "private":
        if not current_user.is_authenticated or article.user_id != current_user.id:
            return jsonify({"error": "无权查看"}), 403

    ip_address = request.headers.get("X-Forwarded-For", request.remote_addr)
    if "," in ip_address:
        ip_address = ip_address.split(",")[0].strip()

    if can_increment_view(id, ip_address):
        article.views += 1
        db.session.commit()

    user_liked = False
    user_favorited = False
    if current_user.is_authenticated:
        user_liked = (
            ArticleLike.query.filter_by(user_id=current_user.id, article_id=id).first()
            is not None
        )
        user_favorited = (
            ArticleFavorite.query.filter_by(
                user_id=current_user.id, article_id=id
            ).first()
            is not None
        )

    return jsonify(
        {
            "id": article.id,
            "title": article.title,
            "content": article.content,
            "author": article.author,
            "date": article.date.isoformat() if article.date else None,
            "updated_at": to_utc_iso(article.updated_at),
            "excerpt": article.excerpt,
            "thumbnail": article.thumbnail,
            "tag": article.tag,
            "views": article.views,
            "likes": article.likes,
            "favorites": article.favorites,
            "status": article.status,
            "scheduled_at": to_utc_iso(article.scheduled_at),
            "user_liked": user_liked,
            "user_favorited": user_favorited,
        }
    )


@articles_bp.route("/api/articles/<int:id>/like", methods=["POST"])
@login_required
def like_article(id):
    article = Article.query.get(id)
    if not article:
        return jsonify({"error": "文章不存在"}), 404

    existing = ArticleLike.query.filter_by(user_id=current_user.id, article_id=id).first()
    if existing:
        db.session.delete(existing)
        article.likes = max(0, article.likes - 1)
        db.session.commit()
        return jsonify({"likes": article.likes, "action": "unliked"})

    new_like = ArticleLike(user_id=current_user.id, article_id=id)
    db.session.add(new_like)
    article.likes += 1
    db.session.commit()
    return jsonify({"likes": article.likes, "action": "liked"})


@articles_bp.route("/api/articles/<int:id>/favorite", methods=["POST"])
@login_required
def favorite_article(id):
    article = Article.query.get(id)
    if not article:
        return jsonify({"error": "文章不存在"}), 404

    existing = ArticleFavorite.query.filter_by(user_id=current_user.id, article_id=id).first()
    if existing:
        db.session.delete(existing)
        article.favorites = max(0, article.favorites - 1)
        db.session.commit()
        return jsonify({"favorites": article.favorites, "action": "unfavorited"})

    new_fav = ArticleFavorite(user_id=current_user.id, article_id=id)
    db.session.add(new_fav)
    article.favorites += 1
    db.session.commit()
    return jsonify({"favorites": article.favorites, "action": "favorited"})


@articles_bp.route("/api/user/articles", methods=["GET"])
@login_required
def get_my_articles():
    articles = (
        Article.query.filter_by(user_id=current_user.id)
        .order_by(Article.updated_at.desc())
        .all()
    )
    result = []
    for a in articles:
        result.append(
            {
                "id": a.id,
                "title": a.title,
                "author": a.author,
                "date": a.date.isoformat() if a.date else None,
                "updated_at": to_utc_iso(a.updated_at),
                "excerpt": a.excerpt,
                "thumbnail": a.thumbnail,
                "tag": a.tag,
                "views": a.views,
                "likes": a.likes,
                "favorites": a.favorites,
                "status": a.status,
                "scheduled_at": to_utc_iso(a.scheduled_at),
                "created_at": to_utc_iso(a.created_at),
            }
        )
    return jsonify(result)


@articles_bp.route("/api/user/articles", methods=["POST"])
@login_required
def create_article():
    data = request.get_json()
    title = (data.get("title") or "").strip()
    content = data.get("content") or ""
    excerpt = (data.get("excerpt") or "").strip()
    thumbnail = (data.get("thumbnail") or "").strip()
    tag = (data.get("tag") or "").strip()
    status = data.get("status") or "public"
    scheduled_at_str = data.get("scheduled_at")

    if not title:
        return jsonify({"error": "标题不能为空"}), 400
    if not excerpt:
        return jsonify({"error": "摘要不能为空"}), 400
    if status not in ("public", "private", "scheduled", "draft"):
        return jsonify({"error": "状态不合法"}), 400

    scheduled_at = None
    if status == "scheduled":
        if not scheduled_at_str:
            return jsonify({"error": "定时发布需要指定时间"}), 400
        try:
            scheduled_at = datetime.fromisoformat(scheduled_at_str)
        except ValueError:
            return jsonify({"error": "时间格式不正确"}), 400

    user = User.query.get(current_user.id)
    display_name = user.nickname if user.nickname else user.username

    now_date = date.today()
    article = Article(
        title=title,
        content=content,
        author=display_name,
        user_id=current_user.id,
        date=now_date,
        excerpt=excerpt,
        thumbnail=thumbnail or None,
        tag=tag or None,
        status=status,
        scheduled_at=scheduled_at,
    )
    db.session.add(article)
    db.session.commit()
    return jsonify({"message": "文章已创建", "id": article.id})


@articles_bp.route("/api/user/articles/<int:id>", methods=["PUT"])
@login_required
def update_article(id):
    article = Article.query.get(id)
    if not article:
        return jsonify({"error": "文章不存在"}), 404
    if article.user_id != current_user.id:
        return jsonify({"error": "无权操作"}), 403

    data = request.get_json()
    if "title" in data:
        title = (data["title"] or "").strip()
        if not title:
            return jsonify({"error": "标题不能为空"}), 400
        article.title = title
    if "content" in data:
        article.content = data["content"]
    if "excerpt" in data:
        excerpt = (data["excerpt"] or "").strip()
        if not excerpt:
            return jsonify({"error": "摘要不能为空"}), 400
        article.excerpt = excerpt
    if "thumbnail" in data:
        article.thumbnail = (data["thumbnail"] or "").strip() or None
    if "tag" in data:
        article.tag = (data["tag"] or "").strip() or None
    if "status" in data:
        status = data["status"]
        if status not in ("public", "private", "scheduled", "draft"):
            return jsonify({"error": "状态不合法"}), 400
        article.status = status
        if status == "public":
            article.date = date.today()
    if "scheduled_at" in data:
        s = data["scheduled_at"]
        if s:
            try:
                article.scheduled_at = datetime.fromisoformat(s)
            except ValueError:
                return jsonify({"error": "时间格式不正确"}), 400
        else:
            article.scheduled_at = None

    article.updated_at = datetime.utcnow()
    db.session.commit()
    return jsonify({"message": "文章已更新"})


@articles_bp.route("/api/user/articles/<int:id>", methods=["DELETE"])
@login_required
def delete_article(id):
    article = Article.query.get(id)
    if not article:
        return jsonify({"error": "文章不存在"}), 404
    if article.user_id != current_user.id:
        return jsonify({"error": "无权操作"}), 403
    db.session.delete(article)
    db.session.commit()
    return jsonify({"message": "文章已删除"})



