"""
Multi-tier caching system for PDF parsing results.
Reduces redundant AI API calls and improves performance.
"""

import hashlib
import json
import logging
from typing import Optional, Any, Dict
from datetime import timedelta
import redis
from core.config import settings

logger = logging.getLogger(__name__)


class CacheManager:
    """
    Multi-tier cache manager for PDF parsing results.

    Cache Tiers:
    - L1: Redis (15 min TTL) - Fast, in-memory
    - L2: Could add database cache if needed

    Cache Keys:
    - PDF hash + course name → parsed assignments
    - Intermediate results: tables, text, metadata
    """

    def __init__(self):
        try:
            self.redis_client = redis.Redis(
                host=settings.REDIS_URL.split('://')[1].split(':')[0] if '://' in settings.REDIS_URL else 'localhost',
                port=6379,
                db=1,  # Use DB 1 for caching (DB 0 is for Celery)
                decode_responses=False  # We'll handle encoding
            )
            # Test connection
            self.redis_client.ping()
            self.redis_available = True
            logger.info("Redis cache initialized successfully")
        except Exception as e:
            logger.warning(f"Redis unavailable, caching disabled: {str(e)}")
            self.redis_available = False

    def _generate_pdf_hash(self, pdf_content: bytes) -> str:
        """Generate SHA256 hash of PDF content"""
        return hashlib.sha256(pdf_content).hexdigest()

    def _generate_cache_key(
        self,
        pdf_content: bytes,
        course_name: Optional[str] = None,
        prefix: str = "pdf_parse"
    ) -> str:
        """
        Generate cache key from PDF hash and optional course name.

        Args:
            pdf_content: Raw PDF bytes
            course_name: Optional course name
            prefix: Key prefix for namespacing

        Returns:
            Cache key string
        """
        pdf_hash = self._generate_pdf_hash(pdf_content)

        if course_name:
            # Include course name in key (same PDF might be parsed differently with context)
            key = f"{prefix}:{pdf_hash}:{hashlib.md5(course_name.encode()).hexdigest()[:8]}"
        else:
            key = f"{prefix}:{pdf_hash}"

        return key

    async def get_parsed_assignments(
        self,
        pdf_content: bytes,
        course_name: Optional[str] = None
    ) -> Optional[Dict[str, Any]]:
        """
        Retrieve cached parsing results.

        Args:
            pdf_content: Raw PDF bytes
            course_name: Optional course name

        Returns:
            Cached results or None if not found
        """
        if not self.redis_available:
            return None

        try:
            cache_key = self._generate_cache_key(pdf_content, course_name)

            cached_data = self.redis_client.get(cache_key)

            if cached_data:
                logger.info(f"Cache HIT for key: {cache_key[:50]}...")
                result = json.loads(cached_data.decode('utf-8'))
                return result
            else:
                logger.debug(f"Cache MISS for key: {cache_key[:50]}...")
                return None

        except Exception as e:
            logger.error(f"Error retrieving from cache: {str(e)}")
            return None

    async def set_parsed_assignments(
        self,
        pdf_content: bytes,
        assignments: Dict[str, Any],
        course_name: Optional[str] = None,
        ttl_minutes: int = 15
    ):
        """
        Store parsing results in cache.

        Args:
            pdf_content: Raw PDF bytes
            assignments: Parsed assignments data
            course_name: Optional course name
            ttl_minutes: Time to live in minutes (default 15)
        """
        if not self.redis_available:
            return

        try:
            cache_key = self._generate_cache_key(pdf_content, course_name)

            # Serialize data
            cached_data = json.dumps(assignments).encode('utf-8')

            # Store with TTL
            self.redis_client.setex(
                cache_key,
                timedelta(minutes=ttl_minutes),
                cached_data
            )

            logger.info(
                f"Cached results for key: {cache_key[:50]}... "
                f"(TTL: {ttl_minutes} min)"
            )

        except Exception as e:
            logger.error(f"Error storing in cache: {str(e)}")

    async def get_intermediate_result(
        self,
        pdf_content: bytes,
        result_type: str  # 'tables', 'text', 'metadata'
    ) -> Optional[Any]:
        """
        Retrieve cached intermediate parsing results.

        Args:
            pdf_content: Raw PDF bytes
            result_type: Type of intermediate result

        Returns:
            Cached intermediate result or None
        """
        if not self.redis_available:
            return None

        try:
            cache_key = self._generate_cache_key(
                pdf_content,
                prefix=f"intermediate:{result_type}"
            )

            cached_data = self.redis_client.get(cache_key)

            if cached_data:
                logger.debug(f"Intermediate cache HIT for {result_type}")
                return json.loads(cached_data.decode('utf-8'))

            return None

        except Exception as e:
            logger.error(f"Error retrieving intermediate result from cache: {str(e)}")
            return None

    async def set_intermediate_result(
        self,
        pdf_content: bytes,
        result_type: str,
        data: Any,
        ttl_minutes: int = 30
    ):
        """
        Store intermediate parsing results.

        Args:
            pdf_content: Raw PDF bytes
            result_type: Type of intermediate result
            data: Data to cache
            ttl_minutes: Time to live in minutes
        """
        if not self.redis_available:
            return

        try:
            cache_key = self._generate_cache_key(
                pdf_content,
                prefix=f"intermediate:{result_type}"
            )

            cached_data = json.dumps(data).encode('utf-8')

            self.redis_client.setex(
                cache_key,
                timedelta(minutes=ttl_minutes),
                cached_data
            )

            logger.debug(f"Cached intermediate result: {result_type}")

        except Exception as e:
            logger.error(f"Error storing intermediate result: {str(e)}")

    def clear_cache(self, pattern: str = "pdf_parse:*"):
        """
        Clear cache entries matching pattern.

        Args:
            pattern: Redis key pattern to match
        """
        if not self.redis_available:
            return

        try:
            keys = self.redis_client.keys(pattern)
            if keys:
                self.redis_client.delete(*keys)
                logger.info(f"Cleared {len(keys)} cache entries matching '{pattern}'")
        except Exception as e:
            logger.error(f"Error clearing cache: {str(e)}")

    def get_cache_stats(self) -> Dict[str, Any]:
        """Get cache statistics"""
        if not self.redis_available:
            return {"available": False}

        try:
            info = self.redis_client.info('stats')
            return {
                "available": True,
                "total_keys": self.redis_client.dbsize(),
                "hits": info.get('keyspace_hits', 0),
                "misses": info.get('keyspace_misses', 0),
                "hit_rate": info.get('keyspace_hits', 0) / max(
                    info.get('keyspace_hits', 0) + info.get('keyspace_misses', 0), 1
                )
            }
        except Exception as e:
            logger.error(f"Error getting cache stats: {str(e)}")
            return {"available": False, "error": str(e)}
