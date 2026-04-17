import os
import uuid
from datetime import datetime
from urllib.parse import unquote, urlparse

from flask import current_app
from qiniu import Auth as QiniuAuth, BucketManager, put_data
from werkzeug.utils import secure_filename

IMAGE_EXTENSIONS = {
    "png",
    "jpg",
    "jpeg",
    "gif",
    "webp",
    "bmp",
    "heic",
    "heif",
    "jfif",
    "avif",
    "svg",
    "tif",
    "tiff",
}
VIDEO_EXTENSIONS = {"mp4", "mov", "webm", "avi", "mkv"}
UPLOAD_BACKENDS = {"auto", "local", "qiniu"}


def allowed_image_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in IMAGE_EXTENSIONS


def is_image_file(filename):
    return allowed_image_file(filename)


def is_video_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in VIDEO_EXTENSIONS


def _normalized_upload_backend():
    backend = (current_app.config.get("UPLOAD_BACKEND") or "auto").strip().lower()
    if backend not in UPLOAD_BACKENDS:
        return "auto"
    return backend


def _qiniu_ready():
    return all(
        [
            current_app.config.get("QINIU_ACCESS_KEY"),
            current_app.config.get("QINIU_SECRET_KEY"),
            current_app.config.get("QINIU_BUCKET"),
            current_app.config.get("QINIU_DOMAIN"),
        ]
    )


def _qiniu_auth():
    return QiniuAuth(
        current_app.config["QINIU_ACCESS_KEY"],
        current_app.config["QINIU_SECRET_KEY"],
    )


def _qiniu_public_url(key):
    domain = current_app.config["QINIU_DOMAIN"]
    if domain.startswith("http://") or domain.startswith("https://"):
        return f"{domain}/{key}"
    return f"https://{domain}/{key}"


def upload_to_qiniu(file_storage, folder):
    if not _qiniu_ready():
        return (
            None,
            None,
            "Qiniu is not configured. Please set QINIU_ACCESS_KEY/QINIU_SECRET_KEY/QINIU_BUCKET/QINIU_DOMAIN.",
        )

    original = secure_filename(file_storage.filename or "")
    ext = os.path.splitext(original)[1].lower()
    key = f"{folder}/{datetime.utcnow().strftime('%Y/%m/%d')}/{uuid.uuid4().hex}{ext}"
    token = _qiniu_auth().upload_token(current_app.config["QINIU_BUCKET"], key, 3600)
    data = file_storage.read()
    ret, info = put_data(token, key, data)
    file_storage.stream.seek(0)

    if info.status_code != 200 or not ret or ret.get("key") != key:
        return None, None, "Failed to upload file to Qiniu."
    return _qiniu_public_url(key), key, None


def _safe_local_path(key):
    upload_root = os.path.abspath(current_app.config["UPLOAD_FOLDER"])
    file_path = os.path.abspath(os.path.join(upload_root, key))
    if not file_path.startswith(upload_root):
        return None
    return file_path


def _local_public_url(key):
    return f"/uploads/{key.replace(os.sep, '/')}"


def normalize_media_url(url):
    value = (url or "").strip()
    if not value:
        return value

    value = value.replace("\\", "/")
    parsed = urlparse(value)
    if parsed.scheme in {"http", "https"}:
        return value

    if value.startswith("/uploads/"):
        return value
    if value.startswith("uploads/"):
        return f"/{value}"

    marker = "/uploads/"
    lower_value = value.lower()
    idx = lower_value.find(marker)
    if idx != -1:
        return value[idx:]

    # Qiniu domain without scheme, e.g. cdn.example.com/path/file.png
    if "." in value.split("/", 1)[0] and not value.startswith("/"):
        return f"https://{value}"

    return value


def upload_to_local(file_storage, folder):
    original = secure_filename(file_storage.filename or "")
    ext = os.path.splitext(original)[1].lower()
    key = f"{folder}/{datetime.utcnow().strftime('%Y/%m/%d')}/{uuid.uuid4().hex}{ext}"
    file_path = _safe_local_path(key)
    if not file_path:
        return None, None, "Invalid local upload path."
    os.makedirs(os.path.dirname(file_path), exist_ok=True)
    file_storage.save(file_path)
    return _local_public_url(key), key, None


def upload_media(file_storage, folder):
    backend = _normalized_upload_backend()

    if backend == "local":
        return upload_to_local(file_storage, folder)

    if backend == "qiniu":
        url, key, err = upload_to_qiniu(file_storage, folder)
        if err:
            return upload_to_local(file_storage, folder)
        return url, key, None

    if _qiniu_ready():
        url, key, err = upload_to_qiniu(file_storage, folder)
        if not err:
            return url, key, None
    return upload_to_local(file_storage, folder)


def _extract_qiniu_key(url):
    if not url:
        return None
    parsed = urlparse(url)
    if not parsed.path:
        return None
    return unquote(parsed.path.lstrip("/"))


def delete_qiniu_by_url(url):
    if not _qiniu_ready():
        return
    key = _extract_qiniu_key(url)
    if not key:
        return
    bucket_manager = BucketManager(_qiniu_auth())
    bucket_manager.delete(current_app.config["QINIU_BUCKET"], key)


def _delete_local_by_url(url):
    parsed = urlparse(url or "")
    path = unquote(parsed.path or "")
    if not path.startswith("/uploads/"):
        return
    key = path[len("/uploads/") :]
    if not key:
        return
    file_path = _safe_local_path(key)
    if file_path and os.path.exists(file_path):
        os.remove(file_path)


def delete_uploaded_by_url(url):
    if not url:
        return

    parsed = urlparse(url)
    qiniu_domain = (current_app.config.get("QINIU_DOMAIN") or "").strip().rstrip("/")
    if qiniu_domain:
        qiniu_host = urlparse(
            qiniu_domain
            if qiniu_domain.startswith(("http://", "https://"))
            else f"https://{qiniu_domain}"
        ).netloc
        if _qiniu_ready() and parsed.netloc and parsed.netloc == qiniu_host:
            delete_qiniu_by_url(url)
            return

    _delete_local_by_url(url)
