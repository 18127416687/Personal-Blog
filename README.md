# 静泊小筑后端项目

基于 Flask 的 RESTful API 后端，支持用户认证、文章管理、评论、相册和弹幕功能。

## 项目结构

```
project/
├── app.py                 # 主应用（所有路由、CLI命令、配置）
├── models.py              # 数据库模型
├── requirements.txt       # 依赖清单
├── uploads/               # 用户上传图片存储目录
├── static/                # 前端静态文件
│   ├── index.html         # 首页
│   ├── css/style.css      # 样式文件
│   └── js/script.js       # 前端交互逻辑
└── README.md              # 项目说明
```

## 技术栈

- Python 3.8+
- Flask (Web 框架)
- SQLite (开发环境数据库)
- Flask-SQLAlchemy (ORM)
- Flask-Login (用户认证)
- Flask-CORS (跨域支持)
- Werkzeug (密码加密和文件上传)

## 安装依赖

```bash
pip install -r requirements.txt
```

## 初始化数据库

```bash
flask --app app initdb
```

此命令会创建数据库表并插入示例文章数据。

## CLI 命令

| 命令 | 说明 |
|------|------|
| `flask --app app initdb` | 初始化数据库并插入示例文章 |
| `flask --app app checkdb` | 检查数据库表是否存在 |
| `flask --app app add-ai-articles` | 为用户「小白a」批量添加 AI 相关文章 |
| `flask --app app create-user` | 创建测试用户（123123/123123） |

## 运行项目

```bash
flask --app app run
```

项目将在 `http://localhost:5000` 运行。

## API 端点

### 认证相关

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| POST | `/api/register` | 用户注册（支持邮箱、手机号） | 公开 |
| POST | `/api/login` | 用户登录 | 公开 |
| POST | `/api/logout` | 用户注销 | 登录 |
| POST | `/api/reset_password` | 重置密码 | 公开 |
| GET | `/api/current_user` | 获取当前登录用户信息 | 公开 |

### 用户资料

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| GET | `/api/user/profile` | 获取用户资料 | 登录 |
| PUT | `/api/user/profile` | 更新用户资料（昵称、简介、邮箱、手机） | 登录 |
| POST | `/api/user/avatar` | 上传头像 | 登录 |
| PUT | `/api/user/password` | 修改密码 | 登录 |
| PUT | `/api/user/username` | 修改用户名 | 登录 |
| GET | `/api/user/likes` | 获取我点赞的文章 | 登录 |
| GET | `/api/user/favorites` | 获取我收藏的文章 | 登录 |

### 文章（公开）

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| GET | `/api/articles` | 获取所有公开文章 | 公开 |
| GET | `/api/articles/<id>` | 获取单篇文章详情 | 公开/登录 |
| POST | `/api/articles/<id>/like` | 文章点赞/取消 | 登录 |
| POST | `/api/articles/<id>/favorite` | 文章收藏/取消 | 登录 |

### 文章（用户管理）

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| GET | `/api/user/articles` | 获取我的文章列表 | 登录 |
| POST | `/api/user/articles` | 创建文章（支持定时发布） | 登录 |
| PUT | `/api/user/articles/<id>` | 更新文章 | 登录（作者） |
| DELETE | `/api/user/articles/<id>` | 删除文章 | 登录（作者） |
| POST | `/api/user/articles/<id>/image` | 上传文章内图片 | 登录（作者） |

### 评论

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| GET | `/api/articles/<id>/comments` | 获取文章评论（含回复） | 公开 |
| POST | `/api/articles/<id>/comments` | 发表评论/回复 | 登录 |
| POST | `/api/comments/<id>/like` | 评论点赞/取消 | 登录 |
| DELETE | `/api/comments/<id>` | 删除评论 | 登录（作者） |

### 弹幕

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| GET | `/api/bullets` | 获取最近 50 条弹幕 | 公开 |
| POST | `/api/bullets` | 发送弹幕 | 登录 |

### 相册

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| GET | `/api/photos` | 获取所有图片 | 公开 |
| POST | `/api/photos` | 上传图片 | 登录 |

## 数据模型

- **User** - 用户（用户名、密码、昵称、头像、简介、邮箱、手机）
- **Article** - 文章（标题、内容、摘要、缩略图、标签、状态、定时发布）
- **Comment** - 评论（支持嵌套回复）
- **ArticleLike** - 文章点赞记录
- **ArticleFavorite** - 文章收藏记录
- **CommentLike** - 评论点赞记录
- **Bullet** - 弹幕
- **Photo** - 相册图片

## 注意事项

1. 开发环境下允许所有跨域请求
2. 文件上传限制为 5MB，仅允许 png/jpg/jpeg/gif 格式
3. 密码使用 Werkzeug 的 `generate_password_hash` 加密存储
4. 弹幕采用短轮询实现，前端每 5 秒刷新一次
5. 评论和弹幕包含敏感词过滤
6. 文章支持三种状态：公开（public）、私有（private）、定时发布（scheduled）
7. 定时发布任务每 60 秒自动检查一次

## 生产环境配置

- 可将数据库配置为 MySQL 或 PostgreSQL
- 配置 CORS 为特定域名
- 设置 `SECRET_KEY` 为安全的随机字符串
- 考虑使用 Gunicorn 等 WSGI 服务器运行应用
- 建议启用 HTTPS
