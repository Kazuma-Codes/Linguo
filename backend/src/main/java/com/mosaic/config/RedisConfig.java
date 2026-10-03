package com.mosaic.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.listener.RedisMessageListenerContainer;

/**
 * ponytail: Boot auto-configures RedisTemplate but NOT this container
 * (verified: RedisAutoConfiguration in Boot 3.5) — chat pub/sub fails to start without it.
 * upgrade path: delete this file if a future Boot version defines the bean itself.
 */
@Configuration
public class RedisConfig {

    @Bean
    RedisMessageListenerContainer redisMessageListenerContainer(RedisConnectionFactory connectionFactory) {
        RedisMessageListenerContainer container = new RedisMessageListenerContainer();
        container.setConnectionFactory(connectionFactory);
        return container;
    }
}
