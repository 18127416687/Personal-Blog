# -*- coding: gbk -*-
# ==================== Imports ====================
import os
import re
import shutil
import sqlite3
from datetime import datetime, date
from collections import defaultdict
import threading

from flask import Flask, request, jsonify, session
from flask_sqlalchemy import SQLAlchemy
from flask_login import (
    LoginManager,
    UserMixin,
    login_user,
    login_required,
    logout_user,
    current_user,
)
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash

from models import (
    db,
    User,
    Article,
    Bullet,
    AdminNotice,
    Photo,
    Comment,
    ArticleLike,
    ArticleFavorite,
    CommentLike,
)
from config.settings import apply_app_config, ensure_upload_folder
from routes.media import media_bp
from routes.auth import auth_bp
from routes.articles import articles_bp
from routes.comments import comments_bp
from routes.bullets import bullets_bp
from routes.admin import admin_bp
from services.auth_session import UserLogin


def to_utc_iso(dt):
    if dt is None:
        return None
    return dt.isoformat() + "Z"


# ==================== App & Extensions ====================
app = Flask(__name__)
apply_app_config(app)
ensure_upload_folder(app)

def _sqlite_file_uri(db_path):
    normalized = os.path.normpath(db_path).replace("\\", "/")
    return f"file:{normalized}?mode=ro&immutable=1"


def _is_sqlite_db_healthy(db_path):
    if not os.path.exists(db_path) or os.path.getsize(db_path) <= 0:
        return False
    try:
        conn = sqlite3.connect(_sqlite_file_uri(db_path), uri=True)
        conn.execute("SELECT name FROM sqlite_master LIMIT 1")
        conn.close()
        return True
    except sqlite3.Error:
        return False


def _can_write_to_dir(dir_path):
    probe = os.path.join(dir_path, '.__codex_sqlite_probe__.tmp')
    try:
        with open(probe, 'w', encoding='utf-8') as fh:
            fh.write('ok')
        os.remove(probe)
        return True
    except OSError:
        return False


def _resolve_default_sqlite_path(flask_app):
    uri = flask_app.config.get("SQLALCHEMY_DATABASE_URI", "")
    if not uri.startswith("sqlite:///"):
        return None
    rel_path = uri.replace("sqlite:///", "", 1)
    if not rel_path or rel_path.startswith("file:"):
        return None
    if os.path.isabs(rel_path):
        return rel_path
    return os.path.join(flask_app.instance_path, rel_path)


def _configure_runtime_database(flask_app):
    flask_app.config["_USE_MEMORY_DB"] = False
    flask_app.config["_DB_SEED_PRIMARY"] = None
    flask_app.config["_DB_SEED_ADMIN"] = None

    default_path = _resolve_default_sqlite_path(flask_app)
    if not default_path:
        return

    project_root = os.path.dirname(os.path.abspath(__file__))
    backup_path = f"{default_path}.bak"
    legacy_backup = os.path.join(flask_app.instance_path, "blog.db.bak")
    admin_verify = os.path.join(project_root, "admin_verify.db")

    writable = _can_write_to_dir(os.path.dirname(default_path))

    if writable and (not os.path.exists(default_path) or os.path.getsize(default_path) <= 0):
        candidate = legacy_backup if _is_sqlite_db_healthy(legacy_backup) else backup_path
        if _is_sqlite_db_healthy(candidate):
            try:
                shutil.copy2(candidate, default_path)
            except OSError:
                pass

    if writable and _is_sqlite_db_healthy(default_path):
        return

    # Fallback: shared in-memory sqlite loaded from readable snapshots.
    flask_app.config["_USE_MEMORY_DB"] = True
    flask_app.config["_DB_SEED_PRIMARY"] = (
        legacy_backup if _is_sqlite_db_healthy(legacy_backup) else None
    )
    flask_app.config["_DB_SEED_ADMIN"] = (
        admin_verify if _is_sqlite_db_healthy(admin_verify) else None
    )
    flask_app.config[
        "SQLALCHEMY_DATABASE_URI"
    ] = "sqlite:///file:blog_runtime_memdb?mode=memory&cache=shared&uri=true"


