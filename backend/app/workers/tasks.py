from app.database import SessionLocal
from app.models import Video
from app.services.replicate_service import generate_video
from app.services.s3_service import upload_to_s3
from app.workers.celery_worker import celery


@celery.task
def generate_video_task(prompt, user_id):
    video_url = generate_video(prompt)
    s3_url = upload_to_s3(video_url)

    db = SessionLocal()
    video = Video(prompt=prompt, url=s3_url, user_id=user_id)
    db.add(video)
    db.commit()
    db.close()

    return {"video_url": s3_url}
