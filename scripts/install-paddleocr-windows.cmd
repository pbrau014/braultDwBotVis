@echo off
setlocal
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0install-paddleocr-windows.ps1" %*
exit /b %ERRORLEVEL%