_configure_runtime_database(app)

_memory_keeper = None
if app.config.get("_USE_MEMORY_DB"):
    _memory_keeper = sqlite3.connect(
        "file:blog_runtime_memdb?mode=memory&cache=shared",
        uri=True,
        check_same_thread=False,
    )

db.init_app(app)

login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = None

CORS(app, supports_credentials=True, origins=["http://localhost:5173", "http://127.0.0.1:5173"])
app.register_blueprint(media_bp)
app.register_blueprint(auth_bp)
app.register_blueprint(articles_bp)
app.register_blueprint(comments_bp)
app.register_blueprint(bullets_bp)
app.register_blueprint(admin_bp)





@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({'message': 'ok'})


# ==================== Flask-Login ====================
@login_manager.user_loader
def load_user(user_id):
    user = User.query.get(int(user_id))
    if user:
        return UserLogin(user)
    return None


@login_manager.unauthorized_handler
def handle_unauthorized():
    return jsonify({"error": "请先登录"}), 401


# ==================== Helpers ====================
# Route-level helpers are moved to services/common.py and services/article_views.py

# ==================== DB Migration Helper ====================
def _ensure_db_columns():
    try:
        engine = db.engine
        if engine.dialect.name != "sqlite":
            return
        with engine.connect() as conn:
            cols = conn.execute(db.text("PRAGMA table_info(user)")).fetchall()
            col_names = {c[1] for c in cols}
            for col, ddl in [
                ("nickname", "VARCHAR(80)"),
                ("avatar", "VARCHAR(200)"),
                ("bio", "TEXT"),
                ("created_at", "DATETIME"),
                ("is_admin", "BOOLEAN DEFAULT 0"),
                ("is_active", "BOOLEAN DEFAULT 1"),
                ("banned_until", "DATETIME"),
            ]:
                if col not in col_names:
                    conn.execute(db.text(f"ALTER TABLE user ADD COLUMN {col} {ddl}"))
            art_cols = conn.execute(db.text("PRAGMA table_info(article)")).fetchall()
            art_names = {c[1] for c in art_cols}
            for col, ddl in [
                ("content", "TEXT"),
                ("user_id", "INTEGER"),
                ("status", "VARCHAR(20)"),
                ("scheduled_at", "DATETIME"),
                ("created_at", "DATETIME"),
                ("updated_at", "DATETIME"),
            ]:
                if col not in art_names:
                    conn.execute(db.text(f"ALTER TABLE article ADD COLUMN {col} {ddl}"))
            conn.execute(
                db.text("""
                CREATE TABLE IF NOT EXISTS article_like (
                    id INTEGER PRIMARY KEY,
                    user_id INTEGER NOT NULL,
                    article_id INTEGER NOT NULL,
                    created_at DATETIME,
                    FOREIGN KEY(user_id) REFERENCES user(id),
                    FOREIGN KEY(article_id) REFERENCES article(id)
                )
            """)
            )
            conn.execute(
                db.text("""
                CREATE TABLE IF NOT EXISTS article_favorite (
                    id INTEGER PRIMARY KEY,
                    user_id INTEGER NOT NULL,
                    article_id INTEGER NOT NULL,
                    created_at DATETIME,
                    FOREIGN KEY(user_id) REFERENCES user(id),
                    FOREIGN KEY(article_id) REFERENCES article(id)
                )
            """)
            )
            conn.commit()
    except Exception as e:
        print("ensure columns failed:", e)


def _parse_date(v):
    if v is None or v == "":
        return None
    if isinstance(v, date):
        return v
    s = str(v)
    try:
        return date.fromisoformat(s[:10])
    except Exception:
        return None


def _parse_datetime(v):
    if v is None or v == "":
        return None
    if isinstance(v, datetime):
        return v
    s = str(v).replace("Z", "")
    try:
        return datetime.fromisoformat(s)
    except Exception:
        return None


