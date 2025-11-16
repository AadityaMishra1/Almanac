"""
Rate limiter for AI API calls to respect free tier limits.
Prevents hitting rate limits and ensures fair usage across requests.
"""

import asyncio
import logging
from typing import Dict, Optional
from datetime import datetime, timedelta
from collections import deque

logger = logging.getLogger(__name__)


class TokenBucket:
    """
    Token bucket algorithm for rate limiting.
    Allows burst traffic while maintaining average rate.
    """

    def __init__(
        self,
        capacity: int,
        refill_rate: float,  # tokens per second
        name: str = "default"
    ):
        """
        Args:
            capacity: Maximum number of tokens in bucket
            refill_rate: Tokens added per second
            name: Identifier for this bucket
        """
        self.capacity = capacity
        self.refill_rate = refill_rate
        self.name = name

        self.tokens = float(capacity)
        self.last_refill = datetime.now()

    def _refill(self):
        """Refill tokens based on elapsed time"""
        now = datetime.now()
        elapsed = (now - self.last_refill).total_seconds()

        # Calculate tokens to add
        tokens_to_add = elapsed * self.refill_rate
        self.tokens = min(self.capacity, self.tokens + tokens_to_add)
        self.last_refill = now

    async def acquire(self, tokens: int = 1) -> bool:
        """
        Try to acquire tokens.

        Args:
            tokens: Number of tokens to acquire

        Returns:
            True if tokens acquired, False otherwise
        """
        self._refill()

        if self.tokens >= tokens:
            self.tokens -= tokens
            logger.debug(
                f"Token bucket '{self.name}': Acquired {tokens} tokens. "
                f"Remaining: {self.tokens:.1f}/{self.capacity}"
            )
            return True

        logger.debug(
            f"Token bucket '{self.name}': Insufficient tokens. "
            f"Need {tokens}, have {self.tokens:.1f}"
        )
        return False

    async def wait_for_token(self, tokens: int = 1, timeout: float = 60.0):
        """
        Wait until tokens are available.

        Args:
            tokens: Number of tokens needed
            timeout: Maximum wait time in seconds

        Raises:
            TimeoutError: If tokens not available within timeout
        """
        start_time = datetime.now()

        while True:
            if await self.acquire(tokens):
                return

            # Check timeout
            elapsed = (datetime.now() - start_time).total_seconds()
            if elapsed >= timeout:
                raise TimeoutError(
                    f"Could not acquire {tokens} tokens within {timeout}s"
                )

            # Calculate wait time until next token
            wait_time = min(tokens / self.refill_rate, 1.0)
            await asyncio.sleep(wait_time)

    def get_status(self) -> Dict:
        """Get current token bucket status"""
        self._refill()
        return {
            "name": self.name,
            "tokens": self.tokens,
            "capacity": self.capacity,
            "refill_rate": self.refill_rate,
            "utilization": 1 - (self.tokens / self.capacity)
        }


class RateLimiter:
    """
    Rate limiter for multiple AI models with different limits.

    Free Tier Limits:
    - Gemini 2.0 Flash: 1,500 requests/day, 15 requests/min
    - Groq: 1,000 requests/day, 6,000 tokens/min
    """

    def __init__(self):
        # Gemini rate limits
        self.gemini_per_minute = TokenBucket(
            capacity=15,
            refill_rate=15 / 60,  # 15 requests per 60 seconds
            name="gemini_per_minute"
        )

        self.gemini_per_day = TokenBucket(
            capacity=1500,
            refill_rate=1500 / (24 * 3600),  # 1500 requests per day
            name="gemini_per_day"
        )

        # Groq rate limits
        self.groq_per_minute = TokenBucket(
            capacity=30,  # Conservative limit
            refill_rate=30 / 60,
            name="groq_per_minute"
        )

        self.groq_per_day = TokenBucket(
            capacity=1000,
            refill_rate=1000 / (24 * 3600),
            name="groq_per_day"
        )

        # Tracking
        self.request_history: Dict[str, deque] = {
            'gemini': deque(maxlen=1500),
            'groq': deque(maxlen=1000)
        }

    async def acquire_gemini(self, timeout: float = 60.0):
        """
        Acquire rate limit tokens for Gemini API call.

        Args:
            timeout: Maximum wait time

        Raises:
            TimeoutError: If rate limit cannot be satisfied
        """
        # Check both per-minute and per-day limits
        await self.gemini_per_minute.wait_for_token(timeout=timeout)
        await self.gemini_per_day.wait_for_token(timeout=timeout)

        # Record request
        self.request_history['gemini'].append(datetime.now())

        logger.debug("Gemini rate limit tokens acquired")

    async def acquire_groq(self, timeout: float = 60.0):
        """
        Acquire rate limit tokens for Groq API call.

        Args:
            timeout: Maximum wait time

        Raises:
            TimeoutError: If rate limit cannot be satisfied
        """
        await self.groq_per_minute.wait_for_token(timeout=timeout)
        await self.groq_per_day.wait_for_token(timeout=timeout)

        self.request_history['groq'].append(datetime.now())

        logger.debug("Groq rate limit tokens acquired")

    def can_use_gemini(self) -> bool:
        """Check if Gemini API is currently available"""
        return (
            self.gemini_per_minute.tokens >= 1 and
            self.gemini_per_day.tokens >= 1
        )

    def can_use_groq(self) -> bool:
        """Check if Groq API is currently available"""
        return (
            self.groq_per_minute.tokens >= 1 and
            self.groq_per_day.tokens >= 1
        )

    def get_status(self) -> Dict:
        """Get rate limiter status for all models"""
        return {
            "gemini": {
                "per_minute": self.gemini_per_minute.get_status(),
                "per_day": self.gemini_per_day.get_status(),
                "requests_today": len([
                    t for t in self.request_history['gemini']
                    if (datetime.now() - t) < timedelta(days=1)
                ]),
                "available": self.can_use_gemini()
            },
            "groq": {
                "per_minute": self.groq_per_minute.get_status(),
                "per_day": self.groq_per_day.get_status(),
                "requests_today": len([
                    t for t in self.request_history['groq']
                    if (datetime.now() - t) < timedelta(days=1)
                ]),
                "available": self.can_use_groq()
            }
        }
