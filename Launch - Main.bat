@echo off
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\launch.ps1" -Branch main -Port 49216
if errorlevel 1 pause
