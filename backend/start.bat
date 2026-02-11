@echo off
echo 啟動 mySite 後端伺服器...
echo.

REM 確認 .env 存在
if not exist .env (
    echo [!] 找不到 .env 檔案，請先複製 .env.example 並設定內容：
    echo     copy .env.example .env
    echo     然後編輯 .env 填入 JWT_SECRET 和 OPENAI_API_KEY
    pause
    exit /b 1
)

REM 確認虛擬環境存在
if not exist .venv (
    echo [*] 建立虛擬環境...
    python -m venv .venv
)

REM 啟動虛擬環境並安裝依賴
call .venv\Scripts\activate.bat
pip install -r requirements.txt -q

echo.
echo [OK] 後端啟動於 http://localhost:8000
echo [OK] API 文件：http://localhost:8000/docs
echo.
uvicorn main:app --reload --host 0.0.0.0 --port 8000
