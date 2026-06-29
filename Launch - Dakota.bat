@echo off
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\launch.ps1" -Branch dakota -Port 49218
if errorlevel 1 pause
