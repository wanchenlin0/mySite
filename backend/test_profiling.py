#!/usr/bin/env python3
"""
自動測試 mySite API 並收集 profiling 數據
"""
import httpx
import time
import sys
from datetime import datetime

BASE_URL = "http://localhost:8000"

def print_header(text):
    print("\n" + "="*80)
    print(f"  {text}")
    print("="*80)

def test_endpoint(client, method, path, json=None, description=""):
    """測試單個端點"""
    try:
        print(f"\n🔍 {description}")
        print(f"   {method} {path}")

        start = time.time()

        if method == "GET":
            response = client.get(path)
        elif method == "POST":
            response = client.post(path, json=json)
        else:
            response = client.request(method, path, json=json)

        duration = (time.time() - start) * 1000

        # 從 header 獲取 profiling 數據
        process_time = response.headers.get("X-Process-Time", "N/A")
        memory_delta = response.headers.get("X-Memory-Delta", "N/A")

        print(f"   ✅ Status: {response.status_code}")
        print(f"   ⏱️  總時間: {duration:.2f}ms")
        print(f"   📊 伺服器處理時間: {process_time}ms")
        print(f"   💾 記憶體變化: {memory_delta}MB")

        return True

    except Exception as e:
        print(f"   ❌ 錯誤: {e}")
        return False

def main():
    print_header("🧪 mySite API Profiling 自動測試")

    print(f"\n⏰ 測試開始時間: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"🎯 目標伺服器: {BASE_URL}")

    # 檢查伺服器是否運行
    print("\n📡 檢查伺服器連線...")
    try:
        with httpx.Client(base_url=BASE_URL, timeout=5.0) as client:
            response = client.get("/health")
            print(f"   ✅ 伺服器正在運行 (Status: {response.status_code})")
    except Exception as e:
        print(f"\n❌ 無法連接到伺服器！")
        print(f"   錯誤: {e}")
        print(f"\n💡 請先在另一個終端啟動伺服器：")
        print(f"   cd /mnt/c/Users/ptwclin.NB338/Projects/mySite/backend")
        print(f"   venv/bin/python3 run_with_profiling.py")
        sys.exit(1)

    print_header("開始測試各個端點")

    with httpx.Client(base_url=BASE_URL, timeout=10.0) as client:
        # 1. 測試健康檢查（輕量級）
        test_endpoint(
            client, "GET", "/health",
            description="1️⃣  健康檢查 (最輕量級的端點)"
        )
        time.sleep(0.5)

        # 2. 測試靜態首頁
        test_endpoint(
            client, "GET", "/",
            description="2️⃣  首頁 (靜態文件)"
        )
        time.sleep(0.5)

        # 3. 測試 API 端點（不需要認證的）
        test_endpoint(
            client, "GET", "/api/records",
            description="3️⃣  獲取記錄列表 (可能需要認證)"
        )
        time.sleep(0.5)

        # 4. 測試註冊（可能會失敗，但可以測試性能）
        test_endpoint(
            client, "POST", "/api/auth/register",
            json={
                "email": f"test_{int(time.time())}@example.com",
                "password": "test123456"
            },
            description="4️⃣  註冊新用戶 (測試資料庫寫入)"
        )
        time.sleep(0.5)

        # 5. 測試登入（使用剛註冊的帳號）
        test_endpoint(
            client, "POST", "/api/auth/login",
            json={
                "email": f"test_{int(time.time())}@example.com",
                "password": "test123456"
            },
            description="5️⃣  登入 (測試認證和密碼驗證)"
        )
        time.sleep(0.5)

        # 6. 重複測試健康檢查（測試快取效果）
        print("\n" + "-"*80)
        print("重複測試健康檢查端點 10 次（測試穩定性）")
        print("-"*80)

        times = []
        for i in range(10):
            start = time.time()
            response = client.get("/health")
            duration = (time.time() - start) * 1000
            times.append(duration)
            process_time = response.headers.get("X-Process-Time", "N/A")
            print(f"   #{i+1:2d}: {duration:6.2f}ms (伺服器: {process_time}ms)")
            time.sleep(0.1)

        avg_time = sum(times) / len(times)
        min_time = min(times)
        max_time = max(times)

        print(f"\n   平均: {avg_time:.2f}ms")
        print(f"   最快: {min_time:.2f}ms")
        print(f"   最慢: {max_time:.2f}ms")

    print_header("測試完成")
    print("\n💡 提示：")
    print("   1. 回到伺服器終端，按 Ctrl+C 停止")
    print("   2. 會自動顯示完整的 profiling 報告")
    print("   3. 報告會按照平均執行時間排序，找出最慢的端點")
    print("\n" + "="*80 + "\n")

if __name__ == "__main__":
    main()
