import os

# JWT Settings
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "hackathon-secret-key-12345")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440")) # 24 hours for hackathon

# CORS Settings
raw_cors = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://localhost:3000")
CORS_ORIGINS = [origin.strip() for origin in raw_cors.split(",") if origin.strip()]
