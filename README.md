# Blog Monorepo

当前项目按前后端分离组织，**以这两个目录为准**：

- `backend/`：Flask API 服务
- `frontend/`：Vue 3 + Vite 前端

## 项目结构（当前生效）

```text
blog/
├─ backend/
│  ├─ app.py
│  ├─ models.py
│  ├─ routes/
│  ├─ services/
│  ├─ config/
│  ├─ instance/
│  ├─ uploads/
│  └─ requirements.txt
├─ frontend/
│  ├─ src/
│  ├─ public/static/
│  ├─ package.json
│  └─ vite.config.js
└─ README.md
```

## 本地开发

### 1) 启动后端

```bash
cd backend
pip install -r requirements.txt
# 首次请先复制环境变量模板
# Windows: copy .env.example .env
# macOS/Linux: cp .env.example .env
flask --app app run
```

后端默认地址：`http://127.0.0.1:5000`

### 后端环境变量（.env）

后端现在使用 `.env` 管理配置，启动前请在 `backend/` 下创建 `.env` 文件（可由 `.env.example` 复制）。

必填：

- `SECRET_KEY`
- `SQLALCHEMY_DATABASE_URI`

AI 写作功能必填：

- `AI_API_KEY`
- `AI_API_URL`
- `AI_MODEL`
- `AI_API_FORMAT`：`chat_completions` / `dashscope_generation`

AI 生图功能（可选，编辑页封面“AI生图”按钮）：

- `AI_IMAGE_MODEL`（必填，使用生图功能时）
- `AI_IMAGE_API_KEY`（可选，默认复用 `AI_API_KEY`）
- `AI_IMAGE_API_URL`（可选，默认复用 `AI_API_URL`，并自动推导到 `/images/generations`）
- `AI_IMAGE_SIZE`（可选，默认 `1024x1024`）
- `AI_IMAGE_API_FORMAT`（可选，支持 `openai_images` / `dashscope_image_async` / `dashscope_multimodal`）

独立后台登录（可选）：

- `ADMIN_USERNAME`
- `ADMIN_PASSWORD`

配置后管理员通过 `http://localhost:5173/admin-login` 登录；普通 `/login` 不允许管理员账号登录。

七牛云（按需填写）：

- `UPLOAD_BACKEND`：`auto` / `local` / `qiniu`
- `QINIU_ACCESS_KEY`
- `QINIU_SECRET_KEY`
- `QINIU_BUCKET`
- `QINIU_DOMAIN`

### 2) 启动前端

```bash
cd frontend
npm install
npm run dev
```

前端默认地址：`http://127.0.0.1:5173`

### 一键启动（Windows PowerShell）

在项目根目录执行：

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\start-dev.ps1
```

停止前后端：

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\stop-dev.ps1
```

## 前端代理配置

Vite 已配置：

- `/api` -> `http://127.0.0.1:5000`
- `/uploads` -> `http://127.0.0.1:5000`

## 迁移说明

- 原 HTML/CSS/JS 静态页面已迁到 `frontend/public/static/`，用于过渡。
- 根目录仍可见的旧 `app.py / routes / static` 等属于历史遗留副本，后续将统一清理。
- 后端详细说明见 `backend/README.md`。
