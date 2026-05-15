"""
FastAPI Performance Profiling Middleware
追蹤每個 API 端點的執行時間、記憶體使用
"""
import time
import psutil
import logging
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from datetime import datetime
import json
import os

# 設定 profiling 日誌
profiling_logger = logging.getLogger("profiling")
profiling_logger.setLevel(logging.INFO)

# 創建日誌目錄
log_dir = os.path.join(os.path.dirname(__file__), "profiling_logs")
os.makedirs(log_dir, exist_ok=True)

# 日誌文件
log_file = os.path.join(log_dir, f"api_profiling_{datetime.now().strftime('%Y%m%d')}.jsonl")
file_handler = logging.FileHandler(log_file)
file_handler.setFormatter(logging.Formatter('%(message)s'))
profiling_logger.addHandler(file_handler)

# 統計數據
stats = {}


class ProfilingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # 開始時間
        start_time = time.time()

        # 記錄開始時的記憶體
        process = psutil.Process()
        memory_before = process.memory_info().rss / 1024 / 1024  # MB

        # 處理請求
        response = await call_next(request)

        # 計算執行時間
        duration = (time.time() - start_time) * 1000  # 毫秒

        # 記錄結束時的記憶體
        memory_after = process.memory_info().rss / 1024 / 1024  # MB
        memory_delta = memory_after - memory_before

        # 記錄資料
        endpoint = f"{request.method} {request.url.path}"

        profiling_data = {
            "timestamp": datetime.now().isoformat(),
            "endpoint": endpoint,
            "method": request.method,
            "path": request.url.path,
            "duration_ms": round(duration, 2),
            "status_code": response.status_code,
            "memory_before_mb": round(memory_before, 2),
            "memory_after_mb": round(memory_after, 2),
            "memory_delta_mb": round(memory_delta, 2),
        }

        # 寫入日誌
        profiling_logger.info(json.dumps(profiling_data, ensure_ascii=False))

        # 更新統計
        if endpoint not in stats:
            stats[endpoint] = {
                "count": 0,
                "total_duration": 0,
                "min_duration": float('inf'),
                "max_duration": 0,
                "total_memory_delta": 0,
            }

        stats[endpoint]["count"] += 1
        stats[endpoint]["total_duration"] += duration
        stats[endpoint]["min_duration"] = min(stats[endpoint]["min_duration"], duration)
        stats[endpoint]["max_duration"] = max(stats[endpoint]["max_duration"], duration)
        stats[endpoint]["total_memory_delta"] += memory_delta

        # 添加 header（供前端查看）
        response.headers["X-Process-Time"] = str(round(duration, 2))
        response.headers["X-Memory-Delta"] = str(round(memory_delta, 2))

        return response


def get_profiling_stats():
    """取得 profiling 統計資訊"""
    result = []
    for endpoint, data in stats.items():
        avg_duration = data["total_duration"] / data["count"]
        avg_memory = data["total_memory_delta"] / data["count"]

        result.append({
            "endpoint": endpoint,
            "count": data["count"],
            "avg_duration_ms": round(avg_duration, 2),
            "min_duration_ms": round(data["min_duration"], 2),
            "max_duration_ms": round(data["max_duration"], 2),
            "avg_memory_delta_mb": round(avg_memory, 4),
        })

    # 按平均執行時間排序
    result.sort(key=lambda x: x["avg_duration_ms"], reverse=True)
    return result


def print_profiling_report():
    """列印 profiling 報告"""
    print("\n" + "="*80)
    print("📊 API Performance Profiling Report")
    print("="*80)

    report = get_profiling_stats()

    if not report:
        print("尚無 profiling 資料")
        return

    print(f"\n{'Endpoint':<40} {'Count':>8} {'Avg (ms)':>10} {'Min (ms)':>10} {'Max (ms)':>10} {'Mem (MB)':>10}")
    print("-"*80)

    for item in report:
        print(f"{item['endpoint']:<40} "
              f"{item['count']:>8} "
              f"{item['avg_duration_ms']:>10.2f} "
              f"{item['min_duration_ms']:>10.2f} "
              f"{item['max_duration_ms']:>10.2f} "
              f"{item['avg_memory_delta_mb']:>10.4f}")

    print("="*80)
    print(f"日誌檔案：{log_file}")
    print("="*80 + "\n")
