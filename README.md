# UI Copy Lens（界语）

面向 UI/产品设计师的截图式 UI 文案优化工具。上传复杂业务界面截图后，工具会使用本地 OCR 识别文字与坐标，再调用支持视觉输入的大模型理解页面、筛选需要优化的说明文案，并在原位置生成优化结果。

当前版本是阶段 1：聚焦一次截图分析与优化，不包含历史记录、账号体系、多人协作或结果导出。

## 快速开始

环境要求：Node.js 18.18 及以上，推荐 Node.js 20。详细配置见 [docs/setup.md](docs/setup.md)。

```bash
npm install
cp .env.example .env.local
# 编辑 .env.local，填入 MOONSHOT_API_KEY
npm run dev
```

打开 [http://localhost:3000](http://localhost:3000)。

## 环境变量

| 变量 | 必填 | 说明 |
| --- | --- | --- |
| `MOONSHOT_API_KEY` | 是 | OpenAI 兼容模型服务 API 密钥，仅在服务端读取 |
| `MOONSHOT_BASE_URL` | 否 | 模型服务的 OpenAI 兼容接口地址 |
| `MOONSHOT_VISION_MODEL` | 否 | 支持图片输入的模型名称 |

不要提交 `.env.local`、API 密钥或真实业务截图。`.env.example` 只包含变量名和说明，不包含密钥。

## 常用命令

| 命令 | 作用 |
| --- | --- |
| `npm run dev` | 启动本地开发服务 |
| `npm run dev:host` | 监听局域网地址的开发服务 |
| `npm run build` | 执行生产构建和类型检查 |
| `npm run start` | 启动生产服务 |
| `npm test` | 执行段落识别边界测试 |
| `npm run docker:dev` | 使用 Docker 启动开发服务 |

## 运行流程

`上传图片 → 本地 OCR → 页面理解与候选筛选 → 信息充分性判断 → 补充业务信息（必要时） → 生成优化文案 → 原位置查看结果/原文`

取消分析会保留当前图片；同一图片再次识别会保留上一轮位置稳定的有效候选，并补充新发现，避免模型单次召回波动导致结果倒退。上传新图片前会确认并清除上一任务状态。

## 项目结构

```text
app/                         Next.js 页面与 API 路由
components/optimizer/        画布、设置面板和工作区状态
lib/                         OCR、模型请求、框选校验
public/                      设计稿图标与静态资源
docs/                        需求、交互、实现、OCR 准则和验收记录
tests/                       段落识别边界测试
```

## 设计与实现文档

- [阶段 1 需求说明](docs/phase-1-requirements.md)
- [阶段 1 交互设计](docs/phase-1-interaction-design.md)
- [阶段 1 实现计划](docs/phase-1-implementation-plan.md)
- [OCR 段落识别准则](docs/ocr-recognition-guidelines.md)
- [阶段 1 验收记录](docs/phase-1-acceptance.md)
- [环境安装与配置](docs/setup.md)

## 隐私与安全

图片会随分析请求发送到配置的大模型服务，用于当前会话的页面理解和文案生成。项目默认不提供历史记录功能。生产环境部署时请使用服务端环境变量管理 API 密钥，并根据组织要求补充日志脱敏、访问控制和数据留存策略。