def _load_primary_snapshot(snapshot_path):
    if not snapshot_path:
        return
    conn = sqlite3.connect(_sqlite_file_uri(snapshot_path), uri=True)
    conn.row_factory = sqlite3.Row

    users = conn.execute("SELECT * FROM user").fetchall()
    for row in users:
        keys = set(row.keys())
        db.session.merge(
            User(
                id=row["id"],
                username=row["username"],
                password=row["password"],
                nickname=row["nickname"] if "nickname" in keys else None,
                avatar=row["avatar"] if "avatar" in keys else None,
                bio=row["bio"] if "bio" in keys else None,
                email=row["email"] if "email" in keys else None,
                phone=row["phone"] if "phone" in keys else None,
                is_admin=bool(row["is_admin"]) if "is_admin" in keys else False,
                is_active=bool(row["is_active"]) if "is_active" in keys else True,
                created_at=_parse_datetime(row["created_at"]) if "created_at" in keys else None,
            )
        )

    articles = conn.execute("SELECT * FROM article").fetchall()
    for row in articles:
        keys = set(row.keys())
        db.session.merge(
            Article(
                id=row["id"],
                title=row["title"],
                content=row["content"] if "content" in keys else None,
                author=row["author"],
                user_id=row["user_id"] if "user_id" in keys else None,
                date=_parse_date(row["date"]),
                excerpt=row["excerpt"],
                thumbnail=row["thumbnail"],
                tag=row["tag"],
                views=row["views"] or 0,
                likes=row["likes"] or 0,
                favorites=row["favorites"] or 0,
                status=row["status"] if "status" in keys and row["status"] else "public",
                scheduled_at=_parse_datetime(row["scheduled_at"]) if "scheduled_at" in keys else None,
                created_at=_parse_datetime(row["created_at"]) if "created_at" in keys else None,
                updated_at=_parse_datetime(row["updated_at"]) if "updated_at" in keys else None,
            )
        )

    for row in conn.execute("SELECT * FROM bullet").fetchall():
        db.session.merge(
            Bullet(
                id=row["id"],
                content=row["content"],
                user_id=row["user_id"],
                created_at=_parse_datetime(row["created_at"]),
            )
        )

    for row in conn.execute("SELECT * FROM photo").fetchall():
        db.session.merge(
            Photo(
                id=row["id"],
                url=row["url"],
                uploader_id=row["uploader_id"],
                uploaded_at=_parse_datetime(row["uploaded_at"]),
            )
        )

    for row in conn.execute("SELECT * FROM article_like").fetchall():
        db.session.merge(
            ArticleLike(
                id=row["id"],
                user_id=row["user_id"],
                article_id=row["article_id"],
                created_at=_parse_datetime(row["created_at"]),
            )
        )

    for row in conn.execute("SELECT * FROM article_favorite").fetchall():
        db.session.merge(
            ArticleFavorite(
                id=row["id"],
                user_id=row["user_id"],
                article_id=row["article_id"],
                created_at=_parse_datetime(row["created_at"]),
            )
        )

    for row in conn.execute("SELECT * FROM comment").fetchall():
        db.session.merge(
            Comment(
                id=row["id"],
                article_id=row["article_id"],
                user_id=row["user_id"],
                content=row["content"],
                parent_id=row["parent_id"],
                likes=row["likes"] or 0,
                created_at=_parse_datetime(row["created_at"]),
                updated_at=_parse_datetime(row["updated_at"]),
            )
        )

    for row in conn.execute("SELECT * FROM comment_like").fetchall():
        db.session.merge(
            CommentLike(
                id=row["id"],
                user_id=row["user_id"],
                comment_id=row["comment_id"],
                created_at=_parse_datetime(row["created_at"]),
            )
        )

    conn.close()
    db.session.commit()


