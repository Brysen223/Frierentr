$port = 49217
$root = Split-Path -Parent $MyInvocation.MyCommand.Path

Set-Location -LiteralPath $root
Write-Host "Starting Frieren prototype at http://127.0.0.1:$port"
Write-Host "Press Ctrl+C in this window to stop the server."
python -m http.server $port --bind 127.0.0.1
