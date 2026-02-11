from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import User, Profile
from schemas import ProfileUpdate, ProfileResponse
from auth import get_current_user

router = APIRouter(prefix="/api/profile", tags=["profile"])


def profile_to_dict(p: Profile) -> dict:
    return {
        "id": p.id,
        "user_id": p.user_id,
        "name": p.name or "您的姓名",
        "company": p.company or "目前實習公司",
        "position": p.position or "實習職位",
        "interests": p.interests,
        "email": p.email,
        "github": p.github,
        "linkedin": p.linkedin,
    }


@router.get("")
def get_profile(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """取得個人資料：owner 看自己的，viewer 看 owner 的"""
    if current_user.role == 'viewer':
        owner = db.query(User).filter(User.role == 'owner').first()
        if not owner:
            raise HTTPException(status_code=404, detail="找不到 owner 資料")
        profile = db.query(Profile).filter(Profile.user_id == owner.id).first()
    else:
        profile = db.query(Profile).filter(Profile.user_id == current_user.id).first()
        if not profile:
            profile = Profile(user_id=current_user.id)
            db.add(profile)
            db.commit()
            db.refresh(profile)

    return {"profile": profile_to_dict(profile)}


@router.put("")
def update_profile(
    req: ProfileUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """更新個人資料（僅 owner）"""
    if current_user.role != 'owner':
        raise HTTPException(status_code=403, detail="無編輯權限")
    profile = db.query(Profile).filter(Profile.user_id == current_user.id).first()

    if not profile:
        profile = Profile(user_id=current_user.id)
        db.add(profile)

    if req.name is not None:
        profile.name = req.name
    if req.company is not None:
        profile.company = req.company
    if req.position is not None:
        profile.position = req.position
    if req.interests is not None:
        profile.interests = req.interests
    if req.email is not None:
        profile.email = req.email
    if req.github is not None:
        profile.github = req.github
    if req.linkedin is not None:
        profile.linkedin = req.linkedin

    db.commit()
    db.refresh(profile)

    return {"profile": profile_to_dict(profile)}
