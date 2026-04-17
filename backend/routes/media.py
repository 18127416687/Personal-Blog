import base64
import json
import os
import time
import uuid
from datetime import datetime
from urllib.error import HTTPError, URLError
from urllib.parse import urlparse, urlunparse
from urllib.request import Request, urlopen

from flask import Blueprint, current_app, jsonify, request, send_from_directory
from flask_login import current_user, login_required

from models import Article, Photo, User, db
from services.storage import (
    allowed_image_file,
    delete_uploaded_by_url,
    is_image_file,
    is_video_file,
    normalize_media_url,
    upload_media,
)

media_bp = Blueprint("media", __name__)


def _normalize_image_api_url(raw_url):
    base = (raw_url or "").rstrip("/")
    if base.endswith("/images/generations"):
        return base
    if base.endswith("/chat/completions"):
        return base[: -len("/chat/completions")] + "/images/generations"
    if base.endswith("/compatible-mode/v1"):
        return base + "/images/generations"
    return base + "/images/generations"


def _normalize_dashscope_submit_url(raw_url):
    base = (raw_url or "").rstrip("/")
    if base.endswith("/api/v1/services/aigc/text2image/image-synthesis"):
        return base

    parsed = urlparse(base)
    if parsed.scheme and parsed.netloc:
        origin = urlunparse((parsed.scheme, parsed.netloc, "", "", "", ""))
    else:
        origin = base
    return origin.rstrip("/") + "/api/v1/services/aigc/text2image/image-synthesis"


def _normalize_dashscope_task_url(raw_url, task_id):
    base = (raw_url or "").rstrip("/")
    parsed = urlparse(base)
    if parsed.scheme and parsed.netloc:
        origin = urlunparse((parsed.scheme, parsed.netloc, "", "", "", ""))
    else:
        origin = base
    return origin.rstrip("/") + f"/api/v1/tasks/{task_id}"


def _normalize_dashscope_multimodal_url(raw_url):
    base = (raw_url or "").rstrip("/")
    if base.endswith("/api/v1/services/aigc/multimodal-generation/generation"):
        return base
    parsed = urlparse(base)
    if parsed.scheme and parsed.netloc:
        origin = urlunparse((parsed.scheme, parsed.netloc, "", "", "", ""))
    else:
        origin = base
    return origin.rstrip("/") + "/api/v1/services/aigc/multimodal-generation/generation"


def _save_b64_image_to_local(b64_data):
    if not b64_data:
        return None
    try:
        blob = base64.b64decode(b64_data)
    except Exception:
        return None
    if not blob:
        return None

    rel_key = (
        f"ai/images/{datetime.utcnow().strftime('%Y/%m/%d')}/{uuid.uuid4().hex}.png"
    )
    upload_root = os.path.abspath(current_app.config["UPLOAD_FOLDER"])
    file_path = os.path.abspath(os.path.join(upload_root, rel_key))
    if not file_path.startswith(upload_root):
        return None

    os.makedirs(os.path.dirname(file_path), exist_ok=True)
    with open(file_path, "wb") as fh:
        fh.write(blob)
    return f"/uploads/{rel_key.replace(os.sep, '/')}"


def _extract_image_url(result):
    data = result.get("data") or []
    if not data:
        return None
    first = data[0] or {}
    image_url = (first.get("url") or "").strip()
    if image_url:
        return image_url
    b64_json = first.get("b64_json")
    return _save_b64_image_to_local(b64_json)


def _extract_dashscope_result_url(result):
    output = result.get("output") or {}
    results = output.get("results") or []
    if results and isinstance(results[0], dict):
        url = (results[0].get("url") or "").strip()
        if url:
            return url
    url = (output.get("result_url") or "").strip()
    if url:
        return url
    return None


def _extract_dashscope_multimodal_url(result):
    output = result.get("output") or {}
    choices = output.get("choices") or []
    if not choices:
        return None
    message = choices[0].get("message") or {}
    content = message.get("content") or []
    if not isinstance(content, list):
        return None
    for item in content:
        if isinstance(item, dict):
            url = (item.get("image") or "").strip()
            if url:
                return url
    return None


@media_bp.route("/api/user/avatar", methods=["POST"])
@login_required
def upload_avatar():
    if "file" not in request.files:
        return jsonify({"error": "No file uploaded"}), 400
    file = request.files["file"]
    if file.filename == "":
        return jsonify({"error": "No file selected"}), 400
    if file and allowed_image_file(file.filename):
        avatar_url, _, upload_error = upload_media(file, "avatars")
        if upload_error:
            return jsonify({"error": upload_error}), 500
        user = User.query.get(current_user.id)
        user.avatar = avatar_url
        db.session.commit()
        return jsonify({"url": avatar_url})
    return jsonify({"error": "Only image files are allowed"}), 400


