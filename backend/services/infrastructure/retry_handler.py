"""
Retry handler with exponential backoff and circuit breaker pattern.
Ensures robust API calls with graceful failure handling.
"""

import asyncio
import logging
from typing import Callable, Any, Optional, TypeVar, Dict
from datetime import datetime, timedelta
from enum import Enum

logger = logging.getLogger(__name__)

T = TypeVar('T')


class CircuitState(Enum):
    """Circuit breaker states"""
    CLOSED = "closed"  # Normal operation
    OPEN = "open"  # Failing, reject requests
    HALF_OPEN = "half_open"  # Testing if service recovered


class CircuitBreaker:
    """
    Circuit breaker to prevent cascading failures.
    Opens after threshold failures, closes after recovery period.
    """

    def __init__(
        self,
        failure_threshold: int = 5,
        recovery_timeout: int = 60,
        name: str = "default"
    ):
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.name = name

        self.failure_count = 0
        self.last_failure_time: Optional[datetime] = None
        self.state = CircuitState.CLOSED

    def record_success(self):
        """Record successful call, reset failure count"""
        self.failure_count = 0
        self.state = CircuitState.CLOSED
        logger.info(f"Circuit breaker '{self.name}': Success recorded, circuit CLOSED")

    def record_failure(self):
        """Record failed call, potentially open circuit"""
        self.failure_count += 1
        self.last_failure_time = datetime.now()

        if self.failure_count >= self.failure_threshold:
            self.state = CircuitState.OPEN
            logger.warning(
                f"Circuit breaker '{self.name}': OPENED after {self.failure_count} failures"
            )
        else:
            logger.debug(
                f"Circuit breaker '{self.name}': Failure {self.failure_count}/{self.failure_threshold}"
            )

    def can_attempt(self) -> bool:
        """Check if request should be attempted"""
        if self.state == CircuitState.CLOSED:
            return True

        if self.state == CircuitState.OPEN:
            # Check if recovery timeout has passed
            if self.last_failure_time:
                time_since_failure = (datetime.now() - self.last_failure_time).total_seconds()
                if time_since_failure >= self.recovery_timeout:
                    self.state = CircuitState.HALF_OPEN
                    logger.info(f"Circuit breaker '{self.name}': HALF_OPEN, testing recovery")
                    return True
            return False

        # HALF_OPEN state - allow one attempt
        return True

    def get_state(self) -> Dict[str, Any]:
        """Get current circuit breaker state"""
        return {
            "name": self.name,
            "state": self.state.value,
            "failure_count": self.failure_count,
            "last_failure_time": self.last_failure_time.isoformat() if self.last_failure_time else None
        }


class RetryHandler:
    """
    Handles retries with exponential backoff for API calls.
    Integrates with circuit breaker for fail-fast behavior.
    """

    def __init__(
        self,
        max_retries: int = 4,
        base_delay: float = 1.0,
        max_delay: float = 32.0,
        exponential_base: float = 2.0,
        circuit_breaker: Optional[CircuitBreaker] = None
    ):
        """
        Args:
            max_retries: Maximum number of retry attempts
            base_delay: Initial delay in seconds
            max_delay: Maximum delay in seconds
            exponential_base: Base for exponential backoff calculation
            circuit_breaker: Optional circuit breaker instance
        """
        self.max_retries = max_retries
        self.base_delay = base_delay
        self.max_delay = max_delay
        self.exponential_base = exponential_base
        self.circuit_breaker = circuit_breaker

    def _calculate_delay(self, attempt: int) -> float:
        """Calculate exponential backoff delay"""
        delay = min(
            self.base_delay * (self.exponential_base ** attempt),
            self.max_delay
        )
        return delay

    async def execute_with_retry(
        self,
        func: Callable,
        *args,
        **kwargs
    ) -> Any:
        """
        Execute function with retry logic and exponential backoff.

        Args:
            func: Async function to execute
            *args: Positional arguments for func
            **kwargs: Keyword arguments for func

        Returns:
            Function result

        Raises:
            Exception: If all retries exhausted
        """
        last_exception = None

        for attempt in range(self.max_retries + 1):
            # Check circuit breaker
            if self.circuit_breaker and not self.circuit_breaker.can_attempt():
                logger.error(
                    f"Circuit breaker '{self.circuit_breaker.name}' is OPEN, failing fast"
                )
                raise Exception(
                    f"Circuit breaker '{self.circuit_breaker.name}' is OPEN. "
                    f"Service temporarily unavailable."
                )

            try:
                logger.debug(f"Attempt {attempt + 1}/{self.max_retries + 1}")

                # Execute function
                result = await func(*args, **kwargs)

                # Success - record in circuit breaker
                if self.circuit_breaker:
                    self.circuit_breaker.record_success()

                if attempt > 0:
                    logger.info(f"Succeeded on attempt {attempt + 1}")

                return result

            except Exception as e:
                last_exception = e

                # Record failure in circuit breaker
                if self.circuit_breaker:
                    self.circuit_breaker.record_failure()

                # If last attempt, don't retry
                if attempt >= self.max_retries:
                    logger.error(
                        f"All {self.max_retries + 1} attempts failed. Last error: {str(e)}"
                    )
                    break

                # Calculate delay
                delay = self._calculate_delay(attempt)

                logger.warning(
                    f"Attempt {attempt + 1} failed: {str(e)}. "
                    f"Retrying in {delay:.1f}s..."
                )

                # Wait before retry
                await asyncio.sleep(delay)

        # All retries exhausted
        raise last_exception or Exception("All retry attempts failed")


class MultiModelRetryStrategy:
    """
    Strategy for retrying across multiple AI models with fallback.

    Example:
        1. Try Gemini 2.0 Flash
        2. Try Groq + Llama Vision
        3. Try rule-based parsing
    """

    def __init__(self, models: list[Dict[str, Any]]):
        """
        Args:
            models: List of model configs with 'name', 'func', 'circuit_breaker'
        """
        self.models = models

    async def execute_with_fallback(
        self,
        *args,
        **kwargs
    ) -> tuple[Any, str]:
        """
        Try each model in sequence until one succeeds.

        Returns:
            tuple: (result, model_name_used)

        Raises:
            Exception: If all models fail
        """
        last_exception = None

        for model_config in self.models:
            model_name = model_config['name']
            model_func = model_config['func']
            circuit_breaker = model_config.get('circuit_breaker')

            # Check circuit breaker
            if circuit_breaker and not circuit_breaker.can_attempt():
                logger.warning(
                    f"Model '{model_name}' circuit breaker is OPEN, skipping to next model"
                )
                continue

            try:
                logger.info(f"Attempting to use model: {model_name}")

                # Execute model function
                result = await model_func(*args, **kwargs)

                # Success
                if circuit_breaker:
                    circuit_breaker.record_success()

                logger.info(f"Successfully used model: {model_name}")
                return result, model_name

            except Exception as e:
                last_exception = e
                logger.warning(f"Model '{model_name}' failed: {str(e)}")

                if circuit_breaker:
                    circuit_breaker.record_failure()

                # Try next model
                continue

        # All models failed
        logger.error("All models failed to process request")
        raise last_exception or Exception("All AI models failed")
