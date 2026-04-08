# ==================== Imports ====================
import os
import re
from datetime import datetime, date
from collections import defaultdict
import threading

from flask import Flask, request, jsonify, send_from_directory, session
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
from werkzeug.utils import secure_filename
from werkzeug.security import generate_password_hash, check_password_hash

from models import (
    db,
    User,
    Article,
    Bullet,
    Photo,
    Comment,
    ArticleLike,
    ArticleFavorite,
    CommentLike,
)


def to_utc_iso(dt):
    if dt is None:
        return None
    return dt.isoformat() + "Z"


# ==================== App & Extensions ====================
app = Flask(__name__)
app.config["SECRET_KEY"] = "your-secret-key"
app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///blog.db"
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
app.config["UPLOAD_FOLDER"] = os.path.join(
    os.path.dirname(os.path.abspath(__file__)), "uploads"
)
app.config["MAX_CONTENT_LENGTH"] = 100 * 1024 * 1024

ALLOWED_EXTENSIONS = {
    "png",
    "jpg",
    "jpeg",
    "gif",
    "webp",
    "mp4",
    "mov",
    "webm",
    "avi",
    "mkv",
}

# Separate extensions for images and videos used by editor uploads
IMAGE_EXTENSIONS = {"png", "jpg", "jpeg", "gif", "webp"}
VIDEO_EXTENSIONS = {"mp4", "mov", "webm", "avi", "mkv"}

# Ensure upload folder exists
try:
    os.makedirs(app.config["UPLOAD_FOLDER"], exist_ok=True)
except Exception:
    pass

db.init_app(app)

login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = "login"

CORS(app, supports_credentials=True)


# ==================== Flask-Login ====================
class UserLogin(UserMixin):
    def __init__(self, user):
        self.id = user.id
        self.username = user.username


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
def allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in IMAGE_EXTENSIONS


def is_image_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in IMAGE_EXTENSIONS


def is_video_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in VIDEO_EXTENSIONS


def _is_valid_email(email):
    if not email:
        return False
    return (
        re.fullmatch(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}", email)
        is not None
    )


def _is_valid_phone(phone):
    if not phone:
        return False
    return re.fullmatch(r"1[3-9]\d{9}", phone) is not None


_BANNED_WORDS = [
    "傻逼",
    "煞笔",
    "垃圾",
    "妈的",
    "你妈",
    "他妈",
    "去死",
    "死全家",
    "操你",
    "fuck",
    "shit",
    "nmsl",
    "sb",
]


def _filter_banned_words(text):
    if not text:
        return text
    filtered = text
    for w in _BANNED_WORDS:
        if not w:
            continue
        filtered = re.sub(re.escape(w), "*" * len(w), filtered, flags=re.IGNORECASE)
    return filtered


_view_count_lock = threading.Lock()
_view_counts = defaultdict(list)


def _can_increment_view(article_id, ip_address):
    now = datetime.utcnow()
    key = f"{article_id}:{ip_address}"
    _view_count_lock.acquire()
    try:
        recent_views = _view_counts[article_id]
        recent_views = [t for t in recent_views if (now - t).total_seconds() < 3600]
        if len(recent_views) >= 10:
            return False
        recent_views.append(now)
        _view_counts[article_id] = recent_views
        return True
    finally:
        _view_count_lock.release()


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


# ==================== Request Hooks ====================
@app.before_request
def _before_any_request():
    if not getattr(app, "_columns_checked", False):
        _ensure_db_columns()
        setattr(app, "_columns_checked", True)


def _publish_scheduled():
    now = datetime.utcnow()
    articles = Article.query.filter(
        Article.status == "scheduled", Article.scheduled_at <= now
    ).all()
    for a in articles:
        a.status = "public"
    if articles:
        db.session.commit()


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


