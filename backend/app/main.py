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
    try:
        db.execute(text("SELECT reset_token, reset_token_expires_at, otp_code, otp_expires_at FROM users LIMIT 1"))
    except Exception:
        db.rollback()
        # Add reset_token columns if missing
        try:
            db.execute(text("ALTER TABLE users ADD COLUMN reset_token VARCHAR"))
            db.execute(text("ALTER TABLE users ADD COLUMN reset_token_expires_at DATETIME"))
            db.commit()
        except Exception:
            db.rollback()

        # Add otp columns if missing
        try:
            db.execute(text("ALTER TABLE users ADD COLUMN otp_code VARCHAR"))
            db.execute(text("ALTER TABLE users ADD COLUMN otp_expires_at DATETIME"))
            db.commit()
            print("Successfully added OTP columns to users table.")
        except Exception as alter_err:
            db.rollback()
            print(f"Failed to alter users table for OTP: {str(alter_err)}")
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
