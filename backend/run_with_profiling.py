#!/usr/bin/env python3
"""
mySite with Profiling Middleware
啟動 FastAPI 並自動記錄每個 API 請求的性能數據
"""
import sys
import os

# 確保在正確的目錄
os.chdir(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# 載入主應用
from main import app

# 加入 profiling middleware
from profiling_middleware import ProfilingMiddleware, print_profiling_report
app.add_middleware(ProfilingMiddleware)

# 註冊關閉事件（按 Ctrl+C 時顯示報告）
import atexit
atexit.register(print_profiling_report)

if __name__ == "__main__":
    import uvicorn

    print("\n" + "="*80)
    print("🚀 mySite FastAPI Backend with Profiling Middleware")
    print("="*80)
    print("\n📊 Profiling 已啟用！")
    print("   - 每個 API 請求都會被記錄")
    print("   - 測量執行時間和記憶體使用")
    print("   - 按 Ctrl+C 停止並查看完整報告")
    print("\n🧪 測試方式：")
    print("   在另一個終端執行：")
    print("   1. curl http://localhost:8000/health")
    print("   2. curl http://localhost:8000/api/records")
    print("   3. 或在瀏覽器開啟前端頁面進行操作")
    print("\n⏱️  每個請求的執行時間會顯示在 Response Header 中：")
    print("   - X-Process-Time: 執行時間（毫秒）")
    print("   - X-Memory-Delta: 記憶體變化（MB）")
    print("\n" + "="*80 + "\n")

    # 啟動伺服器
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8000,
        log_level="info"
    )
