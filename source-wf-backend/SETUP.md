# 源--WF 后端部署

## 1. 创建 Worker + D1

1. 在 Cloudflare 新建 Worker（例如 `source-wf-api`）。
2. 绑定 D1 数据库到变量 `DB`。
3. 将 `cloudflare-worker.js` 作为 Worker 代码。

## 2. 初始化数据库

将 `schema.sql` 执行到 D1 数据库。

## 3. 配置环境变量/密钥

- 必需：`AUTH_SECRET`（强随机字符串）
- 可选：`OPENAI_API_KEY`（用于 AI 自动开头）
- 可选：`OPENAI_MODEL`（默认 `gpt-4.1-mini`）

## 4. 修改前端 API 地址

编辑 `/source-wf/index.html`：

```js
const API_BASE = 'https://your-source-wf-worker.example.com';
```

替换成你的 Worker 域名（不带尾部 `/api`）。

## 5. 功能说明

- 注册/登录：账号密码
- 新建项目：可自写开头，留空则 AI 自动生成（无 API Key 时使用后端内置随机开头）
- 协作续写：所有访客可见同一项目并续写
- 锁机制：同一时间仅一人持有续写权（默认 2 分钟，前端每 20 秒续期）
- 完成项目：仅创建者可点击“完成”
