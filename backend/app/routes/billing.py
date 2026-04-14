from fastapi import APIRouter
import stripe

from app.config import settings

router = APIRouter()
stripe.api_key = settings.STRIPE_SECRET


@router.post("/create-checkout")
def create_checkout():
    session = stripe.checkout.Session.create(
        payment_method_types=["card"],
        line_items=[
            {
                "price": "YOUR_PRICE_ID",
                "quantity": 1,
            }
        ],
        mode="subscription",
        success_url="http://localhost:3000/success",
        cancel_url="http://localhost:3000/cancel",
    )

    return {"url": session.url}
