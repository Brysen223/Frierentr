@echo off
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\launch.ps1" -Branch brysen -Port 49217
if errorlevel 1 pause
