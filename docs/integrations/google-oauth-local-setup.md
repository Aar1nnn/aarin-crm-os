# Google OAuth 本地连接（Gmail + Calendar）

此连接只用于 Gmail 与 Google Calendar，不启用 Google Drive。

## Google Cloud Console

1. 创建或选择一个 Google Cloud 项目。
2. 启用 `Gmail API` 与 `Google Calendar API`。
3. 配置 OAuth consent screen；处于 Testing 状态时，把自己的 Gmail 账号加入 Test users。
4. 创建 `Web application` 类型的 OAuth Client。
5. 添加 Authorized JavaScript origin：

   ```text
   http://127.0.0.1:5188
   ```

6. 添加 Authorized redirect URI（必须逐字一致）：

   ```text
   http://127.0.0.1:4190/api/integrations/oauth/callback/google-workspace
   ```

## 本地保存凭据

不要把 Client Secret 发到聊天。请在项目根目录运行：

```powershell
powershell -ExecutionPolicy Bypass -File scripts/configure-google-oauth.ps1
```

脚本把以下源码实际使用的变量写入已忽略的 `.env.development.local`：

- `INTEGRATION_GOOGLE_CLIENT_ID`
- `INTEGRATION_OAUTH_GOOGLE_CLIENT_SECRET`
- `INTEGRATION_OAUTH_CALLBACK_BASE_URL`
- `INTEGRATION_OAUTH_SUCCESS_REDIRECT_URL`

## Scopes

GoodJob 的 Google Workspace connector 固定申请：

```text
openid
profile
email
https://www.googleapis.com/auth/gmail.readonly
https://www.googleapis.com/auth/gmail.compose
https://www.googleapis.com/auth/gmail.send
https://www.googleapis.com/auth/calendar.events
https://www.googleapis.com/auth/calendar.freebusy
```

没有 Google Drive scope。

## 授权顺序

1. 保存本地凭据。
2. 重启 Backend 与 Integration Worker。
3. 打开 Aarin CRM 的“集成中心”。
4. 只创建 `Google Workspace` 连接。
5. 点击授权并在 Google 页面确认账号与 scopes。
6. 回到 CRM，等待连接完成 discovery/confirmation。
7. 先运行只读验证：邮箱账号、Gmail 搜索、日历列表。
8. 创建 Gmail 草稿、发送测试邮件或创建日历事件前，必须再次人工确认。

## 重新授权与恢复

- 授权拒绝：回到连接详情重新发起，不复用已失败的 state。
- Token 过期：使用“重新授权”；系统会通过加密 Credential Vault 保存新 token。
- Client Secret 轮换：再次运行配置脚本并重启 Backend，然后重新授权现有连接。
- 撤销连接：在 CRM 执行 disconnect，并在 Google Account 的第三方访问页面撤销旧授权。
