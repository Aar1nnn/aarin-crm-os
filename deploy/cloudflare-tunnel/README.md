# Cloudflare Tunnel（真实连接演示版）

本配置只公开两个入口：

- `https://crm.aarinaishop.com` → 本机前端 `127.0.0.1:5188`
- `https://api.crm.aarinaishop.com` → 本机 API `127.0.0.1:4190`

MySQL、Redis、Integration Worker 与 WhatsApp 插件端口保持本机访问，不创建公网路由。

## 首次配置

1. 安装官方 `cloudflared`，然后完成浏览器授权：

   ```powershell
   cloudflared tunnel login
   ```

2. 创建固定名称的 Tunnel：

   ```powershell
   cloudflared tunnel create goodjob-real-demo
   ```

3. 复制 `config.yml.example` 为用户目录下的 `.cloudflared\config.yml`，把 Tunnel UUID、凭据文件路径替换为上一步生成的值。

4. 创建两个 DNS 路由：

   ```powershell
   cloudflared tunnel route dns goodjob-real-demo crm.aarinaishop.com
   cloudflared tunnel route dns goodjob-real-demo api.crm.aarinaishop.com
   ```

5. 验证配置并启动：

   ```powershell
   cloudflared tunnel ingress validate
   cloudflared tunnel run goodjob-real-demo
   ```

## 应用配置

公网演示环境使用根目录 `.env.example` 中的域名配置。Google OAuth 控制台必须登记精确回调：

```text
https://api.crm.aarinaishop.com/api/integrations/oauth/callback/google-workspace
```

浏览器来源只允许：

```text
https://crm.aarinaishop.com
```

本地调试仍可在 `.env.development.local` 使用 `127.0.0.1`，不要把本地环境文件或任何 Tunnel/OAuth 凭据提交到 Git。

## 恢复与排错

- `cloudflared tunnel info goodjob-real-demo`：检查 Tunnel 状态。
- `cloudflared tunnel ingress rule https://crm.aarinaishop.com`：检查 URL 命中的 ingress 规则。
- 前端可访问而 API 失败时，先检查 `http://127.0.0.1:4190/api/health`。
- OAuth 回调失败时，逐字比对 Google 控制台回调 URI 和 `INTEGRATION_OAUTH_CALLBACK_BASE_URL`。
- 凭据丢失时不要手工伪造 JSON；重新创建 Tunnel 或从 Cloudflare Zero Trust 获取新 token，并撤销旧凭据。
