"""
Redis-based rate limiting.

Provides:
- Configurable rate limiting using Redis
- Sliding window algorithm for accurate limiting
- Decorators for easy endpoint protection
- Proper 429 responses with Retry-After header
"""

import asyncio
import hashlib
import time
from functools import wraps
from typing import Callable, Optional

from fastapi import HTTPException, Request, Response, status
from redis import asyncio as aioredis

from app.core.config import settings


class RateLimiter:
    """
    Redis-based rate limiter using sliding window algorithm.
    
    Attributes:
        redis: Redis client instance
        prefix: Key prefix for rate limit entries
    """
    
    def __init__(self, redis_url: Optional[str] = None):
        """
        Initialize rate limiter.
        
        Args:
            redis_url: Redis connection URL. Uses settings if not provided.
        """
        self._redis_url = redis_url or settings.REDIS_URL
        self._redis: Optional[aioredis.Redis] = None
        self.prefix = "rate_limit:"
    
    async def get_redis(self) -> aioredis.Redis:
        """
        Get or create Redis connection.
        
        Returns:
            Redis: Async Redis client
        """
        if self._redis is None:
            self._redis = await aioredis.from_url(
                self._redis_url,
                encoding="utf-8",
                decode_responses=True,
            )
        return self._redis
    
    async def close(self) -> None:
        """Close Redis connection."""
        if self._redis:
            await self._redis.close()
            self._redis = None
    
    def _get_key(self, identifier: str, endpoint: str) -> str:
        """
        Generate Redis key for rate limit entry.
        
        Args:
            identifier: Unique identifier (e.g., IP, user_id)
            endpoint: API endpoint path
            
        Returns:
            str: Redis key
        """
        # Hash the endpoint to keep keys shorter
        endpoint_hash = hashlib.md5(endpoint.encode()).hexdigest()[:8]
        return f"{self.prefix}{identifier}:{endpoint_hash}"
    
    async def is_rate_limited(
        self,
        identifier: str,
        endpoint: str,
        max_calls: int,
        period: int,
    ) -> tuple[bool, int, int]:
        """
        Check if request should be rate limited.
        
        Uses sliding window algorithm for accurate rate limiting.
        
        Args:
            identifier: Unique identifier (IP or user_id)
            endpoint: API endpoint being accessed
            max_calls: Maximum allowed calls in period
            period: Time period in seconds
            
        Returns:
            tuple: (is_limited, remaining_calls, retry_after_seconds)
        """
        if not settings.RATE_LIMIT_ENABLED:
            return False, max_calls, 0
        
        redis = await self.get_redis()
        key = self._get_key(identifier, endpoint)
        now = time.time()
        window_start = now - period
        
        # Use pipeline for atomic operations
        pipe = redis.pipeline()
        
        # Remove old entries outside the window
        pipe.zremrangebyscore(key, 0, window_start)
        
        # Count current entries in window
        pipe.zcard(key)
        
        # Add current request
        pipe.zadd(key, {str(now): now})
        
        # Set expiry on the key
        pipe.expire(key, period)
        
        results = await pipe.execute()
        current_count = results[1]  # zcard result
        
        if current_count >= max_calls:
            # Get oldest entry to calculate retry-after
            oldest = await redis.zrange(key, 0, 0, withscores=True)
            if oldest:
                retry_after = int(period - (now - oldest[0][1])) + 1
            else:
                retry_after = period
            
            return True, 0, retry_after
        
        remaining = max_calls - current_count - 1
        return False, remaining, 0
    
    async def reset(self, identifier: str, endpoint: str) -> None:
        """
        Reset rate limit for a specific identifier/endpoint.
        
        Args:
            identifier: Unique identifier
            endpoint: API endpoint
        """
        redis = await self.get_redis()
        key = self._get_key(identifier, endpoint)
        await redis.delete(key)


# Global rate limiter instance
rate_limiter = RateLimiter()


def get_client_identifier(request: Request) -> str:
    """
    Get unique identifier for the client.
    
    Uses user_id if authenticated, otherwise falls back to IP.
    
    Args:
        request: FastAPI request object
        
    Returns:
        str: Client identifier
    """
    # Check for authenticated user
    if hasattr(request.state, "user") and request.state.user:
        return f"user:{request.state.user.id}"
    
    # Fall back to IP address
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        # Get the first IP in the chain (client IP)
        ip = forwarded.split(",")[0].strip()
    else:
        ip = request.client.host if request.client else "unknown"
    
    return f"ip:{ip}"


