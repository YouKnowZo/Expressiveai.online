from pydantic import BaseModel


class GenerateRequest(BaseModel):
    prompt: str
    user_id: int
