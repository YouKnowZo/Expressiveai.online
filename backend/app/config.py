import os


class Settings:
    DATABASE_URL = os.getenv("DATABASE_URL")
    REDIS_URL = os.getenv("REDIS_URL")
    STRIPE_SECRET = os.getenv("STRIPE_SECRET")
    REPLICATE_API = os.getenv("REPLICATE_API")
    AWS_ACCESS_KEY = os.getenv("AWS_ACCESS_KEY")
    AWS_SECRET = os.getenv("AWS_SECRET")
    S3_BUCKET = os.getenv("S3_BUCKET")


settings = Settings()
