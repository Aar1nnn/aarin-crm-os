param(
  [string]$EnvironmentFile = ".env.development.local"
)

$resolvedEnvironmentFile = Resolve-Path -LiteralPath $EnvironmentFile -ErrorAction Stop
$clientId = (Read-Host "Google OAuth Client ID").Trim()
if (-not $clientId) { throw "Client ID 不能为空" }

$secureClientSecret = Read-Host "Google OAuth Client Secret（输入不会显示）" -AsSecureString
$secretPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureClientSecret)
try {
  $clientSecret = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($secretPointer)
  if (-not $clientSecret) { throw "Client Secret 不能为空" }
  if ($clientId -match "[\r\n]" -or $clientSecret -match "[\r\n]") {
    throw "OAuth 凭据不能包含换行符"
  }

  $content = [IO.File]::ReadAllText($resolvedEnvironmentFile)
  $settings = [ordered]@{
    INTEGRATION_ENABLED = "true"
    INTEGRATION_WORKER_ENABLED = "true"
    INTEGRATION_GOOGLE_CLIENT_ID = $clientId
    INTEGRATION_OAUTH_GOOGLE_CLIENT_SECRET = $clientSecret
    INTEGRATION_OAUTH_CALLBACK_BASE_URL = "http://127.0.0.1:4190"
    INTEGRATION_WEBHOOK_BASE_URL = "http://127.0.0.1:4190"
    INTEGRATION_OAUTH_SUCCESS_REDIRECT_URL = "http://127.0.0.1:5188/#integrations"
  }
  foreach ($entry in $settings.GetEnumerator()) {
    $pattern = "(?m)^" + [Regex]::Escape($entry.Key) + "=.*$"
    $replacement = $entry.Key + "=" + $entry.Value
    if ([Regex]::IsMatch($content, $pattern)) {
      $content = ([Regex]::new($pattern)).Replace(
        $content,
        [System.Text.RegularExpressions.MatchEvaluator]{ param($match) $replacement },
        1
      )
    } else {
      $content = $content.TrimEnd() + [Environment]::NewLine + $replacement + [Environment]::NewLine
    }
  }
  [IO.File]::WriteAllText($resolvedEnvironmentFile, $content, [Text.UTF8Encoding]::new($false))
  Write-Host "Google OAuth 本地配置已保存；Secret 未输出。"
  Write-Host "Redirect URI: http://127.0.0.1:4190/api/integrations/oauth/callback/google-workspace"
  Write-Host "Authorized JavaScript origin: http://127.0.0.1:5188"
  Write-Host "下一步：重启 Backend 与 Integration Worker，再在集成中心授权 Google Workspace。"
} finally {
  if ($secretPointer -ne [IntPtr]::Zero) {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($secretPointer)
  }
}
