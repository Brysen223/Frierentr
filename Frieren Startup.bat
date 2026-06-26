@echo off
cd /d "%~dp0"
echo Starting Frieren prototype at http://127.0.0.1:49217
echo Press Ctrl+C in this window to stop the server.
python -m http.server 49217 --bind 127.0.0.1
pause