# ==================== Auth Routes ====================
@app.route("/api/register", methods=["POST"])
def register():
    data = request.get_json()
    username = (data.get("username") or "").strip()
    password = data.get("password") or ""
    email = (data.get("email") or "").strip()
    phone = (data.get("phone") or "").strip()

    if not username or not password:
        return jsonify({"error": "用户名和密码不能为空"}), 400
    if len(username) < 3 or len(username) > 80:
        return jsonify({"error": "用户名长度需在3-80之间"}), 400
    if len(password) < 6:
        return jsonify({"error": "密码至少6位"}), 400
    if email and not _is_valid_email(email):
        return jsonify({"error": "邮箱格式不正确"}), 400
    if phone and not _is_valid_phone(phone):
        return jsonify({"error": "手机号格式不正确"}), 400
    if User.query.filter_by(username=username).first():
        return jsonify({"error": "用户名已存在"}), 400
    if email and User.query.filter_by(email=email).first():
        return jsonify({"error": "邮箱已被使用"}), 400
    if phone and User.query.filter_by(phone=phone).first():
        return jsonify({"error": "手机号已被使用"}), 400

    hashed_password = generate_password_hash(password)
    new_user = User(
        username=username,
        password=hashed_password,
        email=email or None,
        phone=phone or None,
    )
    db.session.add(new_user)
    db.session.commit()
    return jsonify({"message": "注册成功"})


@app.route("/api/reset_password", methods=["POST"])
def reset_password():
    data = request.get_json() or {}
    username = (data.get("username") or "").strip()
    email = (data.get("email") or "").strip()
    phone = (data.get("phone") or "").strip()
    new_password = data.get("new_password") or ""

    if not username:
        return jsonify({"error": "请输入用户名"}), 400
    if len(new_password) < 6:
        return jsonify({"error": "新密码至少6位"}), 400
    if not email and not phone:
        return jsonify({"error": "请提供邮箱或手机号用于核验"}), 400
    if email and not _is_valid_email(email):
        return jsonify({"error": "邮箱格式不正确"}), 400
    if phone and not _is_valid_phone(phone):
        return jsonify({"error": "手机号格式不正确"}), 400

    user = User.query.filter_by(username=username).first()
    if not user:
        return jsonify({"error": "用户不存在"}), 404
    if email and user.email != email:
        return jsonify({"error": "邮箱不匹配"}), 400
    if phone and user.phone != phone:
        return jsonify({"error": "手机号不匹配"}), 400

    user.password = generate_password_hash(new_password)
    db.session.commit()
    return jsonify({"message": "密码已重置，请重新登录"})


@app.route("/api/login", methods=["POST"])
def login():
    data = request.get_json()
    username = data.get("username")
    password = data.get("password")
    user = User.query.filter_by(username=username).first()
    if not user or not check_password_hash(user.password, password):
        return jsonify({"error": "用户名或密码错误"}), 401
    login_user(UserLogin(user))
    return jsonify({"message": "登录成功", "username": username})


@app.route("/api/logout", methods=["POST"])
@login_required
def logout():
    logout_user()
    return jsonify({"message": "注销成功"})


@app.route("/api/current_user", methods=["GET"])
def get_current_user():
    if current_user.is_authenticated:
        user = User.query.get(current_user.id)
        return jsonify(
            {
                "id": current_user.id,
                "username": current_user.username,
                "nickname": user.nickname if user else None,
                "avatar": user.avatar if user else None,
                "bio": user.bio if user else None,
            }
        )
    return jsonify({"username": None})


# ==================== User Profile Routes ====================
@app.route("/api/user/profile", methods=["GET"])
@login_required
def get_profile():
    user = User.query.get(current_user.id)
    if not user:
        return jsonify({"error": "用户不存在"}), 404
    return jsonify(
        {
            "id": user.id,
            "username": user.username,
            "nickname": user.nickname,
            "avatar": user.avatar,
            "bio": user.bio,
            "email": user.email,
            "phone": user.phone,
            "created_at": to_utc_iso(user.created_at),
        }
    )


