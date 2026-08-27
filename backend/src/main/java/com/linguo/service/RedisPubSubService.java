package com.linguo.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.linguo.model.dto.WsOutgoingMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.redis.connection.Message;
import org.springframework.data.redis.connection.MessageListener;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.listener.ChannelTopic;
import org.springframework.data.redis.listener.RedisMessageListenerContainer;
import org.springframework.stereotype.Service;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArraySet;

@Service
public class RedisPubSubService {

    private static final Logger log = LoggerFactory.getLogger(RedisPubSubService.class);

    private final StringRedisTemplate redisTemplate;
    private final RedisMessageListenerContainer listenerContainer;
    private final ObjectMapper objectMapper;

    private final Map<String, Set<WebSocketSession>> roomSessions = new ConcurrentHashMap<>();
    private final Map<String, MessageListener> roomListeners = new ConcurrentHashMap<>();

    public RedisPubSubService(StringRedisTemplate redisTemplate, RedisMessageListenerContainer listenerContainer, ObjectMapper objectMapper) {
        this.redisTemplate = redisTemplate;
        this.listenerContainer = listenerContainer;
        this.objectMapper = objectMapper;
    }

    public void addSession(String roomId, WebSocketSession session) {
        roomSessions.computeIfAbsent(roomId, k -> new CopyOnWriteArraySet<>()).add(session);
        ensureListener(roomId);
    }

    public void removeSession(String roomId, WebSocketSession session) {
        Set<WebSocketSession> sessions = roomSessions.get(roomId);
        if (sessions != null) {
            sessions.remove(session);
            if (sessions.isEmpty()) {
                roomSessions.remove(roomId);
                removeListener(roomId);
            }
        }
    }

    public void broadcastLocal(String roomId, String payload) {
        Set<WebSocketSession> sessions = roomSessions.get(roomId);
        if (sessions != null) {
            for (WebSocketSession session : sessions) {
                if (session.isOpen()) {
                    try {
                        session.sendMessage(new TextMessage(payload));
                    } catch (IOException e) {
                        log.warn("Failed to send message to session {}: {}", session.getId(), e.getMessage());
                    }
                }
            }
        }
    }

    public void publish(String roomId, WsOutgoingMessage message) {
        try {
            String json = objectMapper.writeValueAsString(message);
            redisTemplate.convertAndSend("chat:" + roomId, json);
        } catch (Exception e) {
            log.error("Failed to publish chat message for room {}: {}", roomId, e.getMessage());
        }
    }

    private synchronized void ensureListener(String roomId) {
        if (!roomListeners.containsKey(roomId)) {
            MessageListener listener = (Message message, byte[] pattern) -> {
                String payload = new String(message.getBody(), StandardCharsets.UTF_8);
                broadcastLocal(roomId, payload);
            };
            listenerContainer.addMessageListener(listener, new ChannelTopic("chat:" + roomId));
            roomListeners.put(roomId, listener);
            log.info("Started Redis Pub/Sub listener for room {}", roomId);
        }
    }

    private synchronized void removeListener(String roomId) {
        MessageListener listener = roomListeners.remove(roomId);
        if (listener != null) {
            listenerContainer.removeMessageListener(listener, new ChannelTopic("chat:" + roomId));
            log.info("Stopped Redis Pub/Sub listener for room {}", roomId);
        }
    }
}
