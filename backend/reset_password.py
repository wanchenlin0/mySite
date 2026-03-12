#!/usr/bin/env python3
"""
密碼重置工具
用法：python reset_password.py
"""

import sys
import os
import bcrypt
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# 設定資料庫連線
DATABASE_URL = "sqlite:///./mysite.db"
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def hash_password(password: str) -> str:
    """使用 bcrypt 加密密碼"""
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def list_users():
    """列出所有用戶"""
    from models import User
    db = SessionLocal()
    try:
        users = db.query(User).all()
        if not users:
            print("[X] 資料庫中沒有用戶")
            return []

        print("\n" + "=" * 60)
        print("現有用戶列表")
        print("=" * 60)
        for idx, user in enumerate(users, 1):
            print(f"{idx}. Email: {user.email}")
            print(f"   Role: {user.role}")
            print(f"   Created: {user.created_at}")
            print("-" * 60)

        return users
    finally:
        db.close()


def reset_password_by_email(email: str, new_password: str):
    """根據 email 重置密碼"""
    from models import User
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == email).first()
        if not user:
            print(f"[X] 找不到 email: {email}")
            return False

        # 更新密碼
        user.password_hash = hash_password(new_password)
        db.commit()

        print(f"\n[OK] 成功重置密碼！")
        print(f"   Email: {email}")
        print(f"   新密碼: {new_password}")
        print(f"   Role: {user.role}")
        return True
    except Exception as e:
        print(f"[X] 重置失敗: {e}")
        db.rollback()
        return False
    finally:
        db.close()


def reset_password_interactive():
    """互動式重置密碼"""
    print("\n" + "=" * 60)
    print("實習紀錄系統 - 密碼重置工具")
    print("=" * 60)

    # 列出所有用戶
    users = list_users()
    if not users:
        return

    # 選擇用戶
    print("\n請選擇要重置密碼的用戶：")
    try:
        choice = int(input("輸入編號（1-{}）: ".format(len(users))))
        if choice < 1 or choice > len(users):
            print("[X] 無效的選擇")
            return

        selected_user = users[choice - 1]
        email = selected_user.email

    except ValueError:
        print("[X] 請輸入數字")
        return
    except KeyboardInterrupt:
        print("\n\n[X] 操作已取消")
        return

    # 輸入新密碼
    print(f"\n選擇的用戶：{email}")
    new_password = input("輸入新密碼: ").strip()

    if not new_password:
        print("[X] 密碼不能為空")
        return

    if len(new_password) < 6:
        print("[X] 密碼長度至少 6 個字元")
        return

    # 確認
    confirm = input(f"\n確定要將 {email} 的密碼重置為 '{new_password}' 嗎？(y/N): ").strip().lower()
    if confirm != 'y':
        print("[X] 操作已取消")
        return

    # 執行重置
    reset_password_by_email(email, new_password)


def main():
    """主程式"""
    # 檢查資料庫是否存在
    if not os.path.exists("mysite.db"):
        print("[X] 找不到資料庫檔案 mysite.db")
        print("   請確認你在 backend 目錄中執行此腳本")
        sys.exit(1)

    # 如果有命令列參數，直接重置
    if len(sys.argv) == 3:
        email = sys.argv[1]
        new_password = sys.argv[2]
        reset_password_by_email(email, new_password)
    else:
        # 互動式模式
        reset_password_interactive()


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n[X] 操作已取消")
        sys.exit(0)
