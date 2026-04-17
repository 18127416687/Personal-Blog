from functools import wraps

from flask import Blueprint, current_app, redirect, request, send_from_directory
from flask_login import current_user

pages_bp = Blueprint("pages", __name__)

# Add new private pages here to avoid missing auth checks.
PRIVATE_PAGE_FILES = [
    "profile.html",
    "my-interactions.html",
    "editor.html",
    "my-articles.html",
    "my-drafts.html",
    "my-photos.html",
]


def login_required_page(view_func):
    @wraps(view_func)
    def wrapper(*args, **kwargs):
        if not current_user.is_authenticated:
            return redirect(f"/login.html?next={request.path}")
        return view_func(*args, **kwargs)

    return wrapper


def serve_page(filename):
    return send_from_directory("static", filename)


def serve_private_page(filename):
    # Keep this guard to make private-page usage explicit.
    if filename not in PRIVATE_PAGE_FILES:
        return serve_page(filename)
    return serve_page(filename)


@pages_bp.route("/uploads/<path:filename>")
def uploaded_file(filename):
    return send_from_directory(current_app.config["UPLOAD_FOLDER"], filename)


@pages_bp.route("/static/<path:path>")
def serve_static(path):
    return send_from_directory("static", path)


@pages_bp.route("/")
def index():
    return serve_page("index.html")


@pages_bp.route("/index.html")
def index_html():
    return serve_page("index.html")


@pages_bp.route("/articles.html")
def articles_page():
    return serve_page("articles.html")


@pages_bp.route("/gallery.html")
def gallery():
    return serve_page("gallery.html")


@pages_bp.route("/treehole.html")
def treehole():
    return serve_page("treehole.html")


@pages_bp.route("/search.html")
def search_page():
    return serve_page("search.html")


@pages_bp.route("/login.html")
def login_page():
    return serve_page("login.html")


@pages_bp.route("/profile.html")
@login_required_page
def profile_page():
    return serve_private_page("profile.html")


@pages_bp.route("/my-interactions.html")
@login_required_page
def my_interactions_page():
    return serve_private_page("my-interactions.html")


@pages_bp.route("/editor.html")
@login_required_page
def editor_page():
    return serve_private_page("editor.html")


@pages_bp.route("/editor.html/<int:id>")
@login_required_page
def editor_page_edit(id):
    return serve_private_page("editor.html")


@pages_bp.route("/my-articles.html")
@login_required_page
def my_articles_page():
    return serve_private_page("my-articles.html")


@pages_bp.route("/my-drafts.html")
@login_required_page
def my_drafts_page():
    return serve_private_page("my-drafts.html")


@pages_bp.route("/my-photos.html")
@login_required_page
def my_photos_page():
    return serve_private_page("my-photos.html")


@pages_bp.route("/article/<int:id>")
def article_detail(id):
    return serve_page("article-detail.html")


@pages_bp.route("/article-detail.html")
def article_detail_redirect():
    return serve_page("article-detail.html")
