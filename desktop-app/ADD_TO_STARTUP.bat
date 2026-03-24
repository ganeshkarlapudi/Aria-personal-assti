@echo off
title ARIA - Add to Startup

set ARIA_DIR=%~dp0
set STARTUP=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\ARIA.bat

(
echo @echo off
echo cd /d "%ARIA_DIR%"
echo start /b pythonw aria.py
) > "%STARTUP%"

if exist "%STARTUP%" (
    echo [OK] ARIA will now auto-start every time Windows boots!
    echo.
    echo To remove: delete  %STARTUP%
) else (
    echo [ERROR] Failed. Try right-clicking and "Run as Administrator".
)
echo.
pause
