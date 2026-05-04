from fastapi import FastAPI
from app.routes import billing, generate

app = FastAPI()

app.include_router(generate.router, prefix="/api")
app.include_router(billing.router, prefix="/api")


@app.get("/")
def root():
    return {"status": "running"}
