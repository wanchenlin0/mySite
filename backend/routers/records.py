import json
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional

from database import get_db
from models import User, Record
from schemas import RecordCreate, RecordUpdate, RecordResponse
from auth import get_current_user

router = APIRouter(prefix="/api/records", tags=["records"])


def record_to_dict(r: Record) -> dict:
    """將 Record ORM 物件轉為 API 回應格式"""
    return {
        "id": r.id,
        "user_id": r.user_id,
        "date": r.date,
        "startTime": r.start_time,
        "endTime": r.end_time,
        "title": r.title,
        "content": r.content,
        "tags": json.loads(r.tags) if r.tags else [],
        "createdAt": r.created_at.isoformat() if r.created_at else None,
        "updatedAt": r.updated_at.isoformat() if r.updated_at else None,
    }


@router.get("")
def get_records(
    sort: str = Query("date-desc", regex="^(date-desc|date-asc|title)$"),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """取得紀錄：owner 只看自己的，viewer 看所有 owner 的紀錄"""
    if current_user.role == 'viewer':
        # viewer 看所有 owner 的紀錄
        owner_ids = [u.id for u in db.query(User).filter(User.role == 'owner').all()]
        query = db.query(Record).filter(Record.user_id.in_(owner_ids))
    else:
        query = db.query(Record).filter(Record.user_id == current_user.id)

    # 搜尋（標題、內容）
    if search and search.strip():
        keyword = f"%{search.strip()}%"
        query = query.filter(
            (Record.title.ilike(keyword)) |
            (Record.content.ilike(keyword)) |
            (Record.tags.ilike(keyword))
        )

    # 排序
    if sort == "date-asc":
        query = query.order_by(Record.date.asc(), Record.created_at.asc())
    elif sort == "title":
        query = query.order_by(Record.title.asc())
    else:  # date-desc（預設）
        query = query.order_by(Record.date.desc(), Record.created_at.desc())

    records = query.all()
    return {"records": [record_to_dict(r) for r in records], "total": len(records)}


@router.get("/{record_id}/adjacent")
def get_adjacent_records(
    record_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """取得上/下一篇紀錄"""
    if current_user.role == 'viewer':
        owner_ids = [u.id for u in db.query(User).filter(User.role == 'owner').all()]
        all_records = db.query(Record).filter(
            Record.user_id.in_(owner_ids)
        ).order_by(Record.date.desc(), Record.created_at.desc()).all()
    else:
        all_records = db.query(Record).filter(
            Record.user_id == current_user.id
        ).order_by(Record.date.desc(), Record.created_at.desc()).all()

    idx = next((i for i, r in enumerate(all_records) if r.id == record_id), None)
    if idx is None:
        raise HTTPException(status_code=404, detail="紀錄不存在")

    prev_record = all_records[idx - 1] if idx > 0 else None
    next_record = all_records[idx + 1] if idx < len(all_records) - 1 else None

    return {
        "prev": record_to_dict(prev_record) if prev_record else None,
        "next": record_to_dict(next_record) if next_record else None,
    }


@router.get("/{record_id}")
def get_record(
    record_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """取得單筆紀錄（viewer 可看 owner 的紀錄）"""
    if current_user.role == 'viewer':
        owner_ids = [u.id for u in db.query(User).filter(User.role == 'owner').all()]
        record = db.query(Record).filter(
            Record.id == record_id,
            Record.user_id.in_(owner_ids)
        ).first()
    else:
        record = db.query(Record).filter(
            Record.id == record_id,
            Record.user_id == current_user.id
        ).first()

    if not record:
        raise HTTPException(status_code=404, detail="紀錄不存在")

    return {"record": record_to_dict(record)}


@router.post("", status_code=201)
def create_record(
    req: RecordCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """新增紀錄"""
    if current_user.role != 'owner':
        raise HTTPException(status_code=403, detail="無編輯權限")
    record = Record(
        user_id=current_user.id,
        date=req.date,
        start_time=req.start_time,
        end_time=req.end_time,
        title=req.title,
        content=req.content,
        tags=json.dumps(req.tags or [], ensure_ascii=False)
    )
    db.add(record)
    db.commit()
    db.refresh(record)

    return {"record": record_to_dict(record)}


@router.put("/{record_id}")
def update_record(
    record_id: str,
    req: RecordUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """更新紀錄（驗證擁有權）"""
    if current_user.role != 'owner':
        raise HTTPException(status_code=403, detail="無編輯權限")
    record = db.query(Record).filter(
        Record.id == record_id,
        Record.user_id == current_user.id
    ).first()

    if not record:
        raise HTTPException(status_code=404, detail="紀錄不存在或無權限")

    if req.date is not None:
        record.date = req.date
    if req.start_time is not None:
        record.start_time = req.start_time
    if req.end_time is not None:
        record.end_time = req.end_time
    if req.title is not None:
        record.title = req.title
    if req.content is not None:
        record.content = req.content
    if req.tags is not None:
        record.tags = json.dumps(req.tags, ensure_ascii=False)

    db.commit()
    db.refresh(record)

    return {"record": record_to_dict(record)}


@router.delete("/{record_id}")
def delete_record(
    record_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """刪除紀錄（驗證擁有權）"""
    if current_user.role != 'owner':
        raise HTTPException(status_code=403, detail="無編輯權限")
    record = db.query(Record).filter(
        Record.id == record_id,
        Record.user_id == current_user.id
    ).first()

    if not record:
        raise HTTPException(status_code=404, detail="紀錄不存在或無權限")

    db.delete(record)
    db.commit()

    return {"success": True}
