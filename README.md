# BOSS CV Creator

手机端 BOSS 直聘简历与打招呼语助手。

## 功能

- 粘贴 JD 或上传 JD 截图进行浏览器端 OCR。
- 通过 `/api/generate` 调用 DeepSeek，按 JD 深度改写打招呼语和 PDF 简历内容。
- DeepSeek 不可用时自动使用本地规则兜底。
- 打招呼语支持一键复制，PDF 文件名固定为 `王春元简历-18191206377.pdf`。
- PDF 简历避免出现“JD”“匹配亮点”“AI生成”“求职意向”等不专业字样。

## 本地运行

```bash
npm install
npm run start
```

本地不配置 DeepSeek 时，前端会自动使用本地规则生成。

## Vercel 部署

1. 将仓库导入 Vercel。
2. Framework 选择 Vite。
3. Build Command 使用：

```bash
npm run build
```

4. Output Directory 使用：

```bash
dist
```

5. 在 Vercel 的 Environment Variables 中配置：

```bash
DEEPSEEK_API_KEY=你的 DeepSeek API Key
```

可选：

```bash
DEEPSEEK_MODEL=deepseek-chat
```

## OCR 说明

DeepSeek API 不负责 OCR。当前 OCR 在浏览器端通过 `tesseract.js` 完成；如果截图识别不准，直接粘贴 JD 文本效果更稳定。

## 服务器部署

静态前端可以由 Nginx 托管 `dist/`。如果使用自己的服务器，需要额外部署 Node API，用环境变量保存 `DEEPSEEK_API_KEY`，不要把 Key 写进前端代码。
