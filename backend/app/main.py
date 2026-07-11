from fastapi import FastAPI
from app.core.config import settings
from app.api.v1 import auth

app = FastAPI(title=settings.PROJECT_NAME)
app.include_router(auth.router,prefix = "/api/v1/auth",tags = ["Auth"])

@app.get("/health")
def health_check():
    return {"status":"ok", "message": "backend is running fine"}

