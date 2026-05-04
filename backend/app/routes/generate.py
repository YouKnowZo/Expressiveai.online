from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models import User
from app.schemas import GenerateRequest
from app.workers.tasks import generate_video_task

router = APIRouter()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.post("/generate")
def generate(payload: GenerateRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == payload.user_id).first()

    if not user or user.credits <= 0:
        raise HTTPException(status_code=403, detail="No credits")

    user.credits -= 1
    db.commit()

    task = generate_video_task.delay(payload.prompt, payload.user_id)

    return {"task_id": task.id}
