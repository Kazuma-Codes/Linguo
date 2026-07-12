
# imports the async version of redis to allow asyncronous operation
import redis.asyncio as redis

from app.core.config import settings

# used for caching , session storage, rate limiting 
# normal redis = get , set ,del, upda
redis_client = redis.from_url(settings.REDIS_URL,decode_responses = True)


# used for real time chat , notification , live updates
# used for subscribe, publish
pubsub_client = redis.from_url(settings.REDIS_URL,decode_response  = True)