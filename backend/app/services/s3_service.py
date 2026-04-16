import requests
import boto3

from app.config import settings

s3 = boto3.client(
    "s3",
    aws_access_key_id=settings.AWS_ACCESS_KEY,
    aws_secret_access_key=settings.AWS_SECRET,
)


def upload_to_s3(video_url: str) -> str:
    video_data = requests.get(video_url, timeout=60).content

    key = "videos/generated.mp4"

    s3.put_object(
        Bucket=settings.S3_BUCKET,
        Key=key,
        Body=video_data,
    )

    return f"https://{settings.S3_BUCKET}.s3.amazonaws.com/{key}"
