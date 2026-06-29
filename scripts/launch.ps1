param(
  [Parameter(Mandatory = $true)]
  [ValidateSet("main", "brysen", "dakota")]
  [string]$Branch,

  [Parameter(Mandatory = $true)]
  [ValidateRange(1024, 65535)]
  [int]$Port
)

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $PSScriptRoot
$documentsRoot = Split-Path -Parent $repoRoot
$displayName = (Get-Culture).TextInfo.ToTitleCase($Branch)
$worktreeRoot = if ($Branch -eq "main") {
  $repoRoot
} else {
  Join-Path $documentsRoot "Frieren-$displayName"
}

function Stop-WithMessage([string]$Message) {
  Write-Host ""
  Write-Host "Could not launch Frieren:" -ForegroundColor Red
  Write-Host $Message
  exit 1
}

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
  Stop-WithMessage "Git is not installed or is not available in PATH."
}

if (-not (Get-Command python -ErrorAction SilentlyContinue)) {
  Stop-WithMessage "Python 3 is not installed or is not available in PATH."
}

if (-not (Test-Path -LiteralPath (Join-Path $repoRoot ".git"))) {
  Stop-WithMessage "The main repository was not found at $repoRoot."
}

if ($Branch -ne "main" -and -not (Test-Path -LiteralPath $worktreeRoot)) {
  Write-Host "Creating the $displayName workspace..."
  & git -C $repoRoot worktree add $worktreeRoot $Branch
  if ($LASTEXITCODE -ne 0) {
    Stop-WithMessage "Git could not create the $Branch worktree."
  }
}

if (-not (Test-Path -LiteralPath $worktreeRoot)) {
  Stop-WithMessage "The workspace was not found at $worktreeRoot."
}

$activeBranch = (& git -C $worktreeRoot branch --show-current).Trim()
if ($LASTEXITCODE -ne 0 -or $activeBranch -ne $Branch) {
  Stop-WithMessage "Expected branch '$Branch' at $worktreeRoot, but found '$activeBranch'."
}

$changes = & git -C $worktreeRoot status --porcelain
if ($changes) {
  Write-Host "Note: this workspace has uncommitted work. It will not be changed." -ForegroundColor Yellow
}

$url = "http://127.0.0.1:$Port"
$listener = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
if ($listener) {
  Write-Host "$displayName is already running at $url"
  Start-Process $url
  exit 0
}

Write-Host ""
Write-Host "Branch: $Branch" -ForegroundColor Cyan
Write-Host "Folder: $worktreeRoot"
Write-Host "Game:   $url"
Write-Host ""
Write-Host "Keep this window open while playing. Press Ctrl+C to stop."

$browserCommand = "Start-Sleep -Milliseconds 700; Start-Process '$url'"
Start-Process -FilePath "powershell.exe" `
  -ArgumentList @("-NoProfile", "-WindowStyle", "Hidden", "-Command", $browserCommand) `
  -WindowStyle Hidden

Set-Location -LiteralPath $worktreeRoot
python -m http.server $Port --bind 127.0.0.1