@media_bp.route("/api/user/articles/<int:id>/image", methods=["POST"])
@login_required
def upload_article_image(id):
    article = Article.query.get(id)
    if not article or article.user_id != current_user.id:
        return jsonify({"error": "Forbidden"}), 403
    if "file" not in request.files:
        return jsonify({"error": "No file uploaded"}), 400
    file = request.files["file"]
    if file.filename == "":
        return jsonify({"error": "No file selected"}), 400
    if file and allowed_image_file(file.filename):
        url, _, upload_error = upload_media(file, f"articles/{id}")
        if upload_error:
            return jsonify({"error": upload_error}), 500
        return jsonify({"url": url})
    return jsonify({"error": "Only image files are allowed"}), 400


@media_bp.route("/api/upload-editor-image", methods=["POST"])
@login_required
def upload_editor_image():
    if "file" not in request.files:
        return jsonify({"errno": 1, "message": "No file uploaded"}), 400
    file = request.files["file"]
    if file.filename == "":
        return jsonify({"errno": 1, "message": "No file selected"}), 400
    if file and is_image_file(file.filename):
        url, _, upload_error = upload_media(file, "editor/images")
        if upload_error:
            return jsonify({"errno": 1, "message": upload_error}), 500
        return jsonify({"errno": 0, "data": [{"url": url}]})
    return jsonify({"errno": 1, "message": "Only image files are allowed"}), 400


@media_bp.route("/api/upload-editor-video", methods=["POST"])
@login_required
def upload_editor_video():
    if "file" not in request.files:
        return jsonify({"errno": 1, "message": "No file uploaded"}), 400
    file = request.files["file"]
    if file.filename == "":
        return jsonify({"errno": 1, "message": "No file selected"}), 400
    if file and is_video_file(file.filename):
        url, _, upload_error = upload_media(file, "editor/videos")
        if upload_error:
            return jsonify({"errno": 1, "message": upload_error}), 500
        return jsonify({"errno": 0, "data": [{"url": url}]})
    return jsonify({"errno": 1, "message": "Only video files are allowed"}), 400


