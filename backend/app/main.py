from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.database import engine
from app.models import Base  # Importing Base from models ensures they are registered
from app.api import auth, profile, loans, matching, audit as audit_api, admin_analytics

# Automatically create all tables on startup (convenient for local development)
Base.metadata.create_all(bind=engine)

from app.seed import seed_database

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

@app.on_event("startup")
def on_startup():
    """Trigger DB seeding on startup if tables are empty, and ensure database schema is up-to-date."""
    from app.database import SessionLocal
    from sqlalchemy import text
    db = SessionLocal()
    
    # 1. Add reset_token columns if missing
    try:
        db.execute(text("SELECT reset_token FROM users LIMIT 1"))
    except Exception:
        db.rollback()
        try:
            db.execute(text("ALTER TABLE users ADD COLUMN reset_token VARCHAR"))
            db.commit()
        except Exception:
            db.rollback()
            
    try:
        db.execute(text("SELECT reset_token_expires_at FROM users LIMIT 1"))
    except Exception:
        db.rollback()
        try:
            db.execute(text("ALTER TABLE users ADD COLUMN reset_token_expires_at TIMESTAMP WITH TIME ZONE"))
            db.commit()
        except Exception:
            db.rollback()
            try:
                db.execute(text("ALTER TABLE users ADD COLUMN reset_token_expires_at DATETIME"))
                db.commit()
            except Exception:
                db.rollback()

    # 2. Add otp_code column if missing
    try:
        db.execute(text("SELECT otp_code FROM users LIMIT 1"))
    except Exception:
        db.rollback()
        try:
            db.execute(text("ALTER TABLE users ADD COLUMN otp_code VARCHAR"))
            db.commit()
        except Exception:
            db.rollback()

    # 3. Add otp_expires_at column if missing
    try:
        db.execute(text("SELECT otp_expires_at FROM users LIMIT 1"))
    except Exception:
        db.rollback()
        try:
            db.execute(text("ALTER TABLE users ADD COLUMN otp_expires_at TIMESTAMP WITH TIME ZONE"))
            db.commit()
        except Exception:
            db.rollback()
            try:
                db.execute(text("ALTER TABLE users ADD COLUMN otp_expires_at DATETIME"))
                db.commit()
            except Exception:
                db.rollback()
    finally:
        db.close()
        
    seed_database()

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=".*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from fastapi.responses import JSONResponse
import logging

logger = logging.getLogger(__name__)

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Global exception fallback to ensure CORS headers are attached even on 500 errors."""
    logger.error(f"Global exception: {str(exc)}", exc_info=True)
    response = JSONResponse(
        status_code=500,
        content={"detail": f"Server Error: {str(exc)}"}
    )
    origin = request.headers.get("origin")
    if origin:
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Credentials"] = "true"
    return response

# Route routing
app.include_router(auth.router, prefix=f"{settings.API_V1_STR}/auth", tags=["Authentication"])
app.include_router(profile.router, prefix=f"{settings.API_V1_STR}/profile", tags=["Profile Intake"])
app.include_router(loans.router, prefix=f"{settings.API_V1_STR}/loans", tags=["Loan Products"])
app.include_router(matching.router, prefix=f"{settings.API_V1_STR}/matching", tags=["Matching & AI Recommendation"])
app.include_router(audit_api.router, prefix=f"{settings.API_V1_STR}/admin/audit-logs", tags=["Admin Audit Logs"])
app.include_router(admin_analytics.router, prefix=f"{settings.API_V1_STR}/admin/analytics", tags=["Admin Analytics"])

@app.get("/")
def root():
    return {
        "message": "Welcome to the AI-Powered Loan Recommendation System API.",
        "docs_url": "/docs"
    }
