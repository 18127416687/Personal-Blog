import os
from pathlib import Path

from dotenv import load_dotenv


def _load_env_file():
    backend_dir = Path(__file__).resolve().parents[1]
    project_root = backend_dir.parent
    env_candidates = [backend_dir / ".env", project_root / ".env"]
    for env_path in env_candidates:
        if env_path.exists():
            load_dotenv(env_path, override=False)
            break


def _require_env(name):
    value = (os.getenv(name) or "").strip()
    if not value:
        raise RuntimeError(f"Missing required environment variable: {name}")
    return value


def apply_app_config(app):
    _load_env_file()

    app.config["SECRET_KEY"] = _require_env("SECRET_KEY")
    app.config["SQLALCHEMY_DATABASE_URI"] = _require_env("SQLALCHEMY_DATABASE_URI")
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    app.config["UPLOAD_FOLDER"] = os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "uploads"
    )
    app.config["MAX_CONTENT_LENGTH"] = 100 * 1024 * 1024
    app.config["UPLOAD_BACKEND"] = os.getenv("UPLOAD_BACKEND", "auto").strip().lower()

    app.config["QINIU_ACCESS_KEY"] = os.getenv("QINIU_ACCESS_KEY", "").strip()
    app.config["QINIU_SECRET_KEY"] = os.getenv("QINIU_SECRET_KEY", "").strip()
    app.config["QINIU_BUCKET"] = os.getenv("QINIU_BUCKET", "").strip()
    app.config["QINIU_DOMAIN"] = os.getenv("QINIU_DOMAIN", "").strip().rstrip("/")

    app.config["AI_API_KEY"] = os.getenv("AI_API_KEY", "").strip()
    app.config["AI_API_URL"] = os.getenv("AI_API_URL", "").strip()
    app.config["AI_MODEL"] = os.getenv("AI_MODEL", "").strip()
    app.config["AI_API_FORMAT"] = (
        os.getenv("AI_API_FORMAT", "chat_completions").strip().lower()
    )
    app.config["AI_IMAGE_API_KEY"] = os.getenv("AI_IMAGE_API_KEY", "").strip()
    app.config["AI_IMAGE_API_URL"] = os.getenv("AI_IMAGE_API_URL", "").strip()
    app.config["AI_IMAGE_MODEL"] = os.getenv("AI_IMAGE_MODEL", "").strip()
    app.config["AI_IMAGE_SIZE"] = os.getenv("AI_IMAGE_SIZE", "1024x1024").strip()
    app.config["AI_IMAGE_API_FORMAT"] = (
        os.getenv("AI_IMAGE_API_FORMAT", "openai_images").strip().lower()
    )
    app.config["ADMIN_USERNAME"] = os.getenv("ADMIN_USERNAME", "").strip()
    app.config["ADMIN_PASSWORD"] = os.getenv("ADMIN_PASSWORD", "")


def ensure_upload_folder(app):
    try:
        os.makedirs(app.config["UPLOAD_FOLDER"], exist_ok=True)
    except Exception:
        pass
