@echo off
title ARIA - Starting...
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python not found! Install from https://python.org
    pause & exit /b
)
echo Installing dependencies...
pip install -r requirements.txt -q
echo Launching ARIA...
start /b pythonw aria.py
if errorlevel 1 python aria.py
