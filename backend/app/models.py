from sqlalchemy import Column, Integer, String

from app.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True)
    email = Column(String, unique=True)
    credits = Column(Integer, default=5)


class Video(Base):
    __tablename__ = "videos"

    id = Column(Integer, primary_key=True)
    prompt = Column(String)
    url = Column(String)
    user_id = Column(Integer)