def _merge_admin_snapshot(snapshot_path):
    if not snapshot_path:
        return
    conn = sqlite3.connect(_sqlite_file_uri(snapshot_path), uri=True)
    conn.row_factory = sqlite3.Row
    admin_rows = conn.execute("SELECT * FROM user WHERE is_admin = 1").fetchall()

    for row in admin_rows:
        username = row["username"]
        existing = User.query.filter_by(username=username).first()
        if existing:
            existing.password = row["password"]
            existing.is_admin = True
            existing.is_active = bool(row["is_active"]) if "is_active" in row.keys() else True
            continue

        max_id = db.session.query(db.func.max(User.id)).scalar() or 0
        db.session.add(
            User(
                id=max_id + 1,
                username=username,
                password=row["password"],
                nickname=row["nickname"] if "nickname" in row.keys() else None,
                avatar=row["avatar"] if "avatar" in row.keys() else None,
                bio=row["bio"] if "bio" in row.keys() else None,
                email=row["email"] if "email" in row.keys() else None,
                phone=row["phone"] if "phone" in row.keys() else None,
                is_admin=True,
                is_active=bool(row["is_active"]) if "is_active" in row.keys() else True,
                created_at=_parse_datetime(row["created_at"]) if "created_at" in row.keys() else None,
            )
        )

    conn.close()
    db.session.commit()


def _seed_memory_database_if_needed():
    if not app.config.get("_USE_MEMORY_DB"):
        return
    if User.query.first() or Article.query.first():
        return

    primary = app.config.get("_DB_SEED_PRIMARY")
    admin = app.config.get("_DB_SEED_ADMIN")

    if primary and _is_sqlite_db_healthy(primary):
        _load_primary_snapshot(primary)
    if admin and _is_sqlite_db_healthy(admin):
        _merge_admin_snapshot(admin)


def _bootstrap_database():
    with app.app_context():
        db.create_all()
        if app.config.get("_USE_MEMORY_DB"):
            _seed_memory_database_if_needed()
        else:
            _ensure_db_columns()


_bootstrap_database()

# ==================== Request Hooks ====================
@app.before_request
def _before_any_request():
    if app.config.get("_USE_MEMORY_DB"):
        return None
    if not getattr(app, "_columns_checked", False):
        _ensure_db_columns()
        setattr(app, "_columns_checked", True)



@app.before_request
def _enforce_account_active():
    if current_user.is_authenticated:
        user = User.query.get(current_user.id)
        if user and user.banned_until and user.banned_until <= datetime.utcnow():
            user.banned_until = None
            user.is_active = True
            db.session.commit()
            return None
        if user and not user.is_active:
            logout_user()
            return jsonify({"error": "账号已被禁用"}), 401
def _publish_scheduled():
    try:
        now = datetime.utcnow()
        articles = Article.query.filter(
            Article.status == "scheduled", Article.scheduled_at <= now
        ).all()
        for a in articles:
            a.status = "public"
        if articles:
            db.session.commit()
    except Exception as e:
        print("publish scheduled skipped:", e)


@app.before_request
def _check_scheduled():
    if not getattr(app, "_last_cron", 0):
        _publish_scheduled()
        app._last_cron = datetime.utcnow().timestamp()
    else:
        now = datetime.utcnow().timestamp()
        if now - app._last_cron > 60:
            _publish_scheduled()
            app._last_cron = now


# ==================== Flask CLI Commands ====================
@app.cli.command("initdb")
def initdb():
    if not os.path.exists(app.config["UPLOAD_FOLDER"]):
        os.makedirs(app.config["UPLOAD_FOLDER"])
    db.create_all()
    articles = [
        Article(
            title="Cookie, Session, Token, JWT都是些什么？什么情况下用什么？",
            author="程序员逗号",
            date=datetime(2025, 3, 15).date(),
            excerpt="本文系统介绍了三种主流Token认证方案。Session+Cookie方案简单易用但存在跨域和集群问题；Opaque Token+Redis解决了集群问题但依赖Redis高可用；JWT实现...",
            thumbnail="https://picsum.photos/200/200?random=101",
            tag="认证",
            views=4900,
            likes=31,
            favorites=11,
            status="public",
        ),
        Article(
            title="OAuth 2.0 与 OpenID Connect 实战指南",
            author="安全小哥",
            date=datetime(2025, 3, 10).date(),
            excerpt="从授权码模式到PKCE，教你如何在移动端和Web应用中安全集成OAuth2.0，并利用OIDC获取用户身份信息。",
            thumbnail="https://picsum.photos/200/200?random=102",
            tag="OAuth",
            views=3200,
            likes=24,
            favorites=8,
            status="public",
        ),
        Article(
            title="从单点登录到CAS原理",
            author="架构喵",
            date=datetime(2025, 3, 5).date(),
            excerpt="深度解析CAS协议的核心流程，包括Ticket的颁发与验证，以及如何与Spring Security集成实现统一认证。",
            thumbnail="https://picsum.photos/200/200?random=103",
            tag="SSO",
            views=2800,
            likes=17,
            favorites=5,
            status="public",
        ),
        Article(
            title="WebAuthn 无密码认证介绍",
            author="密码学家",
            date=datetime(2025, 2, 28).date(),
            excerpt="告别密码！使用生物识别、安全密钥等基于公钥加密的认证方式，提升安全性与用户体验。",
            thumbnail="https://picsum.photos/200/200?random=104",
            tag="WebAuthn",
            views=1500,
            likes=9,
            favorites=3,
            status="public",
        ),
    ]
    db.session.add_all(articles)
    db.session.commit()
    print("数据库初始化完成，添加了示例文章")


