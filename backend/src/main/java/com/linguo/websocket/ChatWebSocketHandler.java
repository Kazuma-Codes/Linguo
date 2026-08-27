package com.linguo.websocket;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.linguo.config.JwtService;
import com.linguo.model.dto.WsIncomingMessage;
import com.linguo.model.entity.User;
import com.linguo.repository.ChatRoomRepository;
import com.linguo.repository.UserRepository;
import com.linguo.service.ChatService;
import com.linguo.service.RedisPubSubService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.net.URI;
import java.util.Optional;
import java.util.UUID;

@Component
public class ChatWebSocketHandler extends TextWebSocketHandler {

    private static final Logger log = LoggerFactory.getLogger(ChatWebSocketHandler.class);

    private final JwtService jwtService;
    private final UserRepository userRepository;
    private final ChatRoomRepository roomRepository;
    private final ChatService chatService;
    private final RedisPubSubService redisPubSubService;
    private final ObjectMapper objectMapper;

    private static final String ATTR_USER = "user";
    private static final String ATTR_ROOM_ID = "roomId";

    public ChatWebSocketHandler(JwtService jwtService,
                                UserRepository userRepository,
                                ChatRoomRepository roomRepository,
                                ChatService chatService,
                                RedisPubSubService redisPubSubService,
                                ObjectMapper objectMapper) {
        this.jwtService = jwtService;
        this.userRepository = userRepository;
        this.roomRepository = roomRepository;
        this.chatService = chatService;
        this.redisPubSubService = redisPubSubService;
        this.objectMapper = objectMapper;
    }

    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws Exception {
        URI uri = session.getUri();
        if (uri == null) {
            session.close(CloseStatus.POLICY_VIOLATION);
            return;
        }

        String path = uri.getPath();
        String roomIdStr = extractRoomIdFromPath(path);
        String query = uri.getQuery();
        String token = extractTokenFromQuery(query);

        if (token == null || roomIdStr == null) {
            log.warn("WebSocket connection rejected: missing token or room ID");
            session.close(CloseStatus.POLICY_VIOLATION);
            return;
        }

        Optional<String> emailOpt = jwtService.decodeToken(token);
        if (emailOpt.isEmpty()) {
            log.warn("WebSocket connection rejected: invalid JWT token");
            session.close(CloseStatus.POLICY_VIOLATION);
            return;
        }

        Optional<User> userOpt = userRepository.findByEmail(emailOpt.get());
        if (userOpt.isEmpty()) {
            log.warn("WebSocket connection rejected: user not found");
            session.close(CloseStatus.POLICY_VIOLATION);
            return;
        }

        try {
            UUID roomId = UUID.fromString(roomIdStr);
            if (!roomRepository.existsById(roomId)) {
                log.warn("WebSocket connection rejected: room not found");
                session.close(CloseStatus.SERVER_ERROR);
                return;
            }
        } catch (IllegalArgumentException e) {
            session.close(CloseStatus.BAD_DATA);
            return;
        }

        User user = userOpt.get();
        session.getAttributes().put(ATTR_USER, user);
        session.getAttributes().put(ATTR_ROOM_ID, roomIdStr);

        redisPubSubService.addSession(roomIdStr, session);
        log.info("WebSocket connected for user {} in room {}", user.getEmail(), roomIdStr);
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {
        User user = (User) session.getAttributes().get(ATTR_USER);
        String roomId = (String) session.getAttributes().get(ATTR_ROOM_ID);

        if (user == null || roomId == null) {
            return;
        }

        try {
            WsIncomingMessage incoming = objectMapper.readValue(message.getPayload(), WsIncomingMessage.class);
            if (incoming == null || incoming.getType() == null) {
                return;
            }

            switch (incoming.getType()) {
                case "send_draft" -> chatService.handleSendDraft(roomId, incoming.getText(), user);
                case "confirm_draft" -> chatService.handleConfirmDraft(roomId, incoming.getId(), incoming.getEditedText(), user);
                default -> log.debug("Unhandled incoming message type: {}", incoming.getType());
            }
        } catch (Exception e) {
            log.warn("Failed to process WebSocket text message: {}", e.getMessage());
        }
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) throws Exception {
        String roomId = (String) session.getAttributes().get(ATTR_ROOM_ID);
        if (roomId != null) {
            redisPubSubService.removeSession(roomId, session);
        }
        log.info("WebSocket closed for room {} with status {}", roomId, status);
    }

    @Override
    public void handleTransportError(WebSocketSession session, Throwable exception) throws Exception {
        log.warn("WebSocket transport error for session {}: {}", session.getId(), exception.getMessage());
    }

    private String extractRoomIdFromPath(String path) {
        if (path == null) return null;
        String prefix = "/api/v1/ws/chat/";
        int idx = path.indexOf(prefix);
        if (idx != -1) {
            String sub = path.substring(idx + prefix.length());
            int slash = sub.indexOf('/');
            return slash != -1 ? sub.substring(0, slash) : sub;
        }
        return null;
    }

    private String extractTokenFromQuery(String query) {
        if (query == null) return null;
        for (String param : query.split("&")) {
            String[] pair = param.split("=", 2);
            if (pair.length == 2 && "token".equals(pair[0])) {
                return pair[1];
            }
        }
        return null;
    }
}