@app.route("/api/user/profile", methods=["PUT"])
@login_required
def update_profile():
    user = User.query.get(current_user.id)
    if not user:
        return jsonify({"error": "用户不存在"}), 404
    data = request.get_json()

    nickname = data.get("nickname")
    if nickname is not None:
        nickname = nickname.strip()
        if len(nickname) > 80:
            return jsonify({"error": "昵称过长"}), 400
        user.nickname = nickname if nickname else None

    bio = data.get("bio")
    if bio is not None:
        user.bio = bio.strip() if bio.strip() else None

    email = data.get("email")
    if email is not None:
        email = email.strip()
        if email and not _is_valid_email(email):
            return jsonify({"error": "邮箱格式不正确"}), 400
        if email and User.query.filter(User.email == email, User.id != user.id).first():
            return jsonify({"error": "邮箱已被使用"}), 400
        user.email = email if email else None

    phone = data.get("phone")
    if phone is not None:
        phone = phone.strip()
        if phone and not _is_valid_phone(phone):
            return jsonify({"error": "手机号格式不正确"}), 400
        if phone and User.query.filter(User.phone == phone, User.id != user.id).first():
            return jsonify({"error": "手机号已被使用"}), 400
        user.phone = phone if phone else None

    db.session.commit()
    return jsonify({"message": "资料已更新"})


@app.route("/api/user/avatar", methods=["POST"])
@login_required
def upload_avatar():
    if "file" not in request.files:
        return jsonify({"error": "没有上传文件"}), 400
    file = request.files["file"]
    if file.filename == "":
        return jsonify({"error": "没有选择文件"}), 400
    if file and allowed_file(file.filename):
        filename = secure_filename(f"avatar_{current_user.id}_{file.filename}")
        filepath = os.path.join(app.config["UPLOAD_FOLDER"], filename)
        file.save(filepath)
        avatar_url = f"/uploads/{filename}"
        user = User.query.get(current_user.id)
        user.avatar = avatar_url
        db.session.commit()
        return jsonify({"url": avatar_url})
    return jsonify({"error": "只允许上传图片文件"}), 400


@app.route("/api/user/password", methods=["PUT"])
@login_required
def change_password():
    data = request.get_json()
    old_password = data.get("old_password") or ""
    new_password = data.get("new_password") or ""
    if not old_password or not new_password:
        return jsonify({"error": "请填写旧密码和新密码"}), 400
    if len(new_password) < 6:
        return jsonify({"error": "新密码至少6位"}), 400
    user = User.query.get(current_user.id)
    if not check_password_hash(user.password, old_password):
        return jsonify({"error": "旧密码不正确"}), 400
    user.password = generate_password_hash(new_password)
    db.session.commit()
    return jsonify({"message": "密码已修改"})


@app.route("/api/user/username", methods=["PUT"])
@login_required
def change_username():
    data = request.get_json()
    new_username = (data.get("username") or "").strip()
    if not new_username or len(new_username) < 3 or len(new_username) > 80:
        return jsonify({"error": "用户名长度需在3-80之间"}), 400
    if User.query.filter(
        User.username == new_username, User.id != current_user.id
    ).first():
        return jsonify({"error": "用户名已存在"}), 400
    user = User.query.get(current_user.id)
    user.username = new_username
    db.session.commit()
    return jsonify({"message": "用户名已修改"})


@app.route("/api/user/likes", methods=["GET"])
@login_required
def get_my_likes():
    likes = (
        ArticleLike.query.filter_by(user_id=current_user.id)
        .order_by(ArticleLike.created_at.desc())
        .all()
    )
    result = []
    for l in likes:
        a = Article.query.get(l.article_id)
        if a:
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
                    "status": a.status,
                    "liked_at": to_utc_iso(l.created_at),
                }
            )
    return jsonify(result)


@app.route("/api/user/favorites", methods=["GET"])
@login_required
def get_my_favorites():
    favs = (
        ArticleFavorite.query.filter_by(user_id=current_user.id)
        .order_by(ArticleFavorite.created_at.desc())
        .all()
    )
    result = []
    for f in favs:
        a = Article.query.get(f.article_id)
        if a:
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
                    "status": a.status,
                    "favorited_at": to_utc_iso(f.created_at),
                }
            )
    return jsonify(result)


# ==================== Article Public Routes ====================
@app.route("/api/tags/popular", methods=["GET"])
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


@app.route("/api/weibo/hot", methods=["GET"])
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


@app.route("/api/articles", methods=["GET"])
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


