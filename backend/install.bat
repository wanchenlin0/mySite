@echo off
echo Installing dependencies...
echo.

REM Check if virtual environment exists
if not exist .venv (
    echo [*] Creating virtual environment...
    python -m venv .venv
)

REM Activate and install
call .venv\Scripts\activate.bat
pip install -r requirements.txt

echo.
echo [OK] Installation complete!
echo.
echo Now you can run: start.bat
echo.
pause
