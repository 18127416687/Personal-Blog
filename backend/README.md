# Backend (Flask API)

`backend/` 是当前后端主目录，提供博客业务 API。

## 技术栈

- Python 3.10+
- Flask
- Flask-SQLAlchemy
- Flask-Login
- Flask-CORS
- SQLite（默认）

## 目录结构

```text
backend/
├─ app.py
├─ models.py
├─ routes/
│  ├─ auth.py
│  ├─ articles.py
│  ├─ comments.py
│  ├─ bullets.py
│  └─ media.py
├─ services/
├─ config/
├─ instance/
├─ uploads/
└─ requirements.txt
```

## 安装与运行

```bash
cd backend
pip install -r requirements.txt
# 首次启动先创建 .env
# Windows: copy .env.example .env
# macOS/Linux: cp .env.example .env
flask --app app run
```

默认地址：`http://127.0.0.1:5000`

## 常用命令

```bash
flask --app app initdb
flask --app app checkdb
flask --app app add-ai-articles
flask --app app create-user
```

## 环境变量

后端配置统一从 `.env` 读取（优先 `backend/.env`，其次项目根 `.env`）。

必填：

- `SECRET_KEY`
- `SQLALCHEMY_DATABASE_URI`

AI 写作功能必填：

- `AI_API_KEY`
- `AI_API_URL`
- `AI_MODEL`
- `AI_API_FORMAT`：`chat_completions` / `dashscope_generation`

AI 生图功能（可选）：

- `AI_IMAGE_MODEL`（启用生图时必填）
- `AI_IMAGE_API_KEY`（可选，默认复用 `AI_API_KEY`）
- `AI_IMAGE_API_URL`（可选，默认复用 `AI_API_URL`，后端会自动转成 `/images/generations`）
- `AI_IMAGE_SIZE`（可选，默认 `1024x1024`）
- `AI_IMAGE_API_FORMAT`（可选，支持 `openai_images` / `dashscope_image_async` / `dashscope_multimodal`）

独立后台登录（可选）：

- `ADMIN_USERNAME`
- `ADMIN_PASSWORD`

配置后可使用 `http://localhost:5173/admin-login` 独立登录后台；普通 `/login` 不允许管理员账号登录。

七牛云（按需）：

- `UPLOAD_BACKEND`：`auto` / `local` / `qiniu`
- `QINIU_ACCESS_KEY`
- `QINIU_SECRET_KEY`
- `QINIU_BUCKET`
- `QINIU_DOMAIN`

建议从模板复制并编辑：

```bash
# Windows
copy .env.example .env

# macOS/Linux
cp .env.example .env
```

## 说明

- 当前后端以 API 为主，前端页面由 `frontend/` 承载。
- `/uploads/*` 仍由后端提供静态资源访问。