@app.route("/api/articles/<int:id>", methods=["GET"])
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

    if not _can_increment_view(id, ip_address):
        pass
    else:
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


@app.route("/api/articles/<int:id>/like", methods=["POST"])
@login_required
def like_article(id):
    article = Article.query.get(id)
    if not article:
        return jsonify({"error": "文章不存在"}), 404

    existing = ArticleLike.query.filter_by(
        user_id=current_user.id, article_id=id
    ).first()
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


@app.route("/api/articles/<int:id>/favorite", methods=["POST"])
@login_required
def favorite_article(id):
    article = Article.query.get(id)
    if not article:
        return jsonify({"error": "文章不存在"}), 404

    existing = ArticleFavorite.query.filter_by(
        user_id=current_user.id, article_id=id
    ).first()
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


# ==================== Article User CRUD Routes ====================
@app.route("/api/user/articles", methods=["GET"])
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


@app.route("/api/user/articles", methods=["POST"])
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


@app.route("/api/user/articles/<int:id>", methods=["PUT"])
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


@app.route("/api/user/articles/<int:id>", methods=["DELETE"])
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


@app.route("/api/user/articles/<int:id>/image", methods=["POST"])
@login_required
def upload_article_image(id):
    article = Article.query.get(id)
    if not article or article.user_id != current_user.id:
        return jsonify({"error": "无权操作"}), 403
    if "file" not in request.files:
        return jsonify({"error": "没有上传文件"}), 400
    file = request.files["file"]
    if file.filename == "":
        return jsonify({"error": "没有选择文件"}), 400
    if file and allowed_file(file.filename):
        filename = secure_filename(f"article_{id}_{file.filename}")
        filepath = os.path.join(app.config["UPLOAD_FOLDER"], filename)
        file.save(filepath)
        url = f"/uploads/{filename}"
        return jsonify({"url": url})
    return jsonify({"error": "只允许上传图片文件"}), 400


@app.route("/api/upload-editor-image", methods=["POST"])
@login_required
def upload_editor_image():
    if "file" not in request.files:
        return jsonify({"errno": 1, "message": "没有上传文件"}), 400
    file = request.files["file"]
    if file.filename == "":
        return jsonify({"errno": 1, "message": "没有选择文件"}), 400
    if file and is_image_file(file.filename):
        import time

        filename = secure_filename(f"editor_{int(time.time())}_{file.filename}")
        filepath = os.path.join(app.config["UPLOAD_FOLDER"], filename)
        file.save(filepath)
        url = f"/uploads/{filename}"
        return jsonify({"errno": 0, "data": [{"url": url}]})
    return jsonify({"errno": 1, "message": "只允许上传图片文件"}), 400


@app.route("/api/upload-editor-video", methods=["POST"])
@login_required
def upload_editor_video():
    if "file" not in request.files:
        return jsonify({"errno": 1, "message": "没有上传文件"}), 400
    file = request.files["file"]
    if file.filename == "":
        return jsonify({"errno": 1, "message": "没有选择文件"}), 400
    if file and is_video_file(file.filename):
        import time

        filename = secure_filename(f"video_{int(time.time())}_{file.filename}")
        filepath = os.path.join(app.config["UPLOAD_FOLDER"], filename)
        file.save(filepath)
        url = f"/uploads/{filename}"
        return jsonify({"errno": 0, "data": [{"url": url}]})
    return jsonify({"errno": 1, "message": "只允许上传视频文件"}), 400


# ==================== Comment Routes ====================
@app.route("/api/articles/<int:id>/comments", methods=["GET"])
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
                    "user_nickname": r.user.nickname
                    if r.user.nickname
                    else r.user.username,
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
                "user_nickname": c.user.nickname
                if c.user.nickname
                else c.user.username,
                "user_avatar": c.user.avatar,
                "likes": c.likes,
                "created_at": to_utc_iso(c.created_at),
                "replies": reply_list,
            }
        )
    return jsonify(result)


@app.route("/api/articles/<int:id>/comments", methods=["POST"])
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


@app.route("/api/comments/<int:id>/like", methods=["POST"])
@login_required
def like_comment(id):
    comment = Comment.query.get(id)
    if not comment:
        return jsonify({"error": "评论不存在"}), 404

    existing = CommentLike.query.filter_by(
        user_id=current_user.id, comment_id=id
    ).first()
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