@media_bp.route("/api/ai/generate-image", methods=["POST"])
@login_required
def generate_image_by_ai():
    data = request.get_json(silent=True) or {}
    prompt = (data.get("prompt") or "").strip()
    if len(prompt) < 2:
        return jsonify({"error": "提示词至少 2 个字符"}), 400

    api_key = (
        current_app.config.get("AI_IMAGE_API_KEY")
        or current_app.config.get("AI_API_KEY")
        or os.getenv("DASHSCOPE_API_KEY")
        or ""
    ).strip()
    api_url = (
        current_app.config.get("AI_IMAGE_API_URL")
        or current_app.config.get("AI_API_URL")
        or ""
    ).strip()
    model = (current_app.config.get("AI_IMAGE_MODEL") or "").strip()
    size = (current_app.config.get("AI_IMAGE_SIZE") or "1024x1024").strip()
    api_format = (
        current_app.config.get("AI_IMAGE_API_FORMAT") or "openai_images"
    ).strip()

    if not api_key:
        return jsonify({"error": "请先配置 AI_IMAGE_API_KEY 或 AI_API_KEY"}), 400
    if not api_url:
        return jsonify({"error": "请先配置 AI_IMAGE_API_URL 或 AI_API_URL"}), 400
    if not model:
        return jsonify({"error": "请先配置 AI_IMAGE_MODEL"}), 400

    try:
        if api_format == "openai_images":
            payload = {
                "model": model,
                "prompt": prompt,
                "size": size,
                "n": 1,
            }
            req = Request(
                _normalize_image_api_url(api_url),
                data=json.dumps(payload).encode("utf-8"),
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {api_key}",
                },
                method="POST",
            )
            with urlopen(req, timeout=60) as resp:
                result = json.loads(resp.read().decode("utf-8"))
            image_url = _extract_image_url(result)
            if not image_url:
                return jsonify({"error": "AI 生图返回为空"}), 502
            return jsonify({"url": image_url})

        if api_format == "dashscope_image_async":
            submit_payload = {
                "model": model,
                "input": {"prompt": prompt},
                "parameters": {"size": size, "n": 1},
            }
            submit_req = Request(
                _normalize_dashscope_submit_url(api_url),
                data=json.dumps(submit_payload).encode("utf-8"),
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {api_key}",
                    "X-DashScope-Async": "enable",
                },
                method="POST",
            )
            with urlopen(submit_req, timeout=60) as resp:
                submit_result = json.loads(resp.read().decode("utf-8"))

            output = submit_result.get("output") or {}
            task_id = (output.get("task_id") or output.get("taskId") or "").strip()
            if not task_id:
                return jsonify({"error": "百炼生图任务创建失败：未返回 task_id"}), 502

            for _ in range(30):
                time.sleep(2)
                query_req = Request(
                    _normalize_dashscope_task_url(api_url, task_id),
                    headers={"Authorization": f"Bearer {api_key}"},
                    method="GET",
                )
                with urlopen(query_req, timeout=30) as resp:
                    task_result = json.loads(resp.read().decode("utf-8"))

                out = task_result.get("output") or {}
                status = (
                    out.get("task_status")
                    or out.get("taskStatus")
                    or task_result.get("task_status")
                    or ""
                ).upper()

                if status in ("SUCCEEDED", "SUCCESS"):
                    image_url = _extract_dashscope_result_url(task_result)
                    if image_url:
                        return jsonify({"url": image_url})
                    return jsonify({"error": "百炼生图完成但未返回图片地址"}), 502

                if status in ("FAILED", "FAIL", "CANCELED"):
                    message = out.get("message") or out.get("code") or "任务失败"
                    return jsonify({"error": f"百炼生图失败：{message}"}), 502

            return jsonify({"error": "百炼生图超时，请稍后重试"}), 504

        if api_format == "dashscope_multimodal":
            mm_payload = {
                "model": model,
                "input": {
                    "messages": [
                        {
                            "role": "user",
                            "content": [{"text": prompt}],
                        }
                    ]
                },
                "parameters": {
                    "size": size,
                    "n": 1,
                    "watermark": True,
                },
            }
            mm_req = Request(
                _normalize_dashscope_multimodal_url(api_url),
                data=json.dumps(mm_payload).encode("utf-8"),
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {api_key}",
                },
                method="POST",
            )
            with urlopen(mm_req, timeout=60) as resp:
                mm_result = json.loads(resp.read().decode("utf-8"))

            image_url = _extract_dashscope_multimodal_url(mm_result)
            if not image_url:
                return jsonify({"error": "百炼多模态生图返回为空"}), 502
            return jsonify({"url": image_url})

        return jsonify(
            {
                "error": "不支持的 AI_IMAGE_API_FORMAT，请使用 openai_images、dashscope_image_async 或 dashscope_multimodal"
            }
        ), 400
    except HTTPError as e:
        body = ""
        try:
            body = e.read().decode("utf-8", errors="ignore")
        except Exception:
            body = ""
        return jsonify({"error": f"AI 生图失败（HTTP {e.code}）: {body[:300]}"}), 502
    except URLError as e:
        return jsonify({"error": f"AI 生图连接失败: {e.reason}"}), 502
    except Exception:
        return jsonify({"error": "AI 生图失败，请稍后重试"}), 502


@media_bp.route("/api/photos", methods=["GET"])
def get_photos():
    photos = Photo.query.order_by(Photo.uploaded_at.desc()).all()
    return jsonify([{"url": normalize_media_url(p.url)} for p in photos])


@media_bp.route("/api/photos", methods=["POST"])
@login_required
def upload_photo():
    if "file" not in request.files:
        return jsonify({"error": "No file uploaded"}), 400
    file = request.files["file"]
    if file.filename == "":
        return jsonify({"error": "No file selected"}), 400
    if file and allowed_image_file(file.filename):
        photo_url, _, upload_error = upload_media(file, "gallery")
        if upload_error:
            return jsonify({"error": upload_error}), 500
        new_photo = Photo(url=photo_url, uploader_id=current_user.id)
        db.session.add(new_photo)
        db.session.commit()
        return jsonify({"url": photo_url})
    return jsonify({"error": "Only image files are allowed"}), 400


@media_bp.route("/api/photos/delete", methods=["POST"])
@login_required
def delete_photo():
    data = request.get_json()
    url = (data.get("url") or "").strip()
    if not url:
        return jsonify({"error": "Missing photo URL"}), 400

    normalized_url = normalize_media_url(url)
    photo = Photo.query.filter_by(url=url, uploader_id=current_user.id).first()
    if not photo and normalized_url:
        candidates = Photo.query.filter_by(uploader_id=current_user.id).all()
        for item in candidates:
            if normalize_media_url(item.url) == normalized_url:
                photo = item
                break
    if not photo:
        return jsonify({"error": "Photo not found or no permission"}), 404

    delete_uploaded_by_url(photo.url)
    db.session.delete(photo)
    db.session.commit()
    return jsonify({"message": "Photo deleted"})


@media_bp.route("/uploads/<path:filename>", methods=["GET"])
def uploaded_file(filename):
    return send_from_directory(current_app.config["UPLOAD_FOLDER"], filename)
