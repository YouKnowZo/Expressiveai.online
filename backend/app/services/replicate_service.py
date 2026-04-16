import requests

from app.config import settings


def generate_video(prompt: str) -> str:
    response = requests.post(
        "https://api.replicate.com/v1/predictions",
        headers={
            "Authorization": f"Token {settings.REPLICATE_API}",
        },
        json={
            "version": "MODEL_VERSION",
            "input": {
                "prompt": prompt,
            },
        },
        timeout=60,
    )

    data = response.json()

    # You will need polling here in production.
    return data["urls"]["get"]
