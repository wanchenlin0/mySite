#!/usr/bin/env python3
"""測試登入"""

import bcrypt
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models import User

DATABASE_URL = "sqlite:///./mysite.db"
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def test_login(email, password):
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == email).first()
        if not user:
            print(f"[X] User not found: {email}")
            return False

        # 驗證密碼
        is_valid = bcrypt.checkpw(password.encode(), user.password_hash.encode())

        if is_valid:
            print(f"[OK] Login successful!")
            print(f"   Email: {email}")
            print(f"   Role: {user.role}")
            return True
        else:
            print(f"[X] Invalid password")
            print(f"   Email: {email}")
            return False
    finally:
        db.close()

if __name__ == "__main__":
    import sys
    if len(sys.argv) == 3:
        email = sys.argv[1]
        password = sys.argv[2]
        test_login(email, password)
    else:
        print("Usage: python test_login.py <email> <password>")
