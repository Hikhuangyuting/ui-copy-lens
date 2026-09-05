# 环境安装与配置

## 1. 安装 Node.js

Windows 和 macOS 均支持。要求 Node.js `>=18.18`，推荐 Node.js 20 LTS。项目根目录的 `.nvmrc` 已指定推荐版本。

### macOS

使用 nvm 时：

```bash
nvm install
nvm use
```

没有 nvm 时，可从 [Node.js 官网](https://nodejs.org/) 安装 LTS 版本。

### Windows

推荐安装 [nvm-windows](https://github.com/coreybutler/nvm-windows)，然后在 PowerShell 或命令提示符中执行：

```powershell
nvm install 20
nvm use 20
```

也可以直接从 [Node.js 官网](https://nodejs.org/) 下载 Windows LTS 安装包。

## 2. 安装依赖

在 PowerShell、命令提示符或 macOS 终端进入项目根目录后执行：

```bash
npm install
```

项目使用 `package-lock.json` 锁定依赖版本。CI 或部署环境建议使用：

```bash
npm ci
```

## 3. 配置大模型 API

本项目通过 OpenAI 兼容的 Chat Completions 接口调用支持视觉输入的大模型。你可以使用任意提供该接口的大模型服务。

复制示例文件。

macOS 终端：

```bash
cp .env.example .env.local
```

Windows PowerShell：

```powershell
Copy-Item .env.example .env.local
```

编辑项目根目录下的 `.env.local`：

```dotenv
MOONSHOT_API_KEY=你的模型服务API密钥
MOONSHOT_BASE_URL=https://你的模型服务地址/v1
MOONSHOT_VISION_MODEL=支持视觉输入的模型名称
```

其中：

- `MOONSHOT_API_KEY`：模型服务提供的 API 密钥；
- `MOONSHOT_BASE_URL`：模型服务的 OpenAI 兼容接口地址；
- `MOONSHOT_VISION_MODEL`：支持图片输入的模型名称。

如果使用其他服务商，只需将这三个变量替换为对应的服务地址、密钥和视觉模型名称。

## 4. 启动与验证

开发模式：

```bash
npm run dev
```

生产模式：

```bash
npm run build
npm run start
```

验证代码质量：

```bash
npm test
npm run build
```

## 5. Docker（可选）

安装 Docker Desktop 后，在项目根目录执行：

```bash
docker compose up
```

服务默认监听 `http://localhost:3000`。首次启动会安装容器内依赖，需要等待一段时间。

## 6. 常见问题

### 页面显示 `ERR_CONNECTION_REFUSED`

开发服务未运行，执行 `npm run dev`，然后刷新浏览器。

### 页面显示模型服务未配置

检查 `.env.local` 是否存在模型服务 API 密钥，修改后重启开发服务。

### 分析失败或超时

确认 API 密钥有效、接口地址正确、模型名称支持视觉输入，并检查模型服务的额度和网络连接。复杂截图首次 OCR 和视觉理解可能需要几十秒。
