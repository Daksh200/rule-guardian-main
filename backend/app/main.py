from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routers import rules
from .routers import auth

app = FastAPI(title="Fraud Detection API")

# CORS configuration
origins = [
    "http://localhost:8080",
    "http://localhost:8081",
    "http://localhost:5173",
    "http://localhost:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(rules.router)

@app.get("/")
def read_root():
    return {"message": "Welcome to the Fraud Detection API"}
