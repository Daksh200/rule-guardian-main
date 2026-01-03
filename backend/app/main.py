from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routers import rules
from .database import engine, Base

# Create tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Fraud Detection API")

# CORS configuration
origins = [
    "http://localhost:5173", # Vite default port
    "http://localhost:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(rules.router)

@app.get("/")
def read_root():
    return {"message": "Welcome to the Fraud Detection API"}