@app.route("/api/comments/<int:id>", methods=["DELETE"])
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


# ==================== Bullet Routes ====================
@app.route("/api/bullets", methods=["GET"])
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


@app.route("/api/bullets", methods=["POST"])
@login_required
def create_bullet():
    data = request.get_json()
    content = data.get("content")
    if not content or len(content) > 100:
        return jsonify({"error": "弹幕内容不能为空且长度不能超过100字符"}), 400
    content = _filter_banned_words(content.strip())
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


# ==================== Photo Routes ====================
@app.route("/api/photos", methods=["GET"])
def get_photos():
    photos = Photo.query.order_by(Photo.uploaded_at.desc()).all()
    return jsonify([{"url": p.url} for p in photos])


@app.route("/api/photos", methods=["POST"])
@login_required
def upload_photo():
    if "file" not in request.files:
        return jsonify({"error": "没有上传文件"}), 400
    file = request.files["file"]
    if file.filename == "":
        return jsonify({"error": "没有选择文件"}), 400
    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        filepath = os.path.join(app.config["UPLOAD_FOLDER"], filename)
        file.save(filepath)
        photo_url = f"/uploads/{filename}"
        new_photo = Photo(url=photo_url, uploader_id=current_user.id)
        db.session.add(new_photo)
        db.session.commit()
        return jsonify({"url": photo_url})
    return jsonify({"error": "只允许上传图片文件"}), 400


@app.route("/api/photos/delete", methods=["POST"])
@login_required
def delete_photo():
    data = request.get_json()
    url = (data.get("url") or "").strip()
    if not url:
        return jsonify({"error": "缺少图片URL"}), 400

    photo = Photo.query.filter_by(url=url, uploader_id=current_user.id).first()
    if not photo:
        return jsonify({"error": "图片不存在或无权删除"}), 404

    filename = url.split("/")[-1]
    filepath = os.path.join(app.config["UPLOAD_FOLDER"], filename)
    if os.path.exists(filepath):
        os.remove(filepath)

    db.session.delete(photo)
    db.session.commit()
    return jsonify({"message": "图片已删除"})


# ==================== Static & Page Routes ====================
@app.route("/uploads/<filename>")
def uploaded_file(filename):
    return send_from_directory(app.config["UPLOAD_FOLDER"], filename)


@app.route("/static/<path:path>")
def serve_static(path):
    return send_from_directory("static", path)


@app.route("/")
def index():
    return send_from_directory("static", "index.html")


@app.route("/index.html")
def index_html():
    return send_from_directory("static", "index.html")


@app.route("/articles.html")
def articles_page():
    return send_from_directory("static", "articles.html")


@app.route("/gallery.html")
def gallery():
    return send_from_directory("static", "gallery.html")


@app.route("/treehole.html")
def treehole():
    return send_from_directory("static", "treehole.html")


@app.route("/login.html")
def login_page():
    return send_from_directory("static", "login.html")


@app.route("/profile.html")
def profile_page():
    return send_from_directory("static", "profile.html")


@app.route("/my-interactions.html")
def my_interactions_page():
    return send_from_directory("static", "my-interactions.html")


@app.route("/editor.html")
def editor_page():
    return send_from_directory("static", "editor.html")


@app.route("/editor.html/<int:id>")
def editor_page_edit(id):
    return send_from_directory("static", "editor.html")


@app.route("/my-articles.html")
def my_articles_page():
    return send_from_directory("static", "my-articles.html")


@app.route("/my-drafts.html")
def my_drafts_page():
    return send_from_directory("static", "my-drafts.html")


@app.route("/my-photos.html")
def my_photos_page():
    return send_from_directory("static", "my-photos.html")


@app.route("/article/<int:id>")
def article_detail(id):
    return send_from_directory("static", "article-detail.html")


@app.route("/article-detail.html")
def article_detail_redirect():
    return send_from_directory("static", "article-detail.html")


# ==================== Main ====================
if __name__ == "__main__":
    app.run(debug=True)
