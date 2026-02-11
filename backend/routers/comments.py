from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import User, Record, Comment
from auth import get_current_user

router = APIRouter(tags=["comments"])


def comment_to_dict(c: Comment) -> dict:
    return {
        "id": c.id,
        "record_id": c.record_id,
        "user_id": c.user_id,
        "user_email": c.user.email if c.user else "",
        "content": c.content,
        "createdAt": c.created_at.isoformat() if c.created_at else None,
        "updatedAt": c.updated_at.isoformat() if c.updated_at else None,
    }


@router.get("/api/records/{record_id}/comments")
def get_comments(
    record_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    comments = db.query(Comment).filter(
        Comment.record_id == record_id
    ).order_by(Comment.created_at.asc()).all()
    return {"comments": [comment_to_dict(c) for c in comments]}


@router.post("/api/records/{record_id}/comments", status_code=201)
def add_comment(
    record_id: str,
    req: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    content = req.get("content", "").strip()
    if not content:
        raise HTTPException(status_code=400, detail="留言內容不可為空")

    comment = Comment(
        record_id=record_id,
        user_id=current_user.id,
        content=content,
    )
    db.add(comment)
    db.commit()
    db.refresh(comment)
    return {"comment": comment_to_dict(comment)}


@router.put("/api/comments/{comment_id}")
def update_comment(
    comment_id: str,
    req: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    comment = db.query(Comment).filter(Comment.id == comment_id).first()
    if not comment:
        raise HTTPException(status_code=404, detail="留言不存在")
    if comment.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="只能編輯自己的留言")

    content = req.get("content", "").strip()
    if not content:
        raise HTTPException(status_code=400, detail="留言內容不可為空")

    comment.content = content
    db.commit()
    db.refresh(comment)
    return {"comment": comment_to_dict(comment)}


@router.delete("/api/comments/{comment_id}")
def delete_comment(
    comment_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    comment = db.query(Comment).filter(Comment.id == comment_id).first()
    if not comment:
        raise HTTPException(status_code=404, detail="留言不存在")
    if comment.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="只能刪除自己的留言")

    db.delete(comment)
    db.commit()
    return {"success": True}
