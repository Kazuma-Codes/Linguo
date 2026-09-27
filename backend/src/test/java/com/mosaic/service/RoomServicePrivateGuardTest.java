package com.mosaic.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mosaic.model.entity.ChatRoom;
import com.mosaic.model.entity.User;
import com.mosaic.repository.ChatParticipantRepository;
import com.mosaic.repository.ChatRoomRepository;
import com.mosaic.repository.MessageRepository;
import com.mosaic.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.server.ResponseStatusException;

import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

/**
 * Regression tests for the private-room IDOR fix:
 * getRoom must NOT auto-join private/direct rooms on read.
 */
@ExtendWith(MockitoExtension.class)
class RoomServicePrivateGuardTest {

    @Mock
    ChatRoomRepository roomRepository;
    @Mock
    ChatParticipantRepository participantRepository;
    @Mock
    MessageRepository messageRepository;
    @Mock
    UserRepository userRepository;
    @Mock
    TranslationService translationService;

    RoomService roomService;

    @BeforeEach
    void setup() {
        roomService = new RoomService(roomRepository, participantRepository,
                messageRepository, userRepository, translationService, new ObjectMapper());
    }

    private User user(UUID id) {
        return User.builder().id(id).email("u@example.com")
                .hashedPassword("x").preferredLanguage("en").build();
    }

    private ChatRoom room(UUID roomId, UUID creatorId, boolean isPrivate, String roomType) {
        User creator = user(creatorId);
        return ChatRoom.builder().id(roomId).title("t")
                .roomType(roomType).isPrivate(isPrivate).creator(creator).build();
    }

    @Test
    void privateRoomReadWithoutMembershipIsForbidden() {
        UUID roomId = UUID.randomUUID();
        UUID creatorId = UUID.randomUUID();
        UUID callerId = UUID.randomUUID();
        when(roomRepository.findById(roomId))
                .thenReturn(Optional.of(room(roomId, creatorId, true, "group")));
        when(participantRepository.existsByRoomIdAndUserId(roomId, callerId)).thenReturn(false);

        assertThrows(ResponseStatusException.class,
                () -> roomService.getRoom(roomId, user(callerId)));
        verify(participantRepository, never()).save(any());
    }

    @Test
    void directRoomReadWithoutMembershipIsForbidden() {
        UUID roomId = UUID.randomUUID();
        UUID creatorId = UUID.randomUUID();
        UUID callerId = UUID.randomUUID();
        when(roomRepository.findById(roomId))
                .thenReturn(Optional.of(room(roomId, creatorId, true, "direct")));
        when(participantRepository.existsByRoomIdAndUserId(roomId, callerId)).thenReturn(false);

        assertThrows(ResponseStatusException.class,
                () -> roomService.getRoom(roomId, user(callerId)));
    }

    @Test
    void joinDirectRoomIsForbidden() {
        UUID roomId = UUID.randomUUID();
        UUID creatorId = UUID.randomUUID();
        UUID callerId = UUID.randomUUID();
        when(roomRepository.findById(roomId))
                .thenReturn(Optional.of(room(roomId, creatorId, true, "direct")));

        assertThrows(ResponseStatusException.class,
                () -> roomService.joinRoom(roomId, user(callerId)));
    }
}
