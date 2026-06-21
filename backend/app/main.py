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
    """Trigger DB seeding on startup if tables are empty."""
    seed_database()

# CORS configuration
# Allows requests from Next.js (usually http://localhost:3000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust for production to specify frontend domain
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
