param(
  [Parameter(Mandatory=$true)]
  [ValidateSet('architect','docs','frontend','platform-api','web3-contract','qa','security')]
  [string]$Agent,

  [string]$PromptPath,
  [string]$ReportPath,
  [string]$SessionId,
  [switch]$NewSession,
  [switch]$Json
)

$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
$promptDir = Join-Path $repoRoot 'docs\claude-code-subteam\prompts'
$reportDir = Join-Path $repoRoot 'docs\claude-code-subteam\reports'
$sessionDir = Join-Path $repoRoot '.claude\subteam-sessions'

if (-not $PromptPath) {
  $PromptPath = Join-Path $promptDir "$Agent-agent.md"
}

if (-not (Test-Path -LiteralPath $PromptPath)) {
  throw "Prompt not found: $PromptPath"
}

New-Item -ItemType Directory -Force -Path $reportDir | Out-Null
New-Item -ItemType Directory -Force -Path $sessionDir | Out-Null

if (-not $ReportPath) {
  $stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
  $ReportPath = Join-Path $reportDir "$stamp-$Agent.md"
}

$outputFormat = if ($Json) { 'json' } else { 'text' }
$prompt = Get-Content -LiteralPath $PromptPath -Raw
$sessionPath = Join-Path $sessionDir "$Agent.txt"
$hasExistingSession = $false

if ($NewSession -and (Test-Path -LiteralPath $sessionPath)) {
  Remove-Item -LiteralPath $sessionPath -Force
}

if (-not $SessionId -and (Test-Path -LiteralPath $sessionPath)) {
  $SessionId = (Get-Content -LiteralPath $sessionPath -Raw).Trim()
  $hasExistingSession = $SessionId.Length -gt 0
}

if (-not $SessionId) {
  $SessionId = [guid]::NewGuid().ToString()
  Set-Content -LiteralPath $sessionPath -Value $SessionId -Encoding ascii
}

Push-Location $repoRoot
try {
  if ($NewSession -or -not $hasExistingSession) {
    $result = claude -p $prompt --model opus --effort xhigh --output-format $outputFormat --session-id $SessionId
  } else {
    $result = claude -p $prompt --model opus --effort xhigh --output-format $outputFormat --resume $SessionId
  }
  $result | Set-Content -LiteralPath $ReportPath -Encoding UTF8
  Write-Host "Report written: $ReportPath"
  Write-Host "Session reused: $SessionId"
} finally {
  Pop-Location
}