def rate_limit(
    calls: int = settings.RATE_LIMIT_DEFAULT_CALLS,
    period: int = settings.RATE_LIMIT_DEFAULT_PERIOD,
    identifier_func: Optional[Callable[[Request], str]] = None,
) -> Callable:
    """
    Rate limiting decorator for FastAPI endpoints.
    
    Applies rate limiting based on calls per period using sliding window.
    
    Args:
        calls: Maximum number of calls allowed in period
        period: Time period in seconds
        identifier_func: Custom function to get client identifier
        
    Returns:
        Callable: Decorator function
        
    Example:
        @router.post("/login")
        @rate_limit(calls=5, period=900)  # 5 attempts per 15 minutes
        async def login(credentials: LoginCredentials):
            ...
        
        @router.get("/books")
        @rate_limit(calls=100, period=60)  # 100 requests per minute
        async def list_books():
            ...
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Find request object in args/kwargs
            request: Optional[Request] = None
            for arg in args:
                if isinstance(arg, Request):
                    request = arg
                    break
            if request is None:
                request = kwargs.get("request")
            
            if request is None:
                # Can't rate limit without request, proceed normally
                return await func(*args, **kwargs)
            
            # Get client identifier
            if identifier_func:
                identifier = identifier_func(request)
            else:
                identifier = get_client_identifier(request)
            
            # Check rate limit
            endpoint = request.url.path
            is_limited, remaining, retry_after = await rate_limiter.is_rate_limited(
                identifier=identifier,
                endpoint=endpoint,
                max_calls=calls,
                period=period,
            )
            
            if is_limited:
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail=f"Rate limit exceeded. Try again in {retry_after} seconds.",
                    headers={
                        "Retry-After": str(retry_after),
                        "X-RateLimit-Limit": str(calls),
                        "X-RateLimit-Remaining": "0",
                        "X-RateLimit-Reset": str(int(time.time()) + retry_after),
                    },
                )
            
            # Execute the endpoint
            response = await func(*args, **kwargs)
            
            # Add rate limit headers to response if possible
            # Note: This requires the endpoint to return a Response object
            # or be wrapped in a middleware that adds headers
            
            return response
        
        return wrapper
    
    return decorator


class RateLimitMiddleware:
    """
    ASGI middleware for global rate limiting.
    
    Applies rate limiting to all requests before they reach endpoints.
    More efficient for global limits, use decorator for endpoint-specific limits.
    """
    
    def __init__(
        self,
        app,
        calls: int = settings.RATE_LIMIT_DEFAULT_CALLS,
        period: int = settings.RATE_LIMIT_DEFAULT_PERIOD,
        exclude_paths: Optional[list[str]] = None,
    ):
        """
        Initialize middleware.
        
        Args:
            app: ASGI application
            calls: Max calls per period
            period: Period in seconds
            exclude_paths: Paths to exclude from rate limiting
        """
        self.app = app
        self.calls = calls
        self.period = period
        self.exclude_paths = exclude_paths or ["/health", "/docs", "/redoc", "/openapi.json"]
    
    async def __call__(self, scope, receive, send):
        """Handle ASGI request."""
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return
        
        request = Request(scope, receive, send)
        path = request.url.path
        
        # Skip excluded paths
        if any(path.startswith(excluded) for excluded in self.exclude_paths):
            await self.app(scope, receive, send)
            return
        
        # Check rate limit
        identifier = get_client_identifier(request)
        is_limited, remaining, retry_after = await rate_limiter.is_rate_limited(
            identifier=identifier,
            endpoint="global",
            max_calls=self.calls,
            period=self.period,
        )
        
        if is_limited:
            response = Response(
                content=f'{{"detail": "Rate limit exceeded. Try again in {retry_after} seconds."}}',
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                media_type="application/json",
                headers={
                    "Retry-After": str(retry_after),
                    "X-RateLimit-Limit": str(self.calls),
                    "X-RateLimit-Remaining": "0",
                    "X-RateLimit-Reset": str(int(time.time()) + retry_after),
                },
            )
            await response(scope, receive, send)
            return
        
        # Add rate limit headers via middleware
        async def send_with_headers(message):
            if message["type"] == "http.response.start":
                headers = list(message.get("headers", []))
                headers.extend([
                    (b"X-RateLimit-Limit", str(self.calls).encode()),
                    (b"X-RateLimit-Remaining", str(remaining).encode()),
                    (b"X-RateLimit-Reset", str(int(time.time()) + self.period).encode()),
                ])
                message["headers"] = headers
            await send(message)
        
        await self.app(scope, receive, send_with_headers)


# Convenience decorators for common rate limits
def login_rate_limit():
    """Rate limit for login endpoints (5 attempts per 15 minutes)."""
    return rate_limit(
        calls=settings.RATE_LIMIT_LOGIN_CALLS,
        period=settings.RATE_LIMIT_LOGIN_PERIOD,
    )


def api_rate_limit():
    """Rate limit for general API endpoints (100 calls per minute)."""
    return rate_limit(
        calls=settings.RATE_LIMIT_DEFAULT_CALLS,
        period=settings.RATE_LIMIT_DEFAULT_PERIOD,
    )


def strict_rate_limit():
    """Strict rate limit for sensitive endpoints (10 calls per minute)."""
    return rate_limit(calls=10, period=60)
