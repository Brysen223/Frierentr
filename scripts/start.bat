@echo off
cd /d "%~dp0\.."
echo Starting Frieren at http://127.0.0.1:49217
echo Press Ctrl+C to stop the server.
python -m http.server 49217 --bind 127.0.0.1
pause
