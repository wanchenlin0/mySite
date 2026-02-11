from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from dotenv import load_dotenv
from sqlalchemy import text
import os

from database import engine, Base
from routers import auth, records, profile, llm, comments

load_dotenv()

# 建立資料庫資料表
Base.metadata.create_all(bind=engine)

# 遷移：為舊有用戶加上 role 欄位（已是 owner）
try:
    with engine.connect() as conn:
        conn.execute(text("ALTER TABLE users ADD COLUMN role VARCHAR NOT NULL DEFAULT 'owner'"))
        conn.commit()
except Exception:
    pass  # 欄位已存在，忽略

try:
    with engine.connect() as conn:
        conn.execute(text("ALTER TABLE records ADD COLUMN feedback TEXT"))
        conn.commit()
except Exception:
    pass  # 欄位已存在，忽略

app = FastAPI(
    title="mySite API",
    description="實習紀錄管理系統後端 API",
    version="2.0.0"
)

# CORS 設定：允許前端跨域請求
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5500")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5500",
        "http://127.0.0.1:5500",
        "http://localhost:5501",
        "http://127.0.0.1:5501",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 掛載路由
app.include_router(auth.router)
app.include_router(records.router)
app.include_router(profile.router)
app.include_router(llm.router)
app.include_router(comments.router)


@app.get("/health")
def health():
    return {"status": "ok"}


# 提供前端靜態檔案（放在最後，避免攔截 API 路由）
FRONTEND_DIR = os.path.join(os.path.dirname(__file__), "..")
app.mount("/", StaticFiles(directory=FRONTEND_DIR, html=True), name="frontend")
