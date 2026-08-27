package com.linguo.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.connection.RedisStandaloneConfiguration;
import org.springframework.data.redis.connection.lettuce.LettuceConnectionFactory;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.listener.RedisMessageListenerContainer;

import java.net.URI;

@Configuration
public class RedisConfig {

    @Value("${REDIS_URL:redis://localhost:6379}")
    private String redisUrl;

    @Bean
    public RedisConnectionFactory redisConnectionFactory() {
        try {
            if (redisUrl != null && !redisUrl.isBlank()) {
                URI uri = new URI(redisUrl);
                String host = uri.getHost() != null ? uri.getHost() : "localhost";
                int port = uri.getPort() != -1 ? uri.getPort() : 6379;
                RedisStandaloneConfiguration config = new RedisStandaloneConfiguration(host, port);

                if (uri.getUserInfo() != null) {
                    String[] parts = uri.getUserInfo().split(":", 2);
                    if (parts.length == 2) {
                        config.setPassword(parts[1]);
                    } else if (parts.length == 1 && !parts[0].isEmpty()) {
                        config.setPassword(parts[0]);
                    }
                }

                boolean isSsl = "rediss".equalsIgnoreCase(uri.getScheme()) || redisUrl.startsWith("rediss://");
                if (isSsl) {
                    org.springframework.data.redis.connection.lettuce.LettuceClientConfiguration clientConfig =
                            org.springframework.data.redis.connection.lettuce.LettuceClientConfiguration.builder()
                                    .useSsl()
                                    .build();
                    return new LettuceConnectionFactory(config, clientConfig);
                }

                return new LettuceConnectionFactory(config);
            }
        } catch (Exception ignored) {
        }
        return new LettuceConnectionFactory();
    }

    @Bean
    public StringRedisTemplate stringRedisTemplate(RedisConnectionFactory connectionFactory) {
        return new StringRedisTemplate(connectionFactory);
    }

    @Bean
    public RedisMessageListenerContainer redisMessageListenerContainer(RedisConnectionFactory connectionFactory) {
        RedisMessageListenerContainer container = new RedisMessageListenerContainer();
        container.setConnectionFactory(connectionFactory);
        return container;
    }
}
