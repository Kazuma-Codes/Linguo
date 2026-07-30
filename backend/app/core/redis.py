"""Redis client initialization — provides two separate connections for different use cases.

- redis_client: General-purpose async Redis (get/set/delete for caching, rate limiting)
- pubsub_client: Dedicated connection for Redis Pub/Sub (subscribe/publish for real-time chat)
"""

import redis.asyncio as redis

from app.core.config import settings

# General-purpose client for caching, session storage, rate limiting, etc.
redis_client = redis.from_url(settings.REDIS_URL, decode_responses=True)

# Separate client dedicated to Pub/Sub — a single connection cannot be used for
# both regular commands and pub/sub subscriptions simultaneously in redis-py.
pubsub_client = redis.from_url(settings.REDIS_URL, decode_responses=True)