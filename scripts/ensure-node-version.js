/**
 * Next.js 15 需要 Node >= 18.18；在旧版本上直接跑 next 会报 node:events 等错误，
 * 且端口无监听，浏览器显示 ERR_CONNECTION_REFUSED。
 */
var versionParts = process.versions.node.split(".").map(Number);
var major = versionParts[0];
var minor = versionParts[1];
var unsupported = major < 18 || (major === 18 && minor < 18);
if (unsupported) {
  console.error("");
  console.error("[web-tool] 当前 Node 版本：" + process.version);
  console.error("[web-tool] 本项目需要 Node.js >= 18.18（建议 20，见 .nvmrc）。");
  console.error("");
  console.error("可选做法：");
  console.error("  1) 安装 nvm：https://github.com/nvm-sh/nvm");
  console.error("     然后在 web-tool 目录执行：nvm install && nvm use && npm install && npm run dev");
  console.error("  2) 或安装 Docker Desktop，在 web-tool 目录执行：npm run docker:dev");
  console.error("");
  process.exit(1);
}
