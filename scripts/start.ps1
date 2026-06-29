$port = 49217
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)

Set-Location -LiteralPath $root
Write-Host "Starting Frieren at http://127.0.0.1:$port"
Write-Host "Press Ctrl+C to stop the server."
python -m http.server $port --bind 127.0.0.1
