# -*- coding: utf-8 -*-
"""
添加"文章分享机器人"用户和2026年热门AI文章
主题：Claude Code、MCP、Skills、Codex
"""

import sys
import io

if sys.platform == "win32":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

from app import app
from models import db, User, Article
from datetime import date
from werkzeug.security import generate_password_hash

with app.app_context():
    # ========== 创建用户 ==========
    username = "文章分享机器人"
    password = "adminadmin"

    user = User.query.filter_by(username=username).first()
    if not user:
        hashed_password = generate_password_hash(password)
        user = User(
            username=username,
            password=hashed_password,
            nickname="文章分享机器人",
            bio="专注分享最新AI技术动态：Claude Code、MCP、Skills、Codex等前沿资讯",
        )
        db.session.add(user)
        db.session.commit()
        print(f"[OK] 用户创建成功: {username} (id={user.id})")
    else:
        print(f"[INFO] 用户已存在: {username} (id={user.id})")

    # ========== 2026年最新文章 ==========
    articles = [
        {
            "title": "Claude Code 2026全面解析：Channels、Remote Control与Agent Teams如何改变编程",
            "content": (
                "<h2>一、Claude Code：从终端工具到AI编程平台</h2>"
                "<p>2026年，Anthropic的Claude Code已经从最初的命令行编程助手，进化为一个完整的AI编程平台。截至2026年3月，Claude Code已经发布了v2.1.69版本，这是2.1.x系列中最大的单次更新，包含超过100项改动。</p>"
                "<h2>二、Channels：用Telegram或Discord远程操控Claude Code</h2>"
                "<p>Channels是Claude Code 2026年最令人兴奋的功能之一。它允许你通过Telegram或Discord与正在运行的Claude Code会话进行消息交互，不再需要第三方工具。这意味着你可以在终端启动一个编程任务，然后在手机上通过Telegram继续与它对话、查看进度、下达新指令。</p>"
                "<h3>Channels的核心优势</h3>"
                "<ul><li>原生集成：无需额外配置，Claude Code内置支持</li><li>多平台：支持Telegram和Discord两大主流通讯平台</li><li>实时交互：与运行中的会话双向通信</li><li>任务追踪：随时查看任务执行状态和输出</li></ul>"
                "<h2>三、Remote Control & Dispatch：随时随地编程</h2>"
                "<p>Remote Control功能让你可以在终端启动任务后，从手机或其他设备继续操作。Dispatch则进一步扩展了这一概念——你可以将任务分发给远程的Claude Code实例，然后在任何地方监控和管理。</p>"
                "<p>这一组合彻底打破了编程的地理限制。你可以在通勤路上用手机审查Claude Code在服务器上完成的代码修改，或者在出差时远程启动新的开发任务。</p>"
                "<h2>四、Agent Teams：多智能体协作编程</h2>"
                "<p>随着Code Kit v5.0的发布，Claude Code引入了Agent Teams功能。这允许多个Claude Code实例协同工作，每个实例负责不同的子任务。例如，一个Agent负责前端开发，另一个负责后端API，第三个负责测试编写——它们可以并行工作并在需要时协调。</p>"
                "<h2>五、2026年3月更新亮点</h2>"
                "<p>仅在2026年3月，Claude Code就跳跃了约10个版本号，更新频率惊人。主要更新包括：</p>"
                "<ul><li>安全性大幅增强：新的权限模型和沙箱机制</li><li>性能优化：更快的代码分析和生成速度</li><li>更好的多语言支持：对Python、JavaScript、TypeScript、Rust等语言的理解深度提升</li><li>上下文窗口扩展：能够处理更大的代码库</li><li>Breaking changes修复：确保向后兼容性</li></ul>"
                "<h2>六、OpenClaw时代的终结</h2>"
                "<p>2026年，Claude Code正式结束了OpenClaw时代，全面转向Anthropic官方维护的架构。这意味着更稳定的更新节奏、更好的官方支持和更深入的系统集成。</p>"
                "<h2>七、与竞品对比</h2>"
                "<p>在2026年的AI编程工具市场中，Claude Code面临着GitHub Copilot、Cursor、OpenAI Codex等强劲对手。但Claude Code的独特优势在于：</p>"
                "<ul><li>深度代码理解：基于Claude 4系列模型，被公认为世界上最好的编程模型</li><li>长时间连续工作能力：可以连续数小时不间断地进行复杂编程任务</li><li>开源生态：活跃的社区和丰富的第三方工具</li><li>灵活的部署选项：本地运行和云端服务并存</li></ul>"
            ),
            "excerpt": "2026年Claude Code迎来重大升级：Channels让你用Telegram/Discord远程操控，Agent Teams实现多智能体协作编程，v2.1.69带来100+项改进。本文全面解读Claude Code如何从终端工具进化为AI编程平台。",
            "thumbnail": "https://picsum.photos/400/300?random=301",
            "tag": "Claude Code",
            "views": 35200,
            "likes": 287,
            "favorites": 156,
        },
        {
            "title": "MCP协议2026路线图解读：四大核心问题终于要解决了",
            "content": (
                "<h2>一、MCP一岁了：从工具连接到生产级协议</h2>"
                "<p>Model Context Protocol（MCP）在2026年3月9日迎来了它的一岁生日。作为Anthropic发起的开放协议，MCP已经从最初连接本地工具的简单方案，发展成为在生产环境中运行的成熟AI工具协议。</p>"
                "<h2>二、MCP 2026路线图：四大核心问题</h2>"
                "<h3>问题一：标准化与互操作性</h3>"
                "<p>过去MCP最大的痛点是不同实现之间的兼容性问题。2026年路线图明确提出要建立更严格的标准化测试套件，确保不同厂商的MCP Server和Client能够无缝协作。这意味着你不再需要担心某个MCP工具只能在特定AI平台下使用。</p>"
                "<h3>问题二：安全模型升级</h3>"
                "<p>随着MCP在生产环境中的广泛使用，安全问题日益突出。2026年的安全升级包括：</p>"
                "<ul><li>细粒度权限控制：工具级别的访问控制列表</li><li>运行时沙箱：限制MCP工具的执行范围</li><li>审计日志：完整的工具调用追踪</li><li>用户确认机制：敏感操作需要人工审批</li></ul>"
                "<h3>问题三：多Agent通信</h3>"
                "<p>MCP v2 Beta版本引入了对多Agent通信的原生支持。这意味着多个AI Agent可以通过MCP协议进行协调和协作，而不仅仅是AI与工具之间的单向调用。这是实现真正Agentic AI生态的关键基础设施。</p>"
                "<h3>问题四：性能与可扩展性</h3>"
                "<p>v1.27版本的发布展示了MCP生态的成熟度。性能优化包括：</p>"
                "<ul><li>流式响应支持：减少大工具调用的延迟</li><li>连接池管理：提高并发工具调用的效率</li><li>缓存机制：减少重复工具调用的开销</li><li>批量操作：一次请求处理多个工具调用</li></ul>"
                "<h2>三、MCP生态现状</h2>"
                "<p>截至2026年3月，MCP生态已经包含了数百个官方和社区维护的MCP Server，覆盖：</p>"
                "<ul><li>数据库：PostgreSQL、MongoDB、Redis等</li><li>API集成：GitHub、Slack、Google Workspace等</li><li>开发工具：Git、Docker、Kubernetes等</li><li>数据源：文件系统、Web搜索、API端点等</li></ul>"
                "<h2>四、MCP vs 其他协议</h2>"
                "<p>在AI工具协议领域，MCP面临着A2A（Agent-to-Agent）、OpenAPI等竞争。但MCP的独特优势在于：</p>"
                "<ul><li>开放标准：由社区驱动，不受单一厂商控制</li><li>广泛支持：已被Claude、ChatGPT、Gemini等主流AI平台采用</li><li>简单易用：基于JSON-RPC，开发者友好</li><li>可扩展性：支持stdio、HTTP、SSE等多种传输方式</li></ul>"
                "<h2>五、MCP的安全挑战</h2>"
                "<p>正如网络安全社区所指出的，MCP发展迅速，攻击者也在快速跟进。2026年需要重点关注的安全问题包括：</p>"
                "<ul><li>工具注入攻击：恶意MCP Server可能执行未授权操作</li><li>数据泄露：不当的权限配置可能导致敏感数据暴露</li><li>供应链风险：第三方MCP工具可能包含恶意代码</li></ul>"
                "<p>Anthropic和社区正在积极解决这些问题，2026路线图中的安全升级正是对此的回应。</p>"
            ),
            "excerpt": "MCP协议迎来一周年，2026路线图正式发布。本文将深度解读四大核心问题的解决方案：标准化、安全模型、多Agent通信和性能优化，以及MCP生态的最新发展。",
            "thumbnail": "https://picsum.photos/400/300?random=302",
            "tag": "MCP",
            "views": 28600,
            "likes": 234,
            "favorites": 128,
        },
        {
            "title": "Claude Code Skills完全指南：2026年最值得安装的12个技能",
            "content": (
                "<h2>一、什么是Claude Code Skills？</h2>"
                "<p>Skills（技能）是Claude Code 2026年推出的一个强大功能。简单来说，一个Skill就是一个<code>SKILL.md</code>文件，把它放到正确的文件夹中，Claude Code就能获得新的专业能力。这相当于给Claude Code安装\u201c插件\u201d，让它从通用编程助手变成特定领域的专家。</p>"
                "<h2>二、Skills的工作原理</h2>"
                "<p>Skills基于一个简单的理念：为Claude Code提供结构化的领域知识和最佳实践。每个Skill包含：</p>"
                "<ul><li>领域知识：特定框架、语言或工具的最佳实践</li><li>代码模板：常用的代码结构和模式</li><li>工作流指导：完成特定任务的步骤指南</li><li>工具配置：相关开发工具的设置建议</li></ul>"
                "<h2>三、2026年最值得安装的12个Skills</h2>"
                "<h3>1. React/Next.js 开发Skill</h3>"
                "<p>提供React 19和Next.js 15的最新最佳实践，包括Server Components、Server Actions、App Router等现代React开发模式。</p>"
                "<h3>2. Python 数据科学Skill</h3>"
                "<p>涵盖pandas、numpy、matplotlib、scikit-learn等数据科学工具的最新用法，包括2026年的新特性和性能优化技巧。</p>"
                "<h3>3. Rust 系统编程Skill</h3>"
                "<p>Rust 2026 Edition的完整指南，包括新的语法特性、异步编程模式和性能优化策略。</p>"
                "<h3>4. 数据库设计与优化Skill</h3>"
                "<p>PostgreSQL、MySQL、MongoDB的设计模式和查询优化，包括2026年各数据库的新特性。</p>"
                "<h3>5. DevOps & CI/CD Skill</h3>"
                "<p>Docker、Kubernetes、GitHub Actions的自动化部署最佳实践，帮助Claude Code生成生产级的部署配置。</p>"
                "<h3>6. API设计Skill</h3>"
                "<p>RESTful API和GraphQL的设计规范，包括OpenAPI 3.1、MCP Server开发等2026年热门主题。</p>"
                "<h3>7. 安全审计Skill</h3>"
                "<p>自动识别代码中的安全漏洞，提供OWASP Top 10防护建议和最新的安全最佳实践。</p>"
                "<h3>8. 测试驱动开发Skill</h3>"
                "<p>单元测试、集成测试、E2E测试的完整指南，支持pytest、Jest、Playwright等主流测试框架。</p>"
                "<h3>9. 前端性能优化Skill</h3>"
                "<p>Web Vitals优化、Bundle分析、懒加载策略、图片优化等前端性能提升技巧。</p>"
                "<h3>10. 机器学习工程Skill</h3>"
                "<p>从模型训练到部署的完整MLOps流程，包括2026年最新的模型压缩和边缘部署技术。</p>"
                "<h3>11. 文档编写Skill</h3>"
                "<p>自动生成高质量的技术文档，包括API文档、README、架构说明等。</p>"
                "<h3>12. 代码审查Skill</h3>"
                "<p>模拟资深工程师的代码审查流程，提供代码质量、可读性、可维护性等方面的专业反馈。</p>"
                "<h2>四、如何安装和使用Skills</h2>"
                "<p>安装Skill非常简单：</p>"
                "<pre><code># 1. 找到你想要的Skill\n# 2. 克隆到Skills目录\ngit clone https://github.com/example/skill-name ~/.claude/skills/\n# 3. 在Claude Code中自动加载</code></pre>"
                "<p>你也可以创建自定义Skill，只需编写一个<code>SKILL.md</code>文件，定义你希望Claude Code掌握的领域知识。</p>"
                "<h2>五、Skills vs MCP：如何选择？</h2>"
                "<p>Skills和MCP是互补的技术：</p>"
                "<ul><li><strong>Skills</strong>：为Claude Code提供知识和最佳实践，增强其理解和生成代码的能力</li><li><strong>MCP</strong>：让Claude Code连接外部工具和服务，扩展其执行能力</li></ul>"
                "<p>最佳实践是同时使用两者：用Skills提升代码质量，用MCP扩展工具生态。</p>"
            ),
            "excerpt": "Claude Code Skills是2026年最值得关注的AI编程增强功能。本文精选12个最实用的Skills，涵盖React、Python、Rust、数据库、DevOps等领域，让你的Claude Code生产力提升10倍。",
            "thumbnail": "https://picsum.photos/400/300?random=303",
            "tag": "Skills",
            "views": 22400,
            "likes": 198,
            "favorites": 112,
        },
        {
            "title": "OpenAI Codex 2026：从代码生成到完整软件开发平台",
            "content": (
                "<h2>一、Codex的进化之路</h2>"
                "<p>OpenAI Codex在2026年已经从一个代码生成模型进化为完整的软件开发平台。基于GPT-5架构，新一代Codex不仅能生成代码，还能理解整个软件开发生命周期，从需求分析到部署运维。</p>"
                "<h2>二、2026年Codex的核心能力</h2>"
                "<h3>1. 全栈项目生成</h3>"
                "<p>2026年的Codex可以接收一个自然语言描述，然后自动生成完整的全栈项目，包括：</p>"
                "<ul><li>前端：React/Vue/Angular组件、样式、路由</li><li>后端：API端点、数据库模型、业务逻辑</li><li>基础设施：Docker配置、CI/CD流水线、部署脚本</li><li>测试：单元测试、集成测试、E2E测试</li></ul>"
                "<h3>2. 代码理解与重构</h3>"
                "<p>Codex现在能够深入理解现有代码库，提供：</p>"
                "<ul><li>架构分析：识别设计模式和潜在问题</li><li>重构建议：自动化的代码改进方案</li><li>技术债务评估：量化代码库的健康度</li><li>迁移指南：框架升级和版本迁移的完整步骤</li></ul>"
                "<h3>3. 协作开发</h3>"
                "<p>2026年的Codex支持多人协作模式，多个开发者可以同时与Codex交互，它会自动处理代码合并冲突，确保团队成员的工作无缝集成。</p>"
                "<h2>三、Codex vs Claude Code：2026年AI编程工具对比</h2>"
                "<table><tr><th>特性</th><th>Codex</th><th>Claude Code</th></tr>"
                "<tr><td>代码生成</td><td>⭐⭐⭐⭐⭐</td><td>⭐⭐⭐⭐⭐</td></tr>"
                "<tr><td>长时间任务</td><td>⭐⭐⭐⭐</td><td>⭐⭐⭐⭐⭐</td></tr>"
                "<tr><td>多Agent协作</td><td>⭐⭐⭐</td><td>⭐⭐⭐⭐⭐</td></tr>"
                "<tr><td>生态集成</td><td>⭐⭐⭐⭐⭐</td><td>⭐⭐⭐⭐</td></tr>"
                "<tr><td>开源社区</td><td>⭐⭐⭐</td><td>⭐⭐⭐⭐⭐</td></tr>"
                "<tr><td>远程操控</td><td>⭐⭐⭐</td><td>⭐⭐⭐⭐⭐</td></tr></table>"
                "<h2>四、Codex API与开发者生态</h2>"
                "<p>OpenAI在2026年大幅扩展了Codex API的功能：</p>"
                "<ul><li>新的流式API：实时获取代码生成进度</li><li>多模型选择：根据任务复杂度自动选择最优模型</li><li>成本优化：智能缓存和批量处理降低API调用成本</li><li>企业级功能：私有部署、审计日志、SLA保障</li></ul>"
                "<h2>五、Codex在实际项目中的应用</h2>"
                "<h3>案例一：初创公司快速原型开发</h3>"
                "<p>一家AI初创公司使用Codex在两周内完成了MVP开发，而传统开发方式需要两个月。Codex负责了80%的样板代码和基础设施代码，开发团队专注于核心业务逻辑。</p>"
                "<h3>案例二：大型企业代码现代化</h3>"
                "<p>某金融机构使用Codex将遗留的Java 8代码库迁移到Java 21，同时重构为微服务架构。Codex自动完成了70%的迁移工作，包括测试用例的更新。</p>"
                "<h2>六、2026年AI编程工具的选择建议</h2>"
                "<p>选择哪个工具取决于你的需求：</p>"
                "<ul><li><strong>快速原型</strong>：Codex的全栈生成能力最适合</li><li><strong>深度开发</strong>：Claude Code的长时间工作能力和Agent Teams更适合</li><li><strong>企业集成</strong>：Codex的OpenAI生态集成更完善</li><li><strong>开源定制</strong>：Claude Code的社区和Skills生态更活跃</li></ul>"
                "<p>实际上，越来越多的开发者选择同时使用多个工具，让它们各司其职，最大化AI辅助编程的效率。</p>"
            ),
            "excerpt": "OpenAI Codex在2026年已进化为完整的软件开发平台。本文全面对比Codex与Claude Code的优劣，分析实际项目案例，帮你选择最适合的AI编程工具。",
            "thumbnail": "https://picsum.photos/400/300?random=304",
            "tag": "Codex",
            "views": 19800,
            "likes": 167,
            "favorites": 95,
        },
        {
            "title": "2026年AI编程工具生态全景：Claude Code、MCP、Skills如何协同工作",
            "content": (
                "<h2>一、AI编程工具的新范式</h2>"
                "<p>2026年，AI编程不再是单一的\u201c代码补全\u201d功能，而是一个由多个组件协同工作的生态系统。Claude Code、MCP协议、Skills系统三者形成了一个完整的AI辅助开发平台。</p>"
                "<h2>二、三者如何协同工作？</h2>"
                "<h3>Claude Code：核心引擎</h3>"
                "<p>作为AI编程的核心引擎，Claude Code负责理解代码、生成代码、执行任务。2026年的Claude Code已经是一个成熟的终端应用，支持Channels远程操控和Agent Teams多智能体协作。</p>"
                "<h3>MCP：连接外部世界</h3>"
                "<p>MCP协议让Claude Code能够连接各种外部工具和服务。通过MCP Server，Claude Code可以：</p>"
                "<ul><li>读写数据库：直接查询和修改数据</li><li>调用API：与GitHub、Slack等第三方服务交互</li><li>管理基础设施：操作Docker、Kubernetes等DevOps工具</li><li>访问文件系统：安全地读取项目依赖的文档和配置</li></ul>"
                "<h3>Skills：专业知识注入</h3>"
                "<p>Skills为Claude Code提供特定领域的专业知识和最佳实践。安装一个React Skill后，Claude Code就能以React专家的身份工作，生成符合React 19最佳实践的代码。</p>"
                "<h2>三、实际工作流示例</h2>"
                "<p>假设你要开发一个新的Web应用，整个流程可能是这样的：</p>"
                "<ol><li><strong>项目初始化</strong>：Claude Code使用Next.js Skill生成项目骨架</li><li><strong>数据库设计</strong>：通过MCP连接PostgreSQL，Claude Code设计并创建数据库schema</li><li><strong>API开发</strong>：Claude Code使用API设计Skill生成RESTful端点</li><li><strong>前端开发</strong>：React Skill指导Claude Code生成组件</li><li><strong>测试编写</strong>：测试Skill自动生成单元测试和E2E测试</li><li><strong>部署</strong>：通过MCP连接Docker和Kubernetes，自动部署到生产环境</li></ol>"
                "<h2>四、2026年AI编程的最佳实践</h2>"
                "<h3>1. 选择合适的Skills组合</h3>"
                "<p>根据你的技术栈选择对应的Skills，不要贪多。2-3个核心Skills比10个浅尝辄止的Skills更有价值。</p>"
                "<h3>2. 构建MCP工具链</h3>"
                "<p>为你的开发环境配置必要的MCP Server，让Claude Code能够直接操作你常用的工具和服务。</p>"
                "<h3>3. 人机协作而非完全自动化</h3>"
                "<p>AI工具虽然强大，但关键的设计决策和架构思考仍然需要人类开发者。把AI当作强大的助手，而非替代者。</p>"
                "<h3>4. 重视安全</h3>"
                "<p>随着AI工具能力的增强，安全风险也在增加。确保：</p>"
                "<ul><li>审查AI生成的代码，特别是涉及安全和隐私的部分</li><li>使用MCP的权限控制，限制工具的访问范围</li><li>定期更新Skills和工具，获取最新的安全修复</li></ul>"
                "<h2>五、未来展望</h2>"
                "<p>2026年是AI编程工具生态成熟的关键一年。我们看到了：</p>"
                "<ul><li>Claude Code从工具到平台的转变</li><li>MCP从实验性协议到生产级标准的进化</li><li>Skills从极客玩具到开发者必备工具的普及</li><li>多工具协同工作流的成熟</li></ul>"
                "<p>可以预见，到2026年底，AI辅助编程将成为软件开发的标准配置，而不是可选项。掌握这些工具的开发者将在生产力和创新能力上获得显著优势。</p>"
            ),
            "excerpt": "2026年AI编程不再是单一工具，而是Claude Code、MCP、Skills协同工作的生态系统。本文详解三者如何配合，提供实际工作流示例和最佳实践。",
            "thumbnail": "https://picsum.photos/400/300?random=305",
            "tag": "AI编程",
            "views": 16500,
            "likes": 143,
            "favorites": 87,
        },
    ]

    for a in articles:
        article = Article(
            title=a["title"],
            content=a["content"],
            author="文章分享机器人",
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
    print(f"[OK] 成功添加 {len(articles)} 篇2026年最新文章")
    print("文章列表：")
    for i, a in enumerate(articles, 1):
        print(f"  {i}. {a['title']}")