@app.cli.command("checkdb")
def checkdb():
    db.create_all()
    print("数据库表创建成功")
    print("User table exists:", db.session.query(User).first() is not None or True)
    print("Bullet table exists:", db.session.query(Bullet).first() is not None or True)
    print(
        "Article table exists:", db.session.query(Article).first() is not None or True
    )
    print("Photo table exists:", db.session.query(Photo).first() is not None or True)


@app.cli.command("add-ai-articles")
def add_ai_articles():
    user = User.query.filter_by(username="小白a").first()
    if not user:
        print("User not found")
        return

    print(f"User: {user.username} (id={user.id})")

    articles = [
        {
            "title": "2025年下半年AI技术发展趋势洞察",
            "content": (
                "<h2>一、AI Agent：从工具人到合伙人的华丽转身</h2>"
                "<p>2025年可以说是AI Agent的商用元年。从2023年AutoGPT开启智能体序幕以来，AI Agent作为新一代智能交互范式，展现出前所未有的发展活力，业界认为Agentic AI时代即将到来。</p>"
                "<h3>自主性大幅提升</h3>"
                "<p>AI Agent将具备更强的独立决策能力，能够处理多步骤复杂任务而无需人工干预，从被动响应转向主动服务。</p>"
                "<h3>跨系统集成能力增强</h3>"
                "<p>打通不同平台和应用的数据壁垒，实现企业级的端到端工作流程自动化，成为真正的数字化员工。</p>"
                "<h3>垂直领域专业化</h3>"
                "<p>从通用型助手发展为行业专家，在医疗、金融、教育等领域深度应用，具备领域专业知识和判断能力。</p>"
                "<h2>二、多模态AI：让机器拥有人类般的感知能力</h2>"
                "<p>多模态模型能力持续升级，朝向多模态理解和生成的统一发展。文本、图像、音频、视频的无缝融合处理，实时多模态交互体验更自然的人机交互方式。</p>"
                "<h3>应用场景爆发</h3>"
                "<ul><li>智能助手：看、听、说、理解一体化</li><li>内容创作：AI导演、AI设计师成为现实</li><li>教育培训：个性化、沉浸式学习体验</li><li>医疗诊断：多维度信息综合分析</li></ul>"
                "<h2>三、边缘AI：智能计算的去中心化革命</h2>"
                "<p>如果说云端AI是中央大脑，那么边缘AI就是分布在各个末梢神经的小脑袋。2024年全球边缘AI市场规模达1212.04亿元，至2030年将以29.49%的CAGR增长至5714.86亿元。</p>"
                "<h3>关键突破</h3>"
                "<p>毫秒级的响应时间，减少对网络连接的依赖。数据本地处理，不上传云端，符合各国数据保护法规。减少云端计算成本，降低网络带宽消耗。</p>"
                "<h2>四、大模型技术：从暴力美学到精耕细作</h2>"
                "<p>2025年上半年已经见证了AI历史上最激烈的模型竞争。Google Gemini 2.5 Pro被称为地表最强模型，支持100万token的上下文窗口。Anthropic Claude 4系列成为世界上最好的编程模型，可连续工作数小时。OpenAI GPT-4.1系列支持100万token上下文处理能力。</p>"
                "<h3>中国AI的重大突破：DeepSeek现象</h3>"
                "<p>DeepSeek R1以极低的成本实现了与OpenAI o1相当的性能，每百万输入标记成本仅0.55美元，而OpenAI o1高达15美元。这一突破被业界称为AI界的安卓时刻。</p>"
                "<h2>五、AI商业化：从实验室走向千家万户</h2>"
                "<p>仅在过去一年中，商业领袖和AI决策者对生成式人工智能的使用率就从55%激增至75%。IDC预测2025年全球企业在AI解决方案上的支出将达到3070亿美元，到2028年将增长至6320亿美元。</p>"
                "<h2>六、前沿技术突破：具身智能与物理AI的崛起</h2>"
                "<p>英伟达CEO黄仁勋在CES 2025上提出，AI技术正在从理解阶段，逐步发展到创造阶段，最终将进入能够运行、推理、计划和行动的物理AI阶段。</p>"
            ),
            "excerpt": "2025年下半年AI技术发展将呈现六大特征：AI Agent从工具人到合伙人、多模态AI全面升级、边缘AI去中心化革命、大模型从暴力美学到精耕细作、AI商业化加速、具身智能崛起。",
            "thumbnail": "https://picsum.photos/400/300?random=201",
            "tag": "AI趋势",
            "views": 24900,
            "likes": 156,
            "favorites": 89,
        },
        {
            "title": "2025年十大AI技术趋势：具身智能与世界模型迎来ChatGPT时刻",
            "content": (
                "<h2>趋势一：AI4S驱动科学研究范式变革</h2>"
                "<p>大模型引领下的AI4S（AI for Science），已成为推动科学研究范式变革的关键力量。2024年，科研人员使用AI的比例快速增加，AI对科学研究方法和流程的变革效应也开始显现。</p>"
                "<h2>趋势二：具身智能元年</h2>"
                "<p>2025年的具身智能，将继续从本体扩展到具身脑的叙事主线。在行业格局上，近百家的具身初创或将迎来洗牌。在技术路线上，端到端模型继续迭代，小脑大模型的尝试或有突破。</p>"
                "<h2>趋势三：统一的多模态大模型</h2>"
                "<p>从训练之初就打通多模态数据，实现端到端输入和输出的原生多模态技术路线给出了多模态发展的新可能。训练阶段即对齐视觉、音频、3D等模态的数据。</p>"
                "<h2>趋势四：Scaling Law扩展与RL+LLMs</h2>"
                "<p>基于Scaling Law推动基础模型性能提升的训练模式性价比持续下降，后训练与特定场景的Scaling law不断被探索。强化学习作为发现后训练、推理阶段的Scaling Law的关键技术。</p>"
                "<h2>趋势五：世界模型加速发布</h2>"
                "<p>更注重因果推理的世界模型赋予AI更高级别的认知和更符合逻辑的推理与决策能力，推动AI在自动驾驶、机器人控制及智能制造等前沿领域的深度应用。</p>"
                "<h2>趋势六：合成数据成为重要催化剂</h2>"
                "<p>合成数据可以降低人工治理和标注的成本，缓解对真实数据的依赖，不再涉及数据隐私问题。提升数据的多样性，有助于提高模型处理长文本和复杂问题的能力。</p>"
                "<h2>趋势七：推理优化迭代加速</h2>"
                "<p>大模型硬件载体从云端向手机、PC等端侧硬件渗透。算法加速和硬件优化技术持续迭代，双轮驱动加速AI Native应用落地。</p>"
                "<h2>趋势八：Agentic AI成为产品落地模式</h2>"
                "<p>2025年，更通用、更自主的智能体将重塑产品应用形态，进一步深入工作与生活场景，成为大模型产品落地的重要应用形态。</p>"
                "<h2>趋势九：AI超级应用爆发前夕</h2>"
                "<p>生成式模型在图像、视频侧的处理能力得到大幅提升，叠加推理优化带来的降本，Agent/RAG框架、应用编排工具等技术的持续发展，为AI超级应用的落地积基树本。</p>"
                "<h2>趋势十：AI安全治理体系持续完善</h2>"
                "<p>基础模型在自主决策上的持续进步带来了潜在的失控风险，如何引入新的技术监管方法，如何在人工监管上平衡行业发展和风险管控？</p>"
            ),
            "excerpt": "智源研究院发布2025十大AI技术趋势，涵盖AI4S科学研究、具身智能元年、多模态大模型、Scaling Law扩展、世界模型、合成数据、推理优化、Agentic AI、SuperApp和AI安全治理。",
            "thumbnail": "https://picsum.photos/400/300?random=202",
            "tag": "AI趋势",
            "views": 18500,
            "likes": 124,
            "favorites": 67,
        },
        {
            "title": "2025大模型技术跃迁：四大突破如何重塑AI未来",
            "content": (
                "<h2>引言：大模型技术的奇点时刻</h2>"
                "<p>2025年，大模型技术正从规模竞赛转向能力跃迁阶段。Gartner预测，到2025年底，支持多模态交互的AI应用将覆盖80%的企业核心业务场景。</p>"
                "<h2>突破一：多模态融合</h2>"
                "<p>从文本到全感官融合，跨模态理解与生成能力的质跃。统一的多模态架构成为标配，视觉、听觉、语言的深度融合让AI更接近人类感知能力。</p>"
                "<h2>突破二：AI Agent自主进化</h2>"
                "<p>具备自主决策能力的AI Agent从试点项目到规模化应用的全面转变，7x24小时连续工作的AI员工成为现实。从通用型助手发展为行业专家，在医疗、金融、教育等领域深度应用。</p>"
                "<h2>突破三：高效推理架构</h2>"
                "<p>DeepSeek R1通过多阶段循环训练方式：基础到RL到微调的循环，极大加强了深度思考能力。每百万输入标记成本仅0.55美元，而OpenAI o1高达15美元，成本降低了近30倍。</p>"
                "<h2>突破四：安全可信机制</h2>"
                "<p>AI作为复杂系统，大模型的Scaling带来了涌现能力，但复杂系统特有的涌现结果不可预测、循环反馈等特有属性也对传统工程的安全防护机制带来了挑战。</p>"
            ),
            "excerpt": "深度解析2025年大模型四大关键技术突破：多模态融合、AI Agent自主进化、高效推理架构与安全可信机制，揭示技术演进路径及企业落地策略。",
            "thumbnail": "https://picsum.photos/400/300?random=203",
            "tag": "大模型",
            "views": 12300,
            "likes": 87,
            "favorites": 45,
        },
        {
            "title": "2026人工智能产业趋势报告：大模型之家的年度专题",
            "content": (
                "<h2>过去一年，AI发生了什么？</h2>"
                "<p>过去一年，中国人工智能的发展节奏明显发生了变化：技术突破不再单点爆发，场景落地不再停留在示范层面，商业验证开始走向更为严苛的现实检验。</p>"
                "<h2>轰然成势，万象归一</h2>"
                "<p>几条看似并行的路径，正在同一时间相互牵引、彼此塑形。站在2026年的门槛上，行业竞争的焦点正悄然改变。决定成败的，不仅是模型规模或算力储备，而是谁能够在新一轮生产关系重构中，占据关键位置。</p>"
                "<h2>技术突破不再单点爆发</h2>"
                "<p>从GPT-4到Claude 4，从Gemini到DeepSeek，大模型的竞争已经从单纯的性能比拼转向生态构建。开源模型逐步追平甚至超越闭源模型，技术民主化加速。</p>"
                "<h2>场景落地走向现实检验</h2>"
                "<p>AI Agent从概念验证走向规模化部署，边缘AI市场快速增长，具身智能从实验室走向工业场景。AI不再是科技玩具，而是真正的生产力工具。</p>"
                "<h2>商业验证走向严苛检验</h2>"
                "<p>IDC预测2025年全球企业在AI解决方案上的支出将达到3070亿美元，到2028年将增长至6320亿美元。中国AI产业规模预计到2028年将达到8110亿元人民币。</p>"
            ),
            "excerpt": "站在2026年的门槛上，行业竞争的焦点正悄然改变。决定成败的，不仅是模型规模或算力储备，而是谁能够在新一轮生产关系重构中，占据关键位置。",
            "thumbnail": "https://picsum.photos/400/300?random=204",
            "tag": "产业分析",
            "views": 9800,
            "likes": 65,
            "favorites": 38,
        },
        {
            "title": "2025上半年AI里程碑：技术跃迁与产业重构全景图",
            "content": (
                "<h2>一、技术突破：从实验室到产业化的跨越</h2>"
                "<h3>1. 多模态大模型的规模化落地</h3>"
                "<p>2025年上半年，多模态AI进入全场景渗透阶段。以OpenAI的GPT-5V和谷歌的Gemini Ultra为代表，模型支持文本、图像、视频、3D模型的联合理解与生成。</p>"
                "<h3>2. 算力优化与效率革命</h3>"
                "<p>DeepSeek R1的发布标志着AI成本革命的到来。每百万输入标记成本仅0.55美元，相比OpenAI o1的15美元，成本降低了近30倍。</p>"
                "<h3>3. 伦理框架的初步建立</h3>"
                "<p>随着AI能力的快速提升，全球范围内对AI伦理和治理的讨论也日益深入。各国政府和国际组织开始制定AI治理框架。</p>"
                "<h2>二、产业变革：AI重塑全球经济格局</h2>"
                "<h3>1. 企业级AI应用爆发</h3>"
                "<p>ERP、CRM系统的AI化改造全面展开，供应链管理的智能优化成为标配，人力资源的AI辅助决策普及化。</p>"
                "<h3>2. 中小企业AI普惠</h3>"
                "<p>低成本AI解决方案大量涌现，即插即用的AI工具成为主流，SaaS化的AI服务降低使用门槛。</p>"
                "<h3>3. AI+政策推动</h3>"
                "<p>人工智能+首次被写入政府工作报告，具身智能、6G等前沿技术获得政策支持，从AI实验转向AI落地应用。</p>"
                "<h2>三、全球竞争格局</h2>"
                "<p>中美AI竞争格局重塑，技术领先权的激烈争夺。DeepSeek现象引发全球技术重估和模式反思，高性价比模型的中国方案成为国际标准。</p>"
            ),
            "excerpt": "2025年上半年AI领域实现三大技术突破与四大产业变革，涵盖多模态融合、算力优化、伦理框架等核心领域，重塑全球科技与经济格局。",
            "thumbnail": "https://picsum.photos/400/300?random=205",
            "tag": "AI里程碑",
            "views": 7600,
            "likes": 52,
            "favorites": 29,
        },
    ]

    for a in articles:
        article = Article(
            title=a["title"],
            content=a["content"],
            author="小白a",
            user_id=user.id,
            date=date.today(),
            excerpt=a["excerpt"],
            thumbnail=a["thumbnail"],
            tag=a["tag"],
            views=a["views"],
            likes=a["likes"],
            favorites=a["favorites"],
            status="public",
        )
        db.session.add(article)

    db.session.commit()
    print(f"Successfully added {len(articles)} articles for user 小白a")


@app.cli.command("create-user")
def create_user_cli():
    username = "123123"
    password = "123123"
    if User.query.filter_by(username=username).first():
        print("用户已存在")
        return
    hashed_password = generate_password_hash(password)
    new_user = User(username=username, password=hashed_password)
    db.session.add(new_user)
    db.session.commit()
    print("用户创建成功")



@app.cli.command("create-admin")
def create_admin_cli():
    username = input("管理员用户名: ").strip()
    password = input("管理员密码: ").strip()
    if not username or not password:
        print("用户名和密码不能为空")
        return
    if len(password) < 6:
        print("密码至少6位")
        return

    user = User.query.filter_by(username=username).first()
    if user:
        user.password = generate_password_hash(password)
        user.is_admin = True
        user.is_active = True
        db.session.commit()
        print(f"已将用户 {username} 设为管理员")
        return

    new_user = User(
        username=username,
        password=generate_password_hash(password),
        is_admin=True,
        is_active=True,
    )
    db.session.add(new_user)
    db.session.commit()
    print(f"管理员 {username} 创建成功")
# ==================== Main ====================
if __name__ == "__main__":
    app.run(debug=True)
















