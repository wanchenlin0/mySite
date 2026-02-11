from fastapi import APIRouter, Depends, HTTPException, Response, Cookie, status
from sqlalchemy.orm import Session
from datetime import datetime, timezone
from typing import Optional
import os

from database import get_db
from models import User, RefreshToken
from schemas import RegisterRequest, LoginRequest, TokenResponse, UserResponse
from auth import (
    hash_password, verify_password, get_current_user,
    create_access_token, create_refresh_token_value, get_refresh_token_expiry,
    REFRESH_TOKEN_EXPIRES_DAYS
)

OWNER_EMAIL = os.getenv("OWNER_EMAIL", "")

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register", status_code=201)
def register(req: RegisterRequest, db: Session = Depends(get_db)):
    # 檢查 Email 是否已存在
    if db.query(User).filter(User.email == req.email).first():
        raise HTTPException(status_code=400, detail="此 Email 已被註冊")

    # 密碼長度驗證
    if len(req.password) < 6:
        raise HTTPException(status_code=400, detail="密碼至少需要 6 個字元")

    # 只有 OWNER_EMAIL 才是 owner，其餘都是 viewer
    role = 'owner' if OWNER_EMAIL and req.email.lower() == OWNER_EMAIL.lower() else 'viewer'

    user = User(
        email=req.email,
        password_hash=hash_password(req.password),
        role=role,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # 建立預設個人資料
    from models import Profile
    profile = Profile(user_id=user.id)
    db.add(profile)
    db.commit()

    return {"message": "註冊成功，請登入"}


@router.post("/login")
def login(req: LoginRequest, response: Response, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email).first()

    if not user or not verify_password(req.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Email 或密碼錯誤")

    # 建立 Access Token
    access_token = create_access_token(user.id)

    # 建立 Refresh Token 並存入資料庫
    refresh_token_value = create_refresh_token_value()
    refresh_token = RefreshToken(
        token=refresh_token_value,
        user_id=user.id,
        expires_at=get_refresh_token_expiry()
    )
    db.add(refresh_token)
    db.commit()

    # 設定 httpOnly Cookie
    response.set_cookie(
        key="refresh_token",
        value=refresh_token_value,
        httponly=True,
        max_age=REFRESH_TOKEN_EXPIRES_DAYS * 24 * 60 * 60,
        samesite="lax",
        secure=False  # 開發環境為 False，生產環境改 True
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {"id": user.id, "email": user.email}
    }


@router.post("/refresh")
def refresh_token(response: Response, refresh_token: Optional[str] = Cookie(None), db: Session = Depends(get_db)):
    if not refresh_token:
        raise HTTPException(status_code=401, detail="找不到 Refresh Token")

    # 查詢 DB 中的 Refresh Token
    token_record = db.query(RefreshToken).filter(
        RefreshToken.token == refresh_token
    ).first()

    if not token_record:
        raise HTTPException(status_code=401, detail="Refresh Token 無效")

    # 確認未過期
    if token_record.expires_at.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
        db.delete(token_record)
        db.commit()
        raise HTTPException(status_code=401, detail="Refresh Token 已過期，請重新登入")

    # 換發新的 Access Token
    access_token = create_access_token(token_record.user_id)

    # Refresh Token Rotation：換發新 Refresh Token
    db.delete(token_record)
    new_refresh_value = create_refresh_token_value()
    new_refresh_token = RefreshToken(
        token=new_refresh_value,
        user_id=token_record.user_id,
        expires_at=get_refresh_token_expiry()
    )
    db.add(new_refresh_token)
    db.commit()

    response.set_cookie(
        key="refresh_token",
        value=new_refresh_value,
        httponly=True,
        max_age=REFRESH_TOKEN_EXPIRES_DAYS * 24 * 60 * 60,
        samesite="lax",
        secure=False
    )

    return {"access_token": access_token, "token_type": "bearer"}


@router.post("/logout")
def logout(response: Response, refresh_token: Optional[str] = Cookie(None), db: Session = Depends(get_db)):
    if refresh_token:
        token_record = db.query(RefreshToken).filter(
            RefreshToken.token == refresh_token
        ).first()
        if token_record:
            db.delete(token_record)
            db.commit()

    response.delete_cookie("refresh_token")
    return {"message": "已登出"}


@router.get("/me")
def get_me(current_user: User = Depends(get_current_user)):
    return {"id": current_user.id, "email": current_user.email, "role": current_user.role}
