"""
Application configuration settings.

Uses Pydantic Settings for environment variable management.
All configuration is loaded from environment variables or .env file.
"""

from functools import lru_cache
from typing import Optional

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Application settings loaded from environment variables.
    
    Attributes:
        APP_NAME: Application name
        APP_VERSION: Application version
        DEBUG: Debug mode flag
        API_V1_PREFIX: API version 1 prefix
        DATABASE_URL: PostgreSQL connection URL
        DATABASE_POOL_SIZE: Database connection pool size
        DATABASE_MAX_OVERFLOW: Max overflow connections
        REDIS_URL: Redis connection URL
        SECRET_KEY: Secret key for JWT signing (MUST be changed in production)
        JWT_ALGORITHM: Algorithm for JWT encoding
        ACCESS_TOKEN_EXPIRE_MINUTES: Access token expiry in minutes
        REFRESH_TOKEN_EXPIRE_DAYS: Refresh token expiry in days
        CORS_ORIGINS: List of allowed CORS origins
        GOOGLE_CLIENT_ID: Google OAuth client ID
        GOOGLE_CLIENT_SECRET: Google OAuth client secret
        GITHUB_CLIENT_ID: GitHub OAuth client ID
        GITHUB_CLIENT_SECRET: GitHub OAuth client secret
        RATE_LIMIT_ENABLED: Enable/disable rate limiting
        RATE_LIMIT_DEFAULT_CALLS: Default rate limit calls
        RATE_LIMIT_DEFAULT_PERIOD: Default rate limit period in seconds
    """
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )
    
    # Application
    APP_NAME: str = "Books4All"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    ENVIRONMENT: str = Field(default="development", description="Environment: development, staging, production")
    
    # API
    API_V1_PREFIX: str = "/api/v1"
    
    # Database
    DATABASE_URL: str = Field(
        default="postgresql+asyncpg://neo:gottacomedmra@localhost:5432/books4all_dev",
        description="PostgreSQL connection URL (async driver)"
    )
    DATABASE_POOL_SIZE: int = Field(default=5, ge=1, le=20, description="Connection pool size")
    DATABASE_MAX_OVERFLOW: int = Field(default=10, ge=0, le=50, description="Max overflow connections")
    DATABASE_ECHO: bool = Field(default=False, description="Echo SQL queries (debug)")
    
    # Redis
    REDIS_URL: str = Field(
        default="redis://localhost:6379/0",
        description="Redis connection URL"
    )
    REDIS_PASSWORD: Optional[str] = Field(default=None, description="Redis password if required")
    
    # JWT Security
    SECRET_KEY: str = Field(
        default="change-this-in-production-use-openssl-rand-hex-32",
        min_length=32,
        description="Secret key for JWT signing"
    )
    JWT_ALGORITHM: str = Field(default="HS256", description="JWT encoding algorithm")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(default=15, ge=5, le=60, description="Access token expiry")
    REFRESH_TOKEN_EXPIRE_DAYS: int = Field(default=7, ge=1, le=30, description="Refresh token expiry")
    
    # Password Hashing
    BCRYPT_ROUNDS: int = Field(default=12, ge=10, le=14, description="Bcrypt hashing rounds")
    
    # CORS
    CORS_ORIGINS: list[str] = Field(
        default=["http://localhost:3000"],
        description="Allowed CORS origins"
    )
    CORS_ALLOW_CREDENTIALS: bool = Field(default=True, description="Allow credentials in CORS")
    CORS_ALLOW_METHODS: list[str] = Field(default=["*"], description="Allowed CORS methods")
    CORS_ALLOW_HEADERS: list[str] = Field(default=["*"], description="Allowed CORS headers")
    
    # OAuth - Google
    GOOGLE_CLIENT_ID: Optional[str] = Field(default=None, description="Google OAuth client ID")
    GOOGLE_CLIENT_SECRET: Optional[str] = Field(default=None, description="Google OAuth client secret")
    GOOGLE_REDIRECT_URI: str = Field(
        default="http://localhost:8000/api/v1/auth/google/callback",
        description="Google OAuth redirect URI"
    )
    
    # OAuth - GitHub
    GITHUB_CLIENT_ID: Optional[str] = Field(default=None, description="GitHub OAuth client ID")
    GITHUB_CLIENT_SECRET: Optional[str] = Field(default=None, description="GitHub OAuth client secret")
    GITHUB_REDIRECT_URI: str = Field(
        default="http://localhost:8000/api/v1/auth/github/callback",
        description="GitHub OAuth redirect URI"
    )
    
    # Rate Limiting
    RATE_LIMIT_ENABLED: bool = Field(default=True, description="Enable rate limiting")
    RATE_LIMIT_DEFAULT_CALLS: int = Field(default=100, description="Default rate limit calls")
    RATE_LIMIT_DEFAULT_PERIOD: int = Field(default=60, description="Default rate limit period (seconds)")
    RATE_LIMIT_LOGIN_CALLS: int = Field(default=5, description="Login rate limit calls")
    RATE_LIMIT_LOGIN_PERIOD: int = Field(default=900, description="Login rate limit period (seconds)")
    
    # File Upload
    MAX_UPLOAD_SIZE: int = Field(default=5 * 1024 * 1024, description="Max upload size in bytes (5MB)")
    ALLOWED_IMAGE_TYPES: list[str] = Field(
        default=["image/jpeg", "image/png", "image/webp"],
        description="Allowed image MIME types"
    )
    
    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def parse_cors_origins(cls, v: str | list[str]) -> list[str]:
        """Parse CORS origins from string or list."""
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(",")]
        return v
    
    @property
    def is_production(self) -> bool:
        """Check if running in production environment."""
        return self.ENVIRONMENT == "production"
    
    @property
    def is_development(self) -> bool:
        """Check if running in development environment."""
        return self.ENVIRONMENT == "development"
    
    @property
    def google_oauth_enabled(self) -> bool:
        """Check if Google OAuth is configured."""
        return bool(self.GOOGLE_CLIENT_ID and self.GOOGLE_CLIENT_SECRET)
    
    @property
    def github_oauth_enabled(self) -> bool:
        """Check if GitHub OAuth is configured."""
        return bool(self.GITHUB_CLIENT_ID and self.GITHUB_CLIENT_SECRET)

#dev-note use lru_cache to cache settings instance no matter how many times it's called
@lru_cache()
def get_settings() -> Settings:
    """
    Get cached settings instance.
    
    Uses lru_cache to ensure settings are loaded only once.
    
    Returns:
        Settings: Application settings instance
    """
    return Settings()


# Global settings instance for convenience
settings = get_settings()
